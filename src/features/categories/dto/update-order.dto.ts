import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

/**
 * Data Transfer Object for updating a category's display order
 */
export class UpdateCategoryOrderDto {
  /**
   * New display order position
   */
  @ApiProperty({
    description: 'New display order position',
    example: 2,
    required: true,
  })
  @IsNumber()
  @Min(0)
  order: number;
} 