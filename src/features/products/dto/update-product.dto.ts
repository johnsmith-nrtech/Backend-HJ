import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString,
  IsOptional, 
  IsNumber, 
  Min, 
  MaxLength,
  IsUUID,
  IsBoolean,
  IsObject
} from 'class-validator';

// Delivery info interface
interface DeliveryInfo {
  min_days: number;
  max_days: number;
  text: string;
  shipping_method?: string;
  free_shipping_threshold?: number;
}

/**
 * Data Transfer Object for updating an existing product
 */
export class UpdateProductDto {
  /**
   * Name of the product
   */
  @ApiProperty({
    description: 'Name of the product',
    example: 'Modern Living Room Sofa - Updated',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  /**
   * Description of the product
   */
  @ApiProperty({
    description: 'Description of the product',
    example: 'Comfortable modern sofa for your living room with premium upholstery',
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
    nullable: true,
    type: String
  })
  @IsUUID('4')
  @IsOptional()
  category_id?: string | null;

  /**
   * Base price of the product
   */
  @ApiProperty({
    description: 'Base price of the product',
    example: 849.99,
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  base_price?: number;

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
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  delivery_info?: DeliveryInfo | null;

  /**
   * Warranty information
   */
  @ApiProperty({
    description: 'Warranty information for the product',
    example: '2 year manufacturer warranty included',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  warranty_info?: string | null;

  /**
   * Care instructions
   */
  @ApiProperty({
    description: 'Care and maintenance instructions',
    example: 'Clean with damp cloth. Avoid direct sunlight.',
    required: false,
    nullable: true,
  })
  @IsString()
  @IsOptional()
  care_instructions?: string | null;

  /**
   * Whether assembly is required
   */
  @ApiProperty({
    description: 'Whether the product requires assembly',
    example: true,
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
    nullable: true,
  })
  @IsString()
  @IsOptional()
  assembly_instructions?: string | null;

  /**
   * Tags associated with the product (comma-separated)
   */
  @ApiProperty({
    description: 'Tags associated with the product (comma-separated)',
    example: 'modern,comfortable,living room',
    required: false,
    nullable: true
  })
  @IsString()
  @IsOptional()
  tags?: string | null;

  /**
   * Material of the product
   */
  @ApiProperty({
    description: 'Material of the product',
    example: 'Leather',
    required: false,
    nullable: true
  })
  @IsString()
  @IsOptional()
  material?: string | null;

  /**
   * Brand of the product
   */
  @ApiProperty({
    description: 'Brand of the product',
    example: 'SofaDeal',
    required: false,
    nullable: true
  })
  @IsString()
  @IsOptional()
  brand?: string | null;

  /**
   * Whether the product is featured
   */
  @ApiProperty({
    description: 'Whether the product is featured',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  /**
   * Whether the product is visible in the catalog
   */
  @ApiProperty({
    description: 'Whether the product is visible in the catalog',
    example: true,
    required: false
  })
  @IsBoolean()
  @IsOptional()
  is_visible?: boolean;
} 