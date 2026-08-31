import { Module } from '@nestjs/common';
import { MattressesController } from './mattresses.controller';
import { MattressesService } from './mattresses.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [MattressesController],
  providers: [MattressesService],
  exports: [MattressesService],
})
export class MattressesModule {}