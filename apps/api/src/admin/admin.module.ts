import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthModule } from '../health/health.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperAdminGuard } from './super-admin.guard';

@Module({
  imports: [AuthModule, HealthModule, InvitationsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminBootstrapService, SuperAdminGuard],
})
export class AdminModule {}
