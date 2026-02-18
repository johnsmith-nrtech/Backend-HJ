import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { CategoriesModule } from '../categories/categories.module';
import { CommonModule } from '../../common/common.module';

/**
 * Module for handling product-related functionality
 * This module is responsible for defining all product operations,
 * including CRUD operations and product relationships with variants and images
 */
@Module({
  imports: [
    HttpModule,
    AuthModule,
    SupabaseModule,
    CategoriesModule,
    CommonModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // Export service for use in other modules
})
export class ProductsModule {} 