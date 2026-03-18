/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { BestSellersService } from './best-sellers.service';
import { BestSellersController } from './best-sellers.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [BestSellersController],
  providers: [BestSellersService],
  exports: [BestSellersService],
})
export class BestSellersModule {}