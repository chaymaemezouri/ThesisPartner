import type { MembershipRole } from '@prisma/client';
import { thesisPartnerMailHtml } from '../auth/mail-layout';

export function buildInviteMail(input: {
  appUrl: string;
  thesisTitle: string;
  inviterName: string;
  role: MembershipRole;
  acceptUrl: string;
  replacesSupervisor: boolean;
}): { subject: string; text: string; html: string } {
  const roleLabel =
    input.role === 'SUPERVISOR'
      ? 'supervisor'
      : input.role === 'DOCTORAL_STUDENT'
        ? 'doctoral student'
        : 'administrator';
  const subject = `Thesis Flow invitation — ${input.thesisTitle}`;
  const paragraphs = [
    `${input.inviterName} invited you to join the thesis “${input.thesisTitle}” as ${roleLabel} on Thesis Flow.`,
    input.replacesSupervisor
      ? 'This invitation replaces the current supervisor only after you explicitly accept it.'
      : 'No thesis access is created until you explicitly accept.',
    'If you do not have a Thesis Flow account yet, create one with this same email address, sign in, then open the link below.',
    'The link expires in 14 days. You can accept or decline from the secure page.',
  ];
  const text = `${paragraphs.join('\n\n')}\n\nTo accept or decline:\n${input.acceptUrl}\n`;
  const html = thesisPartnerMailHtml({
    appUrl: input.appUrl,
    preheader: `${input.inviterName} invited you on Thesis Flow.`,
    title: 'Thesis invitation',
    paragraphs,
    actionUrl: input.acceptUrl,
    actionLabel: 'Open invitation',
    footer: 'Thesis Flow — this link is personal. Do not forward it. Do not reply to this message.',
  });
  return { subject, text, html };
}

export function buildInviteReminderMail(input: {
  appUrl: string;
  thesisTitle: string;
  inviterName: string;
  role: MembershipRole;
  acceptUrl: string;
  day: 7 | 12;
  replacesSupervisor: boolean;
}): { subject: string; text: string; html: string } {
  const daysLeft = input.day === 7 ? 7 : 2;
  const roleLabel =
    input.role === 'SUPERVISOR'
      ? 'supervisor'
      : input.role === 'DOCTORAL_STUDENT'
        ? 'doctoral student'
        : 'administrator';
  const subject = `Reminder: Thesis Flow invitation — ${input.thesisTitle}`;
  const paragraphs = [
    `This is a reminder that ${input.inviterName} invited you to join “${input.thesisTitle}” as ${roleLabel} on Thesis Flow.`,
    input.replacesSupervisor
      ? 'Accepting will replace the current supervisor. Past supervision stays in history.'
      : 'No thesis access is created until you explicitly accept.',
    `About ${daysLeft} days remain before this invitation expires.`,
  ];
  const text = `${paragraphs.join('\n\n')}\n\nTo accept or decline:\n${input.acceptUrl}\n`;
  const html = thesisPartnerMailHtml({
    appUrl: input.appUrl,
    preheader: `Reminder: invitation to ${input.thesisTitle}`,
    title: 'Invitation reminder',
    paragraphs,
    actionUrl: input.acceptUrl,
    actionLabel: 'Open invitation',
    footer: 'Thesis Flow — this link is personal. Do not forward it. Do not reply to this message.',
  });
  return { subject, text, html };
}
