import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Cart module for handling shopping cart functionality for both authenticated and guest users
 */
@Module({
  imports: [
    SupabaseModule,
    AuthModule, // For auth guards and service
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {} 