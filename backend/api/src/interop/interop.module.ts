import { Module } from '@nestjs/common';
import { InteropController } from './interop.controller';
import { InteropService } from './interop.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [InteropController],
  providers: [InteropService],
})
export class InteropModule {}
