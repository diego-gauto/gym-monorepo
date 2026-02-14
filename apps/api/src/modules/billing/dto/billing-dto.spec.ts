import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PlanType } from '@gym-admin/shared';
import { ChangeSubscriptionDto } from './change-subscription.dto';
import { CheckoutPayDto } from './checkout-pay.dto';
import { UpdateCardDto } from './update-card.dto';
import { PlanRequestMode, RequestPlanChangeDto } from './request-plan-change.dto';

describe('Billing DTOs', () => {
  describe('ChangeSubscriptionDto', () => {
    it('accepts valid payload', async () => {
      const dto = plainToInstance(ChangeSubscriptionDto, {
        newPlanId: PlanType.MONTHLY,
        effectiveAt: '2026-02-11T00:00:00.000Z',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects unknown plan id', async () => {
      const dto = plainToInstance(ChangeSubscriptionDto, {
        newPlanId: 'INVALID_PLAN',
        effectiveAt: '2026-02-11T00:00:00.000Z',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('newPlanId');
    });
  });

  describe('UpdateCardDto', () => {
    it('accepts valid payload', async () => {
      const dto = plainToInstance(UpdateCardDto, {
        mercadopagoCardId: 'card_123',
        cardBrand: 'visa',
        cardLastFour: '1234',
        cardIssuer: 'bank',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects invalid cardLastFour length', async () => {
      const dto = plainToInstance(UpdateCardDto, {
        mercadopagoCardId: 'card_123',
        cardBrand: 'visa',
        cardLastFour: '123',
        cardIssuer: 'bank',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cardLastFourError = errors.find((error) => error.property === 'cardLastFour');
      expect(cardLastFourError).toBeDefined();
    });
  });

  describe('RequestPlanChangeDto', () => {
    it('accepts scheduled change payload', async () => {
      const dto = plainToInstance(RequestPlanChangeDto, {
        newPlanId: PlanType.MONTHLY,
        mode: PlanRequestMode.SCHEDULED_CHANGE,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('accepts deferred payload with effective date', async () => {
      const dto = plainToInstance(RequestPlanChangeDto, {
        newPlanId: PlanType.QUARTERLY,
        mode: PlanRequestMode.DEFERRED_ACTIVATION,
        paidAccessEndsAt: '2026-03-01T00:00:00.000Z',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects unknown mode', async () => {
      const dto = plainToInstance(RequestPlanChangeDto, {
        newPlanId: PlanType.MONTHLY,
        mode: 'invalid_mode',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('mode');
    });
  });

  describe('CheckoutPayDto', () => {
    it('accepts recurring checkout payload when terms are accepted', async () => {
      const dto = plainToInstance(CheckoutPayDto, {
        planId: PlanType.MONTHLY,
        cardNumber: '4509953566233704',
        expirationMonth: '11',
        expirationYear: '30',
        securityCode: '123',
        cardholderName: 'JUAN PEREZ',
        identificationType: 'DNI',
        identificationNumber: '12345678',
        acceptedRecurringTerms: true,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('rejects payload when recurring terms are not accepted', async () => {
      const dto = plainToInstance(CheckoutPayDto, {
        planId: PlanType.MONTHLY,
        cardNumber: '4509953566233704',
        expirationMonth: '11',
        expirationYear: '30',
        securityCode: '123',
        cardholderName: 'JUAN PEREZ',
        identificationType: 'DNI',
        identificationNumber: '12345678',
        acceptedRecurringTerms: false,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const acceptedTermsError = errors.find((error) => error.property === 'acceptedRecurringTerms');
      expect(acceptedTermsError).toBeDefined();
    });
  });
});
