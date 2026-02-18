import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateCategoryOrderDto } from './dto/update-order.dto';
import { CreateCategoryImageDto } from './dto/create-category-image.dto';
import { Category } from './entities/category.entity';
import { SupabaseService } from '../supabase/supabase.service';
import { ImageOptimizationService } from '../../common/services/image-optimization.service';
import { CreateCategoryHierarchyDto, Level2CategoryDto, Level3CategoryDto, Level4CategoryDto } from './dto/create-category-hierarchy.dto';
import { CategoryWithSubcategories } from './types/category.types';
import * as fs from 'fs';

/**
 * Service responsible for category business logic
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly imageOptimizationService: ImageOptimizationService,
  ) {}

  /**
   * Find all categories with optional nesting
   * @param nested Whether to include nested subcategories
   * @returns Array of categories
   */
  async findAll(nested: boolean = false): Promise<Category[]> {
    const { data: categories, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      throw error;
    }

    // If not nested, return flat list
    if (!nested) {
      return categories;
    }

    // If nested, only return top-level categories with their subcategories
    const topLevelCategories = categories.filter(
      (category) => category.parent_id === null
    );

    // Populate subcategories for each top-level category
    return topLevelCategories.map((category) => 
      this.populateSubcategories(category, categories)
    );
  }

  /**
   * Find popular categories for featured display
   * @param limit Maximum number of categories to return
   * @param includeImages Whether to include associated product images
   * @returns Array of popular categories
   */
  async findPopularCategories(limit: number = 4, includeImages: boolean = true): Promise<any[]> {
    // Get top-level categories ordered by their display order
    const { data: categories, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .is('parent_id', null)  // Only top-level categories
      .order('order', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    // If we don't need images, just return the categories
    if (!includeImages) {
      return categories;
    }

    // For each category, get a representative product image
    const categoriesWithImages = await Promise.all(
      categories.map(async (category) => {
        // Find a product in this category that has images
        const { data: productImages, error: imagesError } = await this.supabaseService
          .getClient()
          .from('product_images')
          .select('url, product_id, products!inner(category_id)')
          .eq('products.category_id', category.id)
          .eq('type', 'main')  // Main product images
          .limit(1);

        if (imagesError) {
          console.error(`Error fetching image for category ${category.id}:`, imagesError);
          return { ...category, image_url: null };
        }

        return {
          ...category,
          image_url: productImages.length > 0 ? productImages[0].url : null,
        };
      })
    );

    return categoriesWithImages;
  }

  /**
   * Find featured categories
   * @param limit Maximum number of categories to return
   * @returns Array of featured categories
   */
  async findFeaturedCategories(limit?: number): Promise<Category[]> {
    let query = this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .eq('featured', true)
      .order('order', { ascending: true });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: categories, error } = await query;

    if (error) {
      throw error;
    }

    return categories;
  }

  /**
   * Find a specific category by ID
   * @param id Category ID
   * @returns Category details
   */
  async findOne(id: string): Promise<Category> {
    const { data: category, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    
    return category;
  }

  /**
   * Get all subcategories of a specific category
   * @param parentId Parent category ID
   * @returns Array of subcategories
   */
  async findSubcategories(parentId: string): Promise<Category[]> {
    // First verify parent exists
    await this.findOne(parentId);
    
    const { data: subcategories, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .order('order', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    return subcategories;
  }

  /**
   * Get all products in a specific category
   * @param categoryId Category ID
   * @param page Page number for pagination
   * @param limit Number of items per page
   * @returns Array of products in the category
   */
  async findProducts(categoryId: string, page: number = 1, limit: number = 10) {
    // First verify category exists
    await this.findOne(categoryId);
    
    const offset = (page - 1) * limit;
    
    const { data: products, error, count } = await this.supabaseService
      .getClient()
      .from('products')
      .select('*', { count: 'exact' })
      .eq('category_id', categoryId)
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw error;
    }
    
    return {
      items: products,
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }
    };
  }

  /**
   * Create a new category
   * @param createCategoryDto Category data
   * @returns Newly created category
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if parent exists if provided
    if (createCategoryDto.parent_id !== undefined && createCategoryDto.parent_id !== null) {
      await this.findOne(createCategoryDto.parent_id);
    }
    
    // Generate slug if not provided
    const slug = createCategoryDto.slug || this.generateSlug(createCategoryDto.name);
    
    // Check if slug is unique
    const { data: existingCategory, error: slugCheckError } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    
    if (slugCheckError) {
      throw slugCheckError;
    }
    
    if (existingCategory) {
      throw new Error(`A category with slug "${slug}" already exists`);
    }
    
    // Get the next order value for sorting
    const order = createCategoryDto.order ?? await this.getNextOrder(createCategoryDto.parent_id ?? null);
    
    // Create the category
    const { data: newCategory, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .insert({
        name: createCategoryDto.name,
        slug,
        parent_id: createCategoryDto.parent_id || null,
        description: createCategoryDto.description || null,
        order,
        image_url: createCategoryDto.image_url || null,
        featured: createCategoryDto.featured || false,
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return newCategory;
  }

  /**
   * Update an existing category
   * @param id Category ID
   * @param updateCategoryDto Updated category data
   * @returns Updated category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    // First verify category exists
    await this.findOne(id);
    
    // If updating parent, verify parent exists
    if (updateCategoryDto.parent_id !== undefined && updateCategoryDto.parent_id !== null) {
      await this.findOne(updateCategoryDto.parent_id);
      
      // Prevent setting parent to self
      if (updateCategoryDto.parent_id === id) {
        throw new Error('A category cannot be its own parent');
      }
      
      // Check for cyclic hierarchy
      await this.checkCyclicHierarchy(id, updateCategoryDto.parent_id);
    }
    
    // If updating slug, check uniqueness
    if (updateCategoryDto.slug) {
      const { data: existingCategory, error: slugCheckError } = await this.supabaseService
        .getClient()
        .from('categories')
        .select('id')
        .eq('slug', updateCategoryDto.slug)
        .neq('id', id)  // Exclude the current category
        .maybeSingle();
      
      if (slugCheckError) {
        throw slugCheckError;
      }
      
      if (existingCategory) {
        throw new Error(`A category with slug "${updateCategoryDto.slug}" already exists`);
      }
    }
    
    // Update the category
    const { data: updatedCategory, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .update({
        name: updateCategoryDto.name,
        slug: updateCategoryDto.slug,
        parent_id: updateCategoryDto.parent_id,
        description: updateCategoryDto.description,
        order: updateCategoryDto.order,
        image_url: updateCategoryDto.image_url,
        featured: updateCategoryDto.featured,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return updatedCategory;
  }

  /**
   * Update a category's display order
   * @param id Category ID
   * @param updateOrderDto Updated order data
   * @returns Updated category
   */
  async updateOrder(id: string, updateOrderDto: UpdateCategoryOrderDto): Promise<Category> {
    // First verify category exists
    const category = await this.findOne(id);
    
    // Update the order
    const { data: updatedCategory, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .update({
        order: updateOrderDto.order,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return updatedCategory;
  }

  /**
   * Delete a category
   * @param id Category ID
   * @returns Deleted category
   */
  async remove(id: string): Promise<Category> {
    // First verify category exists
    const category = await this.findOne(id);
    
    // Check if category has subcategories
    const { data: subcategories, error: subError } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('id')
      .eq('parent_id', id);
    
    if (subError) {
      throw subError;
    }
    
    if (subcategories && subcategories.length > 0) {
      throw new Error('Cannot delete a category with subcategories. Move or delete the subcategories first.');
    }
    
    // Check if category has products
    const { data: products, error: prodError } = await this.supabaseService
      .getClient()
      .from('products')
      .select('id')
      .eq('category_id', id);
    
    if (prodError) {
      throw prodError;
    }
    
    if (products && products.length > 0) {
      throw new Error('Cannot delete a category with products. Move or delete the products first.');
    }
    
    // Delete the category
    const { error } = await this.supabaseService
      .getClient()
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return category;
  }

  /**
   * Helper method to recursively populate subcategories
   * @param category Parent category
   * @param allCategories All categories from database
   * @returns Category with populated subcategories
   */
  private populateSubcategories(category: Category, allCategories: Category[]): Category {
    const subcategories = allCategories
      .filter(c => c.parent_id === category.id)
      .map(sub => this.populateSubcategories(sub, allCategories));
    
    return {
      ...category,
      subcategories,
    };
  }

  /**
   * Generate a URL-friendly slug from a name
   * @param name Category name
   * @returns Slug
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
      .substring(0, 100);           // Limit length
  }

  /**
   * Get the next available order value for a given parent
   * @param parentId Parent category ID or null for top-level
   * @returns Next order value
   */
  private async getNextOrder(parentId: string | null): Promise<number> {
    const { data: categories, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .select('order')
      .eq('parent_id', parentId)
      .order('order', { ascending: false })
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return categories.length > 0 ? categories[0].order + 1 : 0;
  }

  /**
   * Check if setting a new parent would create a cyclic hierarchy
   * @param categoryId Category ID
   * @param newParentId New parent ID
   */
  private async checkCyclicHierarchy(categoryId: string, newParentId: string): Promise<void> {
    let currentId = newParentId;
    
    while (currentId !== null) {
      if (currentId === categoryId) {
        throw new Error('Setting this parent would create a cyclic hierarchy');
      }
      
      const { data: parent, error } = await this.supabaseService
        .getClient()
        .from('categories')
        .select('parent_id')
        .eq('id', currentId)
        .single();
      
      if (error) {
        throw error;
      }
      
      currentId = parent.parent_id;
    }
  }

  /**
   * Creates a hierarchy of categories with up to 4 levels of nesting
   * @param hierarchyDto The hierarchy data containing nested subcategories
   * @returns The created top-level category with IDs of all subcategories
   */
  async createCategoryHierarchy(hierarchyDto: CreateCategoryHierarchyDto): Promise<CategoryWithSubcategories> {
    // Create the top-level (level 1) category
    const level1Category = await this.create({
      name: hierarchyDto.name,
      slug: hierarchyDto.slug,
      description: hierarchyDto.description,
      order: hierarchyDto.order,
      image_url: hierarchyDto.image_url,
      featured: hierarchyDto.featured,
      parent_id: undefined // This is a top-level category, so parent_id is undefined
    });

    const result: CategoryWithSubcategories = {
      ...level1Category,
      subcategories: []
    };

    // Create level 2 subcategories if they exist
    if (hierarchyDto.subcategories && hierarchyDto.subcategories.length > 0) {
      result.subcategories = await Promise.all(
        hierarchyDto.subcategories.map(async (level2Dto: Level2CategoryDto) => {
          const level2Result = await this.createLevel2Category(level2Dto, level1Category.id);
          return level2Result;
        })
      );
    }

    return result;
  }

  /**
   * Creates a level 2 category and its subcategories
   * @param level2Dto Level 2 category data
   * @param parentId Parent category ID
   * @returns Created level 2 category with subcategory IDs
   */
  private async createLevel2Category(level2Dto: Level2CategoryDto, parentId: string): Promise<CategoryWithSubcategories> {
    // Create the level 2 category
    const level2Category = await this.create({
      name: level2Dto.name,
      slug: level2Dto.slug,
      description: level2Dto.description,
      order: level2Dto.order,
      image_url: level2Dto.image_url,
      featured: level2Dto.featured,
      parent_id: parentId
    });

    const result: CategoryWithSubcategories = {
      ...level2Category,
      subcategories: []
    };

    // Create level 3 subcategories if they exist
    if (level2Dto.subcategories && level2Dto.subcategories.length > 0) {
      result.subcategories = await Promise.all(
        level2Dto.subcategories.map(async (level3Dto: Level3CategoryDto) => {
          const level3Result = await this.createLevel3Category(level3Dto, level2Category.id);
          return level3Result;
        })
      );
    }

    return result;
  }

  /**
   * Creates a level 3 category and its subcategories
   * @param level3Dto Level 3 category data
   * @param parentId Parent category ID
   * @returns Created level 3 category with subcategory IDs
   */
  private async createLevel3Category(level3Dto: Level3CategoryDto, parentId: string): Promise<CategoryWithSubcategories> {
    // Create the level 3 category
    const level3Category = await this.create({
      name: level3Dto.name,
      slug: level3Dto.slug,
      description: level3Dto.description,
      order: level3Dto.order,
      image_url: level3Dto.image_url,
      featured: level3Dto.featured,
      parent_id: parentId
    });

    const result: CategoryWithSubcategories = {
      ...level3Category,
      subcategories: []
    };

    // Create level 4 subcategories if they exist
    if (level3Dto.subcategories && level3Dto.subcategories.length > 0) {
      result.subcategories = await Promise.all(
        level3Dto.subcategories.map(async (level4Dto: Level4CategoryDto) => {
          // Create the level 4 category
          const level4Category = await this.create({
            name: level4Dto.name,
            slug: level4Dto.slug,
            description: level4Dto.description,
            order: level4Dto.order,
            image_url: level4Dto.image_url,
            featured: level4Dto.featured,
            parent_id: level3Category.id
          });

          // Level 4 categories don't have subcategories in our model
          return {
            ...level4Category,
            subcategories: []
          } as CategoryWithSubcategories;
        })
      );
    }

    return result;
  }

  /**
   * Upload and set category image
   * @param categoryId Category ID
   * @param createImageDto Image data
   * @returns Updated category with new image URL
   */
  async uploadCategoryImage(categoryId: string, createImageDto: CreateCategoryImageDto): Promise<Category> {
    console.log('Service received image DTO:', JSON.stringify({
      ...createImageDto,
      imageFile: createImageDto.imageFile ? 'File object present' : 'No file'
    }));
    
    // Check if category exists and get current image URL
    const category = await this.findOne(categoryId);
    const oldImageUrl = category.image_url;
    
    // Validate input
    if (!createImageDto.hasValidInput()) {
      throw new Error('Either url or imageFile must be provided');
    }
    
    let imageUrl: string;
    
    if (createImageDto.url) {
      // Use provided URL directly
      imageUrl = createImageDto.url;
    } else if (createImageDto.imageFile) {
      // Upload file to storage
      imageUrl = await this.uploadFileToStorage(
        createImageDto.imageFile.buffer || createImageDto.imageFile.path,
        createImageDto.imageFile.originalname,
        'category-images'
      );
    } else {
      throw new Error('No valid image source provided');
    }
    
    // Update category with new image URL
    const { data: updatedCategory, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .update({ image_url: imageUrl })
      .eq('id', categoryId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Clean up old image if it exists and is from our storage
    if (oldImageUrl && oldImageUrl !== imageUrl) {
      await this.deleteImageFromStorage(oldImageUrl, 'category-images');
    }
    
    return updatedCategory;
  }

  /**
   * Remove category image
   * @param categoryId Category ID
   * @returns Updated category without image
   */
  async removeCategoryImage(categoryId: string): Promise<Category> {
    // Check if category exists and get current image URL
    const category = await this.findOne(categoryId);
    const currentImageUrl = category.image_url;
    
    // Update category to remove image URL
    const { data: updatedCategory, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .update({ image_url: null })
      .eq('id', categoryId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Clean up the image file from storage if it exists
    if (currentImageUrl) {
      await this.deleteImageFromStorage(currentImageUrl, 'category-images');
    }
    
    return updatedCategory;
  }

  /**
   * Toggle featured status of a category
   * @param categoryId Category ID
   * @param featured New featured status
   * @returns Updated category
   */
  async toggleFeatured(categoryId: string, featured: boolean): Promise<Category> {
    // Check if category exists
    const category = await this.findOne(categoryId);
    
    // Update category featured status
    const { data: updatedCategory, error } = await this.supabaseService
      .getClient()
      .from('categories')
      .update({ featured })
      .eq('id', categoryId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return updatedCategory;
  }

  /**
   * Upload a file to Supabase storage with automatic image optimization
   * @param filePath Path to file or Buffer
   * @param filename The name to use for the file
   * @param bucketName The storage bucket name (default: 'category-images')
   * @returns The public URL of the uploaded file
   */
  private async uploadFileToStorage(
    filePath: string | Buffer,
    filename: string,
    bucketName: string = 'category-images'
  ): Promise<string> {
    let fileBuffer: Buffer;
    let shouldCleanup = false;
    let actualFilePath: string = '';
    
    try {
      console.log(`Starting upload process for '${filename}' to bucket '${bucketName}'...`);
      
      // Handle both file path (diskStorage) and buffer (memoryStorage)
      if (typeof filePath === 'string') {
        // Read file from disk
        actualFilePath = filePath;
        shouldCleanup = true;
        
        // Check if file exists before reading
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }
        
        fileBuffer = fs.readFileSync(filePath);
        console.log(`Read file from disk: ${filePath}, size: ${this.formatBytes(fileBuffer.length)}`);
      } else {
        // Use buffer directly
        fileBuffer = filePath;
        console.log(`Using buffer directly, size: ${this.formatBytes(fileBuffer.length)}`);
      }
      
      // Validate buffer
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }

      // Check if the file is an image that can be optimized
      const isImage = this.imageOptimizationService.isSupportedImageFormat(filename);
      
      let finalBuffer = fileBuffer;
      let finalFilename = filename;
      
      if (isImage) {
        try {
          console.log(`Optimizing image: ${filename}`);
          
          // Optimize the image for categories (smaller size)
          const optimizationResult = await this.imageOptimizationService.optimizeImageFromBuffer(
            fileBuffer,
            {
              maxWidth: 1200,
              maxHeight: 800,
              quality: 85,
              format: 'auto',
              progressive: true,
              removeMetadata: true,
            },
            filename
          );
          
          finalBuffer = optimizationResult.buffer;
          finalFilename = optimizationResult.filename;
          
          console.log(
            `Image optimization complete: ` +
            `${this.formatBytes(optimizationResult.originalSize)} → ${this.formatBytes(optimizationResult.optimizedSize)} ` +
            `(${optimizationResult.compressionRatio.toFixed(1)}% reduction)`
          );
          
        } catch (optimizationError) {
          // If optimization fails, log warning but continue with original image
          console.warn(`Image optimization failed for ${filename}: ${optimizationError.message}`);
          console.warn('Continuing with original image...');
        }
      } else {
        console.log(`File ${filename} is not an image or not supported for optimization, uploading as-is`);
      }
      
      // Generate a unique filename to prevent conflicts
      const uniqueFilename = `categories/${Date.now()}-${finalFilename}`;
      console.log(`Uploading optimized file '${uniqueFilename}' to bucket '${bucketName}'...`);
      
      // Create bucket if it doesn't exist
      await this.ensureBucketExists(bucketName);
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await this.supabaseService
        .getClient()
        .storage
        .from(bucketName)
        .upload(uniqueFilename, finalBuffer, {
          contentType: this.getContentType(finalFilename),
          upsert: true
        });
        
      if (uploadError) {
        throw new Error(`Failed to upload file to Supabase: ${uploadError.message}`);
      }
      
      console.log(`Successfully uploaded file to Supabase Storage`);
      
      // Get the public URL
      const { data } = this.supabaseService
        .getClient()
        .storage
        .from(bucketName)
        .getPublicUrl(uniqueFilename);
        
      if (!data || !data.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      console.log(`Generated public URL: ${data.publicUrl}`);
      return data.publicUrl;
      
    } catch (error) {
      console.error('Error uploading file to Supabase storage:', error);
      throw new Error(`File upload failed: ${error.message}`);
    } finally {
      // Always clean up the temporary file if it was read from disk
      if (shouldCleanup && actualFilePath) {
        try {
          if (fs.existsSync(actualFilePath)) {
            fs.unlinkSync(actualFilePath);
            console.log(`✅ Cleaned up temporary file: ${actualFilePath}`);
          }
        } catch (cleanupError) {
          console.error(`❌ Failed to clean up temporary file ${actualFilePath}:`, cleanupError.message);
        }
      }
    }
  }

  /**
   * Ensure the storage bucket exists
   * @param bucketName The bucket name
   */
  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      const { data: buckets, error: listError } = await this.supabaseService
        .getClient()
        .storage
        .listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return; // Continue anyway, bucket might exist
      }
      
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Creating bucket: ${bucketName}`);
        const { error: createError } = await this.supabaseService
          .getClient()
          .storage
          .createBucket(bucketName, { public: true });
        
        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
          // Continue anyway, might be a permissions issue
        } else {
          console.log(`Successfully created bucket: ${bucketName}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      // Continue anyway
    }
  }

  /**
   * Format bytes to human readable string
   * @param bytes Number of bytes
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Determine content type based on file extension
   * @param filename The filename to check
   * @returns The content type
   */
  private getContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'tif': 'image/tiff',
      'ico': 'image/x-icon',
      'jfif': 'image/jpeg',
      'pjpeg': 'image/jpeg',
      'pjp': 'image/jpeg',
      'avif': 'image/avif'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Delete an image file from Supabase storage
   * @param imageUrl The full URL of the image to delete
   * @param bucketName The storage bucket name
   */
  private async deleteImageFromStorage(imageUrl: string, bucketName: string): Promise<void> {
    try {
      // Check if this is a Supabase storage URL
      if (!this.isSupabaseStorageUrl(imageUrl)) {
        console.log(`Image URL is not from our Supabase storage, skipping deletion: ${imageUrl}`);
        return;
      }

      // Extract the file path from the URL
      const filePath = this.extractFilePathFromUrl(imageUrl, bucketName);
      if (!filePath) {
        console.warn(`Could not extract file path from URL: ${imageUrl}`);
        return;
      }

      console.log(`Attempting to delete file: ${filePath} from bucket: ${bucketName}`);

      // Delete the file from Supabase storage
      const { error } = await this.supabaseService
        .getClient()
        .storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error(`Failed to delete image from storage: ${error.message}`);
        // Don't throw error - log it and continue, as the main operation already succeeded
      } else {
        console.log(`✅ Successfully deleted old image: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error deleting image from storage: ${error.message}`);
      // Don't throw error - the main operation (updating category) already succeeded
    }
  }

  /**
   * Check if the URL is from our Supabase storage
   * @param url The URL to check
   * @returns True if it's a Supabase storage URL
   */
  private isSupabaseStorageUrl(url: string): boolean {
    try {
      // Check for common Supabase storage URL patterns
      const supabasePatterns = [
        '/storage/v1/object/public/',
        '.supabase.co/storage/',
        '.supabase.in/storage/'
      ];
      
      return supabasePatterns.some(pattern => url.includes(pattern));
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract the file path from a Supabase storage URL
   * @param url The full Supabase storage URL
   * @param bucketName The expected bucket name
   * @returns The file path within the bucket
   */
  private extractFilePathFromUrl(url: string, bucketName: string): string | null {
    try {
      // Pattern: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const regex = new RegExp(`/storage/v1/object/public/${bucketName}/(.+)$`);
      const match = url.match(regex);
      
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
      
      // Alternative pattern: try to find the bucket name and extract everything after it
      const bucketIndex = url.indexOf(`/${bucketName}/`);
      if (bucketIndex !== -1) {
        const pathStart = bucketIndex + `/${bucketName}/`.length;
        return decodeURIComponent(url.substring(pathStart));
      }
      
      return null;
    } catch (error) {
      console.error(`Error extracting file path from URL: ${error.message}`);
      return null;
    }
  }

  /**
   * Clean up orphaned category image files from storage
   * Files that exist in storage but are not referenced by any category
   */
  async cleanupOrphanedCategoryImages(): Promise<void> {
    try {
      console.log('Starting cleanup of orphaned category images...');
      
      const bucketName = 'category-images';
      
      // Get all files in the category-images bucket
      const { data: files, error: listError } = await this.supabaseService
        .getClient()
        .storage
        .from(bucketName)
        .list('', {
          limit: 1000,
          offset: 0
        });
      
      if (listError) {
        console.error(`Error listing files in bucket ${bucketName}:`, listError);
        return;
      }
      
      if (!files || files.length === 0) {
        console.log('No files found in category-images bucket');
        return;
      }
      
      console.log(`Found ${files.length} files in storage`);
      
      // Get all category image URLs from database
      const { data: categories, error: dbError } = await this.supabaseService
        .getClient()
        .from('categories')
        .select('image_url')
        .not('image_url', 'is', null);
      
      if (dbError) {
        console.error('Error fetching category image URLs from database:', dbError);
        return;
      }
      
      // Extract file paths from URLs
      const usedFilePaths = new Set<string>();
      if (categories) {
        for (const category of categories) {
          if (category.image_url) {
            const filePath = this.extractFilePathFromUrl(category.image_url, bucketName);
            if (filePath) {
              usedFilePaths.add(filePath);
            }
          }
        }
      }
      
      console.log(`Found ${usedFilePaths.size} files referenced in database`);
      
      // Find orphaned files (files in storage but not referenced in database)
      const orphanedFiles: string[] = [];
      for (const file of files) {
        // Skip folders
        if (file.name.endsWith('/')) continue;
        
        const fullPath = file.name;
        if (!usedFilePaths.has(fullPath)) {
          orphanedFiles.push(fullPath);
        }
      }
      
      if (orphanedFiles.length === 0) {
        console.log('No orphaned files found');
        return;
      }
      
      console.log(`Found ${orphanedFiles.length} orphaned files to delete:`, orphanedFiles);
      
      // Delete orphaned files in batches (Supabase has limits)
      const batchSize = 50;
      let deletedCount = 0;
      
      for (let i = 0; i < orphanedFiles.length; i += batchSize) {
        const batch = orphanedFiles.slice(i, i + batchSize);
        
        const { error: deleteError } = await this.supabaseService
          .getClient()
          .storage
          .from(bucketName)
          .remove(batch);
        
        if (deleteError) {
          console.error(`Error deleting batch of files:`, deleteError);
          console.error(`Failed batch:`, batch);
        } else {
          deletedCount += batch.length;
          console.log(`✅ Deleted ${batch.length} orphaned files (total: ${deletedCount}/${orphanedFiles.length})`);
        }
      }
      
      console.log(`🎉 Cleanup completed! Deleted ${deletedCount} orphaned files`);
      
    } catch (error) {
      console.error('Error during orphaned images cleanup:', error);
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }
} 