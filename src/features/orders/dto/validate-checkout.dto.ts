import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmptyObject, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { AddressDto } from './address.dto';

// Optional nested property class to handle malformed requests
class PropertyDto {
  @ApiProperty({ description: 'Quantity of the variant', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

class ValidateCheckoutItemDto {
  @ApiProperty({ description: 'ID of the product variant', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsString()
  variant_id: string;

  @ApiProperty({ description: 'Quantity of the variant', example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  // Handle nested property object coming from clients
  @ApiProperty({ description: 'Deprecated: use quantity directly instead', required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PropertyDto)
  property?: PropertyDto;
}

export class ValidateCheckoutDto {
  @ApiProperty({
    description: 'Shipping address details',
    type: () => AddressDto,
    required: false,
  })
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  shipping_address?: AddressDto;

  @ApiProperty({
    description: 'Billing address details (can be same as shipping)',
    type: () => AddressDto,
    required: false,
  })
  @IsOptional()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  billing_address?: AddressDto;

  @ApiProperty({
    description: 'Array of items in the cart to validate',
    type: () => [ValidateCheckoutItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCheckoutItemDto)
  items: ValidateCheckoutItemDto[];

  @ApiProperty({ description: 'Session ID for guest validation', example: 'sess_abc123', required: false })
  @IsOptional()
  @IsString()
  session_id?: string;
} 