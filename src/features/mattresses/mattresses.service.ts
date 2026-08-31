import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateMattressTypeDto } from './dto/create-mattress-type.dto';
import { UpdateMattressTypeDto } from './dto/update-mattress-type.dto';
import { CreateMattressDto } from './dto/create-mattress.dto';
import { UpdateMattressDto } from './dto/update-mattress.dto';
import { MattressType, Mattress } from './entities/mattress-type.entity';
import * as fs from 'fs';

@Injectable()
export class MattressesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // ── Mattress Types ─────────────────────────────────────────────
  async findAllTypes(onlyActive = false): Promise<MattressType[]> {
    let query = this.supabaseService
      .getClient()
      .from('mattress_types')
      .select('*, mattresses(*)')
      .order('name', { ascending: true });

    if (onlyActive) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return data as MattressType[];
  }

  async findOneType(id: string): Promise<MattressType> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('mattress_types')
      .select('*, mattresses(*)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Mattress type ${id} not found`);
    return data as MattressType;
  }

  async createType(dto: CreateMattressTypeDto): Promise<MattressType> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('mattress_types')
      .insert({
        name: dto.name,
        image_url: dto.image_url ?? null,
        height_cm: dto.height_cm ?? null,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as MattressType;
  }

  async updateType(id: string, dto: UpdateMattressTypeDto): Promise<MattressType> {
    await this.findOneType(id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('mattress_types')
      .update({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.image_url !== undefined && { image_url: dto.image_url }),
        ...(dto.height_cm !== undefined && { height_cm: dto.height_cm }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as MattressType;
  }

  async removeType(id: string): Promise<MattressType> {
    const type = await this.findOneType(id);
    const { error } = await this.supabaseService
      .getClient()
      .from('mattress_types')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return type;
  }

  async uploadTypeImage(id: string, file: Express.Multer.File): Promise<MattressType> {
    await this.findOneType(id);
    const fileBuffer = fs.readFileSync(file.path);
    const uniqueFilename = `mattress-types/${id}-${Date.now()}-${file.originalname}`;

    const { error: uploadError } = await this.supabaseService
      .getClient()
      .storage.from('bed-option-images')
      .upload(uniqueFilename, fileBuffer, { contentType: file.mimetype, upsert: true });

    fs.unlinkSync(file.path);
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = this.supabaseService
      .getClient()
      .storage.from('bed-option-images')
      .getPublicUrl(uniqueFilename);

    return this.updateType(id, { image_url: publicUrlData.publicUrl } as any);
  }

  // ── Mattresses ────────────────────────────────────────────────
  async findAllMattresses(typeId?: string, onlyActive = false): Promise<Mattress[]> {
    let query = this.supabaseService.getClient().from('mattresses').select('*');
    if (typeId) query = query.eq('mattress_type_id', typeId);
    if (onlyActive) query = query.eq('is_active', true);

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return data as Mattress[];
  }

  async findOneMattress(id: string): Promise<Mattress> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('mattresses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Mattress ${id} not found`);
    return data as Mattress;
  }


  async createMattress(dto: CreateMattressDto): Promise<Mattress> {
    await this.findOneType(dto.mattress_type_id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('mattresses')
      .insert({
        mattress_type_id: dto.mattress_type_id,
        name: dto.name,
        height_cm: dto.height_cm ?? null,
        size: dto.size ?? null,
        price: dto.price,
        stock: dto.stock ?? 0,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Mattress;
  }


  async updateMattress(id: string, dto: UpdateMattressDto): Promise<Mattress> {
    await this.findOneMattress(id);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('mattresses')
      .update({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.height_cm !== undefined && { height_cm: dto.height_cm }),
        ...(dto.size !== undefined && { size: dto.size }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Mattress;
  }

    async removeMattress(id: string): Promise<Mattress> {
    const mattress = await this.findOneMattress(id);
    const { error } = await this.supabaseService.getClient().from('mattresses').delete().eq('id', id);
    if (error) throw error;
    return mattress;
  }

  /**
   * Decrement a mattress's stock when it's included in a placed order.
   * Never goes below 0. Silently no-ops if the mattress no longer exists,
   * so a deleted mattress doesn't block order placement.
   * @param id Mattress ID
   * @param quantity Amount to decrement (default 1)
   */
  async decrementStock(id: string, quantity: number = 1): Promise<void> {
    const { data: mattress, error: findError } = await this.supabaseService
      .getClient()
      .from('mattresses')
      .select('stock')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!mattress) return; // mattress deleted since order was placed — skip silently

    const newStock = Math.max(0, (mattress.stock ?? 0) - quantity);

    const { error: updateError } = await this.supabaseService
      .getClient()
      .from('mattresses')
      .update({ stock: newStock, updated_at: new Date() })
      .eq('id', id);

    if (updateError) throw updateError;
  }
}