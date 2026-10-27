import { Inject, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { AppException } from '../common/errors/app.exception';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { thesisPartnerMailHtml } from './mail-layout';

export type AuthMail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class AuthMailer {
  readonly sent: AuthMail[] = [];

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly logger: StructuredLogger,
  ) {}

  async send(mail: AuthMail): Promise<void> {
    const html = mail.html ?? fallbackHtml(mail);
    if (this.env.NODE_ENV === 'test') {
      this.sent.push({ ...mail, html });
      return;
    }

    if (this.env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host: this.env.SMTP_HOST,
        port: this.env.SMTP_PORT,
        secure: this.env.SMTP_SECURE,
        auth: this.env.SMTP_USER
          ? { user: this.env.SMTP_USER, pass: this.env.SMTP_PASS ?? '' }
          : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
      try {
        await transport.sendMail({
          from: this.env.SMTP_FROM,
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
          html,
        });
      } catch {
        this.logger.write({
          level: 'error',
          msg: 'mail.smtp_failed',
          subject: mail.subject,
          toDomain: domainOf(mail.to),
        });
        throw new AppException(503, 'INTERNAL_ERROR', 'Email delivery failed');
      }
      this.logger.write({
        level: 'info',
        msg: 'mail.accepted',
        subject: mail.subject,
        toDomain: domainOf(mail.to),
      });
      return;
    }

    this.logger.write({
      level: 'error',
      msg: 'mail.unconfigured',
      subject: mail.subject,
      toDomain: domainOf(mail.to),
    });
    throw new AppException(503, 'INTERNAL_ERROR', 'Email delivery is not configured');
  }
}

function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1).toLowerCase() : 'unknown';
}

function fallbackHtml(mail: AuthMail): string {
  return thesisPartnerMailHtml({
    preheader: mail.subject,
    title: mail.subject,
    paragraphs: mail.text.split(/\n{2,}/).map((part) => part.replaceAll('\n', ' ').trim()),
    footer: 'Thesis Flow — message automatique, ne pas répondre.',
  });
}
