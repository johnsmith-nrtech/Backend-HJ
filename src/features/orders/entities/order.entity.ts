import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from './order-item.entity';
import { AddressDto } from '../dto/address.dto';

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

/**
 * Represents an order in the system
 */
export class Order {
  @ApiProperty({
    description: 'Unique identifier for the order',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'ID of the user who placed the order (nullable for guest checkouts)',
    example: '123e4567-e89b-12d3-a456-426614174003',
    type: String,
    nullable: true,
  })
  user_id: string | null;

  @ApiProperty({
    description: 'Current status of the order',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'Total amount for the order',
    example: 399.98,
    type: Number,
  })
  total_amount: number;

  @ApiProperty({
    description: 'Currency for the total amount',
    example: 'GBP',
    type: String,
    default: 'GBP',
  })
  currency: string;

  @ApiProperty({
    description: 'Shipping address for the order',
    type: () => AddressDto,
  })
  shipping_address: AddressDto;

  @ApiProperty({
    description: 'Billing address for the order',
    type: () => AddressDto,
  })
  billing_address: AddressDto;

  @ApiProperty({
    description: 'Reason for cancellation (only present if order is cancelled)',
    example: 'Customer requested cancellation due to delayed shipment',
    type: String,
    required: false,
    nullable: true,
  })
  cancellation_reason?: string;

  @ApiProperty({
    description: 'Timestamp when the order was created',
    example: '2023-01-15T10:30:00Z',
    type: Date,
  })
  created_at: Date;

  @ApiProperty({
    description: 'Timestamp when the order was last updated',
    example: '2023-01-15T10:35:00Z',
    type: Date,
  })
  updated_at: Date;

  @ApiProperty({
    description: 'List of items in this order',
    type: () => [OrderItem],
    isArray: true,
    required: false,
  })
  items?: OrderItem[];
} 