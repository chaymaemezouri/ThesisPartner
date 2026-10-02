import { Inject, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';

export type AuthMail = {
  to: string;
  subject: string;
  text: string;
};

@Injectable()
export class AuthMailer {
  readonly sent: AuthMail[] = [];

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly logger: StructuredLogger,
  ) {}

  async send(mail: AuthMail): Promise<void> {
    if (this.env.NODE_ENV === 'test') {
      this.sent.push(mail);
      return;
    }

    if (this.env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host: this.env.SMTP_HOST,
        port: this.env.SMTP_PORT,
        secure: false,
      });
      await transport.sendMail({
        from: this.env.SMTP_FROM,
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
      });
      this.logger.write({ level: 'info', msg: 'auth.mail.sent', subject: mail.subject });
      return;
    }

    if (this.env.NODE_ENV === 'development') {
      this.logger.write({
        level: 'info',
        msg: 'auth.mail.dev',
        subject: mail.subject,
        text: mail.text,
      });
      return;
    }

    this.logger.write({ level: 'error', msg: 'auth.mail.unconfigured' });
    throw new AppException(503, 'INTERNAL_ERROR', 'Email delivery is not configured');
  }
}
