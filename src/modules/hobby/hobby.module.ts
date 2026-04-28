import { Module } from '@nestjs/common';
import { HobbyController } from './hobby.controller';
import { HobbyService } from './hobby.service';

@Module({
  controllers: [HobbyController],
  providers: [HobbyService],
})
export class HobbyModule {}
