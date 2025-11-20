import {
  IsUUID,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
  IsBoolean,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({
    description: 'Product variant ID to add to cart',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  @IsUUID('4')
  variant_id: string;

  @ApiProperty({
    description: 'Quantity of items to add',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Indicates if assembly is required for the item',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  assembly_required?: boolean;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional()
  @ValidateIf((o) => o.assembly_required === undefined)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.quantity === undefined)
  @IsBoolean()
  assembly_required?: boolean;
}

export class DeleteCartItemsDto {
  @ApiProperty({
    description: 'Array of cart item IDs to delete',
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
    type: [String],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one item ID must be provided' })
  @IsUUID('4', { each: true, message: 'Each item ID must be a valid UUID' })
  item_ids: string[];
}
