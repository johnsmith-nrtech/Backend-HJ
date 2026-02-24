import { IsEmail } from 'class-validator';

export class AssignCouponDto {
  @IsEmail()
  email: string;
}