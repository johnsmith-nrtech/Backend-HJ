import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class AddressDto {
  @ApiProperty({ description: 'Recipient\'s full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  recipient_name: string;

  @ApiProperty({ description: 'Address line 1', example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  line1: string;

  @ApiProperty({ description: 'Address line 2 (optional)', example: 'Apt 4B', required: false })
  @IsString()
  @IsOptional()
  line2?: string;

  @ApiProperty({ description: 'City', example: 'London' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State/Province/Region (optional)', example: 'Greater London', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Postal code / ZIP code', example: 'SW1A 1AA' })
  @IsString()
  @IsNotEmpty()
  postal_code: string;

  @ApiProperty({ description: 'Country code (e.g., GB, US)', example: 'GB' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Phone number (optional)', example: '07123456789', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
} 