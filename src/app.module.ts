import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './features/supabase/supabase.module';
import { AuthModule } from './features/auth/auth.module';
import { ProductsModule } from './features/products/products.module';
import { CategoriesModule } from './features/categories/categories.module';
import { ProductTagsModule } from './features/product-tags/product-tags.module';
import { UsersModule } from './features/users/users.module';
import { WishlistModule } from './features/wishlist/wishlist.module';
import { CartModule } from './features/cart/cart.module';
import { OrdersModule } from './features/orders/orders.module';
import { DiscountsModule } from './features/discounts/discounts.module';
import { ContactMessagesModule } from './features/contact-messages/contact-messages.module';
import { HealthController } from './health.controller';
import { CouponModule } from './features/coupons/coupon.module';

// Existing FloorsModule
import { FloorsModule } from './features/floor/floors.module';

// ✅ Add ZonesModule import
import { ZonesModule } from './features/zones/zones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    ProductTagsModule,
    UsersModule,
    WishlistModule,
    CartModule,
    OrdersModule,
    DiscountsModule,
    ContactMessagesModule,
    FloorsModule, 
    ZonesModule,
    CouponModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
