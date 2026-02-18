import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateContactMessageStatusDto {
  @ApiPropertyOptional({ enum: ['new', 'read', 'archived', 'replied'] })
  @IsOptional()
  @IsIn(['new', 'read', 'archived', 'replied'])
  status?: 'new' | 'read' | 'archived' | 'replied';

  @ApiPropertyOptional({ description: 'Internal notes for admins' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  admin_notes?: string;
}


