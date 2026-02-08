import { Controller, Post, Body, Query, HttpCode, HttpStatus, Logger, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from './subscriptions.service';
import { UpdateCardDto } from './dto/update-card.dto';
import { InvoiceStatus } from '@gym-admin/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { Subscription } from './entities/subscription.entity';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);
  
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  @Post('webhook/mp')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Query('id') id: string,
    @Query('topic') topic: string,
    @Body() body: any,
  ) {
    const resourceId = id || (body.data && body.data.id);
    const action = body.action || topic;

    this.logger.log(`Webhook Received: action=${action}, id=${resourceId}`);

    switch (action) {
      case 'payment':
      case 'payment.created':
      case 'payment.updated':
        this.logger.log(`Processing valid payment event for ID: ${resourceId}`);
        await this.paymentsService.syncPaymentStatus(resourceId);
        break;

      case 'plan':
      case 'subscription':
        this.logger.warn(`Received '${action}' event. Ignored as per Rule 1 (Custom Engine only).`);
        break;

      default:
        this.logger.debug(`Unknown or unhandled event received: ${action}. Ignoring gracefully.`);
    }

    // Always 200 to Mercado Pago
    return { received: true, acknowledged_at: new Date().toISOString() };
  }

  @Post('card')
  async updateCard(@Req() req: any, @Body() updateCardDto: UpdateCardDto) {
    const user = req.user; // Assuming AuthGuard populates this
    await this.paymentsService.updateCardAndRecover(user, {
      id: updateCardDto.mercadopagoCardId,
      brand: updateCardDto.cardBrand,
      lastFour: updateCardDto.cardLastFour,
      issuer: updateCardDto.cardIssuer,
    });
    return { message: 'Card updated and recovery attempted' };
  }

  @Post('cancel')
  async cancelSubscription(@Req() req: any) {
    const user = req.user;
    const sub = await this.subscriptionRepository.findOne({ where: { userId: user.id } });
    
    if (!sub) {
      throw new Error('Subscription not found');
    }

    await this.subscriptionsService.cancelSubscription(sub);

    // Rule 8: If cancelling in GRACE_PERIOD, void the pending invoice
    if (sub.status === 'CANCELLED') {
      const pendingInvoice = await this.invoiceRepository.findOne({
        where: { userId: user.id, status: InvoiceStatus.PENDING },
        order: { createdAt: 'DESC' }
      });
      
      if (pendingInvoice) {
        pendingInvoice.status = InvoiceStatus.VOIDED;
        await this.invoiceRepository.save(pendingInvoice);
      }
    }

    return { message: 'Subscription status updated' };
  }
}
