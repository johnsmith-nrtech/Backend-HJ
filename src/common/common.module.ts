import { Module } from '@nestjs/common';
import { ImageOptimizationService } from './services/image-optimization.service';
import { EmailService } from './services/email.service';

@Module({
  providers: [ImageOptimizationService, EmailService],
  exports: [ImageOptimizationService, EmailService],
})
export class CommonModule {} 