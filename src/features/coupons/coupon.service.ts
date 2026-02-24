import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { AssignCouponDto } from './dto/assign-coupon.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class CouponService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  private get supabaseAdmin() {
    return this.supabaseService.getAdminClient();
  }

  // ─── Admin: Create coupon ─────────────────────────────────────────────────
  async create(createCouponDto: CreateCouponDto, adminId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .insert({
        ...createCouponDto,
        created_by: adminId,
        used_count: 0,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Admin: Get all coupons ───────────────────────────────────────────────
  async findAll() {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Admin: Get single coupon ─────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Coupon not found');
    return data;
  }

  // ─── Admin: Update coupon ─────────────────────────────────────────────────
  async update(id: string, updateCouponDto: UpdateCouponDto) {
    await this.findOne(id);

    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .update({
        ...updateCouponDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Admin: Delete coupon ─────────────────────────────────────────────────
  async remove(id: string) {
    const { error } = await this.supabaseAdmin
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Coupon deleted successfully' };
  }



  async assignCoupon(id: string, assignCouponDto: AssignCouponDto) {
    const { email } = assignCouponDto;

    // 1. Fetch the coupon
    const coupon = await this.findOne(id);

    // 2. Look up user in Supabase auth
    const { data: usersData, error: userError } =
      await this.supabaseAdmin.auth.admin.listUsers();

      if (userError) throw new BadRequestException('Failed to look up users');

      const matchedUser = usersData?.users?.find((u) => u.email === email);

    // 3. Block if user not found in auth
    if (!matchedUser) {
      throw new BadRequestException(
        `No registered user found with email: ${email}`,
      );
    }

    // 4. Update coupon with assigned user info
    const { data: updated, error: updateError } = await this.supabaseAdmin
    .from('coupons')
    .update({
      assigned_to_email: email,
      assigned_to_user_id: matchedUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

    if (updateError) throw new BadRequestException(updateError.message);

    // 5. Send email — non-blocking
    try {
      await this.mailService.sendCouponEmail({
        recipientEmail: email,
        recipientName:
          matchedUser.user_metadata?.full_name ||
          matchedUser.user_metadata?.name ||
          email.split('@')[0],
        couponName: coupon.name,
        couponCode: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        expiresAt: coupon.expires_at,
      });
    } catch (emailError) {
      console.error('Failed to send coupon email (non-critical):', emailError);
    }

    return {
      message: `Coupon assigned and email sent to ${email}`,
      coupon: updated,
    };
  }

  // ─── User: Get available coupons ──────────────────────────────────────────
  async findAvailableCoupons(userId?: string) {
    const { data, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    // Filter out coupons that have reached max_uses
    return (data || []).filter((c) => c.used_count < c.max_uses);
  }

  // ─── User: Apply coupon ───────────────────────────────────────────────────
  // Validates the coupon and, if it was assigned to another user (user A),
  // grants user A a 5% referral credit on their profile.
  async applyCoupon(
    userId: string | undefined,
    applyCouponDto: ApplyCouponDto,
  ) {
    const { code } = applyCouponDto;

    // 1. Find valid coupon
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !data) throw new NotFoundException('Invalid or expired coupon');

    if (data.used_count >= data.max_uses) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }

    // 2. Referral credit: if coupon was assigned to user A and user B (different
    //    user) is now using it, give user A a 5% referral credit
    const assignedUserId = data.assigned_to_user_id;
    if (assignedUserId && assignedUserId !== userId) {
      await this.addReferralCredit(assignedUserId, 5);
    }

    return data;
  }

  // ─── Internal: Add referral credit to a user's profile ───────────────────
  private async addReferralCredit(
    userId: string,
    creditPercent: number,
  ): Promise<void> {
    // Fetch current credit
    const { data: profile, error: fetchError } = await this.supabaseAdmin
      .from('users')
      .select('referral_credit')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      console.error(
        `Could not find profile for user ${userId} to add referral credit`,
      );
      return;
    }

    const currentCredit = profile.referral_credit || 0;

    const { error: updateError } = await this.supabaseAdmin
      .from('users')
      .update({
        referral_credit: currentCredit + creditPercent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update referral credit:', updateError.message);
    } else {
      console.log(
        `✅ Added ${creditPercent}% referral credit to user ${userId}. New total: ${currentCredit + creditPercent}%`,
      );
    }
  }

  // ─── Internal: Increment used_count after a successful order ─────────────
  async incrementUsedCount(id: string) {
    console.log('🔥 INCREMENT CALLED FOR ID:', id);

    const { data: coupon, error: fetchError } = await this.supabaseAdmin
      .from('coupons')
      .select('used_count')
      .eq('id', id)
      .single();

    if (fetchError || !coupon) {
      throw new BadRequestException('Coupon not found');
    }

    const { error } = await this.supabaseAdmin
      .from('coupons')
      .update({
        used_count: (coupon.used_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    console.log(
      '✅ used_count incremented to:',
      (coupon.used_count || 0) + 1,
    );
  }

  async consumeReferralCredit(userId: string): Promise<number> {
    const { data: profile, error } = await this.supabaseAdmin
      .from('users')
      .select('referral_credit')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.referral_credit) return 0;

    const credit = profile.referral_credit;

    // Reset credit after consuming
    await this.supabaseAdmin
      .from('users')
      .update({ referral_credit: 0, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return credit;
  }

  // ─── Validate coupon without applying ────────────────────────────────────
  async validateCoupon(code: string) {
    const { data, error } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;
    if (data.used_count >= data.max_uses) return null;
    return data;
  }
}