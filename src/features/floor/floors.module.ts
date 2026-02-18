import { Module } from '@nestjs/common';
import { FloorsService } from './floors.service';
import { FloorsController } from './floors.controller';
import { SupabaseModule } from '../supabase/supabase.module'; 

@Module({
  imports: [SupabaseModule], // ✅ Ye line zaruri hai
  controllers: [FloorsController],
  providers: [FloorsService],
  exports: [FloorsService],
})
export class FloorsModule {}
