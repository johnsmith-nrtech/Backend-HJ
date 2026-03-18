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
import { DimensionsModule } from './features/dimensions/dimensions.module';
import { ContentModule } from './features/content/content.module';
import { BundleModule } from './features/bundles/bundle.module';
import { FloorsModule } from './features/floor/floors.module';
import { ZonesModule } from './features/zones/zones.module';
import { SalesModule } from './features/sales/sales.module';
import { BestSellersModule } from './features/best-sellers/best-sellers.module';
import { TestimonialsModule } from './features/testimonials/testimonials.module';
import { WhyChooseUsModule } from './features/why-choose-us/why-choose-us.module';



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
    DimensionsModule,
    ContentModule,
    BundleModule,
    SalesModule,
    BestSellersModule,
    TestimonialsModule,
    WhyChooseUsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
