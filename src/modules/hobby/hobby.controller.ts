// Module
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@common';

// DTO
import { CreateHobbyDto } from '@beefriends/shared-kernel/dto';

// Service
import { HobbyService } from '@/modules/hobby/hobby.service';

@ApiTags('Hobbies')
@Controller('hobbies')
export class HobbyController {
  constructor(private readonly hobbyService: HobbyService) {}

  @Get()
  @ApiOperation({ summary: 'Get all hobbies' })
  findAll() {
    return this.hobbyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hobby by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hobbyService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new hobby' })
  create(@CurrentUser() user: { userId: number }, @Body() dto: CreateHobbyDto) {
    return this.hobbyService.create(user.userId, dto);
  }
}
