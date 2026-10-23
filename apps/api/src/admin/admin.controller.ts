import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminAnalyticsSchema,
  adminAuditEntrySchema,
  adminAuditListSchema,
  adminInvitationListSchema,
  adminReactivateBodySchema,
  adminStatsSchema,
  adminSuspendBodySchema,
  adminSystemSchema,
  adminThesisRelationsSchema,
  adminUserDetailSchema,
  adminUserListSchema,
  invitationStatusSchema,
  membershipRoleSchema,
  platformRoleSchema,
} from '@thesispartner/validation';
import type { Request } from 'express';
import { z } from 'zod';
import { ValidateBody } from '../common/validation/zod-body.interceptor';
import { InvitationsService } from '../invitations/invitations.service';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from './super-admin.guard';

const listQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
    membershipRole: membershipRoleSchema.optional(),
    platformRole: platformRoleSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const invitationListQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: invitationStatusSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const auditListQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    action: z.string().trim().max(120).optional(),
    entityType: z.string().trim().max(80).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(SuperAdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly invitations: InvitationsService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Platform-wide counters and registration series for the Super Admin dashboard',
  })
  async stats() {
    return adminStatsSchema.parse(await this.admin.stats());
  }

  @Get('analytics')
  @ApiOperation({
    summary:
      'Registration and usage trends, unsupervised theses, stuck invitations (real aggregates only)',
  })
  async analytics() {
    return adminAnalyticsSchema.parse(await this.admin.analytics());
  }

  @Get('audit')
  @ApiOperation({ summary: 'Search and paginate AuditLog entries (secrets redacted)' })
  async listAudit(@Query() raw: Record<string, unknown>) {
    const query = auditListQuerySchema.parse(raw);
    return adminAuditListSchema.parse(await this.admin.listAudit(query));
  }

  @Get('audit/:entryId')
  @ApiOperation({ summary: 'Single AuditLog entry detail (secrets redacted)' })
  async getAuditEntry(@Param('entryId', ParseUUIDPipe) entryId: string) {
    return adminAuditEntrySchema.parse(await this.admin.getAuditEntry(entryId));
  }

  @Get('system')
  @ApiOperation({ summary: 'Technical health and operational counters (no env secrets)' })
  async system() {
    return adminSystemSchema.parse(await this.admin.system());
  }

  @Get('users')
  @ApiOperation({ summary: 'Search and paginate platform users' })
  async listUsers(@Query() raw: Record<string, unknown>) {
    const query = listQuerySchema.parse(raw);
    return adminUserListSchema.parse(await this.admin.listUsers(query));
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'User profile and supervision memberships (no scientific files)' })
  async getUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return adminUserDetailSchema.parse(await this.admin.getUser(userId));
  }

  @Post('users/:userId/suspend')
  @ValidateBody(adminSuspendBodySchema)
  @ApiOperation({ summary: 'Suspend a user account (sets disabledAt, revokes sessions)' })
  async suspend(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return adminUserDetailSchema.parse(
      await this.admin.suspend(
        actorId(request),
        userId,
        adminSuspendBodySchema.parse(body),
        request.requestId,
      ),
    );
  }

  @Post('users/:userId/reactivate')
  @ValidateBody(adminReactivateBodySchema)
  @ApiOperation({ summary: 'Reactivate a suspended user account' })
  async reactivate(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return adminUserDetailSchema.parse(
      await this.admin.reactivate(
        actorId(request),
        userId,
        adminReactivateBodySchema.parse(body ?? {}),
        request.requestId,
      ),
    );
  }

  @Get('invitations')
  @ApiOperation({ summary: 'Platform invitations (no scientific content)' })
  async listInvitations(@Query() raw: Record<string, unknown>) {
    const query = invitationListQuerySchema.parse(raw);
    return adminInvitationListSchema.parse(await this.invitations.adminList(query));
  }

  @Get('theses/:thesisId/relations')
  @ApiOperation({
    summary: 'Thesis memberships, invitations and supervision history (no scientific files)',
  })
  async thesisRelations(@Param('thesisId', ParseUUIDPipe) thesisId: string) {
    return adminThesisRelationsSchema.parse(await this.invitations.adminThesisRelations(thesisId));
  }
}

function actorId(request: Request): string {
  const id = request.auth?.userId;
  if (!id) throw new Error('Missing auth context');
  return id;
}
