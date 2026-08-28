import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService<Env, true>);

  const prefix = config.get('API_PREFIX', { infer: true });
  const port = config.get('API_PORT', { infer: true });
  const corsOrigin = config.get('CORS_ORIGIN', { infer: true });

  app.setGlobalPrefix(prefix);
  app.use(helmet());
  app.use(cookieParser());

  /*
    Lokal saxlama sürücüsündə (yalnız dev) yüklənən şəkillər buradan verilir.

    `Cross-Origin-Resource-Policy` QƏSDƏN `cross-origin`-ə qaytarılır. Helmet
    standart olaraq onu `same-origin` qoyur və bu, düzgün seçimdir — amma
    yalnız API cavabları üçün. `/uploads` altındakı fayllar isə web tətbiqinin
    (başqa origin) səhifəsinə YERLƏŞDİRİLMƏK üçündür: brauzer `same-origin`
    siyasəti ilə onları bloklayır və elan şəkilləri boş qutu kimi görünür.

    Yalnız bu marşrutda dəyişilir, qlobal helmet konfiqurasiyasına toxunulmur.
  */
  if (config.get('STORAGE_DRIVER', { infer: true }) === 'local') {
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads/',
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    });
  }

  // Cookie-əsaslı auth işlədiyi üçün credentials açıqdır və mənbə dəqiq verilir.
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  /*
    `0.0.0.0` — konteynerdə işləyən hostlar üçün məcburidir.

    Ünvan verilməsə Node bəzi mühitlərdə yalnız `localhost`-a bağlanır və
    konteynerin kənarından gələn trafik ora çatmır: host sağlamlıq yoxlamasını
    keçirə bilmir və deploy uğursuz sayılır.
  */
  await app.listen(port, '0.0.0.0');
  new Logger('Yaşayış API').log(`http://localhost:${port}${prefix} — hazırdır`);
}

void bootstrap();
