import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  loginBodySchema,
  passwordResetSchema,
  registerBodySchema,
} from '@thesispartner/validation';
import type { z } from 'zod';
import { AppException } from '../common/errors/app.exception';
import { createOpaqueToken, hashOpaqueToken } from '../common/security/opaque-token';
import { PasswordHasher, PasswordPolicyError } from '../common/security/password-hasher';
import { ENV, type Env } from '../config/env';
import { AuditService } from '../audit/audit.service';
import { StructuredLogger } from '../infrastructure/logger/logger';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { resolveAvatarUrl } from '../profile/profile.service';
import { AuthMailer } from './auth-mailer';
import { LoginAttemptTracker } from './login-attempts';
import { SessionService, type AuthContext, type IssuedSession } from './session.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const INVALID_LOGIN = 'Invalid email or password';

type RegisterBody = z.infer<typeof registerBodySchema>;
type LoginBody = z.infer<typeof loginBodySchema>;
type ResetBody = z.infer<typeof passwordResetSchema>;

export type RequestMeta = {
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
};

export type PublicUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
  displayName: string;
  avatarUrl: string | null;
  platformRole: 'USER' | 'SUPER_ADMIN';
};

type UserWithProfile = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  platformRole: 'USER' | 'SUPER_ADMIN';
  profile: {
    givenName: string;
    familyName: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

@Injectable()
export class AuthService {
  private dummyHashPromise: Promise<string> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionService,
    private readonly mailer: AuthMailer,
    private readonly attempts: LoginAttemptTracker,
    private readonly audit: AuditService,
    private readonly logger: StructuredLogger,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async register(
    body: RegisterBody,
    meta: RequestMeta,
  ): Promise<{ user: PublicUser; issued: IssuedSession }> {
    const passwordHash = await this.hashPassword(body.password);
    const name = displayName(body.givenName, body.familyName);

    let created: { user: PublicUser; issued: IssuedSession; token: string };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: body.email,
            passwordHash,
            profile: {
              create: {
                givenName: body.givenName,
                familyName: body.familyName,
                displayName: name,
                institution: body.institution?.trim() ? body.institution.trim() : null,
              },
            },
          },
          include: { profile: true },
        });
        const token = await this.replaceToken(tx, user.id, 'EMAIL_VERIFICATION', DAY_MS);
        const issued = await this.sessions.issue(tx, user.id, meta);
        await this.audit.record(tx, {
          actorId: user.id,
          action: 'auth.register',
          entityType: 'user',
          entityId: user.id,
          requestId: meta.requestId,
        });
        return { user: toPublicUser(user), issued, token };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(409, 'CONFLICT', 'An account with this email already exists');
      }
      throw error;
    }

    await this.deliver({
      to: created.user.email,
      subject: 'Confirmez votre adresse ThesisPartner',
      text: this.verificationText(created.token),
    });
    return { user: created.user, issued: created.issued };
  }

  async login(
    body: LoginBody,
    meta: RequestMeta,
  ): Promise<{ user: PublicUser; issued: IssuedSession }> {
    this.attempts.assertAllowed(body.email);
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
      include: { profile: true },
    });
    const passwordHash = user?.passwordHash ?? (await this.dummyHash());
    const passwordOk = await this.passwords.verify(body.password, passwordHash);
    if (!user || !user.profile || user.disabledAt || !passwordOk) {
      this.attempts.recordFailure(body.email);
      await this.audit.record(this.prisma, {
        action: 'auth.login_failed',
        entityType: 'auth',
        requestId: meta.requestId,
      });
      throw new AppException(401, 'UNAUTHORIZED', INVALID_LOGIN);
    }
    this.attempts.clear(body.email);

    const issued = await this.prisma.$transaction(async (tx) => {
      const created = await this.sessions.issue(tx, user.id, meta);
      await this.audit.record(tx, {
        actorId: user.id,
        action: 'auth.login',
        entityType: 'session',
        requestId: meta.requestId,
      });
      return created;
    });
    return { user: toPublicUser(user), issued };
  }

  async logout(auth: AuthContext, meta: RequestMeta): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: auth.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorId: auth.userId,
        action: 'auth.logout',
        entityType: 'session',
        entityId: auth.sessionId,
        requestId: meta.requestId,
      });
    });
  }

  async me(userId: string): Promise<{ user: PublicUser }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || !user.profile || user.disabledAt) {
      throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
    }
    return { user: toPublicUser(user) };
  }

  async verifyEmail(token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const userId = await this.consume(tx, 'EMAIL_VERIFICATION', token);
      await tx.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });
      await this.audit.record(tx, {
        actorId: userId,
        action: 'auth.email_verified',
        entityType: 'user',
        entityId: userId,
      });
    });
  }

  async requestVerification(auth: AuthContext): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user || user.emailVerifiedAt || user.disabledAt) return;
    const token = await this.prisma.$transaction((tx) =>
      this.replaceToken(tx, user.id, 'EMAIL_VERIFICATION', DAY_MS),
    );
    await this.deliver({
      to: user.email,
      subject: 'Confirmez votre adresse ThesisPartner',
      text: this.verificationText(token),
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.disabledAt) return;
    const token = await this.prisma.$transaction((tx) =>
      this.replaceToken(tx, user.id, 'PASSWORD_RESET', HOUR_MS),
    );
    const url = `${this.env.APP_URL}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
    await this.deliver({
      to: user.email,
      subject: 'Réinitialisation du mot de passe ThesisPartner',
      text: `Pour choisir un nouveau mot de passe, ouvrez ce lien :\n${url}\n\nCe lien expire dans une heure. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
    });
  }

  async resetPassword(body: ResetBody): Promise<void> {
    const passwordHash = await this.hashPassword(body.password);
    await this.prisma.$transaction(async (tx) => {
      const userId = await this.consume(tx, 'PASSWORD_RESET', body.token);
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await this.sessions.revokeAll(tx, userId);
      await this.audit.record(tx, {
        actorId: userId,
        action: 'auth.password_reset',
        entityType: 'user',
        entityId: userId,
      });
    });
  }

  private async replaceToken(
    db: Prisma.TransactionClient,
    userId: string,
    purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
    ttlMs: number,
  ): Promise<string> {
    await db.authToken.deleteMany({ where: { userId, purpose, usedAt: null } });
    const token = createOpaqueToken();
    await db.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashOpaqueToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return token;
  }

  private async consume(
    db: Prisma.TransactionClient,
    purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
    token: string,
  ): Promise<string> {
    const row = await db.authToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
    if (!row || row.purpose !== purpose || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
      throw new AppException(400, 'BAD_REQUEST', 'This link is invalid or expired');
    }
    await db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    return row.userId;
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      return await this.passwords.hash(password);
    } catch (error) {
      if (error instanceof PasswordPolicyError) {
        throw new AppException(400, 'VALIDATION_ERROR', 'Password does not meet policy', [
          { field: 'password', message: '12 caractères minimum' },
        ]);
      }
      throw error;
    }
  }

  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= this.passwords.hash('dummy-password-value');
    return this.dummyHashPromise;
  }

  private verificationText(token: string): string {
    const url = `${this.env.APP_URL}/verifier-email?token=${encodeURIComponent(token)}`;
    return `Pour confirmer votre adresse ThesisPartner, ouvrez ce lien :\n${url}\n\nCe lien expire dans 24 heures.`;
  }

  private async deliver(mail: { to: string; subject: string; text: string }): Promise<void> {
    try {
      await this.mailer.send(mail);
    } catch {
      this.logger.write({ level: 'error', msg: 'auth.mail.failed' });
    }
  }
}

function displayName(givenName: string, familyName: string): string {
  return `${givenName} ${familyName}`.slice(0, 160);
}

function toPublicUser(user: UserWithProfile): PublicUser {
  if (!user.profile) {
    throw new AppException(500, 'INTERNAL_ERROR', 'Internal server error');
  }
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt != null,
    givenName: user.profile.givenName,
    familyName: user.profile.familyName,
    displayName: user.profile.displayName,
    avatarUrl: resolveAvatarUrl(user.id, user.profile.avatarUrl, true),
    platformRole: user.platformRole,
  };
}
