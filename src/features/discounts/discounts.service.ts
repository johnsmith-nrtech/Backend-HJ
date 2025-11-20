import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { Discount, DiscountType } from './entities/discount.entity';
import { PostgrestError } from '@supabase/supabase-js';

@Injectable()
export class DiscountsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Create a new discount
   */
  async create(createDiscountDto: CreateDiscountDto): Promise<Discount> {
    const supabase = this.supabaseService.getClient();
    
    // Check if code already exists (if provided)
    if (createDiscountDto.code) {
      const { data: existingDiscount } = await supabase
        .from('discounts')
        .select('id')
        .eq('code', createDiscountDto.code)
        .maybeSingle();
      
      if (existingDiscount) {
        throw new ConflictException(`Discount with code '${createDiscountDto.code}' already exists`);
      }
    }
    
    // Insert the new discount
    const { data, error } = await supabase
      .from('discounts')
      .insert({
        name: createDiscountDto.name,
        code: createDiscountDto.code,
        type: createDiscountDto.type,
        value: createDiscountDto.value,
        start_date: createDiscountDto.start_date,
        end_date: createDiscountDto.end_date,
        is_active: createDiscountDto.is_active ?? true,
        min_order_amount: createDiscountDto.min_order_amount,
        max_discount_amount: createDiscountDto.max_discount_amount,
        usage_limit: createDiscountDto.usage_limit,
        usage_count: 0
      })
      .select('*')
      .single();
    
    if (error) {
      this.handleSupabaseError(error);
    }
    
    return data as Discount;
  }

  /**
   * Find all discounts with optional filtering
   */
  async findAll(params: {
    active?: boolean;
    search?: string;
    type?: DiscountType;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: Discount[]; total: number }> {
    const { active, search, type, limit = 20, offset = 0 } = params;
    const supabase = this.supabaseService.getClient();
    
    let query = supabase.from('discounts').select('*', { count: 'exact' });
    
    // Apply filters if provided
    if (active !== undefined) {
      query = query.eq('is_active', active);
    }
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      this.handleSupabaseError(error);
    }
    
    return {
      items: (data || []) as Discount[],
      total: count || 0
    };
  }

  /**
   * Find a discount by ID
   */
  async findOne(id: string): Promise<Discount> {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('discounts')
      .select(`
        *,
        categories:category_discounts(category_id),
        products:product_discounts(product_id),
        variants:variant_discounts(variant_id)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Discount with ID ${id} not found`);
      }
      this.handleSupabaseError(error);
    }
    
    // Cleanup the related entities to match the entity format
    const discount = data as Discount;
    
    if (discount.categories) {
      discount.categories = (discount.categories as any[]).map(item => item.category_id);
    }
    
    if (discount.products) {
      discount.products = (discount.products as any[]).map(item => item.product_id);
    }
    
    if (discount.variants) {
      discount.variants = (discount.variants as any[]).map(item => item.variant_id);
    }
    
    return discount;
  }

  /**
   * Find a discount by code
   */
  async findByCode(code: string): Promise<Discount | null> {
    const supabase = this.supabaseService.getClient();
    
    const { data, error } = await supabase
      .from('discounts')
      .select(`
        *,
        categories:category_discounts(category_id),
        products:product_discounts(product_id),
        variants:variant_discounts(variant_id)
      `)
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      this.handleSupabaseError(error);
    }
    
    if (!data) return null;
    
    // Cleanup the related entities
    const discount = data as Discount;
    
    if (discount.categories) {
      discount.categories = (discount.categories as any[]).map(item => item.category_id);
    }
    
    if (discount.products) {
      discount.products = (discount.products as any[]).map(item => item.product_id);
    }
    
    if (discount.variants) {
      discount.variants = (discount.variants as any[]).map(item => item.variant_id);
    }
    
    return discount;
  }

  /**
   * Update a discount by ID
   */
  async update(id: string, updateDiscountDto: UpdateDiscountDto): Promise<Discount> {
    const supabase = this.supabaseService.getClient();
    
    // Check if discount exists
    const { data: existingDiscount, error: findError } = await supabase
      .from('discounts')
      .select('id')
      .eq('id', id)
      .maybeSingle();
      
    if (findError) {
      this.handleSupabaseError(findError);
    }
    
    if (!existingDiscount) {
      throw new NotFoundException(`Discount with ID ${id} not found`);
    }
    
    // Check for code uniqueness if code is being updated
    if (updateDiscountDto.code) {
      const { data: codeExists } = await supabase
        .from('discounts')
        .select('id')
        .eq('code', updateDiscountDto.code)
        .neq('id', id)
        .maybeSingle();
        
      if (codeExists) {
        throw new ConflictException(`Discount with code '${updateDiscountDto.code}' already exists`);
      }
    }
    
    // Update the discount
    const { data, error } = await supabase
      .from('discounts')
      .update({
        ...updateDiscountDto,
        updated_at: new Date()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      this.handleSupabaseError(error);
    }
    
    return data as Discount;
  }

  /**
   * Remove a discount by ID
   */
  async remove(id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // Check if discount exists
    const { data: existingDiscount, error: findError } = await supabase
      .from('discounts')
      .select('id')
      .eq('id', id)
      .maybeSingle();
      
    if (findError) {
      this.handleSupabaseError(findError);
    }
    
    if (!existingDiscount) {
      throw new NotFoundException(`Discount with ID ${id} not found`);
    }
    
    // Delete the discount
    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', id);
      
    if (error) {
      this.handleSupabaseError(error);
    }
  }

  /**
   * Apply a discount to categories
   */
  async applyToCategories(discountId: string, categoryIds: string[]): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // First validate discount exists
    await this.findOne(discountId);
    
    // Prepare data for insertion
    const categoryDiscounts = categoryIds.map(categoryId => ({
      discount_id: discountId,
      category_id: categoryId
    }));
    
    // Insert relationships
    const { error } = await supabase
      .from('category_discounts')
      .upsert(categoryDiscounts, { onConflict: 'discount_id,category_id' });
      
    if (error) {
      this.handleSupabaseError(error);
    }
  }

  /**
   * Apply a discount to products
   */
  async applyToProducts(discountId: string, productIds: string[]): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // First validate discount exists
    await this.findOne(discountId);
    
    // Prepare data for insertion
    const productDiscounts = productIds.map(productId => ({
      discount_id: discountId,
      product_id: productId
    }));
    
    // Insert relationships
    const { error } = await supabase
      .from('product_discounts')
      .upsert(productDiscounts, { onConflict: 'discount_id,product_id' });
      
    if (error) {
      this.handleSupabaseError(error);
    }
  }

  /**
   * Apply a discount to variants
   */
  async applyToVariants(discountId: string, variantIds: string[]): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    // First validate discount exists
    await this.findOne(discountId);
    
    // Prepare data for insertion
    const variantDiscounts = variantIds.map(variantId => ({
      discount_id: discountId,
      variant_id: variantId
    }));
    
    // Insert relationships
    const { error } = await supabase
      .from('variant_discounts')
      .upsert(variantDiscounts, { onConflict: 'discount_id,variant_id' });
      
    if (error) {
      this.handleSupabaseError(error);
    }
  }

  /**
   * Validate if a discount is currently applicable
   */
  async validateDiscount(discountId: string): Promise<{ valid: boolean; message?: string }> {
    const discount = await this.findOne(discountId);
    
    // Check if discount is active
    if (!discount.is_active) {
      return { valid: false, message: 'Discount is not active' };
    }
    
    // Check date validity
    const now = new Date();
    
    if (discount.start_date && new Date(discount.start_date) > now) {
      return { valid: false, message: 'Discount has not started yet' };
    }
    
    if (discount.end_date && new Date(discount.end_date) < now) {
      return { valid: false, message: 'Discount has expired' };
    }
    
    // Check usage limit
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return { valid: false, message: 'Discount usage limit reached' };
    }
    
    return { valid: true };
  }

  /**
   * Increment the usage count for a discount
   */
  async incrementUsageCount(discountId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    const { error } = await supabase.rpc('increment_discount_usage', {
      discount_id: discountId
    });
    
    if (error) {
      this.handleSupabaseError(error);
    }
  }

  /**
   * Helper method to handle Supabase errors
   */
  private handleSupabaseError(error: PostgrestError): never {
    if (error.code === 'PGRST116') {
      throw new NotFoundException('Resource not found');
    } else if (error.code === '23505') {
      throw new ConflictException('Duplicate entry');
    } else if (error.code === '23503') {
      throw new BadRequestException('Referenced resource does not exist');
    } else {
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }
} 