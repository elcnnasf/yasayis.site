import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { GoogleService } from './google.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

/**
 * Auth qlobaldır: `AuthGuard` bütün modullarda APP_GUARD kimi işlədilir,
 * ona görə `TokenService` hər yerdə əlçatan olmalıdır.
 */
@Global()
@Module({
  // Sirlər imzalama anında ötürülür (TokenService), burada qeydiyyat kifayətdir.
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    TokenService,
    OtpService,
    GoogleService,
    AuthGuard,
  ],
  exports: [AuthService, TokenService, AuthGuard],
})
export class AuthModule {}
