import { Module } from '@nestjs/common';
import { CollabGateway } from './collab.gateway';
import { PresenceService } from './presence.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [CollabGateway, PresenceService],
})
export class CollaborationModule {}
