import { ApiProperty } from '@nestjs/swagger';

/**
 * Zone entity representing a delivery zone in the system
 */
export class Zone {
  /**
   * Unique identifier for the zone
   */
  @ApiProperty({
    description: 'Unique identifier for the zone',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  id: string;

  /**
   * Name of the zone
   */
  @ApiProperty({
    description: 'Name of the zone',
    example: 'North Zone',
  })
  zone_name: string;

  /**
   * List of zip codes in this zone
   */
  @ApiProperty({
    description: 'Array of zip codes for this zone',
    example: ['10001', '10002', '10003'],
    type: [String],
  })
  zip_codes: string[];

  /**
   * Delivery charges for this zone
   */
  @ApiProperty({
    description: 'Delivery charges for this zone',
    example: 150,
    type: Number,
  })
  delivery_charges: number;

  /**
   * Creation timestamp
   */
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  created_at: Date;

  /**
   * Last update timestamp
   */
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  updated_at: Date;
}
