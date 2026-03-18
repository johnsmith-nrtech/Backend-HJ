/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface WhyChooseUsItem {
  id: string;
  title: string;
  description: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWhyChooseUsDto {
  title: string;
  description: string;
  order_index?: number;
}

export interface UpdateWhyChooseUsDto {
  title?: string;
  description?: string;
  order_index?: number;
}

@Injectable()
export class WhyChooseUsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getAdminClient();
  }

  async findAll(): Promise<WhyChooseUsItem[]> {
    const { data, error } = await this.client
      .from('why_choose_us')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async findOne(id: string): Promise<WhyChooseUsItem> {
    const { data, error } = await this.client
      .from('why_choose_us')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Item ${id} not found`);
    return data;
  }

  async create(dto: CreateWhyChooseUsDto): Promise<WhyChooseUsItem> {
    if (dto.order_index === undefined) {
      const { count } = await this.client
        .from('why_choose_us')
        .select('*', { count: 'exact', head: true });
      dto.order_index = count || 0;
    }

    const { data, error } = await this.client
      .from('why_choose_us')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdateWhyChooseUsDto): Promise<WhyChooseUsItem> {
    await this.findOne(id);

    const { data, error } = await this.client
      .from('why_choose_us')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    const { error } = await this.client
      .from('why_choose_us')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Item deleted successfully' };
  }
}