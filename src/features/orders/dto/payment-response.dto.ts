import { IsString, IsNumber, IsBoolean, IsOptional, IsObject, IsUUID, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentFormFieldsDto {
  @ApiProperty({ example: '7220542049', description: 'Tyl store name' })
  @IsString()
  storename: string;

  @ApiProperty({ example: 'combinedpage', description: 'Checkout option' })
  @IsString()
  checkoutoption: string;

  @ApiProperty({ example: 'sale', description: 'Transaction type' })
  @IsString()
  txntype: string;

  @ApiProperty({ example: 'Europe/London', description: 'Timezone for transaction' })
  @IsString()
  timezone: string;

  @ApiProperty({ example: '2024:01:15-14:30:00', description: 'Transaction datetime' })
  @IsString()
  txndatetime: string;

  @ApiProperty({ example: 'HMACSHA256', description: 'Hash algorithm used' })
  @IsString()
  hash_algorithm: string;

  @ApiProperty({ example: 'abc123def456...', description: 'Security hash for transaction verification' })
  @IsString()
  hashExtended: string;

  @ApiProperty({ example: '199.99', description: 'Total charge amount' })
  @IsString()
  chargetotal: string;

  @ApiProperty({ example: '826', description: 'Currency code from environment (e.g., 826 for GBP, 840 for USD)' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'http://localhost:3000/payment/success', description: 'Success redirect URL' })
  @IsString()
  responseSuccessURL: string;

  @ApiProperty({ example: 'http://localhost:3000/payment/failure', description: 'Failure redirect URL' })
  @IsString()
  responseFailURL: string;

  @ApiProperty({ example: 'http://localhost:8000/api/payment/webhook', description: 'Webhook notification URL' })
  @IsString()
  transactionNotificationURL: string;

  // Customer and billing information for 3D Secure
  @ApiProperty({ example: 'John Doe', description: 'Customer billing name' })
  @IsString()
  bname: string;

  @ApiProperty({ example: '123 Oxford Street', description: 'Billing address line 1' })
  @IsString()
  baddr1: string;

  @ApiPropertyOptional({ example: 'Flat 4B', description: 'Billing address line 2' })
  @IsOptional()
  @IsString()
  baddr2?: string;

  @ApiProperty({ example: 'London', description: 'Billing city' })
  @IsString()
  bcity: string;

  @ApiPropertyOptional({ example: 'Greater London', description: 'Billing state/province' })
  @IsOptional()
  @IsString()
  bstate?: string;

  @ApiProperty({ example: 'GB', description: 'Billing country code' })
  @IsString()
  bcountry: string;

  @ApiProperty({ example: 'W1C 1DE', description: 'Billing postal code' })
  @IsString()
  bzip: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Customer email' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: '+44 20 7946 0958', description: 'Customer phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'ORD-2024-001', description: 'Order ID for reference' })
  @IsOptional()
  @IsString()
  oid?: string;
}

export class PaymentFormDto {
  @ApiProperty({ example: 'https://test.ipg-online.com/connect/gateway/processing', description: 'Tyl payment gateway URL' })
  @IsString()
  action_url: string;

  @ApiProperty({ example: 'POST', description: 'HTTP method for form submission' })
  @IsString()
  method: string;

  @ApiProperty({ type: PaymentFormFieldsDto, description: 'Form fields to submit to Tyl' })
  @IsObject()
  fields: PaymentFormFieldsDto;
}

export class CreatePaymentResponseDto {
  @ApiProperty({ example: true, description: 'Whether the payment creation was successful' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Generated order ID' })
  @IsUUID(4)
  order_id: string;

  @ApiProperty({ example: 199.99, description: 'Total payment amount (subtotal only for Phase 1)' })
  @IsNumber()
  total_amount: number;

  @ApiProperty({ example: 'GBP', description: 'Payment currency from environment (e.g., GBP, USD, EUR)' })
  @IsString()
  currency: string;

  @ApiProperty({ type: PaymentFormDto, description: 'Payment form data for frontend auto-submission' })
  @IsObject()
  payment_form: PaymentFormDto;

  @ApiPropertyOptional({ example: 'Invalid variant ID provided', description: 'Error message if creation failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class WebhookNotificationDto {
  @ApiProperty({ example: 'Y:123456:APPROVED', description: 'Approval code from Tyl' })
  @IsString()
  approval_code: string;

  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Order ID' })
  @IsString()
  oid: string;

  @ApiProperty({ example: 'TYL123456789', description: 'Tyl reference number' })
  @IsString()
  refnumber: string;

  @ApiProperty({ 
    example: 'APPROVED', 
    description: 'Transaction status',
    enum: ['APPROVED', 'DECLINED', 'FAILED', 'WAITING', 'PARTIALLY APPROVED']
  })
  @IsIn(['APPROVED', 'DECLINED', 'FAILED', 'WAITING', 'PARTIALLY APPROVED'])
  status: string;

  @ApiProperty({ example: '199.99', description: 'Charge total amount' })
  @IsString()
  chargetotal: string;

  @ApiProperty({ example: '826', description: 'Currency code from environment (e.g., 826 for GBP, 840 for USD)' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '2024:01:15-14:30:00', description: 'Transaction datetime' })
  @IsString()
  txndatetime: string;

  @ApiProperty({ example: '7220542049', description: 'Store name' })
  @IsString()
  storename: string;

  @ApiProperty({ example: 'abc123def456...', description: 'Notification hash for verification' })
  @IsString()
  notification_hash: string;

  @ApiPropertyOptional({ example: '2024-01-15T14:30:00.000Z', description: 'When transaction was processed' })
  @IsOptional()
  @IsDateString()
  txndate_processed?: string;

  @ApiPropertyOptional({ example: 'TYL987654321', description: 'IPG transaction ID' })
  @IsOptional()
  @IsString()
  ipgTransactionId?: string;

  @ApiPropertyOptional({ example: 'Insufficient funds', description: 'Failure reason if declined' })
  @IsOptional()
  @IsString()
  fail_reason?: string;

  @ApiPropertyOptional({ example: '05', description: 'Processor response code' })
  @IsOptional()
  @IsString()
  processor_response_code?: string;

  @ApiPropertyOptional({ example: 'VISA', description: 'Card brand used for payment' })
  @IsOptional()
  @IsString()
  ccbrand?: string;

  @ApiPropertyOptional({ example: '123456', description: 'Card issuer BIN' })
  @IsOptional()
  @IsString()
  ccbin?: string;

  @ApiPropertyOptional({ example: 'GBR', description: 'Cardholder country code' })
  @IsOptional()
  @IsString()
  cccountry?: string;
} 