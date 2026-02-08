export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  PENDING_CANCELLATION = 'PENDING_CANCELLATION',
  GRACE_PERIOD = 'GRACE_PERIOD',
  REJECTED = 'REJECTED',
  REJECTED_FATAL = 'REJECTED_FATAL',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  MP_CARD = 'MP_CARD',
  CASH = 'CASH',
  POSTNET = 'POSTNET',
}

export enum InvoiceStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  VOIDED = 'VOIDED',
}

export enum PlanType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export * from './interfaces';
