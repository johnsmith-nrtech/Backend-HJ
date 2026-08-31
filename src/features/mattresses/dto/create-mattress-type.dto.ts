import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMattressTypeDto {
  @ApiProperty({ description: 'Mattress type name', example: 'Small' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Image URL', required: false })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ description: 'Height in cm', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height_cm?: number;

  @ApiProperty({ description: 'Whether this type is active', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}