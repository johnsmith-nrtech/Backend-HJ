import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module'; // 👈 import MailModule

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    MailModule, // 👈 now MailService will be available
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
