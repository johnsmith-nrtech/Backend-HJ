import {
  IsEmail,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsPositive,
  IsBoolean,
  IsUUID,
  IsIn,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({ example: '123 Oxford Street', description: 'Street address' })
  @IsString()
  @MinLength(1)
  @MaxLength(96)
  street_address: string;

  @ApiPropertyOptional({
    example: 'Flat 4B',
    description: 'Address line 2 (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(96)
  address_line_2?: string;

  @ApiProperty({ example: 'London', description: 'City name' })
  @IsString()
  @MinLength(1)
  @MaxLength(96)
  city: string;

  @ApiPropertyOptional({
    example: 'Greater London',
    description: 'State or province (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(96)
  state?: string;

  @ApiProperty({ example: 'W1C 1DE', description: 'Postal or ZIP code' })
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  postal_code: string;

  @ApiProperty({ example: 'GB', description: 'ISO 2-letter country code' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'Country must be a valid 2-letter ISO code',
  })
  country: string;

  @ApiProperty({ example: 'United Kingdom', description: 'Full country name' })
  @IsString()
  @MinLength(1)
  @MaxLength(96)
  country_name: string;

  @ApiPropertyOptional()
  @IsUUID(4)
  floor_id: string;
}

export class CartItemDto {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Product variant UUID',
  })
  @IsUUID(4)
  variant_id: string;

  @ApiProperty({ example: 2, description: 'Quantity of items', minimum: 1 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    example: true,
    description: 'Whether assembly is required for this item',
  })
  @IsBoolean()
  assembly_required: boolean;
}

export class CreatePaymentDto {
  // Customer Information
  @ApiProperty({ example: 'John', description: 'Customer first name' })
  @IsString()
  @MinLength(1)
  @MaxLength(96)
  contact_first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Customer last name' })
  @IsString()
  @MinLength(1)
  @MaxLength(96)
  contact_last_name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Customer email address',
  })
  @IsEmail()
  @MaxLength(254)
  contact_email: string;

  @ApiPropertyOptional({
    example: '+44 20 7946 0958',
    description: 'Customer phone number (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  contact_phone?: string;

  // Address Information
  @ApiProperty({ type: AddressDto, description: 'Shipping address' })
  @ValidateNested()
  @Type(() => AddressDto)
  shipping_address: AddressDto;

  @ApiPropertyOptional({
    type: AddressDto,
    description: 'Billing address (optional, defaults to shipping address)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billing_address?: AddressDto;

  @ApiProperty({
    example: false,
    description: 'Whether to use a different billing address',
  })
  @IsBoolean()
  use_different_billing_address: boolean;

  // Cart Information
  @ApiProperty({
    type: [CartItemDto],
    description: 'Array of cart items with variant IDs and quantities',
    example: [
      { variant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', quantity: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cart_items: CartItemDto[];

  // Optional Fields
  @ApiPropertyOptional({
    example: 'Please deliver after 6 PM',
    description: 'Special order notes (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  order_notes?: string;
}
