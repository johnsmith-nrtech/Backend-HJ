import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Wishlist module for handling wishlists for both authenticated and guest users
 */
@Module({
  imports: [
    SupabaseModule,
    AuthModule, // For auth guards and service
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {} 