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
import { JwtAuthGuard } from '@common';

// DTO
import { CreateCampusDto } from '@beefriends/shared-kernel/dto';

// Service
import { CampusService } from '@/modules/campus/campus.service';

@ApiTags('Campus')
@Controller('campus')
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get()
  @ApiOperation({ summary: 'Get all campuses' })
  findAll() {
    return this.campusService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campus by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campusService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campus' })
  create(@Body() dto: CreateCampusDto) {
    return this.campusService.create(dto);
  }
}
