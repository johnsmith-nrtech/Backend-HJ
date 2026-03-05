import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface PageSection {
  heading: string;
  paragraph: string;
}

export interface PageContent {
  id: number;
  page_slug: string;
  title: string;
  sections: PageSection[];
  updated_at: string;
}

@Injectable()
export class ContentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabaseAdmin() {
    return this.supabaseService.getAdminClient();
  }

  // ─── Auto-generate slug from title ───────────────────────────────────────
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  

  // ─── Get all pages ────────────────────────────────────────────────────────
  async findAll(): Promise<PageContent[]> {
    // await this.ensureSetup();
    const { data, error } = await this.supabaseAdmin
      .from('contents')
      .select('*')
      .order('id');

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ─── Get single page by slug (public) ────────────────────────────────────
  async findBySlug(slug: string): Promise<PageContent> {
    const { data, error } = await this.supabaseAdmin
      .from('contents')
      .select('*')
      .eq('page_slug', slug)
      .single();

    if (error || !data) throw new NotFoundException(`Page '${slug}' not found`);
    return data;
  }

  // ─── Create new page ──────────────────────────────────────────────────────
  async create(title: string): Promise<PageContent> {
    if (!title?.trim()) throw new BadRequestException('Title is required');

    let slug = this.generateSlug(title);

    // Ensure slug is unique
    const { data: existing } = await this.supabaseAdmin
      .from('contents')
      .select('page_slug')
      .eq('page_slug', slug)
      .single();

    if (existing) slug = `${slug}-${Date.now()}`;

    const { data, error } = await this.supabaseAdmin
      .from('contents')
      .insert({ page_slug: slug, title: title.trim(), sections: [] })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Update page content ──────────────────────────────────────────────────
  async update(slug: string, title: string, sections: PageSection[]): Promise<PageContent> {
    const { data: existing } = await this.supabaseAdmin
      .from('contents')
      .select('id')
      .eq('page_slug', slug)
      .single();

    if (!existing) throw new NotFoundException(`Page '${slug}' not found`);

    const { data, error } = await this.supabaseAdmin
      .from('contents')
      .update({ title, sections, updated_at: new Date().toISOString() })
      .eq('page_slug', slug)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Delete page ──────────────────────────────────────────────────────────
  async delete(slug: string): Promise<{ message: string }> {
    const { data: existing } = await this.supabaseAdmin
      .from('contents')
      .select('id')
      .eq('page_slug', slug)
      .single();

    if (!existing) throw new NotFoundException(`Page '${slug}' not found`);

    const { error } = await this.supabaseAdmin
      .from('contents')
      .delete()
      .eq('page_slug', slug);

    if (error) throw new BadRequestException(error.message);
    return { message: `Page deleted successfully` };
  }
}