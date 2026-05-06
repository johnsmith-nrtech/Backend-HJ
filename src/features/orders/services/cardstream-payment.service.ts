import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import * as crypto from 'crypto';

@Injectable()
export class CardstreamPaymentService {
  private readonly logger = new Logger(CardstreamPaymentService.name);
  private readonly merchantId: string;
  private readonly gatewayUrl: string;
  private readonly signatureKey: string;
  private readonly currency: string;
  private readonly backendBaseUrl: string;
  private readonly frontendBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.getOrThrow<string>('CARDSTREAM_MERCHANT_ID');
    this.gatewayUrl = this.configService.getOrThrow<string>('CARDSTREAM_GATEWAY_URL');
    this.signatureKey = this.configService.getOrThrow<string>('CARDSTREAM_SIGNATURE_KEY');
    this.currency = this.configService.get<string>('CARDSTREAM_CURRENCY') || 'GBP';
    this.backendBaseUrl = this.configService.getOrThrow<string>('BACKEND_BASE_URL');
    this.frontendBaseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
    this.logger.log('Cardstream payment service initialized');
  }

  /**
   * Generate SHA-512 HMAC signature required by Cardstream
   */
  private generateSignature(fields: Record<string, string>): string {
    const message = Object.keys(fields)
      .sort()
      .filter((k) => k !== 'signature')
      .map((k) => `${k}=${fields[k]}`)
      .join('&') + this.signatureKey;

    return crypto
      .createHash('sha512')
      .update(message)
      .digest('hex');
  }

  /**
   * Build hosted payment form fields and return gateway URL + signed fields
   */
public createPaymentFields(
  paymentData: CreatePaymentDto,
  orderId: string,
  totalAmount: number,
): { gatewayUrl: string; fields: Record<string, string> } {
  const billingAddress = paymentData.use_different_billing_address
    ? paymentData.billing_address
    : paymentData.shipping_address;

  if (!billingAddress) {
    throw new BadRequestException('Billing address is required');
  }

  const amountInPence = Math.round(totalAmount * 100).toString();

  const fields: Record<string, string> = {
    merchantID: this.merchantId,
    action: 'SALE',
    type: '1',
    currency: '826',                    // ← was currencyCode
    amount: amountInPence,
    orderRef: orderId,
    transactionUnique: `${orderId}-${Date.now()}`,
    redirectURL: `${this.backendBaseUrl}/orders/payment/success`,
    callbackURL: `${this.backendBaseUrl}/orders/payment/webhook`,
    // Customer fields — short names
    customerEmail: paymentData.contact_email,
    customerName: `${paymentData.contact_first_name} ${paymentData.contact_last_name}`,
    // Billing address — correct field names
    billingAddress: billingAddress.street_address,   // ← was customerAddress
    billingTown: billingAddress.city,                // ← was customerTown
    billingCounty: billingAddress.state || '',       // ← was customerCounty
    billingPostcode: billingAddress.postal_code || '',// ← was customerPostCode
    billingCountry: billingAddress.country,          // ← was customerCountryCode
    billingPhone: paymentData.contact_phone || '',   // ← was customerPhone
  };

  fields['signature'] = this.generateSignature(fields);

  return {
    gatewayUrl: this.gatewayUrl,
    fields,
  };
}

  /**
   * Verify signature from Cardstream callback/webhook
   */
  public verifySignature(fields: Record<string, string>): boolean {
    const receivedSignature = fields['signature'];
    if (!receivedSignature) return false;
    const expectedSignature = this.generateSignature(fields);
    return receivedSignature === expectedSignature;
  }

  /**
   * Map Cardstream responseCode to order status
   */
  public mapResponseToOrderStatus(responseCode: string): string {
    return responseCode === '0' ? 'paid' : 'cancelled';
  }

  /**
   * Map Cardstream responseCode to payment status
   */
  public mapResponseToPaymentStatus(responseCode: string): string {
    return responseCode === '0' ? 'completed' : 'failed';
  }

  public verifyWebhookHash(...args: any[]): boolean {
    return true; // Cardstream webhook verification — implement later
  }

  public mapTylStatusToPaymentStatus(status: string): string {
    const map: Record<string, string> = {
      'APPROVED': 'completed',
      'DECLINED': 'failed',
      'FAILED': 'failed',
      'WAITING': 'pending',
    };
    return map[status] || 'pending';
  }

  public mapTylStatusToOrderStatus(status: string): string {
    const map: Record<string, string> = {
      'APPROVED': 'paid',
      'DECLINED': 'cancelled',
      'FAILED': 'cancelled',
      'WAITING': 'pending',
    };
    return map[status] || 'pending';
  }
}