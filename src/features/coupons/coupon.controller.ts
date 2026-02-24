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

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createCouponDto: CreateCouponDto, @Request() req) {
    const adminId = req.user?.id;
    return this.couponService.create(createCouponDto, adminId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.couponService.findAll();
  }

  @Get('user/my-coupons')
  @UseGuards(JwtAuthGuard)
  getAvailableCoupons(@Request() req) {
    const userId = req.user?.id;
    return this.couponService.findAvailableCoupons(userId);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  applyCoupon(@Body() applyCouponDto: ApplyCouponDto, @Request() req) {
    const userId = req.user?.id;
    return this.couponService.applyCoupon(userId, applyCouponDto);
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

  // Admin: Assign coupon to a user by email → sends email via SendGrid
  @Post(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  assignCoupon(
    @Param('id') id: string,
    @Body() assignCouponDto: AssignCouponDto,
  ) {
    return this.couponService.assignCoupon(id, assignCouponDto);
  }
}