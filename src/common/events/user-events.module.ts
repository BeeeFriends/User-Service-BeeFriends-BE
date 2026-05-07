import { Global, Module } from '@nestjs/common';
import { UserEventPublisher } from './user-event.publisher';

@Global()
@Module({
  providers: [UserEventPublisher],
  exports: [UserEventPublisher],
})
export class UserEventsModule {}
