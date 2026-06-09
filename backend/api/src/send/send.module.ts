import { Module } from '@nestjs/common';
import { SendController } from './send.controller';
import { SendService } from './send.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SendController],
  providers: [SendService],
})
export class SendModule {}
