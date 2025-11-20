import { ApiProperty } from '@nestjs/swagger';

export enum DiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

/**
 * Represents a discount in the system
 */
export class Discount {
  @ApiProperty({
    description: 'Unique identifier for the discount',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'Name of the discount',
    example: 'Summer Sale',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Code that can be applied to activate the discount',
    example: 'SUMMER20',
    type: String,
    required: false,
  })
  code?: string;

  @ApiProperty({
    description: 'Type of discount (percent or fixed amount)',
    enum: DiscountType,
    example: DiscountType.PERCENT,
  })
  type: DiscountType;

  @ApiProperty({
    description: 'Value of the discount (percentage or fixed amount)',
    example: 20,
    type: Number,
  })
  value: number;

  @ApiProperty({
    description: 'Start date for the discount validity period',
    example: '2023-06-01',
    type: Date,
    required: false,
  })
  start_date?: Date;

  @ApiProperty({
    description: 'End date for the discount validity period',
    example: '2023-08-31',
    type: Date,
    required: false,
  })
  end_date?: Date;

  @ApiProperty({
    description: 'Whether the discount is active',
    example: true,
    type: Boolean,
    default: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Minimum order amount for the discount to apply',
    example: 50.00,
    type: Number,
    required: false,
  })
  min_order_amount?: number;

  @ApiProperty({
    description: 'Maximum discount amount that can be applied',
    example: 100.00,
    type: Number,
    required: false,
  })
  max_discount_amount?: number;

  @ApiProperty({
    description: 'Maximum number of times the discount can be used',
    example: 100,
    type: Number,
    required: false,
  })
  usage_limit?: number;

  @ApiProperty({
    description: 'Number of times the discount has been used',
    example: 45,
    type: Number,
    default: 0,
  })
  usage_count: number;

  @ApiProperty({
    description: 'Timestamp when the discount was created',
    example: '2023-01-15T10:30:00Z',
    type: Date,
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the discount was last updated',
    example: '2023-01-15T10:35:00Z',
    type: Date,
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Categories associated with this discount',
    type: 'array',
    items: {
      type: 'string',
      format: 'uuid',
    },
    required: false,
  })
  categories?: string[];

  @ApiProperty({
    description: 'Products associated with this discount',
    type: 'array',
    items: {
      type: 'string',
      format: 'uuid',
    },
    required: false,
  })
  products?: string[];

  @ApiProperty({
    description: 'Variants associated with this discount',
    type: 'array',
    items: {
      type: 'string',
      format: 'uuid',
    },
    required: false,
  })
  variants?: string[];
} 