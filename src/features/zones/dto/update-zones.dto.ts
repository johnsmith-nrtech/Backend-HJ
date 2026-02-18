import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsNumber,
  Min,
  IsOptional,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';

export class UpdateZonesDto {
  @ApiProperty({
    description: 'Zone name',
    example: 'West Zone',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zone_name: string;

  @ApiProperty({
    description: 'Zip codes',
    example: ['ASD-321', 'XYZ-123', 'DEF-456'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  zip_codes: string[];

  @ApiProperty({
    description: 'Delivery charges for this zone',
    example: 150,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_charges: number;
}
