import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../../categories/entities/category.entity';

/**
 * Product entity representing a product in the catalog
 */
export class Product {
  /**
   * Unique identifier for the product
   */
  @ApiProperty({
    description: 'Unique identifier for the product',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  id: string;

  /**
   * Name of the product
   */
  @ApiProperty({
    description: 'Name of the product',
    example: 'Modern Living Room Sofa',
  })
  name: string;

  /**
   * Description of the product
   */
  @ApiProperty({
    description: 'Description of the product',
    example: 'Comfortable modern sofa for your living room',
    nullable: true,
  })
  description: string | null;

  /**
   * Category ID the product belongs to
   */
  @ApiProperty({
    description: 'Category ID the product belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
    type: String
  })
  category_id: string | null;

  /**
   * Base price of the product
   */
  @ApiProperty({
    description: 'Base price of the product',
    example: 799.99,
  })
  base_price: number;

  /**
   * Delivery information
   */
  @ApiProperty({
    description: 'Delivery information including timeframe',
    example: {
      min_days: 3,
      max_days: 4,
      text: "3 To 4 Days Delivery",
      shipping_method: "standard",
      free_shipping_threshold: 500
    },
    nullable: true,
  })
  delivery_info?: object | null;

  /**
   * Warranty information
   */
  @ApiProperty({
    description: 'Warranty information for the product',
    example: '2 year manufacturer warranty included',
    nullable: true,
  })
  warranty_info?: string | null;

  /**
   * Care instructions
   */
  @ApiProperty({
    description: 'Care and maintenance instructions',
    example: 'Clean with damp cloth. Avoid direct sunlight.',
    nullable: true,
  })
  care_instructions?: string | null;

  /**
   * Whether assembly is required
   */
  @ApiProperty({
    description: 'Whether the product requires assembly',
    example: true,
    default: false,
  })
  assembly_required?: boolean;

  /**
   * Whether the product is visible in the catalog
   */
  @ApiProperty({
    description: 'Whether the product is visible in the catalog',
    example: true,
    default: true,
  })
  is_visible: boolean;

  /**
   * Assembly instructions
   */
  @ApiProperty({
    description: 'Assembly instructions or URL to instructions',
    example: 'Assembly instructions included in package. Professional assembly available for additional fee.',
    nullable: true,
  })
  assembly_instructions?: string | null;

  /**
   * Tags associated with the product (comma-separated)
   */
  @ApiProperty({
    description: 'Tags associated with the product (comma-separated)',
    example: 'modern,comfortable,living room',
    nullable: true
  })
  tags?: string | null;

  /**
   * Material of the product
   */
  @ApiProperty({
    description: 'Material of the product',
    example: 'Leather',
    nullable: true
  })
  material?: string | null;

  /**
   * Brand of the product
   */
  @ApiProperty({
    description: 'Brand of the product',
    example: 'SofaDeal',
    nullable: true
  })
  brand?: string | null;

  /**
   * Whether the product is featured
   */
  @ApiProperty({
    description: 'Whether the product is featured',
    example: true,
    default: false
  })
  featured?: boolean;

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
   * Variants (populated in responses when needed)
   */
  @ApiProperty({
    description: 'Product variants',
    type: 'array',
    items: {
      type: 'object',
    },
    required: false,
  })
  variants?: any[];

  /**
   * Images (populated in responses when needed)
   */
  @ApiProperty({
    description: 'Product images',
    type: 'array',
    items: {
      type: 'object',
    },
    required: false,
  })
  images?: any[];

  /**
   * Category (populated in responses when needed)
   */
  @ApiProperty({
    description: 'Category information',
    type: Category,
    required: false
  })
  category?: Category;
} 