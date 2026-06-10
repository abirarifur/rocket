import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { GlobalsService } from './globals.service';
import { BillingService } from './billing.service';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [AuthModule],
  controllers: [TeamsController],
  providers: [TeamsService, GlobalsService, BillingService, MailService],
})
export class TeamsModule {}
