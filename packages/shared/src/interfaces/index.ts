import {
  AuthProvider,
  CurrencyCode,
  InvoiceStatus,
  MembershipStatus,
  PaymentMethod,
  PlanType,
  SubscriptionChangeRequestStatus,
  UserRole,
} from '../index';

export interface IUserAuth {
  password?: string | null;
  emailVerifiedAt?: Date | null;
  emailVerificationTokenHash?: string | null;
  emailVerificationTokenExpiresAt?: Date | null;
  authProvider: AuthProvider;
  googleSub?: string | null;
}

export interface IUserBillingProfile {
  mercadopagoCustomerId?: string | null;
  mercadopagoCardId?: string | null;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  cardIssuer?: string | null;
  cardholderName?: string | null;
  cardExpirationMonth?: number | null;
  cardExpirationYear?: number | null;
}

export interface IUser {
  id: number; // BigInt (Internal)
  uuid: string; // Public UUID
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  auth?: IUserAuth;
  status: MembershipStatus;
  role: UserRole;
  billingProfile?: IUserBillingProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthUser {
  email: string;
  role: UserRole;
}

export interface IAuthResponse {
  access_token: string;
  user: IAuthUser;
}

export interface ISubscription {
  id: number;
  uuid: string;
  userId: number; // FK to Internal ID
  status: MembershipStatus;
  planId: PlanType;
  billingCycleAnchorDay: number;
  autoRenew: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlan {
  id: PlanType;
  name: string;
  price: number;
  currency: CurrencyCode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoice {
  id: number;
  uuid: string;
  userId: number; // FK to Internal ID
  subscriptionId?: number; // FK to Internal ID
  amount: number;
  currency: CurrencyCode;
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
  userId: number;
  subscriptionId?: number | null;
  newPlanId?: PlanType;
  newAutoRenew?: boolean;
  status: SubscriptionChangeRequestStatus;
  effectiveAt: Date;
  createdAt: Date;
}

export interface IUpdateCardRequest {
  mercadopagoCardId: string;
  cardBrand: string;
  cardLastFour: string;
  cardIssuer: string;
  mercadopagoCustomerId?: string;
  cardholderName?: string;
  cardExpirationMonth?: number;
  cardExpirationYear?: number;
}

export interface IChangeSubscriptionRequest {
  newPlanId: PlanType;
  effectiveAt: string;
}
