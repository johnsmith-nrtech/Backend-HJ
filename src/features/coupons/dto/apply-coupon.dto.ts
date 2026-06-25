import { IsString, IsEmail, IsOptional } from 'class-validator';

export class ApplyCouponDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsEmail()
  guest_email?: string;
}