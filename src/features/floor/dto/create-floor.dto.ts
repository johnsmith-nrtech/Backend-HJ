import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsNumber, Min } from 'class-validator';

/**
 * Data Transfer Object for creating a new floor
 */
export class CreateFloorDto {
  /**
   * Name of the floor
   */
  @ApiProperty({
    description: 'Name of the floor',
    example: 'First Floor',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /**
   * Charges associated with this floor
   */
  @ApiProperty({
    description: 'Charges for using this floor',
    example: 1500,
    required: true,
  })
  @IsNumber()
  @Min(0)
  charges: number;
}
