import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { ImageOptimizationService } from '../../common/services/image-optimization.service';
import * as fs from 'fs';

@Injectable()
export class BundleService {

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly imageOptimizationService: ImageOptimizationService,
  ) {}


  private get supabase() {
    return this.supabaseService.getAdminClient();
  }


async create(createBundleDto: CreateBundleDto, bundleImagePath?: string) {
  const { productIds, ...bundleData } = createBundleDto;

  if (!productIds || productIds.length < 2) {
    throw new BadRequestException('A bundle must have at least 2 products');
  }

  // Upload image if file provided
  let imageUrl: string | null = bundleData.bundleimage || null;
  if (bundleImagePath) {
    const filename = bundleImagePath.split(/[\\/]/).pop() || 'bundle-image.jpg';
    imageUrl = await this.uploadBundleImage(bundleImagePath, filename);
  }

  const { data: bundle, error } = await this.supabase
    .from('bundles')
    .insert({
      bundlename: bundleData.bundlename,
      description: bundleData.description || null,
      bundleprice: bundleData.bundleprice,
      discount_type: bundleData.discount_type || 'percentage',
      discount_value: bundleData.discount_value || 0,
      bundlestatus: bundleData.bundlestatus || 'active',
      bundleimage: imageUrl,
    })
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);

  const bundleProducts = productIds.map((productId) => ({
    bundle_id: bundle.id,
    product_id: productId,
  }));

  const { error: junctionError } = await this.supabase
    .from('bundle_products')
    .insert(bundleProducts);

  if (junctionError) {
    await this.supabase.from('bundles').delete().eq('id', bundle.id);
    throw new BadRequestException(junctionError.message);
  }

  return this.findOne(bundle.id);
}

  // ─── Get All Bundles ──────────────────────────────────────────
  async findAll(onlyActive = false) {
    let query = this.supabase
      .from('bundles')
      .select('*')
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('bundlestatus', 'active');
    }

    const { data: bundles, error } = await query;
    if (error) throw new BadRequestException(error.message);

    // Fetch products for each bundle
    const bundlesWithProducts = await Promise.all(
      (bundles || []).map(async (bundle) => {
        const products = await this.getBundleProducts(bundle.id);
        return { ...bundle, products };
      }),
    );

    return bundlesWithProducts;
  }

  // ─── Get Single Bundle ────────────────────────────────────────
  async findOne(id: string) {
    const { data: bundle, error } = await this.supabase
      .from('bundles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !bundle) throw new NotFoundException('Bundle not found');

    const products = await this.getBundleProducts(id);
    return { ...bundle, products };
  }

async update(id: string, updateBundleDto: UpdateBundleDto, bundleImagePath?: string) {
  await this.findOne(id);

  const { productIds, ...bundleData } = updateBundleDto;

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (bundleData.bundlename) updatePayload.bundlename = bundleData.bundlename;
  if (bundleData.description !== undefined) updatePayload.description = bundleData.description;
  if (bundleData.bundleprice !== undefined) updatePayload.bundleprice = bundleData.bundleprice;
  if (bundleData.discount_type) updatePayload.discount_type = bundleData.discount_type;
  if (bundleData.discount_value !== undefined) updatePayload.discount_value = bundleData.discount_value;
  if (bundleData.bundlestatus) updatePayload.bundlestatus = bundleData.bundlestatus;

  // Upload new image if file provided
  if (bundleImagePath) {
    const filename = bundleImagePath.split(/[\\/]/).pop() || 'bundle-image.jpg';
    const uploadedUrl = await this.uploadBundleImage(bundleImagePath, filename);
    updatePayload.bundleimage = uploadedUrl;
  } else if (bundleData.bundleimage !== undefined) {
    updatePayload.bundleimage = bundleData.bundleimage;
  }

  const { error } = await this.supabase
    .from('bundles')
    .update(updatePayload)
    .eq('id', id);

  if (error) throw new BadRequestException(error.message);

  // Update products if provided
  if (productIds && productIds.length >= 2) {
    await this.supabase
      .from('bundle_products')
      .delete()
      .eq('bundle_id', id);

    const bundleProducts = productIds.map((productId: string) => ({
      bundle_id: id,
      product_id: productId,
    }));

    const { error: junctionError } = await this.supabase
      .from('bundle_products')
      .insert(bundleProducts);

    if (junctionError) throw new BadRequestException(junctionError.message);
  }

  return this.findOne(id);
}

  // ─── Delete Bundle ────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.supabase
      .from('bundles')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Bundle deleted successfully' };
  }

  // ─── Helper: Get products for a bundle ───────────────────────
  private async getBundleProducts(bundleId: string) {
    const { data, error } = await this.supabase
      .from('bundle_products')
      .select(`
        product_id,
        product:products(
          id,
          name,
          description,
          base_price,
          discount_offer,
          images:product_images(id, url, type, order),
          variants:product_variants(id, price, stock, assemble_charges, delivery_time_days)
        )
      `)
      .eq('bundle_id', bundleId);

    if (error) return [];

    return (data || []).map((item: any) => item.product).filter(Boolean);
  }

  async uploadBundleImage(filePath: string, filename: string): Promise<string> {
  try {
    let fileBuffer = fs.readFileSync(filePath);

    const isImage = this.imageOptimizationService.isSupportedImageFormat(filename);
    let finalBuffer = fileBuffer;
    let finalFilename = filename;

    if (isImage) {
      try {
        const result = await this.imageOptimizationService.optimizeImageFromBuffer(
          fileBuffer,
          {
            maxWidth: 1200,
            maxHeight: 800,
            quality: 85,
            format: 'auto',
            progressive: true,
            removeMetadata: true,
          },
          filename,
        );
        finalBuffer = result.buffer;
        finalFilename = result.filename;
      } catch {
        // fallback to original if optimization fails
      }
    }

    const storagePath = `bundles/${Date.now()}-${finalFilename}`;

    const { error: uploadError } = await this.supabase
      .storage
      .from('product-images')
      .upload(storagePath, finalBuffer, {
        contentType: this.getContentType(finalFilename),
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = this.supabase
      .storage
      .from('product-images')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  } finally {
    // Always clean up temp file
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
  }
}

private getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const types = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif',
    webp: 'image/webp',
  };
  return types[ext] || 'application/octet-stream';
}

}