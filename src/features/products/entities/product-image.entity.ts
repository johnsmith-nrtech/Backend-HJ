import { ApiProperty } from '@nestjs/swagger';

/**
 * Product image entity representing an image for a product or variant
 */
export class ProductImage {
  /**
   * Unique identifier for the image
   */
  @ApiProperty({
    description: 'Unique identifier for the image',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  id: string;

  /**
   * Product ID this image belongs to
   */
  @ApiProperty({
    description: 'Product ID this image belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  product_id: string;

  /**
   * Variant ID this image belongs to (if applicable)
   */
  @ApiProperty({
    description: 'Variant ID this image belongs to (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
    type: String
  })
  variant_id: string | null;

  /**
   * URL or path to the image
   */
  @ApiProperty({
    description: 'URL or path to the image',
    example: 'https://example.com/images/sofa1.jpg',
  })
  url: string;

  /**
   * Image type ('main', 'gallery', or '360')
   */
  @ApiProperty({
    description: "Image type ('main', 'gallery', or '360')",
    example: 'main',
    enum: ['main', 'gallery', '360'],
  })
  type: 'main' | 'gallery' | '360';

  /**
   * Ordering sequence for images
   */
  @ApiProperty({
    description: 'Ordering sequence for images',
    example: 1,
  })
  order: number;

  /**
   * Creation timestamp
   */
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  created_at: Date;

  /**
   * Last update timestamp
   */
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  updated_at: Date;
} 