import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LoxaInsurance {
  code: string;
  name: string;
  pricing_type: string;
  inclusive_insurance: boolean;
  insurance_price: number;
  insurance_term: string;
  default_selected: boolean;
  html_content: string;
  insurance_content: any;
  is_base_insurance_product: boolean;
  extension: boolean;
  base_insurance_product_code: string | null;
}

export interface LoxaInsuranceResponse {
  sku: string;
  product_price: number;
  product_title: string;
  insurable: boolean;
  active: boolean;
  integration_type: string;
  insurance_category: string;
  insurances: LoxaInsurance[];
}

export interface LoxaOrderItem {
  sku: string;
  product_title: string;
  product_price: number;
  quantity: number;
  'loxa-insurance-code'?: string;
  'loxa-inclusive-code'?: string;
  insurance_price?: number;
}

export interface LoxaOrderPayload {
  order_id: string;
  contact_email: string;
  contact_first_name: string;
  contact_last_name: string;
  items: LoxaOrderItem[];
}

@Injectable()
export class LoxaService {
  private readonly logger = new Logger(LoxaService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LOXA_API') || '';
    this.baseUrl = this.configService.get<string>('LOXA_BASE_URL') || 'https://api.loxacover.com/test/2026-02';
  }

  private get headers() {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  // ─── Get insurance quote for a product ───────────────────────────────────
  async getInsuranceInfo(
    sku: string,
    productPrice: number,
    productTitle: string,
  ): Promise<LoxaInsuranceResponse | null> {
    try {
      const params = new URLSearchParams({
        sku,
        product_price: productPrice.toString(),
        product_title: productTitle,
      });

      const response = await fetch(
        `${this.baseUrl}/products/insurance-information?${params.toString()}`,
        {
          method: 'GET',
          headers: this.headers,
        },
      );

      if (!response.ok) {
        this.logger.warn(`Loxa insurance info failed: ${response.status} for SKU ${sku}`);
        return null;
      }

      const data = await response.json();

      // Only return if product is insurable and active
      if (!data.insurable || !data.active) {
        this.logger.log(`Product SKU ${sku} is not insurable or not active`);
        return null;
      }

      return data as LoxaInsuranceResponse;
    } catch (error) {
      this.logger.error(`Error fetching Loxa insurance info: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  // ─── Submit order to Loxa ─────────────────────────────────────────────────
  async submitOrder(payload: LoxaOrderPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Loxa order submission failed: ${response.status} - ${errorText}`);
        return false;
      }

      this.logger.log(`Loxa order submitted successfully for order ${payload.order_id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error submitting Loxa order: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // ─── Cancel order in Loxa ─────────────────────────────────────────────────
  async cancelOrder(
    orderId: string,
    cancellationDate: string,
    cancellationReason: string,
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/cancellations`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          cancellation_date: cancellationDate,
          cancellation_reason: cancellationReason,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Loxa cancellation failed: ${response.status} - ${errorText}`);
        return false;
      }

      this.logger.log(`Loxa order ${orderId} cancelled successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Error cancelling Loxa order: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}