import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  emailVerificationBodySchema,
  loginBodySchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registerBodySchema,
} from '@thesispartner/validation';
import type { Request, Response } from 'express';
import { AppException } from '../common/errors/app.exception';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { AuthService, type RequestMeta } from './auth.service';
import { Public } from './public.decorator';
import { SessionService } from './session.service';

@ApiTags('auth')
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @ValidateBody(registerBodySchema)
  @ApiOperation({ summary: 'Create an account and a session' })
  async register(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(registerBodySchema.parse(body), meta(request));
    this.sessions.writeCookies(response, result.issued);
    return { user: result.user };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ValidateBody(loginBodySchema)
  @ApiOperation({ summary: 'Open a session' })
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(loginBodySchema.parse(body), meta(request));
    this.sessions.writeCookies(response, result.issued);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const auth = requireAuth(request);
    await this.auth.logout(auth, meta(request));
    this.sessions.clearCookies(response);
    return { status: 'ok' as const };
  }

  @SkipThrottle()
  @Get('me')
  @ApiOperation({ summary: 'Current account' })
  me(@Req() request: Request) {
    return this.auth.me(requireAuth(request).userId);
  }

  @Public()
  @Post('email-verification')
  @HttpCode(200)
  @ValidateBody(emailVerificationBodySchema)
  @ApiOperation({ summary: 'Confirm an email address' })
  async verifyEmail(@Body() body: unknown) {
    await this.auth.verifyEmail(emailVerificationBodySchema.parse(body).token);
    return { status: 'ok' as const };
  }

  @Post('email-verification/request')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a new confirmation link' })
  async requestVerification(@Req() request: Request) {
    await this.auth.requestVerification(requireAuth(request));
    return { status: 'ok' as const };
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(200)
  @ValidateBody(passwordResetRequestSchema)
  @ApiOperation({ summary: 'Send a password reset link if the account exists' })
  async requestPasswordReset(@Body() body: unknown) {
    await this.auth.requestPasswordReset(passwordResetRequestSchema.parse(body).email);
    return { status: 'ok' as const };
  }

  @Public()
  @Post('password-reset')
  @HttpCode(200)
  @ValidateBody(passwordResetSchema)
  @ApiOperation({ summary: 'Set a new password and revoke sessions' })
  async resetPassword(@Body() body: unknown) {
    await this.auth.resetPassword(passwordResetSchema.parse(body));
    return { status: 'ok' as const };
  }
}

function requireAuth(request: Request) {
  if (!request.auth) {
    throw new AppException(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.auth;
}

function meta(request: Request): RequestMeta {
  return {
    requestId: request.requestId,
    userAgent: request.header('user-agent'),
    ipAddress: request.ip,
  };
}
