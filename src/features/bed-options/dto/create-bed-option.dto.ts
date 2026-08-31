import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBedOptionDto {
  @ApiProperty({
    description: 'Bed option category',
    enum: ['headboard_height', 'storage', 'wings', 'mattress', 'base', 'mattress_section'],
  })
  @IsIn(['headboard_height', 'storage', 'wings', 'mattress', 'base', 'mattress_section'])
  type: 'headboard_height' | 'storage' | 'wings' | 'mattress' | 'base' | 'mattress_section';

  @ApiProperty({ description: 'Display label', example: 'Ottoman Storage' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Extra charge for this option', example: 49.0, default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  charge: number = 0;

  @ApiProperty({ description: 'Height in cm (headboard_height type only)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height_cm?: number;

  @ApiProperty({ description: 'Whether this option is selectable by admins', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @ApiProperty({ description: 'Image URL for this option', required: false })
  @IsOptional()
  @IsString()
  image_url?: string;
}