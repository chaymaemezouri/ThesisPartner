import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuthMailer } from '../auth/auth-mailer';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class BillingMailer {
  constructor(
    private readonly mailer: AuthMailer,
    private readonly prisma: PrismaService,
  ) {}

  async sendOnce(input: {
    userId: string;
    email: string;
    eventKey: string;
    subject: string;
    text: string;
    test: boolean;
    metadata?: Prisma.InputJsonValue;
  }): Promise<boolean> {
    const existing = await this.prisma.subscriptionEvent.findFirst({
      where: { userId: input.userId, type: input.eventKey },
      select: { id: true },
    });
    if (existing) return false;
    await this.prisma.subscriptionEvent.create({
      data: {
        userId: input.userId,
        type: input.eventKey,
        metadata: input.metadata ?? {},
      },
    });
    await this.mailer.send({
      to: input.email,
      subject: input.test ? `[TEST] ${input.subject}` : input.subject,
      text: input.test
        ? `${input.text}\n\nCeci est une transaction de test. Aucun encaissement reel n'a eu lieu.`
        : input.text,
    });
    return true;
  }
}
