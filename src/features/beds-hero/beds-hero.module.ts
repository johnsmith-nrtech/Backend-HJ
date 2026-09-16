import { Module } from '@nestjs/common';
import { BedsHeroController } from './beds-hero.controller';
import { BedsHeroService } from './beds-hero.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [BedsHeroController],
  providers: [BedsHeroService],
})
export class BedsHeroModule {}