import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductTagDto, UpdateProductTagDto } from './dto';
import { ProductTag } from './entities/product-tag.entity';

/**
 * Service responsible for product tags business logic
 */
@Injectable()
export class ProductTagsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Create a new product tag
   * @param createProductTagDto Data for creating a new product tag
   * @returns The created product tag
   */
  async create(createProductTagDto: CreateProductTagDto): Promise<ProductTag> {
    try {
      // Normalize the tag name (lowercase, trim whitespace)
      const normalizedName = createProductTagDto.name.toLowerCase().trim();

      // Check if tag with this name already exists
      const { data: existingTag } = await this.supabaseService
        .getClient()
        .from('product_tags')
        .select('id, name')
        .eq('name', normalizedName)
        .single();

      if (existingTag) {
        throw new ConflictException(`Tag with name "${createProductTagDto.name}" already exists`);
      }

      // Create the new tag
      const { data, error } = await this.supabaseService
        .getClient()
        .from('product_tags')
        .insert({
          name: normalizedName,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new ConflictException(`Tag with name "${createProductTagDto.name}" already exists`);
        }
        throw new BadRequestException(`Failed to create product tag: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create product tag: ${error.message}`);
    }
  }

  /**
   * Find all product tags with optional search and pagination
   * @param options Query options for search and pagination
   * @returns Array of product tags with pagination metadata
   */
  async findAll(options: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const {
      search,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    let query = this.supabaseService
      .getClient()
      .from('product_tags')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search.toLowerCase()}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: tags, error, count } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch product tags: ${error.message}`);
    }

    return {
      items: tags || [],
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Find a single product tag by ID
   * @param id The ID of the product tag
   * @returns The product tag
   */
  async findOne(id: string): Promise<ProductTag> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Product tag with ID "${id}" not found`);
    }

    return data;
  }

  /**
   * Update a product tag
   * @param id The ID of the product tag to update
   * @param updateProductTagDto Data for updating the product tag
   * @returns The updated product tag
   */
  async update(id: string, updateProductTagDto: UpdateProductTagDto): Promise<ProductTag> {
    try {
      // First check if the tag exists
      await this.findOne(id);

      const updateData: any = {};

      // Normalize the name if provided
      if (updateProductTagDto.name) {
        const normalizedName = updateProductTagDto.name.toLowerCase().trim();
        
        // Check if another tag with this name exists
        const { data: existingTag } = await this.supabaseService
          .getClient()
          .from('product_tags')
          .select('id, name')
          .eq('name', normalizedName)
          .neq('id', id)
          .single();

        if (existingTag) {
          throw new ConflictException(`Tag with name "${updateProductTagDto.name}" already exists`);
        }

        updateData.name = normalizedName;
      }

      // If no changes to make
      if (Object.keys(updateData).length === 0) {
        return this.findOne(id);
      }

      const { data, error } = await this.supabaseService
        .getClient()
        .from('product_tags')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new ConflictException(`Tag with name "${updateProductTagDto.name}" already exists`);
        }
        throw new BadRequestException(`Failed to update product tag: ${error.message}`);
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update product tag: ${error.message}`);
    }
  }

  /**
   * Remove a product tag
   * @param id The ID of the product tag to remove
   * @returns The removed product tag
   */
  async remove(id: string): Promise<ProductTag> {
    // First get the tag to return it
    const tag = await this.findOne(id);

    const { error } = await this.supabaseService
      .getClient()
      .from('product_tags')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete product tag: ${error.message}`);
    }

    return tag;
  }

  /**
   * Find tags by partial name match (for autocomplete/suggestions)
   * @param query Search query
   * @param limit Maximum number of results
   * @returns Array of matching product tags
   */
  async findByNamePattern(query: string, limit: number = 10): Promise<ProductTag[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_tags')
      .select('*')
      .ilike('name', `%${query.toLowerCase().trim()}%`)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      throw new BadRequestException(`Failed to search product tags: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get tag suggestions for product creation
   * @param limit Maximum number of suggestions
   * @returns Array of popular/recent product tags
   */
  async getTagSuggestions(limit: number = 20): Promise<ProductTag[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_tags')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BadRequestException(`Failed to fetch tag suggestions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Bulk create tags from an array of names
   * @param tagNames Array of tag names to create
   * @returns Array of created or existing tags
   */
  async bulkCreateTags(tagNames: string[]): Promise<ProductTag[]> {
    if (!tagNames || tagNames.length === 0) {
      return [];
    }

    // Normalize all tag names
    const normalizedNames = [...new Set(tagNames.map(name => name.toLowerCase().trim()).filter(name => name.length > 0))];
    
    if (normalizedNames.length === 0) {
      return [];
    }

    try {
      // First, check which tags already exist
      const { data: existingTags } = await this.supabaseService
        .getClient()
        .from('product_tags')
        .select('*')
        .in('name', normalizedNames);

      const existingTagNames = new Set((existingTags || []).map(tag => tag.name));
      const newTagNames = normalizedNames.filter(name => !existingTagNames.has(name));

      // Create new tags
      let newTags: ProductTag[] = [];
      if (newTagNames.length > 0) {
        const tagsToInsert = newTagNames.map(name => ({ name }));
        
        const { data, error } = await this.supabaseService
          .getClient()
          .from('product_tags')
          .insert(tagsToInsert)
          .select();

        if (error) {
          throw new BadRequestException(`Failed to create tags: ${error.message}`);
        }

        newTags = data || [];
      }

      // Return all tags (existing + new)
      return [...(existingTags || []), ...newTags];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to bulk create tags: ${error.message}`);
    }
  }
} 