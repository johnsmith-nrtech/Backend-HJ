import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  EDITOR = 'editor'
}

export class UpdateRoleDto {
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: 'editor',
    required: true
  })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;
} 