import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateReferralSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(1000)
  referrerReward: number;  // In pounds

  @IsNumber()
  @Min(0)
  @Max(100)
  receiverDiscount: number;  // In percentage

  @IsNumber()
  @IsOptional()
  @Min(0)
  minOrderAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;
}