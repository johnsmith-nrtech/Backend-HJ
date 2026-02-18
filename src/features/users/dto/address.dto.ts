import { IsOptional, IsString, IsBoolean, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({
    description: 'Name of the recipient',
    example: 'John Doe',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  recipient_name: string;
  
  @ApiProperty({
    description: 'Address line 1',
    example: '123 Main Street',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  line1: string;

  @ApiProperty({
    description: 'Address line 2',
    example: 'Apartment 4B',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  line2?: string;

  @ApiProperty({
    description: 'City',
    example: 'London',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  city: string;

  @ApiProperty({
    description: 'State/County/Province',
    example: 'Greater London',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  state: string;

  @ApiProperty({
    description: 'Postal/ZIP code',
    example: 'SW1A 1AA',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  postal_code: string;

  @ApiProperty({
    description: 'Country',
    example: 'United Kingdom',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  country: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+44 123 456 7890',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    description: 'Address type (shipping or billing)',
    example: 'shipping',
    required: true,
    enum: ['shipping', 'billing']
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Whether this is the default address for its type',
    example: true,
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

// Use the same structure for both create and update
export class CreateAddressDto extends AddressDto {}

export class UpdateAddressDto extends AddressDto {
  // Make all fields optional for updates
  @IsOptional()
  recipient_name: string;

  @IsOptional()
  line1: string;

  @IsOptional()
  city: string;

  @IsOptional()
  state: string;

  @IsOptional()
  postal_code: string;

  @IsOptional()
  country: string;

  @IsOptional()
  phone: string;

  @IsOptional()
  type: string;
} 