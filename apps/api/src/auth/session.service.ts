import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from '@thesispartner/types';
import type { Response } from 'express';
import { createOpaqueToken, hashOpaqueToken } from '../common/security/opaque-token';
import { sessionCookieOptions } from '../common/security/session-cookie';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type AuthContext = {
  userId: string;
  sessionId: string;
  csrfSecretHash: string;
  email: string;
  emailVerified: boolean;
  givenName: string;
  familyName: string;
  displayName: string;
  platformRole: 'USER' | 'SUPER_ADMIN';
};

export type IssuedSession = {
  token: string;
  csrf: string;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async issue(
    db: Prisma.TransactionClient,
    userId: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedSession> {
    const token = createOpaqueToken();
    const csrf = createOpaqueToken();
    await db.session.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(token),
        csrfSecretHash: hashOpaqueToken(csrf),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        userAgent: meta.userAgent?.slice(0, 512),
        ipAddress: meta.ipAddress?.slice(0, 64),
      },
    });
    return { token, csrf };
  }

  async authenticate(token: string | undefined): Promise<AuthContext | null> {
    if (!token || token.length < 20 || token.length > 200) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashOpaqueToken(token) },
      include: { user: { include: { profile: true } } },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
    if (session.user.disabledAt || !session.user.profile) return null;

    return {
      userId: session.user.id,
      sessionId: session.id,
      csrfSecretHash: session.csrfSecretHash,
      email: session.user.email,
      emailVerified: session.user.emailVerifiedAt != null,
      givenName: session.user.profile.givenName,
      familyName: session.user.profile.familyName,
      displayName: session.user.profile.displayName,
      platformRole: session.user.platformRole,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(db: Prisma.TransactionClient, userId: string): Promise<void> {
    await db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  writeCookies(response: Response, issued: IssuedSession): void {
    const base = sessionCookieOptions(this.env);
    response.cookie(SESSION_COOKIE_NAME, issued.token, base);
    response.cookie(CSRF_COOKIE_NAME, issued.csrf, { ...base, httpOnly: false });
  }

  clearCookies(response: Response): void {
    const base = sessionCookieOptions(this.env);
    response.clearCookie(SESSION_COOKIE_NAME, base);
    response.clearCookie(CSRF_COOKIE_NAME, { ...base, httpOnly: false });
  }
}
