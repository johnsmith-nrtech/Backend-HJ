import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WishlistItemDto {
  @ApiProperty({
    description: 'Product variant ID to add to wishlist',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String
  })
  @IsUUID('4')
  variant_id: string;
} 