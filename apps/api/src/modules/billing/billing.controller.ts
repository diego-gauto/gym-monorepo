import { Controller, Post, Body, Query, HttpCode, HttpStatus, Logger, Req, Get, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from './subscriptions.service';
import { BillingService } from './billing.service';
import { UpdateCardDto } from './dto/update-card.dto';
import { InvoiceStatus, MembershipStatus } from '@gym-admin/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { Subscription } from './entities/subscription.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestPlanChangeDto } from './dto/request-plan-change.dto';
import { CheckoutPayDto } from './dto/checkout-pay.dto';

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);
  
  constructor(
    private readonly billingService: BillingService,
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
  @UseGuards(JwtAuthGuard)
  async updateCard(@Req() req: any, @Body() updateCardDto: UpdateCardDto) {
    const user = req.user; // Assuming AuthGuard populates this
    await this.paymentsService.updateCardAndRecover(user, {
      id: updateCardDto.mercadopagoCardId,
      customerId: updateCardDto.mercadopagoCustomerId,
      brand: updateCardDto.cardBrand,
      lastFour: updateCardDto.cardLastFour,
      issuer: updateCardDto.cardIssuer,
      cardholderName: updateCardDto.cardholderName,
      cardExpirationMonth: updateCardDto.cardExpirationMonth,
      cardExpirationYear: updateCardDto.cardExpirationYear,
    });
    return { message: 'Card updated and recovery attempted' };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Req() req: any) {
    const user = req.user;
    const sub = await this.subscriptionRepository.findOne({ where: { userId: user.id } });
    
    if (!sub) {
      throw new Error('Subscription not found');
    }

    await this.subscriptionsService.cancelSubscription(sub);

    // Rule 8: If cancelling in GRACE_PERIOD, void the pending invoice
    if (sub.status === MembershipStatus.CANCELLED) {
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

  @Get('context')
  @UseGuards(JwtAuthGuard)
  async getBillingContext(@Req() req: any) {
    return this.billingService.getBillingContext(req.user);
  }

  @Post('plan-request')
  @UseGuards(JwtAuthGuard)
  async requestPlanChange(@Req() req: any, @Body() dto: RequestPlanChangeDto) {
    return this.billingService.requestPlanChange(req.user, dto);
  }

  @Post('checkout/pay')
  @UseGuards(JwtAuthGuard)
  async checkoutPay(@Req() req: any, @Body() dto: CheckoutPayDto) {
    return this.billingService.payImmediateCheckout(req.user, dto);
  }
}
