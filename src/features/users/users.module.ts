import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { UsersController, AdminUsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';

/**
 * User management module for handling user profiles and addresses
 */
@Module({
  imports: [
    SupabaseModule,
    AuthModule, // For roles guard and auth service
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {} 