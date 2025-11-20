import { IsString, IsOptional, IsNumber, IsUUID, ValidateNested, IsArray, IsBoolean, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

// Level 4 (lowest level)
export class Level4CategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsUrl()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;
}

// Level 3
export class Level3CategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsUrl()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Level4CategoryDto)
  @IsOptional()
  subcategories?: Level4CategoryDto[];
}

// Level 2
export class Level2CategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsUrl()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Level3CategoryDto)
  @IsOptional()
  subcategories?: Level3CategoryDto[];
}

// Level 1 (top level)
export class CreateCategoryHierarchyDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsUrl()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Level2CategoryDto)
  @IsOptional()
  subcategories?: Level2CategoryDto[];
} 