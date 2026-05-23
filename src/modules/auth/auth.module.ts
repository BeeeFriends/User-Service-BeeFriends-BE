// Module
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Controller
import { AuthController } from '@/modules/auth/auth.controller';

// Provider
import { AuthRepository } from '@/modules/auth/auth.repository';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';

// Config
import { ConfigModule, ConfigService } from '@nestjs/config';

// Feature
import { StorageModule } from '@/modules/storage/storage.module';
import { ProfileReferencesModule } from '@common';

@Module({
  imports: [
    PassportModule,
    StorageModule,
    ProfileReferencesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
})
export class AuthModule {}
