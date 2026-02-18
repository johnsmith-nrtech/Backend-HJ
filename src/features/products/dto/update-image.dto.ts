import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEnum, 
  IsInt, 
  IsOptional, 
  IsString, 
  Min,
  IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating a product image
 */
export class UpdateImageDto {
  /**
   * Variant ID this image belongs to (if applicable)
   */
  @ApiProperty({
    description: 'Variant ID this image belongs to (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
    type: String
  })
  @IsOptional()
  @IsUUID('4')
  variant_id?: string | null;

  /**
   * URL or path to the image
   */
  @ApiProperty({
    description: 'URL or path to the image',
    example: 'https://example.com/images/sofa1.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  url?: string;

  /**
   * Image type ('main', 'gallery', or '360')
   */
  @ApiProperty({
    description: "Image type ('main', 'gallery', or '360')",
    example: 'main',
    enum: ['main', 'gallery', '360'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['main', 'gallery', '360'])
  type?: 'main' | 'gallery' | '360';

  /**
   * Ordering sequence for images
   */
  @ApiProperty({
    description: 'Ordering sequence for images',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
} 