import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsIn,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentResponseDto {
  @ApiProperty({ example: true, description: 'Whether the payment creation was successful' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Generated order ID' })
  @IsUUID(4)
  order_id: string;

  @ApiProperty({ example: 199.99, description: 'Total payment amount' })
  @IsNumber()
  total_amount: number;

  @ApiProperty({ example: 'GBP', description: 'Payment currency' })
  @IsString()
  currency: string;

  @ApiProperty({
    example: 'https://payments.worldpay.com/app/hpp/integration/transaction/xxx',
    description: 'Worldpay hosted payment page URL — redirect customer here',
  })
  @IsString()
  payment_url: string;

  @ApiPropertyOptional({ example: 'Invalid variant ID provided', description: 'Error message if creation failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Signed fields for POST form submission to Cardstream' })
  @IsOptional()
  payment_fields?: Record<string, string>;
}

export class WebhookNotificationDto {
  @ApiProperty({ example: 'Y:123456:APPROVED', description: 'Approval code from Worldpay' })
  @IsString()
  approval_code: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Order ID' })
  @IsString()
  oid: string;

  @ApiProperty({ example: 'WP123456789', description: 'Worldpay reference number' })
  @IsString()
  refnumber: string;

  @ApiProperty({
    example: 'APPROVED',
    description: 'Transaction status',
    enum: ['APPROVED', 'DECLINED', 'FAILED', 'WAITING', 'PARTIALLY APPROVED'],
  })
  @IsIn(['APPROVED', 'DECLINED', 'FAILED', 'WAITING', 'PARTIALLY APPROVED'])
  status: string;

  @ApiProperty({ example: '199.99', description: 'Charge total amount' })
  @IsString()
  chargetotal: string;

  @ApiProperty({ example: '826', description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '2024:01:15-14:30:00', description: 'Transaction datetime' })
  @IsString()
  txndatetime: string;

  @ApiProperty({ example: 'B1mhTDDzFezikcJR', description: 'Store name' })
  @IsString()
  storename: string;

  @ApiProperty({ example: 'abc123def456...', description: 'Notification hash for verification' })
  @IsString()
  notification_hash: string;

  @ApiPropertyOptional({ example: '2024-01-15T14:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  txndate_processed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ipgTransactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fail_reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  processor_response_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ccbrand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ccbin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cccountry?: string;
}

// Kept as empty classes so any existing imports elsewhere do not break
export class PaymentFormFieldsDto {}
export class PaymentFormDto {}