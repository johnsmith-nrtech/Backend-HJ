import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ReorderFaqDto } from './dto/reorder-faq.dto';

@Injectable()
export class FaqService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.getClient();
  }

  private get supabaseAdmin() {
    return this.supabaseService.getAdminClient();
  }

  // ─── Public: Get active FAQs, ordered ─────────────────────────────────────
  async findAllActive() {
    const { data, error } = await this.supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Admin: Get all FAQs (active + inactive), ordered ──────────────────────
  async findAll() {
    const { data, error } = await this.supabaseAdmin
      .from('faqs')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Admin: Get single FAQ ──────────────────────────────────────────────────
  async findOne(id: string) {
    const { data, error } = await this.supabaseAdmin
      .from('faqs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('FAQ not found');
    return data;
  }

async create(createFaqDto: CreateFaqDto) {
  const { count, error: countError } = await this.supabaseAdmin
    .from('faqs')
    .select('*', { count: 'exact', head: true });

  if (countError) throw new BadRequestException(countError.message);

  if ((count ?? 0) >= 4) {
    throw new BadRequestException('Maximum of 4 FAQs allowed. Please delete an existing FAQ before adding a new one.');
  }

  let order = createFaqDto.order;

  if (order === undefined) {
    const { data: maxOrderRow } = await this.supabaseAdmin
      .from('faqs')
      .select('order')
      .order('order', { ascending: false })
      .limit(1)
      .single();

    order = (maxOrderRow?.order ?? -1) + 1;
  }

  const { data, error } = await this.supabaseAdmin
    .from('faqs')
    .insert({
      question: createFaqDto.question,
      answer: createFaqDto.answer,
      order,
      is_active: createFaqDto.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);
  return data;
}

  // ─── Admin: Update FAQ ────────────────────────────────────────────────────────
  async update(id: string, updateFaqDto: UpdateFaqDto) {
    await this.findOne(id);

    const { data, error } = await this.supabaseAdmin
      .from('faqs')
      .update({
        ...updateFaqDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Admin: Reorder FAQs (bulk order update) ────────────────────────────────
  async reorder(reorderFaqDto: ReorderFaqDto) {
    const updates = reorderFaqDto.items.map((item) =>
      this.supabaseAdmin
        .from('faqs')
        .update({ order: item.order, updated_at: new Date().toISOString() })
        .eq('id', item.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    if (failed?.error) {
      throw new BadRequestException(`Failed to reorder FAQs: ${failed.error.message}`);
    }

    return { message: 'FAQs reordered successfully' };
  }

  // ─── Admin: Delete FAQ ─────────────────────────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id);

    const { error } = await this.supabaseAdmin
      .from('faqs')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { message: 'FAQ deleted successfully' };
  }
}