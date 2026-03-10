import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsArray,
  IsUUID,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateBundleDto {
  @IsString()
  bundlename: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  productIds: any;

  @IsNumber()
  @Min(0)
  bundleprice: number;

  @IsOptional()
  @IsString()
  @IsIn(['percentage', 'fixed'])
  discount_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_value?: number;

  @IsOptional()
  @IsString()
  bundlestatus?: string;

  @IsOptional()
  @IsString()
  bundleimage?: string;
}