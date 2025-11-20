import { ApiProperty } from '@nestjs/swagger';
import { Product } from './product.entity';

/**
 * Product variant entity representing a specific variant of a product
 */
export class ProductVariant {
  /**
   * Unique identifier for the variant
   */
  @ApiProperty({
    description: 'Unique identifier for the variant',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  id: string;

  /**
   * Product ID this variant belongs to
   */
  @ApiProperty({
    description: 'Product ID this variant belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  product_id: string;

  /**
   * Stock Keeping Unit (unique identifier)
   */
  @ApiProperty({
    description: 'Stock Keeping Unit (unique identifier)',
    example: 'SOFA-001-RED-L',
  })
  sku: string;

  /**
   * Price of this specific variant (overrides base price if set)
   */
  @ApiProperty({
    description: 'Price of this specific variant (overrides base price if set)',
    example: 899.99,
    nullable: true,
  })
  price: number | null;

  /**
   * Original/Compare price for showing discounts
   */
  @ApiProperty({
    description: 'Original/compare price for showing discounts (strikethrough price)',
    example: 1199.99,
    nullable: true,
  })
  compare_price: number | null;

  /**
   * Size of the product variant
   */
  @ApiProperty({
    description: 'Size of the product variant',
    example: 'Large',
    nullable: true,
  })
  size: string | null;

  /**
   * Color of the product variant
   */
  @ApiProperty({
    description: 'Color of the product variant',
    example: 'Red',
    nullable: true,
  })
  color: string | null;

  /**
   * Number of items in stock
   */
  @ApiProperty({
    description: 'Number of items in stock',
    example: 10,
  })
  stock: number;

  /**
   * Weight in kilograms
   */
  @ApiProperty({
    description: 'Weight in kilograms for shipping calculations',
    example: 45.5,
    nullable: true,
  })
  weight_kg: number | null;

    /**
   * Assembly charges for the product variant
   */
  @ApiProperty({
    description: 'Assembly charges for the product in dollars',
    example: 50.0,
    nullable: true,
  })
  assemble_charges: number | null;

  /**
   * Estimated delivery time for the product variant
   */
  @ApiProperty({
    description: 'Estimated delivery time for the product variant (string, e.g., "3–5 days")',
    example: '3–5 days',
    nullable: true,
  })
  delivery_time_days: string | null;

  
  

  /**
   * Dimensions in both metric and imperial units
   */
  @ApiProperty({
    description: 'Dimensions in both metric and imperial units',
    example: {
      width: { cm: 215, inches: 84.65 },
      depth: { cm: 96, inches: 37.80 },
      height: { cm: 88, inches: 34.65 },
      seat_width: { cm: 180, inches: 70.87 },
      seat_depth: { cm: 56, inches: 22.05 },
      seat_height: { cm: 52, inches: 20.47 },
      bed_width: { cm: 180, inches: 70.87 },
      bed_length: { cm: 110, inches: 43.31 }
    },
    nullable: true,
  })
  dimensions: object | null;

  /**
   * Payment options available for this variant
   */
  @ApiProperty({
    description: 'Payment options available for this variant',
    example: [
      {
        provider: "klarna",
        type: "installment",
        installments: 3,
        amount_per_installment: 266.66,
        total_amount: 799.99,
        description: "Make 3 Payments Of $266.66"
      }
    ],
    nullable: true,
  })
  payment_options: object[] | null;

  /**
   * Calculated discount percentage
   */
  @ApiProperty({
    description: 'Calculated discount percentage based on price vs compare_price',
    example: 25,
    default: 0,
  })
  discount_percentage: number;

  /**
   * Tags associated with the variant (comma-separated)
   */
  @ApiProperty({
    description: 'Tags associated with the variant (comma-separated)',
    example: 'luxury,comfortable,premium',
    nullable: true,
  })
  tags: string | null;

  /**
   * Material of the variant
   */
  @ApiProperty({
    description: 'Material of the variant',
    example: 'Leather',
    nullable: true,
  })
  material: string | null;

  /**
   * Brand of the variant
   */
  @ApiProperty({
    description: 'Brand of the variant',
    example: 'SofaDeal',
    nullable: true,
  })
  brand: string | null;

  /**
   * Whether the variant is featured
   */
  @ApiProperty({
    description: 'Whether the variant is featured',
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
   * Images (populated in responses when needed)
   */
  @ApiProperty({
    description: 'Variant images',
    type: 'array',
    items: {
      type: 'object',
    },
    required: false,
  })
  images?: any[];

  /**
   * Parent product (when requested via nested selections)
   */
  @ApiProperty({
    description: 'Parent product information (may be a partial object with id and name when selected via orders) ',
    type: () => Product,
    required: false,
  })
  product?: Product;
} 