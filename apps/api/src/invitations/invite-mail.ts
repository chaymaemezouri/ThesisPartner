import type { MembershipRole } from '@prisma/client';
import { thesisPartnerMailHtml } from '../auth/mail-layout';

export function buildInviteMail(input: {
  thesisTitle: string;
  inviterName: string;
  role: MembershipRole;
  acceptUrl: string;
  replacesSupervisor: boolean;
}): { subject: string; text: string; html: string } {
  const roleLabel =
    input.role === 'SUPERVISOR'
      ? 'encadrant'
      : input.role === 'DOCTORAL_STUDENT'
        ? 'doctorant'
        : 'administrateur';
  const subject = `Invitation ThesisPartner — ${input.thesisTitle}`;
  const paragraphs = [
    `${input.inviterName} vous invite à rejoindre la thèse « ${input.thesisTitle} » en tant que ${roleLabel} sur ThesisPartner.`,
    input.replacesSupervisor
      ? 'Cette invitation remplace l’encadrant actuel uniquement après votre acceptation explicite.'
      : 'Aucun accès à la thèse n’est créé avant votre acceptation explicite.',
    'Si vous n’avez pas encore de compte ThesisPartner, créez-en un avec cette même adresse e-mail, connectez-vous, puis ouvrez le lien ci-dessous.',
    'Le lien expire dans 14 jours. Vous pourrez accepter ou refuser l’invitation depuis la page sécurisée.',
  ];
  const text = `${paragraphs.join('\n\n')}\n\nPour accepter ou refuser :\n${input.acceptUrl}\n`;
  const html = thesisPartnerMailHtml({
    preheader: `${input.inviterName} vous invite sur ThesisPartner.`,
    title: 'Invitation à une thèse',
    paragraphs,
    actionUrl: input.acceptUrl,
    actionLabel: 'Ouvrir l’invitation',
    footer:
      'ThesisPartner — ce lien est personnel. Ne le transférez pas. Ne répondez pas à ce message.',
  });
  return { subject, text, html };
}
