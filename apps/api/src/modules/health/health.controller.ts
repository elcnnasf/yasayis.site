import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Public } from '../auth/decorators';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Yükləyici (load balancer) və deploy yoxlaması üçün. */
  @Get()
  async check() {
    const started = Date.now();
    let database: 'ok' | 'error' = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }
    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    };
  }
}
