import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'johndoe' })
  @IsString()
  @IsOptional()
  Username?: string;

  @ApiPropertyOptional({ example: 'Hello, I am John!' })
  @IsString()
  @IsOptional()
  Description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  Avatar?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  ImageUrl?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  CampusID?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  DepartmentID?: number;

  @ApiPropertyOptional({ example: 2024 })
  @IsInt()
  @IsOptional()
  CodeYear?: number;
}
