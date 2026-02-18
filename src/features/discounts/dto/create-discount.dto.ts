import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { DiscountType } from '../entities/discount.entity';

export class CreateDiscountDto {
  @ApiProperty({
    description: 'Name of the discount',
    example: 'Summer Sale',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Code that can be applied to activate the discount',
    example: 'SUMMER20',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  code?: string;

  @ApiProperty({
    description: 'Type of discount (percent or fixed amount)',
    enum: DiscountType,
    example: DiscountType.PERCENT,
  })
  @IsNotEmpty()
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({
    description: 'Value of the discount (percentage or fixed amount)',
    example: 20,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  value: number;

  @ApiPropertyOptional({
    description: 'Start date for the discount validity period',
    example: '2023-06-01',
  })
  @IsOptional()
  start_date?: Date;

  @ApiPropertyOptional({
    description: 'End date for the discount validity period',
    example: '2023-08-31',
  })
  @IsOptional()
  end_date?: Date;

  @ApiPropertyOptional({
    description: 'Whether the discount is active',
    example: true,
    default: true,
  })
  @IsOptional()
  is_active?: boolean = true;

  @ApiPropertyOptional({
    description: 'Minimum order amount for the discount to apply',
    example: 50.00,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  @ApiPropertyOptional({
    description: 'Maximum discount amount that can be applied',
    example: 100.00,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  max_discount_amount?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of times the discount can be used',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  usage_limit?: number;
} 