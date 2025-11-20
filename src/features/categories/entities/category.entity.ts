import { ApiProperty } from '@nestjs/swagger';

/**
 * Category entity representing a product category in the system
 * Categories can have a hierarchical structure through self-referencing
 */
export class Category {
  /**
   * Unique identifier for the category
   */
  @ApiProperty({
    description: 'Unique identifier for the category',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  id: string;

  /**
   * Name of the category
   */
  @ApiProperty({
    description: 'Name of the category',
    example: 'Living Room Furniture',
  })
  name: string;

  /**
   * URL-friendly unique identifier
   */
  @ApiProperty({
    description: 'URL-friendly unique identifier',
    example: 'living-room-furniture',
  })
  slug: string;

  /**
   * Optional parent category ID for hierarchical structure
   * If null, this is a top-level category
   */
  @ApiProperty({
    description: 'Parent category ID (null for top-level categories)',
    example: null,
    nullable: true,
    type: String
  })
  parent_id: string | null;

  /**
   * Description of the category
   */
  @ApiProperty({
    description: 'Description of the category',
    example: 'Comfortable and stylish furniture for your living room',
    nullable: true,
  })
  description: string | null;

  /**
   * Display order for sorting categories
   */
  @ApiProperty({
    description: 'Display order for sorting categories',
    example: 1,
  })
  order: number;

  /**
   * Image URL for the category
   */
  @ApiProperty({
    description: 'Image URL for the category',
    example: 'https://example.com/images/living-room-furniture.jpg',
    nullable: true,
  })
  image_url: string | null;

  /**
   * Whether this category is featured
   */
  @ApiProperty({
    description: 'Whether this category is featured',
    example: true,
    default: false,
  })
  featured: boolean;

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
  
  /**
   * Child categories (populated in responses when needed)
   */
  @ApiProperty({
    description: 'Child categories',
    type: [Category],
    isArray: true,
    required: false,
  })
  subcategories?: Category[];
} 