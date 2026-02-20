import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  private get supabaseAdmin() {
    return this.supabaseService.getAdminClient();
  }

  // Admin: Create coupon
  async create(createCouponDto: CreateCouponDto, adminId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .insert({
        ...createCouponDto,
        created_by: adminId,
        used_count: 0, // Initialize used_count
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Admin: Get all coupons
  async findAll() {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Admin: Get single coupon
  async findOne(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Coupon not found');
    return data;
  }

  // Admin: Update coupon
  async update(id: string, updateCouponDto: UpdateCouponDto) {
    // Check if coupon exists
    await this.findOne(id);

    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .update({ 
        ...updateCouponDto, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Admin: Delete coupon
  async remove(id: string) {
    const { error } = await this.supabaseAdmin
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Coupon deleted successfully' };
  }

  // User: Get available coupons (global now - no user assignment)
  async findAvailableCoupons(userId?: string) {
    const query = this.supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .lt('used_count', 'max_uses');

    // Optional: You could still track which coupons user has used
    // but not limit by assignment

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Apply coupon - global access for any user
  async applyCoupon(userId: string | undefined, applyCouponDto: ApplyCouponDto) {
    const { code } = applyCouponDto;
    
    // Find the coupon by code - no user restriction
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !data) throw new NotFoundException('Invalid or expired coupon');

    // Check if coupon has reached max uses
    if (data.used_count >= data.max_uses) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }

    // Optional: Track that this user used this coupon
    // You could create a coupon_usage table to track per user

    return data;
  }

  async incrementUsedCount(id: string) {
  console.log('🔥 INCREMENT CALLED FOR ID:', id);
  
  // First fetch current value
  const { data: coupon, error: fetchError } = await this.supabaseAdmin
    .from('coupons')
    .select('used_count')
    .eq('id', id)
    .single();

  if (fetchError || !coupon) {
    throw new BadRequestException('Coupon not found');
  }

  console.log('📊 Current used_count:', coupon.used_count);

  const { error } = await this.supabaseAdmin
    .from('coupons')
    .update({ 
      used_count: (coupon.used_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw new BadRequestException(error.message);
  
  console.log('✅ used_count incremented to:', (coupon.used_count || 0) + 1);
}

  // Validate coupon without applying
  async validateCoupon(code: string) {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .lt('used_count', 'max_uses')
      .single();

    if (error || !data) return null;
    return data;
  }
}