import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateBedOptionDto } from './dto/create-bed-option.dto';
import { UpdateBedOptionDto } from './dto/update-bed-option.dto';
import { BedOption, BedOptionType } from './entities/bed-option.entity';

@Injectable()
export class BedOptionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(type?: BedOptionType, onlyActive = false): Promise<BedOption[]> {
    let query = this.supabaseService
      .getClient()
      .from('bed_option_catalog')
      .select('*')
      .order('type', { ascending: true })
      .order('label', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }
    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as BedOption[];
  }

  async findOne(id: string): Promise<BedOption> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('bed_option_catalog')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Bed option with ID ${id} not found`);
    }
    return data as BedOption;
  }

  async create(dto: CreateBedOptionDto): Promise<BedOption> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('bed_option_catalog')
      .insert({
        type: dto.type,
        label: dto.label,
        charge: dto.charge ?? 0,
        height_cm: dto.type === 'headboard_height' ? (dto.height_cm ?? null) : null,
        image_url: dto.image_url ?? null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as BedOption;
  }

    async update(id: string, dto: UpdateBedOptionDto): Promise<BedOption> {
    await this.findOne(id);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('bed_option_catalog')
      .update({
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.charge !== undefined && { charge: dto.charge }),
        ...(dto.height_cm !== undefined && { height_cm: dto.height_cm }),
        ...(dto.image_url !== undefined && { image_url: dto.image_url }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BedOption;
  }

  /**
   * Upload an image for a bed option and save its public URL
   */
  async uploadImage(id: string, file: Express.Multer.File): Promise<BedOption> {
    await this.findOne(id);
    const fs = await import('fs');

    const fileBuffer = fs.readFileSync(file.path);
    const uniqueFilename = `bed-options/${id}-${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await this.supabaseService
      .getClient()
      .storage.from('bed-option-images')
      .upload(uniqueFilename, fileBuffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    fs.unlinkSync(file.path);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = this.supabaseService
      .getClient()
      .storage.from('bed-option-images')
      .getPublicUrl(uniqueFilename);

    return this.update(id, { image_url: publicUrlData.publicUrl } as any);
  }

  async remove(id: string): Promise<BedOption> {
    const option = await this.findOne(id);

    const { error } = await this.supabaseService
      .getClient()
      .from('bed_option_catalog')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return option;
  }
}