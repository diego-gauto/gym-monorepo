import { MembershipStatus, PaymentMethod, InvoiceStatus } from '../index';

export interface IUser {
  id: number; // BigInt (Internal)
  uuid: string; // Public UUID
  name: string;
  email: string;
  dni: string;
  password?: string; // Optional in interface, required in DB
  status: MembershipStatus;
  role: 'ADMIN' | 'USER';
  mercadopagoCustomerId?: string;
  mercadopagoCardId?: string;
  cardBrand?: string;
  cardLastFour?: string;
  cardIssuer?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubscription {
  id: number;
  uuid: string;
  userId: number; // FK to Internal ID
  status: MembershipStatus;
  planId: string; // Mapping to PlanType
  billingCycleAnchorDay: number;
  autoRenew: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoice {
  id: number;
  uuid: string;
  userId: number; // FK to Internal ID
  subscriptionId?: number; // FK to Internal ID
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedicalCertificate {
  id: number;
  uuid: string;
  userId: number; // FK to Internal ID
  doctorName: string;
  issuedAt: Date;
  validUntil: Date;
  fileUrl?: string;
  createdAt: Date;
}

export interface IAttendance {
  id: number;
  uuid: string;
  userId: number; // FK to Internal ID
  checkInAt: Date;
  checkOutAt?: Date;
  deviceId?: string;
}

export interface ISubscriptionChangeRequest {
  id: number;
  uuid: string;
  subscriptionId: number;
  newPlanId?: string;
  newAutoRenew?: boolean;
  status: 'PENDING' | 'APPLIED' | 'CANCELLED';
  effectiveAt: Date;
  createdAt: Date;
}
