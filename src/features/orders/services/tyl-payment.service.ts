import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CreatePaymentDto, AddressDto } from '../dto/create-payment.dto';
import { PaymentFormDto, PaymentFormFieldsDto } from '../dto/payment-response.dto';

interface TylConfig {
  storeName: string;
  sharedSecret: string;
  baseUrl: string;
  paymentUrl: string;
}

interface PaymentParams {
  storename: string;
  checkoutoption: string;
  txntype: string;
  timezone: string;
  txndatetime: string;
  hash_algorithm: string;
  chargetotal: string;
  currency: string;
  responseSuccessURL: string;
  responseFailURL: string;
  transactionNotificationURL: string;
  bname: string;
  baddr1: string;
  baddr2?: string;
  bcity: string;
  bstate?: string;
  bcountry: string;
  bzip: string;
  email: string;
  phone?: string;
  oid?: string;
}

@Injectable()
export class TylPaymentService {
  private readonly logger = new Logger(TylPaymentService.name);
  private readonly tylConfig: TylConfig;

  constructor(private readonly configService: ConfigService) {
    this.tylConfig = {
      storeName: this.configService.getOrThrow<string>('TYL_STORE_NAME'),
      sharedSecret: this.configService.getOrThrow<string>('TYL_SHARED_SECRET'),
      baseUrl: this.configService.getOrThrow<string>('TYL_BASE_URL'),
      paymentUrl: this.configService.getOrThrow<string>('TYL_PAYMENT_URL'),
    };

    this.validateConfig();
  }

  /**
   * Validates the Tyl configuration on service initialization
   */
  private validateConfig(): void {
    const requiredFields = ['storeName', 'sharedSecret', 'baseUrl', 'paymentUrl'];
    const missingFields = requiredFields.filter(field => !this.tylConfig[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required Tyl configuration: ${missingFields.join(', ')}`);
    }

    this.logger.log('Tyl payment service initialized successfully');
  }

  /**
   * Generates a timestamp in Tyl's required format (YYYY:MM:DD-HH:mm:ss)
   */
  private generateTylTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}:${month}:${day}-${hours}:${minutes}:${seconds}`;
  }

  /**
   * Generates the extended hash for Tyl payment form
   * Following Tyl's specification for hash calculation
   */
  private generateExtendedHash(params: PaymentParams): string {
    try {
      // Sort parameters alphabetically (ASCII order, uppercase before lowercase)
      const sortedKeys = Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== null && params[key] !== '')
        .sort();

      // Create hash string by joining parameter values with pipe separator
      const hashString = sortedKeys
        .map(key => params[key])
        .join('|');

      this.logger.debug('Hash string created for Tyl payment', { 
        paramCount: sortedKeys.length,
        // Don't log the actual hash string for security
      });

      // Generate HMAC-SHA256 hash
      const hmac = crypto.createHmac('sha256', this.tylConfig.sharedSecret);
      hmac.update(hashString);
      const hash = hmac.digest('base64');

      return hash;
    } catch (error) {
      this.logger.error('Failed to generate extended hash', { error: error.message });
      throw new BadRequestException('Failed to generate payment security hash');
    }
  }

  /**
   * Verifies the webhook notification hash from Tyl
   * According to Tyl docs: chargetotal + sharedsecret + currency + txndatetime + storename + approval_code
   */
  public verifyWebhookHash(
    approvalCode: string,
    chargeTotal: string,
    currency: string,
    txnDateTime: string,
    storeName: string,
    notificationHash: string,
  ): boolean {
    try {
      // Tyl webhook hash format per documentation: chargetotal + sharedsecret + currency + txndatetime + storename + approval_code
      const hashString = `${chargeTotal}${this.tylConfig.sharedSecret}${currency}${txnDateTime}${storeName}${approvalCode}`;
      
      this.logger.debug('Verifying webhook hash', {
        storeName,
        approvalCodePrefix: approvalCode.substring(0, 10),
      });
      
      const hmac = crypto.createHmac('sha256', this.tylConfig.sharedSecret);
      hmac.update(hashString);
      const expectedHash = hmac.digest('base64');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedHash, 'base64'),
        Buffer.from(notificationHash, 'base64')
      );

      if (!isValid) {
        this.logger.warn('Webhook hash verification failed', {
          storeName,
          approvalCode: approvalCode.substring(0, 10) + '...',
        });
      } else {
        this.logger.log('Webhook hash verification successful', {
          storeName,
          approvalCode: approvalCode.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying webhook hash', { 
        error: error.message,
        approvalCode: approvalCode?.substring(0, 10) + '...',
        storeName,
      });
      return false;
    }
  }

