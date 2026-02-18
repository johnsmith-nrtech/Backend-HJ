import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message-status.dto';

export interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message_text: string;
  status: 'new' | 'read' | 'archived' | 'replied';
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ContactMessagesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(dto: CreateContactMessageDto): Promise<ContactMessage> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('contact_messages')
      .insert({
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        message_text: dto.message_text,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data as ContactMessage;
  }

  async listAdmin(params: {
    page?: number;
    limit?: number;
    status?: 'new' | 'read' | 'archived' | 'replied';
    search?: string;
  } = {}): Promise<{ items: ContactMessage[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabaseService
      .getClient()
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.search) {
      const term = params.search.trim();
      if (term.length > 0) {
        query = query.or(
          `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`
        );
      }
    }

    const { data, error, count } = await query.range(from, to);
    if (error) {
      throw error;
    }
    return { items: (data || []) as ContactMessage[], total: count || 0 };
  }

  async updateAdmin(id: string, dto: UpdateContactMessageStatusDto): Promise<ContactMessage> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('contact_messages')
      .update({ status: dto.status, admin_notes: dto.admin_notes })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new NotFoundException('Contact message not found');
    }
    return data as ContactMessage;
  }

  async removeAdmin(id: string): Promise<{ id: string }>
  {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('contact_messages')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new NotFoundException('Contact message not found');
    }
    return { id: data.id as string };
  }
}


