import { ApiProperty } from '@nestjs/swagger';

/**
 * Floor entity representing a floor in the system
 */
export class Floor {
  /**
   * Unique identifier for the floor
   */
  @ApiProperty({
    description: 'Unique identifier for the floor',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  id: string;

  /**
   * Name of the floor
   */
  @ApiProperty({
    description: 'Name of the floor',
    example: 'First Floor',
  })
  name: string;

  /**
   * Charges associated with the floor
   */
  @ApiProperty({
    description: 'Charges for using this floor',
    example: 1500,
  })
  charges: number;

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
