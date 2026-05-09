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
import { UpdateUserDto } from '@beefriends/shared-kernel/dto';
import { CurrentUser, JwtAuthGuard } from '@common';
import { memoryStorage } from 'multer';
import { UserService } from './user.service';

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
  getMe(@CurrentUser() user: any) {
    return this.userService.findById(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
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
    @CurrentUser() user: any,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (!image) throw new BadRequestException('Image file is required');
    return this.userService.uploadChatAttachment(user.userId, image);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }
}
