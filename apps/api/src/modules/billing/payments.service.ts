import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment, CardToken } from 'mercadopago';
import { Invoice } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { InvoiceStatus, MembershipStatus } from '@gym-admin/shared';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly client: MercadoPagoConfig;
  private readonly paymentClient: Payment;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN not found in environment variables');
    }
    this.client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    this.paymentClient = new Payment(this.client);
  }

  /**
   * Generates a card token from raw card data.
   * Note: In production, this should ideally be done on the frontend to avoid PCI compliance issues.
   */
  async createCardToken(cardData: any) {
    const cardTokenClient = new CardToken(this.client);
    try {
      const result = await cardTokenClient.create({ body: cardData });
      return result;
    } catch (error: any) {
      this.logger.error('Error creating card token:', error.message || error);
      throw error;
    }
  }

  /**
   * Processes a payment through Mercado Pago.
   */
  async processPayment(invoice: Invoice, cardId: string, payerEmail: string) {
    const paymentClient = new Payment(this.client);

    try {
      const paymentData = {
        body: {
          transaction_amount: Number(invoice.amount),
          token: cardId,
          description: `Cuota Gimnasio - Invoice ${invoice.uuid}`,
          installments: 1,
          payment_method_id: 'visa', // Defaulting for simple test, should be dynamic or fetched from cardId
          payer: {
            email: payerEmail,
          },
          external_reference: invoice.uuid, // CRITICAL: Linkage for reconciliation
          notification_url: this.configService.get<string>('MP_WEBHOOK_URL'),
        },
        requestOptions: {
          idempotencyKey: invoice.uuid, // Rule 4: Header X-Idempotency-Key
        }
      };

      this.logger.log(`Processing payment for Invoice ${invoice.uuid} using Card ${cardId}`);
      const result = await paymentClient.create(paymentData);
      
      return result;
    } catch (error: any) {
      this.logger.error(`Payment failed for Invoice ${invoice.uuid}:`, error.message || error);
      throw error;
    }
  }

  /**
   * Rule 9: Recovery via New Card Registration.
   */
  async updateCardAndRecover(user: User, cardData: any) {
    this.logger.log(`Updating card and checking recovery for user ${user.email}`);

    // Update user card details
    user.mercadopagoCardId = cardData.id;
    user.cardBrand = cardData.brand;
    user.cardLastFour = cardData.lastFour;
    user.cardIssuer = cardData.issuer;
    await this.userRepository.save(user);

    // Rule 9: If user is in GRACE_PERIOD or REJECTED, try to pay pending/expired invoice
    if (user.status === MembershipStatus.GRACE_PERIOD || user.status === MembershipStatus.REJECTED) {
      const pendingInvoice = await this.invoiceRepository.findOne({
        where: [
          { userId: user.id, status: InvoiceStatus.PENDING },
          { userId: user.id, status: InvoiceStatus.EXPIRED },
        ],
        order: { createdAt: 'DESC' },
        relations: ['subscription'],
      });

        if (pendingInvoice && user.mercadopagoCardId) {
          this.logger.log(`Attempting immediate recovery for Invoice ${pendingInvoice.uuid}`);
          const result = await this.processPayment(pendingInvoice, user.mercadopagoCardId, user.email);

        if (result.status === 'approved') {
          pendingInvoice.status = InvoiceStatus.PAID;
          pendingInvoice.paidAt = new Date();
          await this.invoiceRepository.save(pendingInvoice);

          const sub = pendingInvoice.subscription;
          if (user.status === MembershipStatus.REJECTED) {
            await this.subscriptionsService.reactivateFromDebt(sub);
          } else {
            await this.subscriptionsService.extendActiveSubscription(sub);
          }

          user.status = MembershipStatus.ACTIVE;
          await this.userRepository.save(user);
        }
      }
    }
  }

  /**
   * Rule 10: Webhook sync for payment status updates.
   */
  async syncPaymentStatus(paymentId: string) {
    this.logger.log(`Syncing payment status for MP ID: ${paymentId}`);
    try {
      const mpPayment = await this.paymentClient.get({ id: paymentId });
      const invoiceUuid = mpPayment.external_reference;

      if (!invoiceUuid) {
        this.logger.warn(`Payment ${paymentId} has no external_reference (Invoice UUID)`);
        return;
      }

      this.logger.debug(`Found Invoice UUID ${invoiceUuid} for payment ${paymentId}. Status: ${mpPayment.status}`);

      if (mpPayment.status === 'approved') {
        const invoice = await this.invoiceRepository.findOne({
          where: { uuid: invoiceUuid },
          relations: ['subscription', 'user'],
        });

        if (!invoice) {
          this.logger.error(`Invoice not found for UUID: ${invoiceUuid}`);
          return;
        }

        if (invoice.status !== InvoiceStatus.PAID) {
          this.logger.log(`Marking Invoice ${invoice.uuid} as PAID via Webhook sync`);
          invoice.status = InvoiceStatus.PAID;
          invoice.paidAt = new Date();
          await this.invoiceRepository.save(invoice);

          const sub = invoice.subscription;
          if (sub) {
            if (invoice.user.status === MembershipStatus.REJECTED) {
              await this.subscriptionsService.reactivateFromDebt(sub);
            } else {
              await this.subscriptionsService.extendActiveSubscription(sub);
            }

            const user = invoice.user;
            user.status = MembershipStatus.ACTIVE;
            await this.userRepository.save(user);
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error syncing payment ${paymentId}: ${error.message}`, error.stack);
    }
  }
}
