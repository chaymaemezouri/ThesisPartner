export const MEMBERSHIP_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

/** Global platform role on User — independent of ThesisMembership. */
export const PLATFORM_ROLES = ['USER', 'SUPER_ADMIN'] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const INVITATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const INVITATION_EMAIL_STATUSES = ['QUEUED', 'SENT', 'FAILED'] as const;
export type InvitationEmailStatus = (typeof INVITATION_EMAIL_STATUSES)[number];

export const PLAN_CODES = ['THESISPARTNER_PRO_MONTHLY', 'THESISPARTNER_PRO_YEARLY'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const TRIAL_STATUSES = ['NOT_STARTED', 'ACTIVE', 'EXPIRED'] as const;
export type TrialStatus = (typeof TRIAL_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  'PENDING',
  'ACTIVE',
  'PAST_DUE',
  'GRACE_PERIOD',
  'EXPIRED',
  'CANCELLED',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_ENVIRONMENTS = ['TEST', 'LIVE'] as const;
export type PaymentEnvironment = (typeof PAYMENT_ENVIRONMENTS)[number];

export const INVOICE_KINDS = ['INVOICE', 'CREDIT_NOTE'] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'VOIDED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL_ERROR',
  'COMPLETION_NOT_READY',
  'FILE_TOO_LARGE',
  'FILE_TYPE_NOT_ALLOWED',
  'FILE_SIGNATURE_MISMATCH',
  'VERSION_FILE_ALREADY_EXISTS',
  'FILE_SCAN_PENDING',
  'FILE_INFECTED',
  'SUBSCRIPTION_REQUIRED',
  'STORAGE_UNAVAILABLE',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  errors: ApiFieldError[];
  requestId: string;
}

export interface HealthChecks {
  api: 'ok';
  database: 'ok' | 'error';
  redis: 'ok' | 'error';
  storage: 'ok' | 'error';
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  checks: HealthChecks;
}

export const SESSION_COOKIE_NAME = 'tp_session';
export const CSRF_COOKIE_NAME = 'tp_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const REQUEST_ID_HEADER = 'x-request-id';
