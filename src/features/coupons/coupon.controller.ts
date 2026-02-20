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

  // FIXED: Changed from findUserCoupons to findAvailableCoupons
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
}