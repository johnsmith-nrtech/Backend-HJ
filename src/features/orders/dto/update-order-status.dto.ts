import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'The new status for the order',
    enum: OrderStatus,
    example: OrderStatus.SHIPPED,
  })
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;
} 