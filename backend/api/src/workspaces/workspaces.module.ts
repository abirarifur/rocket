import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { PublicController } from './public.controller';
import { WorkspacesService } from './workspaces.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WorkspacesController, PublicController],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}
