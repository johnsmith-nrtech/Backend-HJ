import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { 
  IsArray, 
  IsNotEmptyObject, 
  IsNumber, 
  IsObject, 
  IsOptional, 
  IsString, 
  IsEmail,
  IsPhoneNumber,
  IsBoolean,
  Min, 
  ValidateNested,
  Matches
} from 'class-validator';

// Enhanced address DTO to match the new JSONB structure
class EnhancedAddressDto {
  @ApiProperty({ description: 'Street address', example: '123 Oxford Street' })
  @IsString()
  street_address: string;

  @ApiProperty({ description: 'Address line 2 (optional)', example: 'Flat 4B', required: false })
  @IsOptional()
  @IsString()
  address_line_2?: string;

  @ApiProperty({ description: 'City', example: 'London' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State/Province/Region (optional)', example: 'Greater London', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Postal/ZIP code', example: 'W1C 1DE' })
  @IsString()
  postal_code: string;

  @ApiProperty({ description: 'Country code (2-letter ISO)', example: 'GB' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter ISO code' })
  country: string;

  @ApiProperty({ description: 'Country name', example: 'United Kingdom' })
  @IsString()
  country_name: string;
}

// Contact information DTO
class ContactInformationDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  first_name: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  last_name: string;

  @ApiProperty({ description: 'Phone number', example: '+44 20 7946 0958', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;
}

// Order item DTO (same as before but with better validation)
class CheckoutItemDto {
  @ApiProperty({ description: 'ID of the product variant', example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsString()
  variant_id: string;

  @ApiProperty({ description: 'Quantity of the variant', example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

// Main enhanced checkout DTO
export class EnhancedCheckoutDto {
  @ApiProperty({
    description: 'Contact information',
    type: () => ContactInformationDto,
  })
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => ContactInformationDto)
  contact: ContactInformationDto;

  @ApiProperty({
    description: 'Shipping address details',
    type: () => EnhancedAddressDto,
  })
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => EnhancedAddressDto)
  shipping_address: EnhancedAddressDto;

  @ApiProperty({
    description: 'Billing address details (required if different from shipping)',
    type: () => EnhancedAddressDto,
    required: false
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EnhancedAddressDto)
  billing_address?: EnhancedAddressDto;

  @ApiProperty({
    description: 'Whether to use a different billing address',
    example: false,
    default: false
  })
  @IsBoolean()
  use_different_billing_address: boolean;

  @ApiProperty({
    description: 'Array of items in the cart to checkout',
    type: () => [CheckoutItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({ 
    description: 'Optional order notes', 
    example: 'Please leave at the front door', 
    required: false 
  })
  @IsOptional()
  @IsString()
  order_notes?: string;

  @ApiProperty({ 
    description: 'Coupon code if applicable', 
    example: 'SAVE10', 
    required: false 
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiProperty({ 
    description: 'Payment method preference', 
    example: 'V', 
    required: false 
  })
  @IsOptional()
  @IsString()
  payment_method?: string;
}

// DTO for order creation response
export class OrderCreationResponseDto {
  @ApiProperty({ description: 'Created order details' })
  order: any; // This would be the Order entity

  @ApiProperty({ description: 'Calculated totals' })
  totals: {
    subtotal: number;
    shipping_cost: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
  };

  @ApiProperty({ description: 'Applied discounts if any' })
  applied_discounts?: any[];
} 