import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const BUCKET_NAME = 'hero-images';
const SETTINGS_ROW_ID = 1;

export interface HeroSettings {
  id: number;
  image_url: string | null;
  width: number;
  height: number;
  label: string;
  updated_at: string;
}

@Injectable()
export class DimensionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabaseAdmin() {
    return this.supabaseService.getAdminClient();
  }

  // ─── Ensure bucket and table exist ───────────────────────────────────────
  async ensureSetup(): Promise<void> {
    // 1. Create storage bucket if it doesn't exist
    const { data: buckets } = await this.supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error } = await this.supabaseAdmin.storage.createBucket(
        BUCKET_NAME,
        { public: true },
      );
      if (error) {
        console.error('Failed to create bucket:', error.message);
      } else {
        console.log(`Bucket '${BUCKET_NAME}' created`);
      }
    }

    // 2. Create hero_settings table row if it doesn't exist
    const { data: existing } = await this.supabaseAdmin
      .from('hero_settings')
      .select('id')
      .eq('id', SETTINGS_ROW_ID)
      .single();

    if (!existing) {
      await this.supabaseAdmin.from('hero_settings').insert({
        id: SETTINGS_ROW_ID,
        image_url: null,
        width: 1200,
        height: 800,
        label: 'Hero Image',
      });
      console.log('hero_settings default row created');
    }
  }

  // ─── Get current hero settings ────────────────────────────────────────────
  async getSettings(): Promise<HeroSettings> {
    await this.ensureSetup();

    const { data, error } = await this.supabaseAdmin
      .from('hero_settings')
      .select('*')
      .eq('id', SETTINGS_ROW_ID)
      .single();

    if (error || !data) {
      return {
        id: SETTINGS_ROW_ID,
        image_url: null,
        width: 1200,
        height: 800,
        label: 'Hero Image',
        updated_at: new Date().toISOString(),
      };
    }

    return data;
  }

  // ─── Upload image to Supabase Storage ────────────────────────────────────
  async uploadImage(
    file: Express.Multer.File,
    adminId: string,
  ): Promise<{ image_url: string }> {
    await this.ensureSetup();

    if (!file) throw new BadRequestException('No file provided');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, WebP and GIF are allowed',
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File size must be under 5MB');
    }

    // Use fixed filename so it always replaces the old hero image
    const ext = file.originalname.split('.').pop();
    const filename = `hero-image.${ext}`;

    // Delete old file first to avoid duplicates
    await this.supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filename]);

    // Upload new file
    const { data, error } = await this.supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    const imageUrl = urlData.publicUrl;

    // Save URL to hero_settings
    await this.supabaseAdmin
      .from('hero_settings')
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', SETTINGS_ROW_ID);

    return { image_url: imageUrl };
  }

  // ─── Update dimensions ────────────────────────────────────────────────────
  async updateDimensions(
    width: number,
    height: number,
    label: string,
    adminId: string,
  ): Promise<HeroSettings> {
    await this.ensureSetup();

    const { data, error } = await this.supabaseAdmin
      .from('hero_settings')
      .update({
        width,
        height,
        label: label || 'Hero Image',
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', SETTINGS_ROW_ID)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Delete image ─────────────────────────────────────────────────────────
  async deleteImage(adminId: string): Promise<{ message: string }> {
    const settings = await this.getSettings();

    if (settings.image_url) {
      // Extract filename from URL
      const parts = settings.image_url.split('/');
      const filename = parts[parts.length - 1];

      await this.supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([filename]);
    }

    await this.supabaseAdmin
      .from('hero_settings')
      .update({
        image_url: null,
        updated_at: new Date().toISOString(),
        updated_by: adminId,
      })
      .eq('id', SETTINGS_ROW_ID);

    return { message: 'Image deleted successfully' };
  }
}