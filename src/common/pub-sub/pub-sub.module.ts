// Module
import { Global, Module } from '@nestjs/common';

// Service
import { PubSubService } from '@/common/pub-sub/pub-sub.service';

@Global()
@Module({
  providers: [PubSubService],
  exports: [PubSubService],
})
export class PubSubModule {}
