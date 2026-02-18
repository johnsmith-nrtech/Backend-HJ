import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
// import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { CommonModule } from '../../common/common.module';

/**
 * Module for handling category-related functionality
 * This module is responsible for defining all category operations,
 * including CRUD operations, hierarchical category management, and 
 * category-product relationships
 */
@Module({
  imports: [
    HttpModule,
    // AuthModule,
    SupabaseModule,
    CommonModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // Export service for use in other modules (e.g., products)
})
export class CategoriesModule {} 