  /**
   * Creates payment form data for frontend submission to Tyl
   */
  public createPaymentForm(
    paymentData: CreatePaymentDto,
    orderId: string,
    totalAmount: number,
  ): PaymentFormDto {
    try {
      const frontendBaseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
      const backendBaseUrl = this.configService.getOrThrow<string>('BACKEND_BASE_URL');

      // Use billing address if provided, otherwise use shipping address
      const billingAddress = paymentData.use_different_billing_address 
        ? paymentData.billing_address 
        : paymentData.shipping_address;

      if (!billingAddress) {
        throw new BadRequestException('Billing address is required');
      }

      const txnDateTime = this.generateTylTimestamp();

      // Prepare payment parameters
      const paymentParams: PaymentParams = {
        storename: this.tylConfig.storeName,
        checkoutoption: 'combinedpage',
        txntype: 'sale',
        timezone: 'Europe/London',
        txndatetime: txnDateTime,
        hash_algorithm: 'HMACSHA256',
        chargetotal: totalAmount.toFixed(2),
        currency: this.configService.get<string>('CURRENCY_ISO_CODE') || '826', // Get currency ISO code from env or default to GBP (826)
        responseSuccessURL: `${backendBaseUrl}/orders/payment/success`,
        responseFailURL: `${backendBaseUrl}/orders/payment/failure`,
        transactionNotificationURL: `${backendBaseUrl}/orders/payment/webhook`,
        // Customer and billing information for 3D Secure
        bname: `${paymentData.contact_first_name} ${paymentData.contact_last_name}`,
        baddr1: billingAddress.street_address,
        baddr2: billingAddress.address_line_2,
        bcity: billingAddress.city,
        bstate: billingAddress.state,
        bcountry: billingAddress.country,
        bzip: billingAddress.postal_code,
        email: paymentData.contact_email,
        phone: paymentData.contact_phone,
        oid: orderId,
      };

      // Generate security hash
      const hashExtended = this.generateExtendedHash(paymentParams);

      // Create form fields DTO
      const formFields: PaymentFormFieldsDto = {
        storename: paymentParams.storename,
        checkoutoption: paymentParams.checkoutoption,
        txntype: paymentParams.txntype,
        timezone: paymentParams.timezone,
        txndatetime: paymentParams.txndatetime,
        hash_algorithm: paymentParams.hash_algorithm,
        hashExtended,
        chargetotal: paymentParams.chargetotal,
        currency: paymentParams.currency,
        responseSuccessURL: paymentParams.responseSuccessURL,
        responseFailURL: paymentParams.responseFailURL,
        transactionNotificationURL: paymentParams.transactionNotificationURL,
        bname: paymentParams.bname,
        baddr1: paymentParams.baddr1,
        baddr2: paymentParams.baddr2,
        bcity: paymentParams.bcity,
        bstate: paymentParams.bstate,
        bcountry: paymentParams.bcountry,
        bzip: paymentParams.bzip,
        email: paymentParams.email,
        phone: paymentParams.phone,
        oid: paymentParams.oid,
      };

      const paymentForm: PaymentFormDto = {
        action_url: this.tylConfig.paymentUrl,
        method: 'POST',
        fields: formFields,
      };

      this.logger.log('Payment form created successfully', {
        orderId,
        amount: totalAmount,
        currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
      });

      return paymentForm;
    } catch (error) {
      this.logger.error('Failed to create payment form', {
        error: error.message,
        orderId,
        amount: totalAmount,
      });
      throw new BadRequestException('Failed to create payment form');
    }
  }

  /**
   * Maps Tyl payment status to our internal order status
   */
  public mapTylStatusToOrderStatus(tylStatus: string): string {
    const statusMap = {
      'APPROVED': 'paid',
      'DECLINED': 'cancelled',
      'FAILED': 'cancelled',
      'WAITING': 'pending',
      'PARTIALLY APPROVED': 'pending', // Handle partial approval in future
    };

    return statusMap[tylStatus] || 'pending';
  }

  /**
   * Maps Tyl payment status to our internal payment status
   */
  public mapTylStatusToPaymentStatus(tylStatus: string): string {
    const statusMap = {
      'APPROVED': 'completed',
      'DECLINED': 'failed',
      'FAILED': 'failed',
      'WAITING': 'pending',
      'PARTIALLY APPROVED': 'approved', // Special status for partial approval
    };

    return statusMap[tylStatus] || 'pending';
  }

  /**
   * Validates if the approval code indicates a successful transaction
   */
  public isTransactionSuccessful(approvalCode: string): boolean {
    return !!(approvalCode && approvalCode.startsWith('Y'));
  }

  /**
   * Extracts meaningful information from Tyl approval code
   */
  public parseApprovalCode(approvalCode: string): { success: boolean; code: string; message: string } {
    if (!approvalCode) {
      return { success: false, code: '', message: 'No approval code provided' };
    }

    const firstChar = approvalCode.charAt(0);
    
    switch (firstChar) {
      case 'Y':
        return { success: true, code: approvalCode, message: 'Transaction approved' };
      case 'N':
        return { success: false, code: approvalCode, message: 'Transaction declined' };
      case '?':
        return { success: false, code: approvalCode, message: 'Transaction pending or waiting' };
      default:
        return { success: false, code: approvalCode, message: 'Unknown approval code format' };
    }
  }
} 