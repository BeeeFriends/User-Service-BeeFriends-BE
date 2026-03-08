import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateHobbyDto {
  @ApiProperty({ example: 'Gaming' })
  @IsString()
  @IsNotEmpty()
  roleName: string;
}
