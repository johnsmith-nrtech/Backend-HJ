/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Testimonial {
  id: string;
  time_ago: string;
  rating: number;
  title: string;
  description: string;
  author: string;
  role: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTestimonialDto {
  time_ago: string;
  rating: number;
  title: string;
  description: string;
  author: string;
  role: string;
  order_index?: number;
}

export interface UpdateTestimonialDto {
  time_ago?: string;
  rating?: number;
  title?: string;
  description?: string;
  author?: string;
  role?: string;
  order_index?: number;
}

@Injectable()
export class TestimonialsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getAdminClient();
  }

  async findAll(): Promise<Testimonial[]> {
    const { data, error } = await this.client
      .from('testimonials')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async findOne(id: string): Promise<Testimonial> {
    const { data, error } = await this.client
      .from('testimonials')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Testimonial ${id} not found`);
    return data;
  }

  async create(dto: CreateTestimonialDto): Promise<Testimonial> {
    // Auto-assign order_index if not provided
    if (dto.order_index === undefined) {
      const { count } = await this.client
        .from('testimonials')
        .select('*', { count: 'exact', head: true });
      dto.order_index = count || 0;
    }

    const { data, error } = await this.client
      .from('testimonials')
      .insert(dto)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, dto: UpdateTestimonialDto): Promise<Testimonial> {
    await this.findOne(id);

    const { data, error } = await this.client
      .from('testimonials')
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
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Testimonial deleted successfully' };
  }
}