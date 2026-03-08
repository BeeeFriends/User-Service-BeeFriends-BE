import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCampusDto {
  @ApiProperty({ example: 'Universitas Indonesia' })
  @IsString()
  @IsNotEmpty()
  campusName: string;

  @ApiProperty({ example: 'Jl. Margonda Raya, Depok' })
  @IsString()
  @IsNotEmpty()
  campusAddress: string;
}
