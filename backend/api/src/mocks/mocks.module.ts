import { Module } from '@nestjs/common';
import { MocksController } from './mocks.controller';
import { MockServeController } from './mock-serve.controller';
import { MocksService } from './mocks.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MocksController, MockServeController],
  providers: [MocksService],
})
export class MocksModule {}
