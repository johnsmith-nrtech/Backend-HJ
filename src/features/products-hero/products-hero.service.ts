import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as fs from 'fs';

@Injectable()
export class ProductsHeroService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getSettings() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('products_hero_settings')
      .select('*')
      .single();

    if (error) throw new NotFoundException('Products hero settings not found');
    return data;
  }

  async uploadImage(file: Express.Multer.File) {
    const settings = await this.getSettings();
    const currentImages: string[] = settings.hero_images || [];

    if (currentImages.length >= 4) {
      throw new Error('Maximum 4 images allowed');
    }

    // Upload to Supabase storage
    const fileBuffer = fs.readFileSync(file.path);
    const filename = `products-hero/${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await this.supabaseService
      .getClient()
      .storage.from('product-images')
      .upload(filename, fileBuffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    // Cleanup temp file
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    const { data: urlData } = this.supabaseService
      .getClient()
      .storage.from('product-images')
      .getPublicUrl(filename);

    const updatedImages = [...currentImages, urlData.publicUrl];

    const { data, error } = await this.supabaseService
      .getClient()
      .from('products_hero_settings')
      .update({ hero_images: updatedImages, updated_at: new Date() })
      .eq('id', settings.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteImage(index: number) {
    const settings = await this.getSettings();
    const currentImages: string[] = settings.hero_images || [];

    if (index < 0 || index >= currentImages.length) {
      throw new NotFoundException('Image not found');
    }

    // Delete from storage
    const url = currentImages[index];
    const storagePattern = '/storage/v1/object/public/product-images/';
    const pathIndex = url.indexOf(storagePattern);
    if (pathIndex !== -1) {
      const filePath = url.substring(pathIndex + storagePattern.length);
      await this.supabaseService
        .getClient()
        .storage.from('product-images')
        .remove([filePath]);
    }

    const updatedImages = currentImages.filter((_, i) => i !== index);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('products_hero_settings')
      .update({ hero_images: updatedImages, updated_at: new Date() })
      .eq('id', settings.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}