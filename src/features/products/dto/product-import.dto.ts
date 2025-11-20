import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Data Transfer Object for bulk importing products from CSV
 */
export class ProductImportDto {
  /**
   * CSV file to import products from
   */
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'CSV file containing products and variants to import',
    required: true,
  })
  file: Express.Multer.File;

  /**
   * Whether to create categories if they don't exist
   */
  @ApiProperty({
    type: Boolean,
    description: 'Create categories if they do not exist',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  createCategories?: boolean;

  /**
   * Whether to skip errors and continue importing
   */
  @ApiProperty({
    type: Boolean,
    description: 'Skip rows with errors and continue importing',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  skipErrors?: boolean;
}

/**
 * Response object for product import results
 */
export class ProductImportResultDto {
  @ApiProperty({
    description: 'Total rows processed in the CSV',
    example: 25
  })
  totalRows: number;

  @ApiProperty({
    description: 'Number of products successfully imported',
    example: 20
  })
  successfulImports: number;

  @ApiProperty({
    description: 'Number of rows that failed to import',
    example: 5
  })
  failedImports: number;

  @ApiProperty({
    description: 'List of errors encountered during import',
    example: [
      { row: 3, error: 'Invalid price format' },
      { row: 10, error: 'Required field "name" missing' }
    ]
  })
  errors: Array<{ row: number; error: string }>;

  @ApiProperty({
    description: 'List of products that were successfully imported',
    example: [
      { id: '123e4567-e89b-12d3-a456-426614174000', name: 'Modern Sofa', sku: 'SOFA-001' }
    ]
  })
  importedProducts: Array<{ id: string; name: string; sku?: string }>;
} 