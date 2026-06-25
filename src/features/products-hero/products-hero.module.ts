import { Module } from '@nestjs/common';
import { ProductsHeroController } from './products-hero.controller';
import { ProductsHeroService } from './products-hero.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ProductsHeroController],
  providers: [ProductsHeroService],
})
export class ProductsHeroModule {}