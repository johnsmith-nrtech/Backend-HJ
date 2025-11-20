import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEnum, 
  IsInt, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  Min,
  ValidateIf,
  IsArray
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating new product images
 * Supports both direct URL input and multiple file uploads
 */
export class CreateImageDto {
  /**
   * URL or path to the image (optional - for direct URL uploads)
   */
  @ApiProperty({
    description: 'URL or path to the image (optional - for direct URL uploads)',
    example: 'https://example.com/images/sofa1.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  url?: string;

  /**
   * Image files for upload to Supabase storage (for multiple file uploads)
   * Supports multiple file uploads
   */
  @ApiProperty({
    description: 'Image files for upload to Supabase storage (for multiple file uploads)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary'
    },
    required: false
  })
  @IsOptional()
  @IsArray()
  imageFiles?: any[];

  /**
   * Single image file for upload (for single file uploads)
   * Use this for single file uploads via /image endpoint
   */
  @ApiProperty({
    description: 'Single image file for upload (for single file uploads)',
    type: 'string',
    format: 'binary', 
    required: false
  })
  @IsOptional()
  imageFile?: any;

  /**
   * Image type ('main', 'gallery', or '360')
   */
  @ApiProperty({
    description: "Image type ('main', 'gallery', or '360')",
    example: 'main',
    enum: ['main', 'gallery', '360'],
    default: 'gallery',
  })
  @IsEnum(['main', 'gallery', '360'])
  type: 'main' | 'gallery' | '360' = 'gallery';

  /**
   * Starting order for images (optional - will auto-calculate based on existing images if not provided)
   */
  @ApiProperty({
    description: 'Starting order for images (optional - will auto-calculate based on existing images if not provided)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;
  
  /**
   * Helper method to get all files as array
   */
  getAllFiles(): any[] {
    const files: any[] = [];
    
    // Add imageFiles if present
    if (this.imageFiles && Array.isArray(this.imageFiles)) {
      files.push(...this.imageFiles);
    }
    
    // Add single imageFile if present (for backward compatibility)
    if (this.imageFile) {
      files.push(this.imageFile);
    }
    
    return files;
  }
} 