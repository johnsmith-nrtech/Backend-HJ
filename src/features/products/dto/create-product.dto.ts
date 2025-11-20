import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  Min, 
  MaxLength,
  IsArray,
  IsInt,
  IsUUID,
  IsBoolean,
  IsObject,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

// Delivery info interface
interface DeliveryInfo {
  min_days: number;
  max_days: number;
  text: string;
  shipping_method?: string;
  free_shipping_threshold?: number;
}

// Payment options interface
interface PaymentOption {
  provider: string;
  type: string;
  installments?: number;
  amount_per_installment?: number;
  total_amount?: number;
  description?: string;
}

// Dimensions interface
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

/**
 * Data Transfer Object for creating a new product
 */
export class CreateProductDto {
  /**
   * Name of the product
   */
  @ApiProperty({
    description: 'Name of the product',
    example: 'Modern Living Room Sofa',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /**
   * Description of the product
   */
  @ApiProperty({
    description: 'Description of the product',
    example: 'Comfortable modern sofa for your living room',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Category ID the product belongs to
   */
  @ApiProperty({
    description: 'Category ID the product belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    type: String
  })
  @IsUUID('4')
  @IsOptional()
  category_id?: string;

  /**
   * Base price of the product
   */
  @ApiProperty({
    description: 'Base price of the product',
    example: 799.99,
    required: true,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  base_price: number;

  /**
   * Delivery information
   */
  @ApiProperty({
    description: 'Delivery information including timeframe',
    example: {
      min_days: 3,
      max_days: 4,
      text: "3 To 4 Days Delivery",
      shipping_method: "standard",
      free_shipping_threshold: 500
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  delivery_info?: DeliveryInfo;

  /**
   * Warranty information
   */
  @ApiProperty({
    description: 'Warranty information for the product',
    example: '2 year manufacturer warranty included',
    required: false,
  })
  @IsString()
  @IsOptional()
  warranty_info?: string;

  /**
   * Care instructions
   */
  @ApiProperty({
    description: 'Care and maintenance instructions',
    example: 'Clean with damp cloth. Avoid direct sunlight.',
    required: false,
  })
  @IsString()
  @IsOptional()
  care_instructions?: string;

  /**
   * Whether assembly is required
   */
  @ApiProperty({
    description: 'Whether the product requires assembly',
    example: true,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  assembly_required?: boolean;

  /**
   * Assembly instructions
   */
  @ApiProperty({
    description: 'Assembly instructions or URL to instructions',
    example: 'Assembly instructions included in package. Professional assembly available for additional fee.',
    required: false,
  })
  @IsString()
  @IsOptional()
  assembly_instructions?: string;

  /**
   * Whether the product is visible in the catalog
   */
  @ApiProperty({
    description: 'Whether the product is visible in the catalog',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_visible?: boolean;

  /**
   * Tags associated with the product (comma-separated)
   */
  @ApiProperty({
    description: 'Tags associated with the product (comma-separated)',
    example: 'modern,comfortable,living room',
    required: false,
  })
  @IsString()
  @IsOptional()
  tags?: string;

  /**
   * Material of the product
   */
  @ApiProperty({
    description: 'Material of the product',
    example: 'Leather',
    required: false,
  })
  @IsString()
  @IsOptional()
  material?: string;

  /**
   * Brand of the product
   */
  @ApiProperty({
    description: 'Brand of the product',
    example: 'SofaDeal',
    required: false,
  })
  @IsString()
  @IsOptional()
  brand?: string;

  /**
   * Whether the product is featured
   */
  @ApiProperty({
    description: 'Whether the product is featured',
    example: true,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  /**
   * Default color for the initial variant
   */
  @ApiProperty({
    description: 'Default color for the initial variant',
    example: 'White',
    required: false,
  })
  @IsString()
  @IsOptional()
  default_color?: string;

  /**
   * Default size for the initial variant
   */
  @ApiProperty({
    description: 'Default size for the initial variant',
    example: '4 feet',
    required: false,
  })
  @IsString()
  @IsOptional()
  default_size?: string;

  /**
   * Initial stock quantity for the default variant
   */
  @ApiProperty({
    description: 'Initial stock quantity for the default variant',
    example: 10,
    required: false,
    default: 0
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  initial_stock?: number;

  /**
   * Default SKU for the initial variant
   * If not provided, one will be generated automatically
   */
  @ApiProperty({
    description: 'Default SKU for the initial variant (optional)',
    example: 'SOFA-WHITE-4FT',
    required: false,
  })
  @IsString()
  @IsOptional()
  default_sku?: string;

  /**
   * Compare price for the product variant
   */
  @ApiProperty({
    description: 'Compare price (original price before discount)',
    example: 959.99,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  compare_price?: number;

  /**
   * Weight of the product in kilograms
   */
  @ApiProperty({
    description: 'Weight of the product in kilograms',
    example: 45.5,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @IsOptional()
  weight_kg?: number;

  /**
 * Assembly charges for the product variant
    */
    @ApiProperty({
      description: 'Assembly charges for the product in dollars',
      example: 50.0,
      required: false,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    assemble_charges?: number;

    /**
     * Estimated delivery time for the product variant
     */
    @ApiProperty({
      description: 'Estimated delivery time for the product variant (string, e.g., "3–5 days")',
      example: '3–5 days',
      required: false,
    })
    @IsString()
    @IsOptional()
    delivery_time_days?: string;


  /**
   * Dimensions of the product
   */
  @ApiProperty({
    description: 'Dimensions of the product with measurements in cm and inches',
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
  @IsObject()
  @IsOptional()
  dimensions?: Dimensions;

  /**
   * Payment options for the product
   */
  @ApiProperty({
    description: 'Available payment options for the product',
    example: [
      {
        provider: 'klarna',
        type: 'installment',
        installments: 3,
        amount_per_installment: 266.66,
        total_amount: 799.99,
        description: 'Make 3 Payments Of $266.66'
      }
    ],
    required: false,
  })
  @IsArray()
  @IsOptional()
  payment_options?: PaymentOption[];

  /**
   * Discount percentage for the product variant
   */
  @ApiProperty({
    description: 'Discount percentage for the product variant',
    example: 15,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  discount_percentage?: number;
} 