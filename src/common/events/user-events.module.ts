// Modules
import { Global, Module } from '@nestjs/common';

// Publisher
import { UserEventPublisher } from '@/common/events/user-event.publisher';

@Global()
@Module({
  providers: [UserEventPublisher],
  exports: [UserEventPublisher],
})
export class UserEventsModule {}
