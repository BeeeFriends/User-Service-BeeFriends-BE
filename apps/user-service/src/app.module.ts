import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CampusModule } from './modules/campus/campus.module';
import { DepartmentModule } from './modules/department/department.module';
import { HobbyModule } from './modules/hobby/hobby.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    CampusModule,
    DepartmentModule,
    HobbyModule,
  ],
})
export class AppModule {}
