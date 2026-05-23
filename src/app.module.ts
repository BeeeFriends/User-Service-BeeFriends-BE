import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PubSubModule, UserEventsModule } from '@common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CampusModule } from '@/modules/campus/campus.module';
import { DepartmentModule } from '@/modules/department/department.module';
import { HobbyModule } from '@/modules/hobby/hobby.module';
import { UserModule } from '@/modules/user/user.module';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PubSubModule,
    UserEventsModule,
    PrismaModule,
    AuthModule,
    UserModule,
    CampusModule,
    DepartmentModule,
    HobbyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
