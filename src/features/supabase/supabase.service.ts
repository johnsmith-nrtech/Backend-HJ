import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabaseClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    // Get Supabase credentials from environment variables
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_KEY must be set in environment variables',
      );
    }

    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  onModuleInit() {
    console.log('Supabase service initialized');
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient {
    return this.supabaseClient;
  }

  /**
   * Get data from a table
   * @param table Table name
   * @param query Optional query modifiers
   */
  async get(table: string, query?: any): Promise<any> {
    let queryBuilder = this.supabaseClient.from(table).select('*');

    if (query) {
      // Apply filters, order, limit, etc. if provided
      if (query.filters) {
        Object.entries(query.filters).forEach(([column, value]) => {
          queryBuilder = queryBuilder.eq(column, value);
        });
      }

      if (query.order) {
        queryBuilder = queryBuilder.order(query.order.column, {
          ascending: query.order.ascending,
        });
      }

      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Insert data into a table
   * @param table Table name
   * @param data Data to insert
   */
  async insert(table: string, data: any): Promise<any> {
    const { data: result, error } = await this.supabaseClient
      .from(table)
      .insert(data)
      .select();

    if (error) {
      throw error;
    }

    return result;
  }

  /**
   * Update data in a table
   * @param table Table name
   * @param data Data to update
   * @param match Column conditions to match
   */
  async update(
    table: string,
    data: any,
    match: Record<string, any>,
  ): Promise<any> {
    let query = this.supabaseClient.from(table).update(data);

    // Apply match conditions
    Object.entries(match).forEach(([column, value]) => {
      query = query.eq(column, value);
    });

    const { data: result, error } = await query.select();

    if (error) {
      throw error;
    }

    return result;
  }

  /**
   * Delete data from a table
   * @param table Table name
   * @param match Column conditions to match
   */
  async delete(table: string, match: Record<string, any>): Promise<any> {
    let query = this.supabaseClient.from(table).delete();

    // Apply match conditions
    Object.entries(match).forEach(([column, value]) => {
      query = query.eq(column, value);
    });

    const { data: result, error } = await query.select();

    if (error) {
      throw error;
    }

    return result;
  }
}
