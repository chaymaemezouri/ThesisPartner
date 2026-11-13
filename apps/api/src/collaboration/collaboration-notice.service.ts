import { Inject, Injectable } from '@nestjs/common';
import { AuthMailer } from '../auth/auth-mailer';
import { thesisPartnerMailHtml } from '../auth/mail-layout';
import { ENV, type Env } from '../config/env';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export type CollaborationKind = 'remark' | 'remark_reply' | 'message';

@Injectable()
export class CollaborationNotice {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: AuthMailer,
    @Inject(ENV) private readonly env: Env,
    private readonly logger: StructuredLogger,
  ) {}

  async notifyThesis(input: {
    thesisId: string;
    actorId: string;
    kind: CollaborationKind;
    title: string;
    preview: string;
  }): Promise<void> {
    const members = await this.prisma.thesisMembership.findMany({
      where: {
        thesisId: input.thesisId,
        role: { in: ['DOCTORAL_STUDENT', 'SUPERVISOR'] },
        userId: { not: input.actorId },
        user: { disabledAt: null },
      },
      select: {
        role: true,
        user: {
          select: {
            email: true,
            profile: { select: { phone: true, displayName: true } },
          },
        },
      },
    });
    const actor = await this.actorName(input.actorId);
    for (const member of members) {
      const path =
        member.role === 'SUPERVISOR'
          ? input.kind === 'message'
            ? '/messagerie'
            : `/encadrement/${input.thesisId}/remarques`
          : input.kind === 'message'
            ? '/messagerie'
            : '/remarques';
      await this.deliver({
        to: member.user.email,
        phone: member.user.profile?.phone,
        actor,
        kind: input.kind,
        title: input.title,
        preview: input.preview,
        path,
      });
    }
  }

  async notifyConversation(input: {
    conversationId: string;
    actorId: string;
    thesisId: string | null;
    preview: string;
  }): Promise<void> {
    if (input.thesisId) {
      await this.notifyThesis({
        thesisId: input.thesisId,
        actorId: input.actorId,
        kind: 'message',
        title: 'Nouveau message',
        preview: input.preview,
      });
      return;
    }
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: input.conversationId, userId: { not: input.actorId } },
      select: {
        user: {
          select: {
            disabledAt: true,
            email: true,
            profile: { select: { phone: true } },
          },
        },
      },
    });
    const actor = await this.actorName(input.actorId);
    for (const member of members) {
      if (member.user.disabledAt) continue;
      await this.deliver({
        to: member.user.email,
        phone: member.user.profile?.phone,
        actor,
        kind: 'message',
        title: 'Nouveau message',
        preview: input.preview,
        path: '/messagerie',
      });
    }
  }

  private async actorName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, profile: { select: { displayName: true } } },
    });
    const name = user?.profile?.displayName?.trim();
    return name || user?.email || 'Thesis Flow';
  }

  private async deliver(input: {
    to: string;
    phone: string | null | undefined;
    actor: string;
    kind: CollaborationKind;
    title: string;
    preview: string;
    path: string;
  }): Promise<void> {
    const appUrl = this.env.APP_URL.replace(/\/$/, '');
    const actionUrl = `${appUrl}${input.path}`;
    const label =
      input.kind === 'message'
        ? 'New message on Thesis Flow'
        : input.kind === 'remark_reply'
          ? 'New reply on a remark'
          : 'New remark on Thesis Flow';
    const preview = input.preview.trim().slice(0, 280) || 'Open Thesis Flow to read it.';
    const paragraphs = [
      `${input.actor} just wrote on Thesis Flow.`,
      input.title,
      preview,
    ];
    try {
      await this.mailer.send({
        to: input.to,
        subject: `${label} — ${input.title}`.slice(0, 180),
        text: `${paragraphs.join('\n\n')}\n\n${actionUrl}\n`,
        html: thesisPartnerMailHtml({
          appUrl,
          preheader: label,
          title: label,
          paragraphs,
          actionUrl,
          actionLabel: 'Open Thesis Flow',
          footer: 'Thesis Flow — you received this because you supervise or work on this thesis.',
        }),
      });
    } catch {
      this.logger.write({ level: 'error', msg: 'collaboration.mail.failed', to: input.to });
    }
    await this.sendWhatsApp(input.phone, `${label}: ${preview}\n${actionUrl}`);
  }

  private async sendWhatsApp(phone: string | null | undefined, text: string): Promise<void> {
    const token = this.env.WHATSAPP_TOKEN;
    const phoneId = this.env.WHATSAPP_PHONE_NUMBER_ID;
    const to = toWhatsAppNumber(phone);
    if (!token || !phoneId || !to) return;
    try {
      const template = this.env.WHATSAPP_TEMPLATE_NAME;
      const body = template
        ? {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
              name: template,
              language: { code: this.env.WHATSAPP_TEMPLATE_LANG },
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: text.slice(0, 1024) }],
                },
              ],
            },
          }
        : {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text.slice(0, 1024) },
          };
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        this.logger.write({
          level: 'error',
          msg: 'collaboration.whatsapp.failed',
          status: response.status,
        });
      }
    } catch {
      this.logger.write({ level: 'error', msg: 'collaboration.whatsapp.failed' });
    }
  }
}

function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`;
  return digits;
}
