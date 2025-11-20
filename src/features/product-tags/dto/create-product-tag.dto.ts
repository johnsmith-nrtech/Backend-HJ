import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class CreateProductTagDto {
  /**
   * Name of the product tag
   */
  @ApiProperty({
    description: 'Name of the product tag',
    example: 'summer-collection',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50, {
    message: 'Tag name must be between 2 and 50 characters long'
  })
  @Matches(/^[a-zA-Z0-9\-_\s]+$/, {
    message: 'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'
  })
  name: string;
} 