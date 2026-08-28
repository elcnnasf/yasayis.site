import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Audit qlobaldır: hər modul öz əməliyyatını jurnala yazmalıdır,
 * ona görə hər yerdə inject oluna bilməlidir.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
