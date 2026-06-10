import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { OAuthController } from './oauth/oauth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, MailService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
