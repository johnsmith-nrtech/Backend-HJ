import { ApiProperty } from '@nestjs/swagger';
import { ProductVariant } from '../../products/entities/product-variant.entity'; // Assuming you want to link to ProductVariant

/**
 * Represents an item within an order
 */
export class OrderItem {
  @ApiProperty({
    description: 'Unique identifier for the order item',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'ID of the order this item belongs to',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  order_id: string;

  @ApiProperty({
    description: 'ID of the product variant for this item (nullable if variant is deleted)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    type: String,
    nullable: true,
  })
  variant_id: string | null;

  @ApiProperty({
    description: 'Quantity of the product variant ordered',
    example: 2,
    type: Number,
  })
  quantity: number;

  @ApiProperty({
    description: 'Price of a single unit of the variant at the time of purchase',
    example: 199.99,
    type: Number,
  })
  unit_price: number;

  @ApiProperty({
    description: 'Discount applied to this item',
    example: 10.0,
    type: Number,
    default: 0,
  })
  discount_applied?: number;

  @ApiProperty({
    description: 'Timestamp when the order item was created',
    example: '2023-01-15T10:30:00Z',
    type: Date,
  })
  created_at: Date;

  // Optional: If you want to include variant details directly
  @ApiProperty({
    description: 'Details of the product variant (populated if requested)',
    type: () => ProductVariant,
    required: false,
  })
  variant?: ProductVariant;
} 