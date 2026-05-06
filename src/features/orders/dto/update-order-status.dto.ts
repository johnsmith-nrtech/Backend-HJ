import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deposit_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deposit_percentage?: number;
}