/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class BestSellersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('best_seller_products')
      .select(
        `
        *,
        product:products(
          id, name, base_price, discount_offer,
          images:product_images(id, url, type, "order"),
          variants:product_variants(id, price, color, size, stock, delivery_time_days, assemble_charges, featured)
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async create(productId: string) {
    const { data: product, error: productError } = await this.supabaseService
      .getClient()
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('best_seller_products')
      .insert({ product_id: productId })
      .select(
        `
        *,
        product:products(
          id, name, base_price, discount_offer,
          images:product_images(id, url, type, "order"),
          variants:product_variants(id, price, color, size, stock, delivery_time_days, assemble_charges, featured)
        )
      `,
      )
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('best_seller_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
}