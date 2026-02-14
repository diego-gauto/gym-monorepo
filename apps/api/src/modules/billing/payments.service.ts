import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment, CardToken, Customer } from 'mercadopago';
import { Invoice } from './entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { InvoiceStatus, MembershipStatus } from '@gym-admin/shared';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { UserBillingProfile } from '../users/entities/user-billing-profile.entity';

type ReusableCardInput = {
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  securityCode: string;
  cardholderName: string;
  identificationType: string;
  identificationNumber: string;
  fallbackBrand?: string | null;
  fallbackIssuer?: string | null;
};

type ReusableCardSnapshot = {
  customerId: string;
  cardId: string;
  cardBrand: string | null;
  cardLastFour: string | null;
  cardIssuer: string | null;
  cardholderName: string | null;
  cardExpirationMonth: number | null;
  cardExpirationYear: number | null;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly client: MercadoPagoConfig;
  private readonly paymentClient: Payment;
  private readonly customerClient: Customer;

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
    this.customerClient = new Customer(this.client);
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
  async processPayment(invoice: Invoice, paymentToken: string, payerEmail: string, paymentMethodId = 'visa', payerCustomerId?: string) {
    const paymentClient = new Payment(this.client);
    const payer = payerCustomerId
      ? { email: payerEmail, id: payerCustomerId, type: 'customer' }
      : { email: payerEmail };

    try {
      const paymentData = {
        body: {
          transaction_amount: Number(invoice.amount),
          token: paymentToken,
          description: `Cuota Gimnasio - Invoice ${invoice.uuid}`,
          installments: 1,
          payment_method_id: paymentMethodId,
          payer,
          external_reference: invoice.uuid, // CRITICAL: Linkage for reconciliation
          notification_url: this.configService.get<string>('MP_WEBHOOK_URL'),
        },
        requestOptions: {
          idempotencyKey: invoice.uuid, // Rule 4: Header X-Idempotency-Key
        }
      };

      this.logger.log(`Processing payment for Invoice ${invoice.uuid} using payment token ${paymentToken}`);
      const result = await paymentClient.create(paymentData);
      
      return result;
    } catch (error: any) {
      this.logger.error(`Payment failed for Invoice ${invoice.uuid}:`, error.message || error);
      throw error;
    }
  }

  private async findOrCreateCustomer(user: User, identificationType: string, identificationNumber: string): Promise<string> {
    const existingCustomerId = user.billingProfile?.mercadopagoCustomerId;
    if (existingCustomerId) return existingCustomerId;

    const search = await this.customerClient.search({ options: { email: user.email } });
    const foundId = search.results?.[0]?.id;
    if (foundId) return foundId;

    const created = await this.customerClient.create({
      body: {
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        identification: {
          type: identificationType,
          number: identificationNumber,
        },
      },
    });

    if (!created.id) {
      throw new Error('No se pudo crear customer en Mercado Pago.');
    }

    return created.id;
  }

  async ensureReusableCardForUser(user: User, input: ReusableCardInput): Promise<ReusableCardSnapshot> {
    const customerId = await this.findOrCreateCustomer(user, input.identificationType, input.identificationNumber);
    const currentCardId = user.billingProfile?.mercadopagoCardId;

    if (currentCardId && user.billingProfile?.mercadopagoCustomerId === customerId) {
      try {
        await this.customerClient.removeCard({ customerId, cardId: currentCardId });
      } catch (error: any) {
        this.logger.warn(`Could not remove previous customer card ${currentCardId}: ${error?.message ?? error}`);
      }
    }

    const vaultToken = await this.createCardToken({
      card_number: input.cardNumber,
      expiration_month: input.expirationMonth,
      expiration_year: input.expirationYear,
      security_code: input.securityCode,
      cardholder: {
        name: input.cardholderName,
        identification: {
          type: input.identificationType,
          number: input.identificationNumber,
        },
      },
    });

    if (!vaultToken?.id) {
      throw new Error('No se pudo tokenizar la tarjeta para guardado.');
    }

    const customerCard = await this.customerClient.createCard({
      customerId,
      body: { token: vaultToken.id },
    });

    if (!customerCard?.id) {
      throw new Error('No se pudo asociar la tarjeta al customer de Mercado Pago.');
    }

    return {
      customerId,
      cardId: customerCard.id,
      cardBrand: customerCard.payment_method?.id ?? input.fallbackBrand ?? null,
      cardLastFour: customerCard.last_four_digits ?? input.cardNumber.slice(-4),
      cardIssuer: customerCard.issuer?.name ?? input.fallbackIssuer ?? null,
      cardholderName: customerCard.cardholder?.name ?? input.cardholderName,
      cardExpirationMonth: customerCard.expiration_month ?? Number(input.expirationMonth),
      cardExpirationYear: customerCard.expiration_year ?? Number(input.expirationYear),
    };
  }

  async processPaymentWithSavedCard(invoice: Invoice, user: User) {
    const customerId = user.billingProfile?.mercadopagoCustomerId ?? undefined;
    const cardId = user.billingProfile?.mercadopagoCardId ?? undefined;
    const paymentMethodId = user.billingProfile?.cardBrand?.toLowerCase() || 'visa';

    if (!cardId) {
      throw new Error('El usuario no tiene tarjeta guardada.');
    }

    if (!customerId) {
      // Legacy fallback for records created before customer/card linkage.
      return this.processPayment(invoice, cardId, user.email, paymentMethodId);
    }

    const paymentToken = await this.createCardToken({
      customer_id: customerId,
      card_id: cardId,
    });

    if (!paymentToken?.id) {
      throw new Error('No se pudo generar token de pago para tarjeta guardada.');
    }

    return this.processPayment(invoice, paymentToken.id, user.email, paymentMethodId, customerId);
  }

  /**
   * Rule 9: Recovery via New Card Registration.
   */
  async updateCardAndRecover(user: User, cardData: any) {
    this.logger.log(`Updating card and checking recovery for user ${user.email}`);

    // Update user card details
    user.billingProfile = user.billingProfile ?? new UserBillingProfile();
    user.billingProfile.mercadopagoCardId = cardData.id;
    user.billingProfile.mercadopagoCustomerId = cardData.customerId ?? user.billingProfile.mercadopagoCustomerId ?? null;
    user.billingProfile.cardBrand = cardData.brand;
    user.billingProfile.cardLastFour = cardData.lastFour;
    user.billingProfile.cardIssuer = cardData.issuer;
    user.billingProfile.cardholderName = cardData.cardholderName ?? user.billingProfile.cardholderName ?? null;
    user.billingProfile.cardExpirationMonth = cardData.cardExpirationMonth ?? user.billingProfile.cardExpirationMonth ?? null;
    user.billingProfile.cardExpirationYear = cardData.cardExpirationYear ?? user.billingProfile.cardExpirationYear ?? null;
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

      if (pendingInvoice && user.billingProfile?.mercadopagoCardId) {
        this.logger.log(`Attempting immediate recovery for Invoice ${pendingInvoice.uuid}`);
        const result = await this.processPaymentWithSavedCard(pendingInvoice, user);

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
