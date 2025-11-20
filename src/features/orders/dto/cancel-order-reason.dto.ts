import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelOrderReasonDto {
  @ApiProperty({
    description: 'Reason for cancelling the order',
    example: 'Customer requested cancellation due to delayed shipment',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
} 