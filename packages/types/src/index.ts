export const MEMBERSHIP_ROLES = ['DOCTORAL_STUDENT', 'SUPERVISOR', 'ADMIN'] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

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
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  checks: HealthChecks;
}

export const SESSION_COOKIE_NAME = 'tp_session';
export const CSRF_COOKIE_NAME = 'tp_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const REQUEST_ID_HEADER = 'x-request-id';
