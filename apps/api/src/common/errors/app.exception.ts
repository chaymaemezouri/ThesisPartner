import { HttpException } from '@nestjs/common';
import type { ApiErrorCode, ApiFieldError } from '@thesispartner/types';

export class AppException extends HttpException {
  readonly appCode: ApiErrorCode;
  readonly errors: ApiFieldError[];

  constructor(status: number, code: ApiErrorCode, message: string, errors: ApiFieldError[] = []) {
    super(message, status);
    this.appCode = code;
    this.errors = errors;
  }
}
