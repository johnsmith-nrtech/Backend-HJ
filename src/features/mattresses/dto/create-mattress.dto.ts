import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMattressDto {
  @ApiProperty({ description: 'Parent mattress type ID' })
  @IsUUID('4')
  mattress_type_id: string;

  @ApiProperty({ description: 'Mattress name', example: 'Orthopedic Mattress' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Height in cm', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height_cm?: number;

  @ApiProperty({ description: 'Size', example: 'King', required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ description: 'Price', example: 199.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Whether this mattress is active', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}