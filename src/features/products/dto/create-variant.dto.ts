import { ApiProperty } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsPositive, 
  IsString, 
  Min,
  ValidateIf,
  IsBoolean,
  IsObject,
  IsArray,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';

// Dimension interface
interface Dimensions {
  width?: { cm: number; inches: number };
  depth?: { cm: number; inches: number };
  height?: { cm: number; inches: number };
  seat_width?: { cm: number; inches: number };
  seat_depth?: { cm: number; inches: number };
  seat_height?: { cm: number; inches: number };
  bed_width?: { cm: number; inches: number };
  bed_length?: { cm: number; inches: number };
}

// Payment option interface
interface PaymentOption {
  provider: string;
  type: string;
  installments?: number;
  amount_per_installment?: number;
  total_amount?: number;
  description?: string;
}

/**
 * DTO for creating a new product variant
 */
export class CreateVariantDto {
  /**
   * Stock Keeping Unit (unique identifier)
   */
  @ApiProperty({
    description: 'Stock Keeping Unit (unique identifier)',
    example: 'SOFA-001-RED-L',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  /**
   * Price of this specific variant (overrides base price if set)
   */
  @ApiProperty({
    description: 'Price of this specific variant (overrides base price if set)',
    example: 899.99,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  price?: number;


  /**
   * Discount of this specific variant (overrides base discount if set)
   */
  @ApiProperty({
    description: 'Discount of this specific variant (overrides base discount if set)',
    example: 10.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  discount_offer?: number;
  /**
   * Original/Compare price for showing discounts
   */
  @ApiProperty({
    description: 'Original/compare price for showing discounts (strikethrough price)',
    example: 1199.99,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  compare_price?: number;

  /**
   * Size of the product variant
   */
  @ApiProperty({
    description: 'Size of the product variant',
    example: 'Large',
    required: false,
  })
  @IsOptional()
  @IsString()
  size?: string;

  /**
   * Color of the product variant
   */
  @ApiProperty({
    description: 'Color of the product variant',
    example: 'Red',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;

  /**
   * Number of items in stock
   */
  @ApiProperty({
    description: 'Number of items in stock',
    example: 10,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => o.stock !== undefined)
  stock: number = 0;

  /**
   * Weight in kilograms
   */
  @ApiProperty({
    description: 'Weight in kilograms for shipping calculations',
    example: 45.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  weight_kg?: number;
  /**
   * Assembly charges for the product variant
   */
  @ApiProperty({
    description: 'Assembly charges for the product in dollars',
    example: 50.0,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  assemble_charges?: number;

  /**
   * Estimated delivery time for the product variant
   */
  @ApiProperty({
    description: 'Estimated delivery time for the product variant (string, e.g., "3–5 days")',
    example: '3–5 days',
    required: false,
  })
  @IsOptional()
  @IsString()
  delivery_time_days?: string;


  /**
   * Dimensions in both metric and imperial units
   */
  @ApiProperty({
    description: 'Dimensions in both metric and imperial units',
    example: {
      width: { cm: 215, inches: 84.65 },
      depth: { cm: 96, inches: 37.80 },
      height: { cm: 88, inches: 34.65 },
      seat_width: { cm: 180, inches: 70.87 },
      seat_depth: { cm: 56, inches: 22.05 },
      seat_height: { cm: 52, inches: 20.47 },
      bed_width: { cm: 180, inches: 70.87 },
      bed_length: { cm: 110, inches: 43.31 }
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  dimensions?: Dimensions;

  /**
   * Payment options available for this variant
   */
  @ApiProperty({
    description: 'Payment options available for this variant',
    example: [
      {
        provider: "klarna",
        type: "installment",
        installments: 3,
        amount_per_installment: 266.66,
        total_amount: 799.99,
        description: "Make 3 Payments Of $266.66"
      }
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  payment_options?: PaymentOption[];

  /**
   * Tags associated with the variant (comma-separated)
   */
  @ApiProperty({
    description: 'Tags associated with the variant (comma-separated)',
    example: 'luxury,comfortable,premium',
    required: false,
  })
  @IsOptional()
  @IsString()
  tags?: string;

  /**
   * Material of the variant
   */
  @ApiProperty({
    description: 'Material of the variant',
    example: 'Leather',
    required: false,
  })
  @IsOptional()
  @IsString()
  material?: string;

  /**
   * Brand of the variant
   */
  @ApiProperty({
    description: 'Brand of the variant',
    example: 'SofaDeal',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  /**
   * Whether the variant is featured
   */
  @ApiProperty({
    description: 'Whether the variant is featured',
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
} 