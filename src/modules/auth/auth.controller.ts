import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  FirebaseRegisterDto,
  FirebaseTokenLoginDto,
  LoginDto,
} from '@beefriends/shared-kernel/dto';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';

type RegisterUploadFiles = {
  profilePhoto?: Express.Multer.File[];
  photos?: Express.Multer.File[];
};

const imageFileFilter = (
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype?.startsWith('image/')) {
    callback(new BadRequestException('Only image files are allowed'), false);
    return;
  }

  callback(null, true);
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'profilePhoto', maxCount: 1 },
        { name: 'photos', maxCount: 3 },
      ],
      {
        storage: memoryStorage(),
        fileFilter: imageFileFilter,
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 4,
        },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'displayName',
        'binusianEmail',
        'phoneNumber',
        'gender',
        'age',
        'binusianYear',
        'campusId',
        'majorId',
        'hobbyIds',
        'profilePhoto',
      ],
      properties: {
        displayName: { type: 'string', example: 'Adrian' },
        binusianEmail: {
          type: 'string',
          example: 'adrian001@binus.ac.id',
        },
        password: { type: 'string', example: 'password123' },
        firebaseIdToken: {
          type: 'string',
          example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
          description:
            'Firebase ID token from frontend Firebase SDK. Use this instead of password for the Eldora-style flow.',
        },
        phoneNumber: { type: 'string', example: '+6281234567890' },
        gender: { type: 'string', enum: ['Male', 'Female'], example: 'Male' },
        age: { type: 'integer', example: 19, minimum: 17, maximum: 60 },
        binusianYear: { type: 'integer', example: 2024 },
        campusId: { type: 'integer', example: 1 },
        majorId: { type: 'integer', example: 1 },
        hobbyIds: {
          oneOf: [
            { type: 'array', items: { type: 'integer' } },
            { type: 'string', example: '[1,2,3]' },
          ],
        },
        description: {
          type: 'string',
          example: 'Computer Science student who loves coffee.',
        },
        profilePhoto: { type: 'string', format: 'binary' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Register Binusian profile and link/create Firebase account',
  })
  register(
    @Body() dto: FirebaseRegisterDto,
    @UploadedFiles() files: RegisterUploadFiles,
  ) {
    return this.authService.register(dto, files);
  }

  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['binusianEmail', 'password'],
      properties: {
        binusianEmail: {
          type: 'string',
          example: 'adrian001@binus.ac.id',
        },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @ApiOperation({ summary: 'Login with Binusian email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('firebase-login')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['idToken'],
      properties: {
        idToken: {
          type: 'string',
          example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Login with Firebase ID token from frontend' })
  firebaseLogin(@Body() dto: FirebaseTokenLoginDto) {
    return this.authService.loginWithFirebase(dto);
  }
}
