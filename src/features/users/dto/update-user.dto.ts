import { IsOptional, IsString, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User\'s full name',
    example: 'John Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'User\'s phone number',
    example: '+447123456789',
    required: false
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User\'s avatar URL',
    example: 'https://example.com/avatar.jpg',
    required: false
  })
  @IsOptional()
  @IsString()
  avatar_url?: string;
} 