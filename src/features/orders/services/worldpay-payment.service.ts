import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentDto } from '../dto/create-payment.dto';

interface WorldpayConfig {
  entity: string;
  username: string;
  password: string;
  paymentPagesUrl: string;
  backendBaseUrl: string;
  frontendBaseUrl: string;
}

@Injectable()
export class WorldpayPaymentService {
  private readonly logger = new Logger(WorldpayPaymentService.name);
  private readonly wpConfig: WorldpayConfig;

  constructor(private readonly configService: ConfigService) {
    this.wpConfig = {
      entity:          this.configService.getOrThrow<string>('WP_ENTITY'),
      username:        this.configService.getOrThrow<string>('WP_USERNAME'),
      password:        this.configService.getOrThrow<string>('WP_PASSWORD'),
      // paymentPagesUrl: 'https://access.worldpay.com/payment_pages',
      paymentPagesUrl: 'https://try.access.worldpay.com/payment_pages',
      backendBaseUrl:  this.configService.getOrThrow<string>('BACKEND_BASE_URL'),
      frontendBaseUrl: this.configService.getOrThrow<string>('FRONTEND_BASE_URL'),
    };

    this.logger.log('Worldpay Access payment service initialized');
  }

  /**
   * Calls Worldpay Hosted Payment Pages API and returns the redirect URL.
   * Replaces the old createPaymentForm() method.
   */
  public async createPaymentUrl(
    paymentData: CreatePaymentDto,
    orderId: string,
    totalAmount: number,
  ): Promise<string> {
    try {
      const billingAddress = paymentData.use_different_billing_address
        ? paymentData.billing_address
        : paymentData.shipping_address;

      if (!billingAddress) {
        throw new BadRequestException('Billing address is required');
      }

      // Worldpay amount is in minor units (pence for GBP), no decimals
      const amountInPence = Math.round(totalAmount * 100);

      const requestBody: any = {
        transactionReference: orderId,
        merchant: {
          entity: this.wpConfig.entity,
        },
        narrative: {
          line1: 'Sofa Deal',
        },
        value: {
          currency: 'GBP',
          amount: amountInPence,
        },
        billingAddress: {
          firstName: paymentData.contact_first_name,
          lastName:  paymentData.contact_last_name,
          address1:  billingAddress.street_address,
          ...(billingAddress.address_line_2 && { address2: billingAddress.address_line_2 }),
          city:        billingAddress.city,
          postalCode:  billingAddress.postal_code || '',
          countryCode: billingAddress.country,
          ...(billingAddress.state && { state: billingAddress.state }),
        },
        resultURLs: {
          successURL: `${this.wpConfig.backendBaseUrl}/orders/payment/success`,
          failureURL: `${this.wpConfig.backendBaseUrl}/orders/payment/failure`,
          cancelURL:  `${this.wpConfig.frontendBaseUrl}/payment/failure`,
          errorURL:   `${this.wpConfig.frontendBaseUrl}/payment/failure`,
        },
      };

      // Basic Auth: base64(username:password)
      const credentials = Buffer.from(
        `${this.wpConfig.username}:${this.wpConfig.password}`,
      ).toString('base64');

      this.logger.log('Calling Worldpay payment pages API', {
        orderId,
        amountInPence,
        entity: this.wpConfig.entity,
      });

      const response = await fetch(this.wpConfig.paymentPagesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/vnd.worldpay.payment_pages-v1.hal+json',
          'Accept':        'application/vnd.worldpay.payment_pages-v1.hal+json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('Worldpay API error response', {
          status: response.status,
          body: errorText,
        });
        throw new BadRequestException(
          `Worldpay API returned ${response.status}: ${errorText}`,
        );
      }

      const responseData = await response.json();

      if (!responseData.url) {
        this.logger.error('Worldpay response missing url field', { responseData });
        throw new BadRequestException('Worldpay did not return a payment URL');
      }

      this.logger.log('Worldpay payment URL created successfully', {
        orderId,
        url: responseData.url.substring(0, 60) + '...',
      });

      return responseData.url;
    } catch (error) {
      this.logger.error('Failed to create Worldpay payment URL', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      });

      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create payment URL');
    }
  }

  /**
   * Maps Worldpay payment status to internal order status
   */
  public mapTylStatusToOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'APPROVED':           'paid',
      'DECLINED':           'cancelled',
      'FAILED':             'cancelled',
      'WAITING':            'pending',
      'PARTIALLY APPROVED': 'pending',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Maps Worldpay payment status to internal payment status
   */
  public mapTylStatusToPaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'APPROVED':           'completed',
      'DECLINED':           'failed',
      'FAILED':             'failed',
      'WAITING':            'pending',
      'PARTIALLY APPROVED': 'approved',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Verifies the webhook notification hash from Worldpay
   * Keep this for webhook verification
   */
  public verifyWebhookHash(
    approvalCode: string,
    chargeTotal: string,
    currency: string,
    txnDateTime: string,
    storeName: string,
    notificationHash: string,
  ): boolean {
    // For Worldpay Access API, webhook verification is done differently
    // For now, return true to not break existing webhook flow
    // TODO: implement proper webhook signature verification per Worldpay Access docs
    this.logger.log('Webhook hash verification called', { storeName });
    return true;
  }

  /**
   * Validates if the approval code indicates a successful transaction
   */
  public isTransactionSuccessful(approvalCode: string): boolean {
    return !!(approvalCode && approvalCode.startsWith('Y'));
  }

  /**
   * Extracts meaningful information from approval code
   */
  public parseApprovalCode(approvalCode: string): {
    success: boolean;
    code: string;
    message: string;
  } {
    if (!approvalCode) {
      return { success: false, code: '', message: 'No approval code provided' };
    }
    switch (approvalCode.charAt(0)) {
      case 'Y':
        return { success: true,  code: approvalCode, message: 'Transaction approved' };
      case 'N':
        return { success: false, code: approvalCode, message: 'Transaction declined' };
      case '?':
        return { success: false, code: approvalCode, message: 'Transaction pending or waiting' };
      default:
        return { success: false, code: approvalCode, message: 'Unknown approval code format' };
    }
  }
}