import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CardstreamPaymentService } from './services/cardstream-payment.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { ZonesModule } from '../zones/zones.module';
import { CouponModule } from '../coupons/coupon.module';
import { LoxaModule } from '../loxa/loxa.module'; 
// Import ProductsModule if OrdersService needs to interact with ProductsService (e.g., for stock checking, price fetching)
// import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot(), // Ensure ConfigService is available
    SupabaseModule,
    AuthModule, // For JwtAuthGuard and RolesGuard
    MailModule,
    ZonesModule,
    CouponModule,
    LoxaModule,
    // ProductsModule, // Uncomment if ProductsService is needed
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CardstreamPaymentService],
})
export class OrdersModule {}
