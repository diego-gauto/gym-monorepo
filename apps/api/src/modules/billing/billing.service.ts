import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CurrencyCode, InvoiceStatus, MembershipStatus, PaymentMethod, PlanType, SubscriptionChangeRequestStatus, UserRole } from '@gym-admin/shared';
import { In, MoreThan, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionChangeRequest } from './entities/subscription-change-request.entity';
import { PlanRequestMode, RequestPlanChangeDto } from './dto/request-plan-change.dto';
import { Plan } from './entities/plan.entity';
import { Invoice } from './entities/invoice.entity';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from './subscriptions.service';
import { CheckoutPayDto } from './dto/checkout-pay.dto';
import { UserBillingProfile } from '../users/entities/user-billing-profile.entity';
import { randomUUID } from 'crypto';

type BillingContextResponse = {
  isAuthenticated: boolean;
  activeSubscriptionEndDate: string | null;
  paidAccessEndsAt: string | null;
  hasSavedCard: boolean;
};

@Injectable()
export class BillingService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionChangeRequest)
    private readonly changeRequestRepository: Repository<SubscriptionChangeRequest>,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async onModuleInit() {
    const count = await this.planRepository.count();
    if (count > 0) return;

    await this.planRepository.save([
      this.planRepository.create({
        id: PlanType.MONTHLY,
        name: 'Mensual',
        description: 'Ideal para empezar tu transformación',
        price: 15000,
        currency: CurrencyCode.ARS,
        features: ['Acceso completo al gimnasio', 'Uso de equipamiento premium'],
        highlight: false,
        badge: null,
        isActive: true,
      }),
      this.planRepository.create({
        id: PlanType.QUARTERLY,
        name: 'Trimestral',
        description: 'La mejor relación precio-calidad',
        price: 36000,
        currency: CurrencyCode.ARS,
        features: ['Todo lo del plan mensual', 'Acceso a clases grupales'],
        highlight: true,
        badge: 'Más Popular',
        isActive: true,
      }),
      this.planRepository.create({
        id: PlanType.YEARLY,
        name: 'Anual',
        description: 'Máximo compromiso, máximos beneficios',
        price: 120000,
        currency: CurrencyCode.ARS,
        features: ['Todo lo del plan trimestral', 'Seguimiento nutricional básico'],
        highlight: false,
        badge: null,
        isActive: true,
      }),
    ]);
  }

  private async findActiveSubscription(userId: number): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: In([MembershipStatus.ACTIVE, MembershipStatus.PENDING_CANCELLATION, MembershipStatus.GRACE_PERIOD]),
        endDate: MoreThan(new Date()),
      },
      order: { endDate: 'ASC' },
    });
  }

  async getBillingContext(user: User): Promise<BillingContextResponse> {
    const activeSubscription = await this.findActiveSubscription(user.id);
    let paidAccessEndsAt: string | null = null;

    if (!activeSubscription) {
      const paidAccessSubscription = await this.subscriptionRepository.findOne({
        where: {
          userId: user.id,
          endDate: MoreThan(new Date()),
        },
        order: { endDate: 'DESC' },
      });

      paidAccessEndsAt = paidAccessSubscription?.endDate?.toISOString() ?? null;
    }

    return {
      isAuthenticated: true,
      activeSubscriptionEndDate: activeSubscription?.endDate?.toISOString() ?? null,
      paidAccessEndsAt,
      hasSavedCard: Boolean(user.billingProfile?.mercadopagoCardId),
    };
  }

  private resolveEffectiveAt(mode: PlanRequestMode, dto: RequestPlanChangeDto, activeSubscription: Subscription | null) {
    if (mode === PlanRequestMode.SCHEDULED_CHANGE) {
      if (!activeSubscription) {
        throw new BadRequestException('No tenés una suscripción activa para programar un cambio.');
      }
      return activeSubscription.endDate;
    }

    if (activeSubscription) {
      throw new BadRequestException('Ya tenés una suscripción activa. Usá el modo de cambio programado.');
    }

    const paidAccessDate = dto.paidAccessEndsAt ? new Date(dto.paidAccessEndsAt) : null;
    if (!paidAccessDate || Number.isNaN(paidAccessDate.getTime())) {
      throw new BadRequestException('No se pudo determinar la fecha de activación diferida.');
    }
    if (paidAccessDate.getTime() <= Date.now()) {
      throw new BadRequestException('El período pago ya finalizó. Podés suscribirte inmediatamente.');
    }

    return paidAccessDate;
  }

  async requestPlanChange(user: User, dto: RequestPlanChangeDto) {
    const activeSubscription = await this.findActiveSubscription(user.id);
    const effectiveAt = this.resolveEffectiveAt(dto.mode, dto, activeSubscription);

    const pendingRequest = await this.changeRequestRepository.findOne({
      where: { userId: user.id, status: SubscriptionChangeRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    if (pendingRequest) {
      throw new ConflictException('Ya tenés una solicitud pendiente de aplicación.');
    }

    const request = this.changeRequestRepository.create({
      userId: user.id,
      subscriptionId: activeSubscription?.id ?? null,
      newPlanId: dto.newPlanId as PlanType,
      status: SubscriptionChangeRequestStatus.PENDING,
      effectiveAt,
    });

    const savedRequest = await this.changeRequestRepository.save(request);

    return {
      message: 'Solicitud registrada con éxito',
      requestId: savedRequest.uuid,
      effectiveAt: savedRequest.effectiveAt,
      requiresCardSetup: dto.mode === PlanRequestMode.DEFERRED_ACTIVATION && !user.billingProfile?.mercadopagoCardId,
    };
  }

  private normalizeYear(rawYear: string): string {
    if (rawYear.length === 4) return rawYear;
    if (rawYear.length === 2) return `20${rawYear}`;
    throw new BadRequestException('Año de vencimiento inválido.');
  }

  async payImmediateCheckout(user: User, dto: CheckoutPayDto) {
    if (!dto.acceptedRecurringTerms) {
      throw new BadRequestException('Debés aceptar el débito recurrente para suscribirte.');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Los administradores no pueden acceder a checkout.');
    }

    const activeSubscription = await this.findActiveSubscription(user.id);
    if (activeSubscription) {
      throw new ConflictException('Ya tenés una suscripción activa. Solicitá cambio de plan.');
    }

    const paidAccessSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId: user.id,
        endDate: MoreThan(new Date()),
      },
      order: { endDate: 'DESC' },
    });

    if (paidAccessSubscription) {
      throw new ConflictException('Tenés un período pago vigente. Programá activación diferida desde checkout.');
    }

    const plan = await this.planRepository.findOne({ where: { id: dto.planId, isActive: true } });
    if (!plan) {
      throw new NotFoundException('Plan no disponible.');
    }

    const normalizedYear = this.normalizeYear(dto.expirationYear);
    let cardToken: { id?: string } | null = null;
    try {
      cardToken = await this.paymentsService.createCardToken({
        card_number: dto.cardNumber,
        expiration_month: dto.expirationMonth,
        expiration_year: normalizedYear,
        security_code: dto.securityCode,
        cardholder: {
          name: dto.cardholderName,
          identification: {
            type: dto.identificationType,
            number: dto.identificationNumber,
          },
        },
      });
    } catch (error: any) {
      const detail = error?.message || error?.cause?.[0]?.description || 'No se pudo tokenizar la tarjeta.';
      throw new BadRequestException(`Tokenización rechazada por Mercado Pago: ${detail}`);
    }

    if (!cardToken?.id) {
      throw new BadRequestException('No se pudo tokenizar la tarjeta.');
    }

    let reusableCard: {
      customerId: string;
      cardId: string;
      cardBrand: string | null;
      cardLastFour: string | null;
      cardIssuer: string | null;
      cardholderName: string | null;
      cardExpirationMonth: number | null;
      cardExpirationYear: number | null;
    };
    try {
      reusableCard = await this.paymentsService.ensureReusableCardForUser(user, {
        cardNumber: dto.cardNumber,
        expirationMonth: dto.expirationMonth,
        expirationYear: normalizedYear,
        securityCode: dto.securityCode,
        cardholderName: dto.cardholderName,
        identificationType: dto.identificationType,
        identificationNumber: dto.identificationNumber,
        fallbackBrand: dto.cardBrand ?? null,
        fallbackIssuer: dto.cardIssuer ?? null,
      });
    } catch (error: any) {
      const detail = error?.message || error?.cause?.[0]?.description || 'No se pudo preparar la tarjeta para cobros futuros.';
      throw new BadRequestException(`Error guardando tarjeta en Mercado Pago: ${detail}`);
    }

    const invoice = this.invoiceRepository.create({
      userId: user.id,
      amount: Number(plan.price),
      currency: plan.currency ?? CurrencyCode.ARS,
      status: InvoiceStatus.PENDING,
      paymentMethod: PaymentMethod.MP_CARD,
      idempotencyKey: randomUUID(),
    });
    const savedInvoice = await this.invoiceRepository.save(invoice);

    const paymentMethodId = (reusableCard.cardBrand ?? dto.cardBrand ?? 'visa').toLowerCase();
    let paymentResult: { status?: string; status_detail?: string } | null = null;
    try {
      paymentResult = await this.paymentsService.processPayment(
        savedInvoice,
        cardToken.id,
        user.email,
        paymentMethodId,
        reusableCard.customerId,
      );
    } catch (error: any) {
      const detail = error?.message || error?.cause?.[0]?.description || 'No se pudo procesar el cobro.';
      throw new BadRequestException(`Pago rechazado por Mercado Pago: ${detail}`);
    }

    if (paymentResult.status !== 'approved') {
      throw new BadRequestException(
        `El pago no fue aprobado (${paymentResult.status ?? 'sin estado'}${paymentResult.status_detail ? `: ${paymentResult.status_detail}` : ''}).`,
      );
    }

    const now = new Date();
    const anchorDay = now.getDate();
    const endDate = this.subscriptionsService.calculateNextExpiration(anchorDay, dto.planId, now);
    const newSubscription = this.subscriptionRepository.create({
      userId: user.id,
      planId: dto.planId,
      billingCycleAnchorDay: anchorDay,
      autoRenew: true,
      status: MembershipStatus.ACTIVE,
      startDate: now,
      endDate,
    });
    const savedSubscription = await this.subscriptionRepository.save(newSubscription);

    savedInvoice.subscriptionId = savedSubscription.id;
    savedInvoice.status = InvoiceStatus.PAID;
    savedInvoice.paidAt = new Date();
    await this.invoiceRepository.save(savedInvoice);

    user.status = MembershipStatus.ACTIVE;
    user.billingProfile = user.billingProfile ?? new UserBillingProfile();
    user.billingProfile.mercadopagoCustomerId = reusableCard.customerId;
    user.billingProfile.mercadopagoCardId = reusableCard.cardId;
    user.billingProfile.cardLastFour = reusableCard.cardLastFour ?? dto.cardNumber.slice(-4);
    user.billingProfile.cardBrand = reusableCard.cardBrand ?? dto.cardBrand ?? null;
    user.billingProfile.cardIssuer = reusableCard.cardIssuer ?? dto.cardIssuer ?? null;
    user.billingProfile.cardholderName = reusableCard.cardholderName ?? dto.cardholderName;
    user.billingProfile.cardExpirationMonth = reusableCard.cardExpirationMonth ?? Number(dto.expirationMonth);
    user.billingProfile.cardExpirationYear = reusableCard.cardExpirationYear ?? Number(normalizedYear);
    await this.userRepository.save(user);

    return {
      message: 'Pago aprobado. Tu suscripción ya está activa.',
      invoiceUuid: savedInvoice.uuid,
      subscriptionUuid: savedSubscription.uuid,
      status: MembershipStatus.ACTIVE,
      paidAt: savedInvoice.paidAt?.toISOString() ?? null,
    };
  }
}
