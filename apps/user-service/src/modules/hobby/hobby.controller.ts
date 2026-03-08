import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '@lib/common';
import { CreateHobbyDto } from './dto/create-hobby.dto';
import { HobbyService } from './hobby.service';

@ApiTags('Hobbies')
@Controller('hobbies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HobbyController {
  constructor(private readonly hobbyService: HobbyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my hobbies' })
  getMyHobbies(@CurrentUser() user: any) {
    return this.hobbyService.findMyHobbies(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a hobby' })
  create(@CurrentUser() user: any, @Body() dto: CreateHobbyDto) {
    return this.hobbyService.create(user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a hobby (soft delete)' })
  remove(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.hobbyService.remove(user.userId, id);
  }
}
