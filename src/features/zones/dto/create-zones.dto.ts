import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateZonesDto {
  @ApiProperty({ description: 'Zone name', example: 'West Zone' })
  @IsString()
  @IsNotEmpty()
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

  @ApiProperty({ description: 'Delivery charges', example: 150 })
  @IsNumber()
  @Min(0)
  delivery_charges: number;
}
