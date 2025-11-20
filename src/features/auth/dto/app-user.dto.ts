import { ApiProperty } from '@nestjs/swagger';
import { User } from '@supabase/supabase-js';

/**
 * Extended User type that includes app-specific properties
 */
export interface AppUser extends User {
  app_role?: string;
}

/**
 * DTO for AppUser responses in API
 */
export class AppUserDto {
  @ApiProperty({ example: 'user-uuid-1234' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ 
    example: 'customer',
    description: 'Application-specific role of the user'
  })
  app_role: string;

  @ApiProperty({ 
    example: { 
      name: 'John Doe'
    },
    description: 'Additional user metadata'
  })
  user_metadata: Record<string, any>;

  constructor(partial: Partial<AppUserDto>) {
    Object.assign(this, partial);
  }
} 