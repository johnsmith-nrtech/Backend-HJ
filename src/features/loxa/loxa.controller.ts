import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { LoxaService } from './loxa.service';

@Controller('loxa')
export class LoxaController {
  constructor(private readonly loxaService: LoxaService) {}

  // ─── Public: Get insurance info for a product ─────────────────────────────
  // Frontend calls this — API key never exposed to browser
  @Get('insurance')
  async getInsuranceInfo(
    @Query('sku') sku: string,
    @Query('price') price: string,
    @Query('title') title: string,
  ) {
    if (!sku || !price || !title) {
      throw new BadRequestException('sku, price and title are required');
    }

    const productPrice = parseFloat(price);
    if (isNaN(productPrice)) {
      throw new BadRequestException('price must be a valid number');
    }

    const result = await this.loxaService.getInsuranceInfo(sku, productPrice, title);

    // Return empty response if not insurable — frontend checks this
    if (!result) {
      return { insurable: false, active: false, insurances: [] };
    }

    return result;
  }
}