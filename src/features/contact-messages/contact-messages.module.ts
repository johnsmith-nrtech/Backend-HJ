import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { ContactMessagesService } from './contact-messages.service';
import { AdminContactMessagesController, ContactMessagesController } from './contact-messages.controller';

@Module({
  imports: [SupabaseModule, AuthModule],
  providers: [ContactMessagesService],
  controllers: [ContactMessagesController, AdminContactMessagesController],
})
export class ContactMessagesModule {}


