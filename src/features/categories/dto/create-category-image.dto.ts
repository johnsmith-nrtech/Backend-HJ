import { ApiProperty } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  ValidateIf
} from 'class-validator';

/**
 * DTO for creating/updating a category image
 * Supports both direct URL input and file uploads
 */
export class CreateCategoryImageDto {
  /**
   * URL or path to the image (required if imageFile is not provided)
   */
  @ApiProperty({
    description: 'URL or path to the image (required if imageFile is not provided)',
    example: 'https://example.com/images/living-room-furniture.jpg',
    required: false
  })
  @IsString()
  @ValidateIf(o => !o.imageFile)
  @IsNotEmpty({ message: 'Either url or imageFile must be provided' })
  url?: string;

  /**
   * Image file for upload to Supabase storage (required if url is not provided)
   */
  @ApiProperty({
    description: 'Image file for upload to Supabase storage (required if url is not provided)',
    type: 'string',
    format: 'binary', 
    required: false
  })
  @ValidateIf(o => !o.url)
  @IsOptional()
  imageFile?: any;
  
  /**
   * Helper method to check if either URL or file is provided
   */
  hasValidInput(): boolean {
    return (this.url !== undefined && this.url !== null && this.url !== '') || 
           (this.imageFile !== undefined && this.imageFile !== null);
  }
} 