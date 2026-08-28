import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AdminController } from './admin.controller';
import { AdminUsersService } from './admin-users.service';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuditModule],
  controllers: [AdminController],
  providers: [DashboardService, AdminUsersService],
})
export class AdminModule {}
