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
    this.logger.log(`Signature key loaded: "${this.signatureKey}"`);
  }

  /**
   * Generate signature required by Cardstream
   */
  private generateSignature(fields: Record<string, string>): string {
    const sortedKeys = Object.keys(fields)
      .sort()
      .filter((k) => k !== 'signature');

    // ✅ Step 2: URL encode like http_build_query (spaces = +)
    const message = sortedKeys
      .map((k) => {
        const encodedKey = encodeURIComponent(k).replace(/%20/g, '+');
        const encodedVal = encodeURIComponent(fields[k]).replace(/%20/g, '+');
        return `${encodedKey}=${encodedVal}`;
      })
      .join('&');

    // ✅ Step 3: Normalize line endings (replace %0D%0A, %0A%0D, %0D with %0A)
    const normalized = message
      .replace(/%0D%0A/gi, '%0A')
      .replace(/%0A%0D/gi, '%0A')
      .replace(/%0D/gi, '%0A');

    // ✅ Step 4: Append signature key
    const finalMessage = normalized + this.signatureKey;

    // ✅ Step 5: SHA512 hash
    return crypto
      .createHash('sha512')
      .update(finalMessage)
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
    currency: '826',
    amount: amountInPence,
    orderRef: orderId,
    transactionUnique: `${orderId}-${Date.now()}`,
    redirectURL: `${this.backendBaseUrl}/orders/payment/success`,
    callbackURL: `${this.backendBaseUrl}/orders/payment/webhook`,
    customerEmail: paymentData.contact_email,
    customerName: `${paymentData.contact_first_name} ${paymentData.contact_last_name}`,
    billingAddress: billingAddress.street_address,
    billingTown: billingAddress.city,
    billingCounty: billingAddress.state || '',
    billingPostcode: billingAddress.postal_code || '',
    billingCountry: billingAddress.country,
    billingPhone: paymentData.contact_phone || '',
  };

  Object.keys(fields).forEach((key) => {
    if (fields[key] === '' || fields[key] === null || fields[key] === undefined) {
      delete fields[key];
    }
  });

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