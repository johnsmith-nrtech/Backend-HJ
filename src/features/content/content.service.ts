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

const VALID_SLUGS = [
  'terms',
  'privacy',
  'returns',
  'cookies',
  'legal-advisory',
  'user-data-protection',
];

@Injectable()
export class ContentService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabaseAdmin() {
    return this.supabaseService.getAdminClient();
  }

  // ─── Ensure default rows exist ────────────────────────────────────────────
  async ensureSetup(): Promise<void> {
    const defaults = [
      { page_slug: 'terms', title: 'Terms and Conditions' },
      { page_slug: 'privacy', title: 'Privacy Policy' },
      { page_slug: 'returns', title: 'Returns & Refund Policy' },
      { page_slug: 'cookies', title: 'Cookie Policy' },
      { page_slug: 'legal-advisory', title: 'Legal Advisory' },
      { page_slug: 'user-data-protection', title: 'User Data Protection' },
    ];

    for (const d of defaults) {
      const { data } = await this.supabaseAdmin
        .from('contents')
        .select('id')
        .eq('page_slug', d.page_slug)
        .single();

      if (!data) {
        await this.supabaseAdmin.from('contents').insert({
          page_slug: d.page_slug,
          title: d.title,
          sections: [],
        });
      }
    }
  }

  // ─── Get all pages (for admin list) ──────────────────────────────────────
  async findAll(): Promise<PageContent[]> {
    await this.ensureSetup();
    const { data, error } = await this.supabaseAdmin
      .from('contents')
      .select('*')
      .order('id');

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ─── Get single page by slug (public) ────────────────────────────────────
  async findBySlug(slug: string): Promise<PageContent> {
    await this.ensureSetup();
    const { data, error } = await this.supabaseAdmin
      .from('contents')
      .select('*')
      .eq('page_slug', slug)
      .single();

    if (error || !data) throw new NotFoundException(`Page '${slug}' not found`);
    return data;
  }

  // ─── Update page content (admin) ─────────────────────────────────────────
  async update(
    slug: string,
    title: string,
    sections: PageSection[],
  ): Promise<PageContent> {
    if (!VALID_SLUGS.includes(slug)) {
      throw new BadRequestException(`Invalid page slug: ${slug}`);
    }

    const { data, error } = await this.supabaseAdmin
      .from('contents')
      .update({
        title,
        sections,
        updated_at: new Date().toISOString(),
      })
      .eq('page_slug', slug)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}