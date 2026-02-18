import { IsEmail, IsString, MinLength, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user signup
 * 
 * The signup process:
 * 1. Creates a user in Supabase Auth
 * 2. Automatically triggers a database function that creates a record in the users table
 * 3. The trigger maps fields: id from Auth, email directly, name from metadata, and default role 'customer'
 */
export class SignupDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password (min 8 characters)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'User metadata - the name field will be stored in the users table',
    example: { name: 'John Doe' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
} 