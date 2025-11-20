import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsNumber, Min } from 'class-validator';

/**
 * Data Transfer Object for updating an existing floor
 */
export class UpdateFloorDto {
  /**
   * Name of the floor
   */
  @ApiProperty({
    description: 'Name of the floor',
    example: 'First Floor',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  /**
   * Charges associated with this floor
   */
  @ApiProperty({
    description: 'Charges for using this floor',
    example: 1500,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  charges?: number;
}
