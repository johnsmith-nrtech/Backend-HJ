import { ApiProperty } from '@nestjs/swagger';
import { User } from '@supabase/supabase-js';

/**
 * Raw Supabase Auth session data
 */
class SessionData {
  @ApiProperty({
    description: 'Authentication access token',
    example: '{{access_token}}',
  })
  access_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'bearer',
  })
  token_type: string;

  @ApiProperty({
    description: 'Expiration time in seconds',
    example: 3600,
  })
  expires_in: number;

  @ApiProperty({
    description: 'Refresh token for obtaining a new access token',
    example: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: 'user-uuid-1234',
      email: 'user@example.com',
      app_metadata: {},
      user_metadata: {
        name: 'John Doe'
      },
      aud: 'authenticated',
      created_at: '2023-01-01T00:00:00Z',
    },
  })
  user: User;
}

/**
 * Data returned from Supabase Auth
 */
class SupabaseData {
  @ApiProperty()
  session?: SessionData;

  @ApiProperty()
  user?: User;
}

/**
 * Raw response from Supabase Auth endpoints
 */
export class AuthResponseDto {
  @ApiProperty()
  data: SupabaseData;

  @ApiProperty({
    nullable: true,
    example: null
  })
  error: any | null;
} 