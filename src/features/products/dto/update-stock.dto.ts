import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for updating stock level of a product variant
 */
export class UpdateStockDto {
  /**
   * New stock quantity
   */
  @ApiProperty({
    description: 'New stock quantity',
    example: 15,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  stock: number;
} 