// import { IsString, IsEnum, IsNumber, IsUUID, IsDateString, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

// export enum DiscountType {
//   PERCENTAGE = 'percentage',
//   FIXED = 'fixed',
// }

// export class CreateCouponDto {
//   @IsString()
//   code: string;

//   @IsEnum(DiscountType)
//   discount_type: DiscountType;

//   @IsNumber()
//   @Min(0)
//   discount_value: number;

//   @IsString()
//   @IsOptional()
//   assigned_to: string;

//   @IsDateString()
//   expires_at: string;

//   @IsInt()
//   @Min(1)
//   max_uses: number = 1;

//   @IsBoolean()
//   @IsOptional()
//   is_active?: boolean = true;
// }


import { IsString, IsEnum, IsNumber, IsDateString, IsInt, Min, IsOptional, IsBoolean, Length } from 'class-validator';

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export class CreateCouponDto {
  @IsString()
  @Length(3, 20)
  name: string;  // New field for display name

  @IsString()
  @Length(3, 20)
  code: string;

  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsDateString()
  expires_at: string;

  @IsInt()
  @Min(1)
  max_uses: number = 1;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}