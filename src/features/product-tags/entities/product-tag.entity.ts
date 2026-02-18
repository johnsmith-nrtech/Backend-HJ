import { ApiProperty } from '@nestjs/swagger';

/**
 * ProductTag entity representing a product tag in the catalog
 */
export class ProductTag {
  /**
   * Unique identifier for the product tag
   */
  @ApiProperty({
    description: 'Unique identifier for the product tag',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    type: String
  })
  id: string;

  /**
   * Name of the product tag
   */
  @ApiProperty({
    description: 'Name of the product tag',
    example: 'summer-collection',
    type: String
  })
  name: string;

  /**
   * Creation timestamp
   */
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  created_at: Date;

  /**
   * Last update timestamp
   */
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  updated_at: Date;
} 