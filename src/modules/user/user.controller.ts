// Module
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, type CurrentUserPayload } from '@common';
import { memoryStorage } from 'multer';

// DTO
import { UpdateUserDto } from '@beefriends/shared-kernel/dto';

// Service
import { UserService } from '@/modules/user/user.service';

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

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.userService.findById(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.updateMe(user.userId, dto);
  }

  @Post('me/chat-attachments')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image for chat attachments' })
  uploadChatAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (!image) throw new BadRequestException('Image file is required');
    return this.userService.uploadChatAttachment(user.userId, image);
  }

  @Post('me/photos')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        kind: { type: 'string', enum: ['profile', 'gallery'] },
      },
    },
  })
  @ApiOperation({ summary: 'Upload an image for profile photos' })
  uploadProfilePhoto(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
    @Body('kind') kind?: string,
  ) {
    if (!image) throw new BadRequestException('Image file is required');
    return this.userService.uploadProfilePhoto(
      user.userId,
      image,
      kind === 'profile' ? 'profile' : 'gallery',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }
}
