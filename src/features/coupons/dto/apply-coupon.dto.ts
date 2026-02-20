// import { IsString } from 'class-validator';

// export class ApplyCouponDto {
//   @IsString()
//   code: string;
// }

import { IsString } from 'class-validator';

export class ApplyCouponDto {
  @IsString()
  code: string;
}