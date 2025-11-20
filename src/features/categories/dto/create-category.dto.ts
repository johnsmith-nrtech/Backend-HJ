import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, MaxLength, IsUUID, IsBoolean, IsUrl } from 'class-validator';

/**
 * Data Transfer Object for creating a new category
 */
export class CreateCategoryDto {
  /**
   * Name of the category
   */
  @ApiProperty({
    description: 'Name of the category',
    example: 'Living Room Furniture',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /**
   * URL-friendly unique identifier
   * If not provided, will be auto-generated from the name
   */
  @ApiProperty({
    description: 'URL-friendly unique identifier (auto-generated if not provided)',
    example: 'living-room-furniture',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  /**
   * Parent category ID for hierarchical structure
   * If not provided, it will be a top-level category
   */
  @ApiProperty({
    description: 'Parent category ID (null for top-level categories)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
    type: String
  })
  @IsUUID('4')
  @IsOptional()
  parent_id?: string;

  /**
   * Description of the category
   */
  @ApiProperty({
    description: 'Description of the category',
    example: 'Comfortable and stylish furniture for your living room',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Display order for sorting categories
   * Defaults to the end of the list if not provided
   */
  @ApiProperty({
    description: 'Display order for sorting categories',
    example: 1,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  /**
   * Image URL for the category
   */
  @ApiProperty({
    description: 'Image URL for the category',
    example: 'https://example.com/images/living-room-furniture.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  image_url?: string;

  /**
   * Whether this category is featured
   */
  @ApiProperty({
    description: 'Whether this category is featured',
    example: true,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  featured?: boolean;
} 