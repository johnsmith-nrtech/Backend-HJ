import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { AssignCouponDto } from './dto/assign-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createCouponDto: CreateCouponDto, @Request() req) {
    return this.couponService.create(createCouponDto, req.user?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.couponService.findAll();
  }

  // ─── User: Get my available coupons ───────────────────────────────────────
  @Get('user/my-coupons')
  @UseGuards(JwtAuthGuard)
  getAvailableCoupons(@Request() req) {
    return this.couponService.findAvailableCoupons(req.user?.id);
  }

  // ─── User: Get my referral code (generates if not exists) ─────────────────
  @Get('user/referral-code')
  @UseGuards(JwtAuthGuard)
  getUserReferralCode(@Request() req) {
    return this.couponService.getUserReferralCode(req.user?.id);
  }

  // ─── User: Get wallet balance ──────────────────────────────────────────────
  @Get('user/wallet-balance')
  @UseGuards(JwtAuthGuard)
  getWalletBalance(@Request() req) {
    return this.couponService.getWalletBalance(req.user?.id);
  }

  // ─── User: Get referral history ────────────────────────────────────────────
  @Get('user/referral-history')
  @UseGuards(JwtAuthGuard)
  getReferralHistory(@Request() req) {
    return this.couponService.getReferralHistory(req.user?.id);
  }

  // ─── User: Get referral credit (old % system) ─────────────────────────────
  @Get('user/referral-credit')
  @UseGuards(JwtAuthGuard)
  getReferralCredit(@Request() req) {
    return this.couponService.getReferralCredit(req.user?.id);
  }

  // ─── User: Consume wallet balance after order ──────────────────────────────
  @Post('user/consume-wallet')
  @UseGuards(JwtAuthGuard)
  consumeWallet(@Body() body: { amount: number }, @Request() req) {
    return this.couponService.consumeWalletBalance(req.user?.id, body.amount);
  }

  // ─── User: Consume referral credit (old % system) ─────────────────────────
  @Post('user/consume-referral-credit')
  @UseGuards(JwtAuthGuard)
  consumeReferralCredit(@Request() req) {
    return this.couponService.consumeReferralCredit(req.user?.id);
  }

  // ─── User: Process referral reward after order placed ─────────────────────
  @Post('user/process-referral-reward')
  @UseGuards(JwtAuthGuard)
  processReferralReward(
    @Body() body: { referral_code: string; order_id: string; discount_given: number },
    @Request() req,
  ) {
    return this.couponService.processReferralReward(
      req.user?.id,
      body.referral_code,
      body.order_id,
      body.discount_given,
    );
  }

  // ─── User: Apply coupon or referral code ───────────────────────────────────
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  applyCoupon(@Body() applyCouponDto: ApplyCouponDto, @Request() req) {
    return this.couponService.applyCoupon(req.user?.id, applyCouponDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }

  // ─── Admin: Assign coupon to user by email ─────────────────────────────────
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  assignCoupon(
    @Param('id') id: string,
    @Body() assignCouponDto: AssignCouponDto,
  ) {
    return this.couponService.assignCoupon(id, assignCouponDto);
  }

  @Get('admin/referral-history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getAdminReferralHistory() {
    return this.couponService.getAdminReferralHistory();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async getReferralSettings() {
    return this.couponService.getReferralSettings();
  }

  @Post('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateReferralSettings(
    @Body() settingsDto: UpdateReferralSettingsDto,
    @Request() req
  ) {
    return this.couponService.updateReferralSettings(settingsDto, req.user?.id);
  }
}