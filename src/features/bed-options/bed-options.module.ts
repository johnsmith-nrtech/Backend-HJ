import { Module } from '@nestjs/common';
import { BedOptionsController } from './bed-options.controller';
import { BedOptionsService } from './bed-options.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [BedOptionsController],
  providers: [BedOptionsService],
  exports: [BedOptionsService],
})
export class BedOptionsModule {}