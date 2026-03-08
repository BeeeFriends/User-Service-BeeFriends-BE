import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseAuthDto } from './dto/firebase-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const defaultAvatar = (seed: string) =>
  `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.msUser.findUnique({
      where: { Email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.msUser.create({
      data: {
        Username: dto.username,
        Password: hashedPassword,
        Email: dto.email,
        ImageUrl: defaultAvatar(dto.username),
        CampusID: dto.campusId ?? null,
        DepartmentID: dto.departmentId ?? null,
        CodeYear: dto.codeYear ?? null,
        Stsrc: 'A',
        CreatedAt: new Date(),
        CreatedBy: dto.email,
      },
    });

    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.msUser.findUnique({
      where: { Email: dto.email },
    });
    if (!user || !user.Password)
      throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.Password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user);
  }

  async firebaseAuth(dto: FirebaseAuthDto) {
    const decoded = await admin.auth().verifyIdToken(dto.idToken);

    if (decoded.email) {
      const existingByEmail = await this.prisma.msUser.findUnique({
        where: { Email: decoded.email },
      });
      if (existingByEmail) {
        const linked = await this.prisma.msUser.update({
          where: { Email: decoded.email },
          data: { FirebaseUID: decoded.uid, UpdatedAt: new Date() },
        });
        return this.issueToken(linked);
      }
    }

    const user = await this.prisma.msUser.upsert({
      where: { FirebaseUID: decoded.uid },
      update: { UpdatedAt: new Date() },
      create: {
        Username: decoded.name ?? decoded.email?.split('@')[0] ?? 'user',
        Email: decoded.email ?? null,
        FirebaseUID: decoded.uid,
        ImageUrl: decoded.picture || defaultAvatar(decoded.name ?? decoded.uid),
        Stsrc: 'A',
        CreatedAt: new Date(),
        CreatedBy: decoded.email ?? decoded.uid,
      },
    });

    return this.issueToken(user);
  }

  private issueToken(user: any) {
    const payload = {
      sub: user.UserID,
      username: user.Username,
      email: user.Email,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.UserID,
        username: user.Username,
        email: user.Email,
      },
    };
  }
}
