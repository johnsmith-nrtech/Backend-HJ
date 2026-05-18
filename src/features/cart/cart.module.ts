import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CartScheduler } from './cart.scheduler';



@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    MailModule,
    ScheduleModule.forRoot()
  ],
  controllers: [CartController],
  providers: [CartService, CartScheduler],
  exports: [CartService],
})
export class CartModule {}
