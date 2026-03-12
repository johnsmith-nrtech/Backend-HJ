// import { IsNumber, Min, Max, IsOptional, IsIn, IsString } from 'class-validator';

// export class UpdateReferralSettingsDto {
//   @IsNumber()
//   @Min(0)
//   @Max(1000)
//   referrerReward: number;

//   @IsNumber()
//   @Min(0)
//   receiverDiscount: number;

//   @IsString()
//   @IsIn(['percentage', 'fixed'])
//   receiverDiscountType: 'percentage' | 'fixed';

//   @IsNumber()
//   @IsOptional()
//   @Min(0)
//   minOrderAmount?: number;

//   @IsNumber()
//   @IsOptional()
//   @Min(0)
//   maxDiscountAmount?: number;
// }



import { IsNumber, Min, Max, IsOptional, IsIn, IsString } from 'class-validator';

export class UpdateReferralSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(10000)
  referrerReward: number;

  @IsString()
  @IsIn(['percentage', 'fixed'])
  referrerRewardType: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  receiverDiscount: number;

  @IsString()
  @IsIn(['percentage', 'fixed'])
  receiverDiscountType: 'percentage' | 'fixed';

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;
}