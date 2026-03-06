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
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';

interface ReferralSettings {
  referrer_reward: number;
  receiver_discount: number;
  receiver_discount_type: 'percentage' | 'fixed';
  min_order_amount: number;
  max_discount_amount: number | null;
  is_active: boolean;
}

interface ReferrerDetails {
  email: string;
  name: string;
}

interface ReferralUse {
  id: string;
  referrer_user_id: string;
  used_by_user_id: string;
  used_by_email: string | null;
  used_by_name: string | null;
  order_id: string;
  discount_given: number;
  reward_given: number;
  created_at: string;
}

export interface AdminReferralHistoryItem {
  id: string;
  referrerName: string;
  referrerEmail: string;
  receiverName: string;
  receiverEmail: string;
  orderId: string;
  discountGiven: number;
  referrerEarned: number;
  date: string;
  orderStatus?: string | null;
  orderAmount?: number | null;
}

export interface AdminReferralResponse {
  totalReferrals: number;
  totalDiscountGiven: number;
  totalEarned: number;
  history: AdminReferralHistoryItem[];
}

@Injectable()
export class CouponService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly mailService: MailService,
  ) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  private settingsCache: {
    referrerReward: number;
    receiverDiscount: number;
    receiverDiscountType: 'percentage' | 'fixed'; 
    minOrderAmount: number;
    maxDiscountAmount: number | null;
    timestamp: number;
  } | null = null;

  private readonly CACHE_DURATION = 5 * 60 * 1000;

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
      .update({ ...updateCouponDto, updated_at: new Date().toISOString() })
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

  // ─── Admin: Assign coupon to a registered user ────────────────────────────
  async assignCoupon(id: string, assignCouponDto: AssignCouponDto) {
    const { email } = assignCouponDto;
    const coupon = await this.findOne(id);

    const { data: usersData, error: userError } =
      await this.supabaseAdmin.auth.admin.listUsers();

    if (userError) throw new BadRequestException('Failed to look up users');

    const matchedUser = usersData?.users?.find((u) => u.email === email);

    if (!matchedUser) {
      throw new BadRequestException(
        `No registered user found with email: ${email}`,
      );
    }

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
    return (data || []).filter((c) => c.used_count < c.max_uses);
  }

  // ─── User: Apply coupon or referral code ──────────────────────────────────
  async applyCoupon(
    userId: string | undefined,
    applyCouponDto: ApplyCouponDto,
  ) {
    const { code } = applyCouponDto;

    // 1. First check if it's a referral code
    const { data: referrer, error: referrerError } = await this.supabaseAdmin
      .from('users')
      .select('id, referral_code, wallet_balance')
      .eq('referral_code', code)
      .single();

    if (referrer && !referrerError) {
      // It's a referral code — validate it
      if (!userId) {
        throw new BadRequestException(
          'You must be logged in to use a referral code',
        );
      }

      if (referrer.id === userId) {
        throw new BadRequestException('You cannot use your own referral code');
      }

      const { data: existingUse } = await this.supabaseAdmin
        .from('referral_uses')
        .select('id')
        .eq('referral_code', code)
        .eq('used_by_user_id', userId)
        .single();

      if (existingUse) {
        throw new BadRequestException(
          'You have already used this referral code',
        );
      }

      const settings = await this.getReferralSettings();

      return {
        id: `referral_${referrer.id}`,
        code: code,
        discount_type: settings.receiverDiscountType,  // WAS 'percentage'
        discount_value: settings.receiverDiscount,
        is_referral: true,
        referrer_id: referrer.id,
      };
    }

    // 2. ✅ Not a referral code — check regular coupons table
    const { data: coupon, error: couponError } = await this.supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      throw new BadRequestException('This coupon has expired');
    }

    // Check usage limit
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    // Check if coupon is assigned to a specific user
    if (coupon.assigned_to_user_id && coupon.assigned_to_user_id !== userId) {
      throw new BadRequestException('This coupon is not valid for your account');
    }

    // ✅ Valid regular coupon — return it
    return {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      is_referral: false,
    };
  }

  async processReferralReward(
    userId: string,
    referralCode: string,
    orderId: string,
    discountGiven: number,
  ): Promise<void> {
    const { data: referrer, error } = await this.supabaseAdmin
      .from('users')
      .select('id, wallet_balance, total_wallet_earned')
      .eq('referral_code', referralCode)
      .single();

    if (error || !referrer) {
      console.error('Referrer not found for code:', referralCode);
      return;
    }

    const { data: existing } = await this.supabaseAdmin
      .from('referral_uses')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existing) {
      console.log('Referral reward already given for order:', orderId);
      return;
    }

    const settings = await this.getReferralSettings();

    const { data: usedByUser } = await this.supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    await this.supabaseAdmin.from('referral_uses').insert({
      referral_code: referralCode,
      referrer_user_id: referrer.id,
      used_by_user_id: userId,
      used_by_email: usedByUser?.email || null,
      used_by_name: usedByUser?.name || null,
      order_id: orderId,
      reward_given: settings.referrerReward,
      discount_given: discountGiven,
    });

    const currentBalance = referrer.wallet_balance || 0;
    const currentTotalEarned = referrer.total_wallet_earned || 0;

    await this.supabaseAdmin
      .from('users')
      .update({
        wallet_balance: currentBalance + settings.referrerReward,
        total_wallet_earned: currentTotalEarned + settings.referrerReward,
        updated_at: new Date().toISOString(),
      })
      .eq('id', referrer.id);

    console.log(
      `Gave £${settings.referrerReward} wallet credit to referrer ${referrer.id} for order ${orderId}`,
    );
  }

  // ─── Internal: Increment used_count after successful order ────────────────
  async incrementUsedCount(id: string) {
    const { data: coupon, error: fetchError } = await this.supabaseAdmin
      .from('coupons')
      .select('used_count')
      .eq('id', id)
      .single();

    if (fetchError || !coupon) throw new BadRequestException('Coupon not found');

    await this.supabaseAdmin
      .from('coupons')
      .update({
        used_count: (coupon.used_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  // ─── User: Get wallet balance ─────────────────────────────────────────────
  async getWalletBalance(userId: string): Promise<{ balance: number; total_earned: number }> {
    const { data: profile, error } = await this.supabaseAdmin
      .from('users')
      .select('wallet_balance, total_wallet_earned')
      .eq('id', userId)
      .single();

    if (error || !profile) return { balance: 0, total_earned: 0 };

    return {
      balance: profile.wallet_balance || 0,
      total_earned: profile.total_wallet_earned || 0,
    };
  }

  // ─── User: Consume wallet balance after successful order ──────────────────
  async consumeWalletBalance(
    userId: string,
    amountToConsume: number,
  ): Promise<{ consumed: number; remaining: number }> {
    const { data: profile, error } = await this.supabaseAdmin
      .from('users')
      .select('wallet_balance')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.wallet_balance) {
      return { consumed: 0, remaining: 0 };
    }

    const currentBalance = profile.wallet_balance || 0;
    const consumed = Math.min(amountToConsume, currentBalance);
    const remaining = currentBalance - consumed;

    await this.supabaseAdmin
      .from('users')
      .update({
        wallet_balance: remaining,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    console.log(
      `Consumed £${consumed} wallet balance for user ${userId}. Remaining: £${remaining}`,
    );

    return { consumed, remaining };
  }

  // ─── User: Get referral credit (old percentage system) ────────────────────
  async getReferralCredit(userId: string): Promise<{ credit: number }> {
    const { data: profile, error } = await this.supabaseAdmin
      .from('users')
      .select('referral_credit')
      .eq('id', userId)
      .single();

    if (error || !profile) return { credit: 0 };
    return { credit: profile.referral_credit || 0 };
  }

  // ─── User: Consume referral credit (old percentage system) ────────────────
  async consumeReferralCredit(userId: string): Promise<{ consumed: number }> {
    const { data: profile, error } = await this.supabaseAdmin
      .from('users')
      .select('referral_credit')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.referral_credit) return { consumed: 0 };

    const credit = profile.referral_credit;

    await this.supabaseAdmin
      .from('users')
      .update({ referral_credit: 0, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return { consumed: credit };
  }

  // ─── User: Get or generate referral code ─────────────────────────────────
  async getUserReferralCode(userId: string): Promise<{ referral_code: string }> {
    const { data: user, error } = await this.supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (error || !user) throw new BadRequestException('User not found');

    if (user.referral_code) return { referral_code: user.referral_code };

    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = this.generateCode();
      const { data: existing } = await this.supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', code)
        .single();
      if (!existing) isUnique = true;
    }

    await this.supabaseAdmin
      .from('users')
      .update({ referral_code: code, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return { referral_code: code };
  }

  // ─── User: Get referral history ───────────────────────────────────────────
  async getReferralHistory(userId: string) {
    const { data: user, error: userError } = await this.supabaseAdmin
      .from('users')
      .select('referral_code, wallet_balance, total_wallet_earned')
      .eq('id', userId)
      .single();

    if (userError || !user) throw new BadRequestException('User not found');

    const referralCode = user.referral_code;
    const balance = user.wallet_balance || 0;
    const totalEarned = user.total_wallet_earned || 0;

    if (!referralCode) {
      return {
        balance,
        total_earned: totalEarned,
        total_referrals: 0,
        history: [],
      };
    }

    const { data: uses, error: usesError } = await this.supabaseAdmin
      .from('referral_uses')
      .select('*')
      .eq('referral_code', referralCode)
      .order('created_at', { ascending: false });

    if (usesError) {
      console.error('Failed to fetch referral history:', usesError.message);
      return { balance, total_earned: totalEarned, total_referrals: 0, history: [] };
    }

    const history = (uses || []).map((u) => ({
      id: u.id,
      usedByUserId: u.used_by_user_id,
      usedByEmail: u.used_by_email || 'Unknown',
      usedByName: u.used_by_name || 'Unknown',
      orderId: u.order_id,
      rewardGiven: u.reward_given,
      discountGiven: u.discount_given,
      date: u.created_at,
    }));

    return {
      balance,
      total_earned: totalEarned,
      total_referrals: history.length,
      referral_code: referralCode,
      history,
    };
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

  // ─── Admin: Get all referral history ─────────────────────────────────────
  async getAdminReferralHistory(): Promise<AdminReferralResponse> {
    const { data: uses, error: usesError } = await this.supabaseAdmin
      .from('referral_uses')
      .select('*')
      .order('created_at', { ascending: false });

    if (usesError) {
      throw new BadRequestException('Failed to fetch referral history');
    }

    if (!uses || uses.length === 0) {
      return {
        totalReferrals: 0,
        totalDiscountGiven: 0,
        totalEarned: 0,
        history: [],
      };
    }

    const referrerIds: string[] = [...new Set(uses.map(u => u.referrer_user_id).filter(Boolean))];
    const referredUserIds: string[] = [...new Set(uses.map(u => u.used_by_user_id).filter(Boolean))];

    const { data: referrers, error: referrersError } = await this.supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', referrerIds);

    if (referrersError) {
      console.error('Failed to fetch referrer details:', referrersError);
    }

    const { data: referredUsers, error: referredError } = await this.supabaseAdmin
      .from('users')
      .select('id, email, name')
      .in('id', referredUserIds);

    if (referredError) {
      console.error('Failed to fetch referred user details:', referredError);
    }

    const referrerMap = new Map<string, { email: string; name: string }>();
    referrers?.forEach(r => {
      referrerMap.set(r.id, {
        email: r.email || 'Unknown',
        name: r.name || r.email?.split('@')[0] || 'Unknown',
      });
    });

    const referredUserMap = new Map<string, { email: string; name: string }>();
    referredUsers?.forEach(r => {
      referredUserMap.set(r.id, {
        email: r.email || 'Unknown',
        name: r.name || r.email?.split('@')[0] || 'Unknown',
      });
    });

    const totalReferrals = uses.length;
    const totalDiscountGiven = uses.reduce((sum, u) => sum + (u.discount_given || 0), 0);
    const totalEarned = uses.reduce((sum, u) => sum + (u.reward_given || 0), 0);

    const history: AdminReferralHistoryItem[] = uses.map((u: any) => {
      const referrerDetails = referrerMap.get(u.referrer_user_id) || { email: 'Unknown', name: 'Unknown' };
      const referredUserDetails = referredUserMap.get(u.used_by_user_id) || { email: 'Unknown', name: 'Unknown' };

      return {
        id: u.id,
        referrerName: referrerDetails.name,
        referrerEmail: referrerDetails.email,
        receiverName: u.used_by_name || referredUserDetails.name,
        receiverEmail: u.used_by_email || referredUserDetails.email,
        orderId: u.order_id,
        discountGiven: u.discount_given || 0,
        referrerEarned: u.reward_given || 0,
        date: u.created_at,
        orderStatus: null,
        orderAmount: null,
      };
    });

    return { totalReferrals, totalDiscountGiven, totalEarned, history };
  }

  // ─── Get referral settings ────────────────────────────────────────────────
  async getReferralSettings() {
    if (this.settingsCache && (Date.now() - this.settingsCache.timestamp) < this.CACHE_DURATION) {
      return {
        referrerReward: this.settingsCache.referrerReward,
        receiverDiscount: this.settingsCache.receiverDiscount,
        receiverDiscountType: this.settingsCache.receiverDiscountType,
        minOrderAmount: this.settingsCache.minOrderAmount,
        maxDiscountAmount: this.settingsCache.maxDiscountAmount,
      };
    }

    const { data, error } = await this.supabaseAdmin
      .from('referral_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Failed to fetch referral settings:', error);
      return {
        referrerReward: 500,
        receiverDiscount: 10,
        receiverDiscountType: 'percentage' as const,
        minOrderAmount: 0,
        maxDiscountAmount: null,
      };
    }

    this.settingsCache = {
      referrerReward: data.referrer_reward,
      receiverDiscount: data.receiver_discount,
      receiverDiscountType: data.receiver_discount_type || 'percentage',
      minOrderAmount: data.min_order_amount || 0,
      maxDiscountAmount: data.max_discount_amount,
      timestamp: Date.now(),
    };

    return {
      referrerReward: data.referrer_reward,
      receiverDiscount: data.receiver_discount,
      receiverDiscountType: data.receiver_discount_type || 'percentage',
      minOrderAmount: data.min_order_amount || 0,
      maxDiscountAmount: data.max_discount_amount,
    };
  }

  // ─── Update referral settings ─────────────────────────────────────────────
  async updateReferralSettings(settingsDto: UpdateReferralSettingsDto, adminId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('referral_settings')
      .update({
        referrer_reward: settingsDto.referrerReward,
        receiver_discount: settingsDto.receiverDiscount,
        receiver_discount_type: settingsDto.receiverDiscountType,
        min_order_amount: settingsDto.minOrderAmount || 0,
        max_discount_amount: settingsDto.maxDiscountAmount || null,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update settings: ' + error.message);
    }

    this.settingsCache = null;

    return {
      message: 'Referral settings updated successfully',
      settings: {
        referrerReward: data.referrer_reward,
        receiverDiscount: data.receiver_discount,
        receiverDiscountType: data.receiver_discount_type,
        minOrderAmount: data.min_order_amount,
        maxDiscountAmount: data.max_discount_amount,
      },
    };
  }

  clearSettingsCache() {
    this.settingsCache = null;
  }

  // ─── Internal: Generate random referral code ──────────────────────────────
  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}