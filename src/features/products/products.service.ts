/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductImage } from './entities/product-image.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { SearchDataResponseDto } from './dto/search-data-response.dto';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/entities/category.entity';
import { parse as csvParse } from 'csv-parse/sync';
import { ProductCsvRow } from './entities/product-csv-row.entity';
import { ProductImportResultDto } from './dto/product-import.dto';
import { ImageOptimizationService } from '../../common/services/image-optimization.service';
import * as fs from 'fs';
import { Discount } from '../discounts/entities/discount.entity';

// Define interfaces for category objects with parent relationships
interface CategoryWithParent extends Category {
  parent?: Category;
}

interface ProductWithCategory extends Product {
  category?: CategoryWithParent;
}

/**
 * Service responsible for product business logic
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly categoriesService: CategoriesService,
    private readonly imageOptimizationService: ImageOptimizationService,
  ) {
    // Automatically clean up old files on service startup
    this.cleanupUploadsDirectory(60).catch((error) => {
      console.warn(
        'Failed to cleanup uploads directory on startup:',
        error.message,
      );
    });
  }

  /**
   * Find all products with optional filtering, pagination, and sorting
   * Consolidated method that handles all product filtering including size, material, search, and price range
   * @param options Query options for filtering, pagination, and sorting
   * @returns Array of products with pagination metadata
   */
  async findAll(
    options: {
      categoryId?: string;
      size?: string;
      material?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: 'price_low_high' | 'price_high_low' | 'rating' | 'created_at';
      priceRange?:
        | 'all'
        | `under-${number}`
        | `${number}-${number}`
        | `over-${number}`;
      includeVariants?: boolean;
      includeImages?: boolean;
      includeCategory?: boolean;
    } = {},
  ) {
    const {
      categoryId,
      size,
      material,
      search,
      page = 1,
      limit,
      sortBy = 'created_at',
      priceRange = 'all',
      includeVariants = true,
      includeImages = false,
      includeCategory = false,
    } = options;

    // Determine sort order based on sortBy (always desc unless price_low_high)
    const sortOrder = sortBy === 'price_low_high' ? 'asc' : 'desc';

    // When search is provided, ignore all other filters and use search-only logic
    if (search && search.trim()) {
      return this.findProductsWithSearch({
        search: search.trim(),
        page,
        limit,
        sortBy,
        sortOrder,
        includeVariants,
        includeImages,
        includeCategory,
      });
    }

    // Step 1: Handle hierarchical category filtering
    let categoryIds: string[] | null = null;
    if (categoryId) {
      categoryIds = await this.getCategoryWithDescendants(categoryId);
      console.log(
        `Filtering by category ${categoryId} and its descendants:`,
        categoryIds,
      );
    }

    // Step 2: Handle size/material filtering by finding matching product IDs from variants
    let filteredProductIds: string[] | null = null;

    if (size || material) {
      filteredProductIds = await this.getProductIdsByVariantFilters({
        size,
        material,
      });

      // If no products match the variant filters, return empty results
      if (filteredProductIds.length === 0) {
        return {
          items: [],
          meta: { page, limit, totalItems: 0, totalPages: 0 },
        };
      }
    }

    // Step 3: Build main products query with all filters
    let query = this.supabaseService
      .getClient()
      .from('products')
      .select(
        `*${includeVariants ? ', variants:product_variants(*)' : ''}${
          includeImages ? ', images:product_images(*)' : ''
        }${includeCategory ? ', category:categories!inner(*)' : ''}`,
        { count: 'exact' },
      );

    // Apply hierarchical category filter (category + all descendants)
    if (categoryIds && categoryIds.length > 0) {
      if (categoryIds.length === 1) {
        // Single category - use eq for better performance
        query = query.eq('category_id', categoryIds[0]);
      } else {
        // Multiple categories (parent + descendants) - use in
        query = query.in('category_id', categoryIds);
      }
    }

    // Apply variant-based product ID filter (for size/material filtering)
    if (filteredProductIds) {
      query = query.in('id', filteredProductIds);
    }

    // Only show visible products
    query = query.eq('is_visible', true);

    // Apply price range filter on base_price
    query = this.applyPriceRangeFilter(query, priceRange);

    // Apply sorting based on sortBy parameter
    query = this.applySorting(query, sortBy, sortOrder);

    // Apply pagination if limit is provided
    if (limit) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    // Execute query
    const { data: products, error, count } = await query;

    if (error) {
      throw error;
    }

    // Step 4: Post-process products to filter variants if size/material was specified
    let processedProducts = products || [];

    if ((size || material) && includeVariants) {
      processedProducts = this.filterProductVariants(processedProducts, {
        size,
        material,
      });
    }

    // Step 5: Enhance with category details if requested
    if (includeCategory && processedProducts.length > 0) {
      processedProducts =
        await this.enhanceProductsWithCategoryDetails(processedProducts);
    }

    return {
      items: processedProducts,
      meta: {
        page,
        limit: limit || null,
        totalItems: count || 0,
        totalPages: limit ? Math.ceil((count || 0) / limit) : 1,
      },
    };
  }

  /**
   * Helper: Get category ID and all its descendant category IDs using application logic
   * @param categoryId The parent category ID
   * @returns Array of category IDs including the parent and all descendants
   */
  private async getCategoryWithDescendants(
    categoryId: string,
  ): Promise<string[]> {
    try {
      // First, get all categories to build the hierarchy tree
      const { data: allCategories, error } = await this.supabaseService
        .getClient()
        .from('categories')
        .select('id, name, parent_id');

      if (error) {
        console.error('Error getting all categories:', error);
        // Fallback to just the original category ID if query fails
        return [categoryId];
      }

      if (!allCategories || allCategories.length === 0) {
        return [categoryId];
      }

      // Build a map for faster lookups: parent_id -> array of child categories
      const childrenMap = new Map<string, any[]>();

      allCategories.forEach((category) => {
        const parentId = category.parent_id || 'root';
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(category);
      });

      // Recursively find all descendants
      const findDescendants = (parentId: string): string[] => {
        const descendants: string[] = [parentId]; // Include the parent itself
        const children = childrenMap.get(parentId) || [];

        for (const child of children) {
          // Recursively get descendants of each child
          descendants.push(...findDescendants(child.id));
        }

        return descendants;
      };

      const categoryIds = findDescendants(categoryId);

      console.log(
        `Category ${categoryId} expanded to include descendants:`,
        categoryIds,
      );
      return categoryIds;
    } catch (error) {
      console.error('Exception getting category descendants:', error);
      // Fallback to just the original category ID
      return [categoryId];
    }
  }

  /**
   * Helper: Find product IDs that have variants matching size/material filters
   * @param filters Object containing size and/or material filters
   * @returns Array of product IDs that have matching variants
   */
  private async getProductIdsByVariantFilters(filters: {
    size?: string;
    material?: string;
  }): Promise<string[]> {
    const { size, material } = filters;

    // Build variant query with filters
    let variantQuery = this.supabaseService
      .getClient()
      .from('product_variants')
      .select('product_id');

    // Apply size filter if provided
    if (size && size.trim()) {
      variantQuery = variantQuery.ilike('size', `%${size.trim()}%`);
    }

    // Apply material filter if provided
    if (material && material.trim()) {
      variantQuery = variantQuery.ilike('material', `%${material.trim()}%`);
    }

    const { data: variants, error } = await variantQuery;

    if (error) {
      throw error;
    }

    // Extract unique product IDs
    const productIds = [...new Set((variants || []).map((v) => v.product_id))];
    return productIds;
  }

  /**
   * Helper: Handle search-only queries (ignores other filters when search is provided)
   * @param options Search-specific options
   * @returns Search results with pagination
   */
  private async findProductsWithSearch(options: {
    search: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeVariants?: boolean;
    includeImages?: boolean;
    includeCategory?: boolean;
  }): Promise<any> {
    const {
      search,
      page = 1,
      limit,
      sortBy = 'created_at',
      sortOrder = 'asc',
      includeVariants = true,
      includeImages = false,
      includeCategory = false,
    } = options;

    // Build search query using simple ILIKE pattern matching
    let query = this.supabaseService
      .getClient()
      .from('products')
      .select(
        `*${includeVariants ? ', variants:product_variants(*)' : ''}${
          includeImages ? ', images:product_images(*)' : ''
        }${includeCategory ? ', category:categories!inner(*)' : ''}`,
        { count: 'exact' },
      )
      .or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      .eq('is_visible', true);

    // Apply sorting
    query = this.applySorting(query, sortBy, sortOrder);

    // Apply pagination if limit is provided
    if (limit) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data: products, error, count } = await query;

    if (error) {
      throw error;
    }

    // Enhance with category details if requested
    let enhancedProducts = products || [];
    if (includeCategory && enhancedProducts.length > 0) {
      enhancedProducts =
        await this.enhanceProductsWithCategoryDetails(enhancedProducts);
    }

    return {
      items: enhancedProducts,
      meta: {
        page,
        limit: limit || null,
        totalItems: count || 0,
        totalPages: limit ? Math.ceil((count || 0) / limit) : 1,
      },
    };
  }

  /**
   * Helper: Apply price range filtering to query
   * @param query Supabase query builder instance
   * @param priceRange Price range filter string
   * @returns Modified query with price filter applied
   */
  private applyPriceRangeFilter(query: any, priceRange: string): any {
    if (!priceRange || priceRange === 'all') {
      return query;
    }

    // Parse price range patterns
    if (priceRange.startsWith('under-')) {
      const maxPrice = parseInt(priceRange.replace('under-', ''));
      if (!isNaN(maxPrice)) {
        query = query.lt('base_price', maxPrice);
      }
    } else if (priceRange.startsWith('over-')) {
      const minPrice = parseInt(priceRange.replace('over-', ''));
      if (!isNaN(minPrice)) {
        query = query.gt('base_price', minPrice);
      }
    } else if (priceRange.includes('-')) {
      const [minStr, maxStr] = priceRange.split('-');
      const minPrice = parseInt(minStr);
      const maxPrice = parseInt(maxStr);

      if (!isNaN(minPrice) && !isNaN(maxPrice)) {
        query = query.gte('base_price', minPrice).lte('base_price', maxPrice);
      }
    }

    return query;
  }

  /**
   * Helper: Apply sorting to query based on sortBy parameter
   * @param query Supabase query builder instance
   * @param sortBy Sort field
   * @param sortOrder Sort direction
   * @returns Modified query with sorting applied
   */
  private applySorting(
    query: any,
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): any {
    switch (sortBy) {
      case 'price_low_high':
        return query.order('base_price', { ascending: true });
      case 'price_high_low':
        return query.order('base_price', { ascending: false });
      case 'rating':
        // Assuming you have a rating field, otherwise fallback to created_at
        return query
          .order('rating', { ascending: sortOrder === 'asc' })
          .order('created_at', { ascending: false }); // Secondary sort
      case 'created_at':
        return query.order('created_at', { ascending: sortOrder === 'asc' });
      default:
        // Default sorting by created_at desc (newest first)
        return query.order('created_at', { ascending: false });
    }
  }

  /**
   * Helper: Filter product variants to only include those matching size/material criteria
   * @param products Array of products with variants
   * @param filters Size and material filters
   * @returns Products with filtered variants
   */
  private filterProductVariants(
    products: any[],
    filters: {
      size?: string;
      material?: string;
    },
  ): any[] {
    const { size, material } = filters;

    return products.map((product) => {
      if (!product.variants || !Array.isArray(product.variants)) {
        return product;
      }

      // Filter variants to only include those matching the criteria
      const filteredVariants = product.variants.filter((variant: any) => {
        let matches = true;

        // Check size match
        if (size && size.trim()) {
          const variantSize = variant.size || '';
          matches =
            matches && variantSize.toLowerCase().includes(size.toLowerCase());
        }

        // Check material match
        if (material && material.trim()) {
          const variantMaterial = variant.material || '';
          matches =
            matches &&
            variantMaterial.toLowerCase().includes(material.toLowerCase());
        }

        return matches;
      });

      return {
        ...product,
        variants: filteredVariants,
      };
    });
  }

  async findProductsBySize(options: {
    size: string;
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      size,
      page = 1,
      limit = 10,
      search,
      sortBy = 'id',
      sortOrder = 'asc',
    } = options;

    // Step 1: Find product_ids with at least one variant of the given size
    const { data: variants, error: variantsError } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select('product_id')
      .ilike('size', `%${size}%`);

    if (variantsError) throw variantsError;

    const productIds = [...new Set((variants || []).map((v) => v.product_id))];
    if (productIds.length === 0) {
      return { items: [], meta: { page, limit, totalItems: 0, totalPages: 0 } };
    }

    // Step 2: Query products with those IDs
    let query = this.supabaseService
      .getClient()
      .from('products')
      .select('*', { count: 'exact' })
      .in('id', productIds)
      .eq('is_visible', true);

    // Optional search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Optional sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: products, error, count } = await query;

    if (error) throw error;

    return {
      items: products,
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async findProductsByMaterial(options: {
    material: string;
    categoryId?: string;
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      material,
      page = 1,
      limit = 10,
      search,
      sortBy = 'id',
      sortOrder = 'asc',
    } = options;

    // Step 1: Find product_ids with at least one variant of the given material
    const { data: variants, error: variantsError } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select('product_id')
      .ilike('material', `%${material}%`);

    if (variantsError) throw variantsError;

    const productIds = [...new Set((variants || []).map((v) => v.product_id))];
    if (productIds.length === 0) {
      return { items: [], meta: { page, limit, totalItems: 0, totalPages: 0 } };
    }

    // Step 2: Query products with those IDs
    let query = this.supabaseService
      .getClient()
      .from('products')
      .select('*', { count: 'exact' })
      .in('id', productIds)
      .eq('is_visible', true);

    // Optional search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Optional sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: products, error, count } = await query;

    if (error) throw error;

    return {
      items: products,
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Find all products with search using simple ILIKE pattern matching
   */
  private async findAllWithSearch(options: {
    categoryId?: string;
    search: string;
    page?: number;
    limit?: number;
    includeVariants?: boolean;
    includeImages?: boolean;
    includeCategory?: boolean;
  }) {
    const {
      categoryId,
      search,
      page = 1,
      limit,
      includeVariants = true,
      includeImages = false,
      includeCategory = false,
    } = options;

    // Build query with simple ILIKE search
    let query = this.supabaseService
      .getClient()
      .from('products')
      .select(
        `*${includeVariants ? ', variants:product_variants(*)' : ''}${
          includeImages ? ', images:product_images(*)' : ''
        }${includeCategory ? ', category:categories!inner(*)' : ''}`,
        { count: 'exact' },
      )
      .or(`name.ilike.%${search}%,description.ilike.%${search}%`)
      .eq('is_visible', true) // Only show visible products
      .order('name', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Apply pagination only if limit is provided
    if (limit) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data: products, error, count } = await query;

    if (error) {
      throw error;
    }

    // If requested, enhance products with category and parent category information
    let enhancedProducts = products || [];
    if (includeCategory && enhancedProducts.length > 0) {
      enhancedProducts =
        await this.enhanceProductsWithCategoryDetails(enhancedProducts);
    }

    return {
      items: enhancedProducts,
      meta: {
        page,
        limit: limit || null,
        totalItems: count || 0,
        totalPages: limit ? Math.ceil((count || 0) / limit) : 1,
      },
    };
  }

  /**
   * Find a single product by ID with optional related data
   * @param id Product ID
   * @param includeVariants Whether to include product variants
   * @param includeImages Whether to include product images
   * @param includeCategory Whether to include category information
   * @returns Single product with optional related data
   */
  async findOne(
    id: string,
    includeVariants = true,
    includeImages = false,
    includeCategory = false,
  ): Promise<Product> {
    let query = `*`;

    if (includeVariants) {
      query += `, variants:product_variants(*)`;
    }

    if (includeImages) {
      query += `, images:product_images(*)`;
    }

    if (includeCategory) {
      query += `, category:categories!inner(*)`;
    }

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('products')
        .select(query)
        .eq('id', id)
        .eq('is_visible', true) // Only return visible products
        .single();

      if (error) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      if (!data) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Type the data as ProductWithCategory to handle category properties
      const productData = data as unknown as ProductWithCategory;

      // If category is requested, enhance with parent category information
      if (includeCategory && productData.category) {
        if (productData.category.parent_id) {
          const { data: parentCategory, error: parentError } =
            await this.supabaseService
              .getClient()
              .from('categories')
              .select('*')
              .eq('id', productData.category.parent_id)
              .single();

          if (!parentError && parentCategory) {
            productData.category.parent = parentCategory as Category;
          }
        }
      } else if (productData.category_id && includeCategory) {
        // If we only have category_id but includeCategory is true
        const fullCategory = await this.getCategoryWithParent(
          productData.category_id,
        );
        if (fullCategory) {
          productData.category = fullCategory as CategoryWithParent;
        }
      }

      return productData;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  /**
   * Get featured products with default variants for cart/wishlist functionality
   * Only returns products that have at least one featured variant
   * Optimized to return only essential data for homepage display
   * @param limit Number of featured products to return
   * @param includeCategory Whether to include category details
   * @returns Array of featured products with default variants (optimized)
   */
  async findFeatured(limit = 6, includeCategory = false): Promise<any[]> {
    try {
      // First, get products that have featured variants
      const { data: featuredVariants, error: variantsError } =
        await this.supabaseService
          .getClient()
          .from('product_variants')
          .select('product_id')
          .eq('featured', true);

      if (variantsError) {
        throw variantsError;
      }

      if (!featuredVariants || featuredVariants.length === 0) {
        return []; // No featured variants found
      }

      // Get unique product IDs that have featured variants
      const featuredProductIds = [
        ...new Set(featuredVariants.map((v: any) => v.product_id)),
      ];

      // Get only essential product fields and main image only for products with featured variants
      const { data: products, error } = await this.supabaseService
        .getClient()
        .from('products')
        .select(
          'id, name, category_id, base_price, discount_offer, created_at, main_image:product_images!inner(id, url, type, order)',
        )
        .in('id', featuredProductIds)
        .eq('product_images.type', 'main') // Only get main images
        .eq('is_visible', true) // Only show visible products
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!products || products.length === 0) {
        return [];
      }

      // Get the product IDs from the filtered results
      const productIds = products.map((p: any) => p.id);

      // Fetch all variants for these products (both featured and non-featured)
      const { data: allVariants, error: allVariantsError } =
        await this.supabaseService
          .getClient()
          .from('product_variants')
          .select(
            'id, product_id, sku, price, discount_offer, color, size, stock, featured, assemble_charges, delivery_time_days',
          )
          .in('product_id', productIds)
          .order('featured', { ascending: false }) // Featured variants first
          .order('created_at', { ascending: true });

      if (allVariantsError) {
        throw allVariantsError;
      }

      // Group variants by product_id
      const variantsByProduct: { [key: string]: any[] } = {};
      if (allVariants) {
        allVariants.forEach((variant: any) => {
          if (!variantsByProduct[variant.product_id]) {
            variantsByProduct[variant.product_id] = [];
          }
          variantsByProduct[variant.product_id].push(variant);
        });
      }

      // Process products to add default_variant field and clean up response
      const processedProducts = products
        .map((product: any) => {
          const productVariants = variantsByProduct[product.id] || [];
          let defaultVariant = null;

          if (productVariants.length > 0) {
            // Always prioritize featured variants first, then use the first available variant
            defaultVariant =
              productVariants.find((v: any) => v.featured) ||
              productVariants[0];
          }

          // Only include products that have at least one featured variant
          const hasFeaturedVariant = productVariants.some(
            (v: any) => v.featured,
          );
          if (!hasFeaturedVariant) {
            return null; // Skip this product
          }

          // Clean up the main_image structure - take only the first main image
          const mainImage = Array.isArray(product.main_image)
            ? product.main_image[0]
            : product.main_image;

          return {
            id: product.id,
            name: product.name,
            category_id: product.category_id,
            base_price: product.base_price,
            discount_offer: product.discount_offer,
            main_image: mainImage
              ? {
                  id: mainImage.id,
                  url: mainImage.url,
                }
              : null,
            default_variant: defaultVariant,
          };
        })
        .filter((product: any) => product !== null && product.default_variant); // Filter out null products and those without variants

      if (includeCategory && processedProducts.length > 0) {
        // Get category information for the filtered products
        const categoryIds = [
          ...new Set(
            processedProducts.map((p: any) => p.category_id).filter(Boolean),
          ),
        ];

        if (categoryIds.length > 0) {
          const { data: categories } = await this.supabaseService
            .getClient()
            .from('categories')
            .select('id, name, slug')
            .in('id', categoryIds);

          // Map categories to products
          const categoriesMap: { [key: string]: any } = {};
          if (categories) {
            categories.forEach((cat: any) => {
              categoriesMap[cat.id] = cat;
            });
          }

          // Add category info to products
          processedProducts.forEach((product: any) => {
            if (product.category_id && categoriesMap[product.category_id]) {
              product.category = categoriesMap[product.category_id];
            }
          });
        }
      }

      return processedProducts;
    } catch (error) {
      console.error('Error in findFeatured:', error);
      throw error;
    }
  }

  /**
   * Get products related to a specific product
   * Enhanced version that considers multiple factors:
   * 1. Same category (highest priority)
   * 2. Similar colors or sizes (if the product has variants)
   * 3. Products from the same parent category as backup
   *
   * @param productId Product ID
   * @param limit Number of related products to return
   * @param includeCategory Whether to include category details
   * @returns Array of related products
   */
  async findRelated(
    productId: string,
    limit = 4,
    includeCategory = false,
  ): Promise<any[]> {
    // First get the current product with its variants to analyze its attributes
    const { data: currentProduct, error: productError } =
      await this.supabaseService
        .getClient()
        .from('products')
        .select(
          `
        *,
        variants:product_variants(id, color, size, delivery_time_days, assemble_charges),
        category:categories!inner(id, parent_id)
      `,
        )
        .eq('id', productId)
        .single();

    if (productError || !currentProduct) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Extract relevant information for matching
    const categoryId = currentProduct.category_id;
    const parentCategoryId = currentProduct.category?.parent_id;

    // Extract unique colors and sizes from variants if they exist
    const colors = currentProduct.variants
      ? [
          ...new Set(
            currentProduct.variants
              .map((variant) => variant.color)
              .filter(Boolean),
          ),
        ]
      : [];
    const sizes = currentProduct.variants
      ? [
          ...new Set(
            currentProduct.variants
              .map((variant) => variant.size)
              .filter(Boolean),
          ),
        ]
      : [];

    // Initialize with empty array
    let sameCategoryProducts: any[] = [];

    // First query: Get products from the same category (exclude current product)
    const { data: categoryProducts, error: categoryError } =
      await this.supabaseService
        .getClient()
        .from('products')
        .select(
          `
        *,
        variants:product_variants(id, color, size, delivery_time_days, assemble_charges),
        images:product_images(*)${includeCategory ? ', category:categories!inner(*)' : ''}
      `,
        )
        .eq('category_id', categoryId)
        .eq('is_visible', true) // Only show visible products
        .neq('id', productId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (categoryError) {
      throw categoryError;
    }

    // Assign the result, handling null case
    sameCategoryProducts = categoryProducts || [];

    // If we got enough products from the same category, return them
    if (sameCategoryProducts.length >= limit) {
      if (includeCategory) {
        return this.enhanceProductsWithCategoryDetails(sameCategoryProducts);
      }
      return sameCategoryProducts;
    }

    // If we need more products and have color/size data, find similar products by attributes
    if (
      sameCategoryProducts.length < limit &&
      (colors.length > 0 || sizes.length > 0)
    ) {
      // Already found products to exclude from further queries
      const excludeIds = [productId, ...sameCategoryProducts.map((p) => p.id)];
      const remainingCount = limit - sameCategoryProducts.length;

      // Build a query to find products with similar attributes (by variant colors or sizes)
      // but from different categories
      const { data: similarProductsData, error: similarError } =
        await this.supabaseService
          .getClient()
          .from('products')
          .select(
            `
          *,
          variants:product_variants(id, color, size, delivery_time_days, assemble_charges),
          images:product_images(*)${includeCategory ? ', category:categories!inner(*)' : ''}
        `,
          )
          .neq('id', productId)
          .not('id', 'in', `(${excludeIds.join(',')})`) // Exclude already found products
          .order('created_at', { ascending: false })
          .limit(remainingCount);

      if (similarError) {
        throw similarError;
      }

      // Handle null result
      let similarProducts = similarProductsData || [];

      // Filter by color/size match
      if (similarProducts.length > 0) {
        similarProducts = similarProducts
          .filter((product: any) => {
            // Ensure product is a valid object with variants
            if (!product || typeof product !== 'object') {
              return false;
            }

            // Check if any variant color matches any of our product's colors
            if (colors.length > 0 && Array.isArray(product.variants)) {
              try {
                const productColors = [
                  ...new Set(
                    product.variants
                      .filter((v: any) => v && typeof v === 'object')
                      .map((v: any) => v.color)
                      .filter(Boolean),
                  ),
                ];

                if (
                  productColors.some((color: string) => colors.includes(color))
                ) {
                  return true;
                }
              } catch (e) {
                // Skip if variants can't be processed
                console.error('Error processing variant colors:', e);
              }
            }

            // Check if any variant size matches any of our product's sizes
            if (sizes.length > 0 && Array.isArray(product.variants)) {
              try {
                const productSizes = [
                  ...new Set(
                    product.variants
                      .filter((v: any) => v && typeof v === 'object')
                      .map((v: any) => v.size)
                      .filter(Boolean),
                  ),
                ];

                if (productSizes.some((size: string) => sizes.includes(size))) {
                  return true;
                }
              } catch (e) {
                // Skip if variants can't be processed
                console.error('Error processing variant sizes:', e);
              }
            }

            return false;
          })
          .slice(0, remainingCount);

        // Add these similar products to our result set
        sameCategoryProducts = [...sameCategoryProducts, ...similarProducts];
      }
    }

    // If we still need more products and there's a parent category, get products from there
    if (sameCategoryProducts.length < limit && parentCategoryId) {
      const excludeIds = [productId, ...sameCategoryProducts.map((p) => p.id)];
      const remainingCount = limit - sameCategoryProducts.length;

      // Find sibling categories (other categories with the same parent)
      const { data: siblingCategoriesData, error: siblingError } =
        await this.supabaseService
          .getClient()
          .from('categories')
          .select('id')
          .eq('parent_id', parentCategoryId)
          .neq('id', categoryId); // Exclude current category

      if (siblingError) {
        throw siblingError;
      }

      const siblingCategories = siblingCategoriesData || [];

      if (siblingCategories.length > 0) {
        // Get category IDs
        const siblingCategoryIds = siblingCategories.map((cat) => cat.id);

        // Get products from sibling categories
        const { data: parentCategoryProductsData, error: parentError } =
          await this.supabaseService
            .getClient()
            .from('products')
            .select(
              `
            *,
            images:product_images(*)${includeCategory ? ', category:categories!inner(*)' : ''}
          `,
            )
            .in('category_id', siblingCategoryIds)
            .eq('is_visible', true) // Only show visible products
            .not('id', 'in', `(${excludeIds.join(',')})`) // Exclude already found products
            .order('created_at', { ascending: false })
            .limit(remainingCount);

        if (parentError) {
          throw parentError;
        }

        // Add these parent category products to our result set (handling null)
        const parentCategoryProducts = parentCategoryProductsData || [];
        sameCategoryProducts = [
          ...sameCategoryProducts,
          ...parentCategoryProducts,
        ];
      }
    }

    // If we STILL need more products, just get the most recent ones
    if (sameCategoryProducts.length < limit) {
      const excludeIds = [productId, ...sameCategoryProducts.map((p) => p.id)];
      const remainingCount = limit - sameCategoryProducts.length;

      const { data: recentProductsData, error: recentError } =
        await this.supabaseService
          .getClient()
          .from('products')
          .select(
            `
          *,
          images:product_images(*)${includeCategory ? ', category:categories!inner(*)' : ''}
        `,
          )
          .eq('is_visible', true) // Only show visible products
          .not('id', 'in', `(${excludeIds.join(',')})`) // Exclude already found products
          .order('created_at', { ascending: false })
          .limit(remainingCount);

      if (recentError) {
        throw recentError;
      }

      // Add these recent products to our result set (handling null)
      const recentProducts = recentProductsData || [];
      sameCategoryProducts = [...sameCategoryProducts, ...recentProducts];
    }

    // If requested, enhance products with category and parent category information
    if (includeCategory) {
      return this.enhanceProductsWithCategoryDetails(sameCategoryProducts);
    }

    return sameCategoryProducts;
  }

  /**
   * Create a new product
   * @param createProductDto Product data
   * @returns Newly created product
   */
  async create(createProductDto: CreateProductDto): Promise<Product> {
    // Check if category exists if provided
    if (createProductDto.category_id) {
      const { data: category, error: categoryError } =
        await this.supabaseService
          .getClient()
          .from('categories')
          .select('*')
          .eq('id', createProductDto.category_id)
          .single();

      if (categoryError || !category) {
        throw new NotFoundException(
          `Category with ID ${createProductDto.category_id} not found`,
        );
      }
    }

    // Create new product - only include fields that belong to the products table
    const { data: product, error } = await this.supabaseService
      .getClient()
      .from('products')
      .insert({
        name: createProductDto.name,
        description: createProductDto.description,
        category_id: createProductDto.category_id,
        base_price: createProductDto.base_price,
        discount_offer: createProductDto.discount_offer,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // If category_id was provided, fetch and include category details in response
    if (createProductDto.category_id) {
      const categoryDetails = await this.getCategoryWithParent(
        createProductDto.category_id,
      );
      if (categoryDetails) {
        (product as any).category = categoryDetails;
      }
    }

    // Automatically create a default variant
    // Generate a SKU if one wasn't provided
    const defaultSku =
      createProductDto.default_sku ||
      this.generateSku(
        product.name,
        createProductDto.default_color,
        createProductDto.default_size,
        product.id,
      );

    const defaultVariant = {
      product_id: product.id,
      sku: defaultSku,
      price:
        createProductDto.base_price > 0 ? createProductDto.base_price : null,
      discount_offer: createProductDto.discount_offer || 0,
      color: createProductDto.default_color || null,
      size: createProductDto.default_size || null,
      stock: createProductDto.initial_stock || 0,
      // Let PostgreSQL handle timestamps with default values
    };

    try {
      console.log('Creating default variant with data:', defaultVariant);

      // Include the extra fields in the variant creation that were moved from products table
      const { data: variant, error: variantError } = await this.supabaseService
        .getClient()
        .from('product_variants')
        .insert({
          ...defaultVariant,
          tags: createProductDto.tags,
          material: createProductDto.material,
          brand: createProductDto.brand,
          featured: createProductDto.featured,
          compare_price: createProductDto.compare_price,
          weight_kg: createProductDto.weight_kg,
          dimensions: createProductDto.dimensions || {},
          payment_options: createProductDto.payment_options || [],
          discount_percentage: createProductDto.discount_percentage || 0,
          assemble_charges: createProductDto.assemble_charges || 0,
          delivery_time_days: createProductDto.delivery_time_days || '',
        })
        .select()
        .single();

      if (variantError) {
        console.error('Error creating default variant:', variantError);
        console.error('Error details:', JSON.stringify(variantError));

        // Delete the product that was created since variant creation failed
        await this.supabaseService
          .getClient()
          .from('products')
          .delete()
          .eq('id', product.id);

        // Handle specific error cases and throw appropriate exceptions
        if (variantError.code === '23505') {
          // Duplicate SKU error
          if (variantError.details?.includes('sku')) {
            throw new BadRequestException(
              `SKU '${defaultSku}' already exists. Please provide a unique SKU.`,
            );
          }
        }

        // Generic variant creation error
        throw new InternalServerErrorException(
          `Failed to create product variant: ${variantError.message || 'Unknown error'}`,
        );
      } else {
        console.log('Successfully created variant:', variant);
        // Add the default variant to the response
        (product as any).default_variant = variant;
      }
    } catch (variantError) {
      console.error('Exception creating default variant:', variantError);

      // If it's already one of our custom exceptions, re-throw it
      if (
        variantError instanceof BadRequestException ||
        variantError instanceof InternalServerErrorException
      ) {
        throw variantError;
      }

      // Delete the product that was created since variant creation failed
      try {
        await this.supabaseService
          .getClient()
          .from('products')
          .delete()
          .eq('id', product.id);
      } catch (deleteError) {
        console.error(
          'Failed to cleanup product after variant creation failure:',
          deleteError,
        );
      }

      // Handle unexpected errors
      if (variantError instanceof Error) {
        console.error('Error message:', variantError.message);
        console.error('Error stack:', variantError.stack);
        throw new InternalServerErrorException(
          `Failed to create product variant: ${variantError.message}`,
        );
      }

      throw new InternalServerErrorException(
        'Failed to create product variant due to unexpected error',
      );
    }

    return product;
  }

  /**
   * Generate a SKU from product details
   * @param name Product name
   * @param color Variant color
   * @param size Variant size
   * @param productId Product ID
   * @returns Generated SKU string
   */
  private generateSku(
    name: string,
    color?: string,
    size?: string,
    productId?: string,
  ): string {
    // Create prefix from first 3 letters of product name (uppercase)
    let prefix = name
      ? name
          .substring(0, 3)
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
      : 'PRD';

    if (prefix.length === 0) {
      // Fallback if all characters were filtered out
      prefix = 'PRD';
    }

    // Add color/size codes if provided
    const colorCode = color
      ? `-${color
          .substring(0, 3)
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()}`
      : '';

    const sizeCode = size
      ? `-${size
          .substring(0, 3)
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()}`
      : '';

    // Add product ID for uniqueness
    const idSuffix = productId ? `-${productId}` : '';

    // Add timestamp for extra uniqueness
    const timestamp = Date.now().toString().substring(7);

    return `${prefix}${colorCode}${sizeCode}${idSuffix}-${timestamp}`;
  }

  /**
   * Update an existing product
   * @param id Product ID
   * @param updateProductDto Updated product data
   * @returns Updated product
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    // Check if product exists
    await this.findOne(id);

    // Check if category exists if provided
    if (updateProductDto.category_id !== undefined) {
      const { data: category, error: categoryError } =
        await this.supabaseService
          .getClient()
          .from('categories')
          .select('id')
          .eq('id', updateProductDto.category_id)
          .single();

      if (categoryError || !category) {
        throw new NotFoundException(
          `Category with ID ${updateProductDto.category_id} not found`,
        );
      }
    }

    // Update the product
    const { data: updatedProduct, error } = await this.supabaseService
      .getClient()
      .from('products')
      .update({
        ...(updateProductDto.name && { name: updateProductDto.name }),
        ...(updateProductDto.description !== undefined && {
          description: updateProductDto.description,
        }),
        ...(updateProductDto.category_id !== undefined && {
          category_id: updateProductDto.category_id,
        }),
        ...(updateProductDto.base_price !== undefined && {
          base_price: updateProductDto.base_price,
        }),
        ...(updateProductDto.discount_offer !== undefined && {
          discount_offer: updateProductDto.discount_offer,
        }),
        ...(updateProductDto.tags !== undefined && {
          tags: updateProductDto.tags,
        }),
        ...(updateProductDto.material !== undefined && {
          material: updateProductDto.material,
        }),
        ...(updateProductDto.brand !== undefined && {
          brand: updateProductDto.brand,
        }),
        ...(updateProductDto.featured !== undefined && {
          featured: updateProductDto.featured,
        }),
        ...(updateProductDto.is_visible !== undefined && {
          is_visible: updateProductDto.is_visible,
        }),
        ...(updateProductDto.delivery_info !== undefined && {
          delivery_info: updateProductDto.delivery_info,
        }),
        ...(updateProductDto.warranty_info !== undefined && {
          warranty_info: updateProductDto.warranty_info,
        }),
        ...(updateProductDto.care_instructions !== undefined && {
          care_instructions: updateProductDto.care_instructions,
        }),
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedProduct;
  }

  /**
   * Delete a product
   * @param id Product ID
   * @returns Deleted product
   */
  async remove(id: string): Promise<Product> {
    // Check if product exists and get its details
    const product = await this.findOne(id, true, true); // Include variants and images

    // Get count of variants and images before deletion for logging
    const variantCount = product.variants?.length || 0;
    const imageCount = product.images?.length || 0;

    console.log(`🗑️  Deleting product: ${product.name} (ID: ${id})`);
    console.log(
      `📦 This will also delete ${variantCount} variant(s) and ${imageCount} image(s)`,
    );

    // First, delete images from Supabase Storage if they are stored there
    await this.deleteProductImagesFromStorage(id);

    // Delete the product - this will automatically cascade delete:
    // 1. All product variants (due to ON DELETE CASCADE foreign key)
    // 2. All product images (due to ON DELETE CASCADE foreign key)
    // 3. All variant images (due to ON DELETE CASCADE foreign key when variants are deleted)
    const { error } = await this.supabaseService
      .getClient()
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`❌ Error deleting product ${id}:`, error);
      throw error;
    }

    console.log(
      `✅ Successfully deleted product "${product.name}" and all related data`,
    );

    return product;
  }

  /**
   * Get product variants
   * @param productId Product ID
   * @returns Array of product variants
   */
  async findVariants(productId: string): Promise<ProductVariant[]> {
    // Check if product exists
    await this.findOne(productId);

    const { data: variants, error } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select(
        `
        *,
        images:product_images(*)
      `,
      )
      .eq('product_id', productId)
      .order('id');

    if (error) {
      throw error;
    }

    return variants;
  }

  /**
   * Get product images
   * @param productId Product ID
   * @returns Array of product images
   */
  async findImages(productId: string): Promise<ProductImage[]> {
    // Check if product exists
    await this.findOne(productId);

    const { data: images, error } = await this.supabaseService
      .getClient()
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('order');

    if (error) {
      throw error;
    }

    return images;
  }

  /**
   * Get a specific variant by ID
   * @param id Variant ID
   * @returns Variant details
   */
  async getVariant(id: string): Promise<ProductVariant> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select(
        `
        *,
        images:product_images(*)
      `,
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return data as unknown as ProductVariant;
  }

  /**
   * Create a new product variant
   * @param productId Product ID
   * @param createVariantDto Variant data
   * @returns Newly created variant
   */
  async createVariant(
    productId: string,
    createVariantDto: CreateVariantDto,
  ): Promise<ProductVariant> {
    // Check if product exists
    await this.findOne(productId);

    // Create variant - make sure all fields match the database schema
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .insert({
        product_id: productId,
        ...createVariantDto,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating variant:', error);
      throw error;
    }

    return data as unknown as ProductVariant;
  }

  /**
   * Update an existing product variant
   * @param id Variant ID
   * @param updateVariantDto Updated variant data
   * @returns Updated variant
   */
  async updateVariant(
    id: string,
    updateVariantDto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    // Check if variant exists
    await this.getVariant(id);

    // Update the variant
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .update({
        ...updateVariantDto,
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating variant:', error);
      throw error;
    }

    return data as unknown as ProductVariant;
  }

  /**
   * Delete a product variant
   * @param id Variant ID
   * @returns Deleted variant
   */
  async removeVariant(id: string): Promise<ProductVariant> {
    // Check if variant exists
    const variant = await this.getVariant(id);

    // Delete the variant
    const { error } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return variant;
  }

  /**
   * Update stock level of a variant
   * @param id Variant ID
   * @param updateStockDto Stock data
   * @returns Updated variant
   */
  async updateStock(
    id: string,
    updateStockDto: UpdateStockDto,
  ): Promise<ProductVariant> {
    // Check if variant exists
    await this.getVariant(id);

    // Update the stock
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .update({
        stock: updateStockDto.stock,
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as ProductVariant;
  }

  /**
   * Get products with low stock
   * @param threshold Low stock threshold
   * @param limit Number of products to return
   * @returns Array of product variants with low stock
   */
  async getLowStock(
    threshold: number = 5,
    limit: number = 20,
  ): Promise<ProductVariant[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select(
        `
        *,
        product:products(*)
      `,
      )
      .lte('stock', threshold)
      .order('stock', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data as unknown as ProductVariant[];
  }

  /**
   * Get 360° view images for a product
   * @param productId Product ID
   * @returns Array of 360° view images
   */
  async get360Images(productId: string): Promise<ProductImage[]> {
    // Check if product exists
    await this.findOne(productId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .eq('type', '360')
      .order('order');

    if (error) {
      throw error;
    }

    return data as unknown as ProductImage[];
  }

  /**
   * Get images for a specific variant
   * @param variantId Variant ID
   * @returns Array of variant images
   */
  async getVariantImages(variantId: string): Promise<ProductImage[]> {
    // Check if variant exists
    await this.getVariant(variantId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_images')
      .select('*')
      .eq('variant_id', variantId)
      .order('order');

    if (error) {
      throw error;
    }

    return data as unknown as ProductImage[];
  }

  /**
   * Delete entire product folder from Supabase Storage
   * This is much more efficient than deleting individual files
   * @param productId Product ID
   */
  private async deleteProductImagesFromStorage(
    productId: string,
  ): Promise<void> {
    try {
      console.log(`🗂️  Cleaning up storage folder for product: ${productId}`);

      // Delete the entire product folder: products/{productId}/
      const folderPath = `products/${productId}`;
      const success = await this.deleteStorageFolder(folderPath);

      if (success) {
        console.log(
          `✅ Successfully deleted entire product folder: ${folderPath}`,
        );
      } else {
        console.log(
          `⚠️  Product folder may not exist or was already cleaned: ${folderPath}`,
        );
      }
    } catch (error) {
      console.error(
        `❌ Error deleting product folder from storage for product ${productId}:`,
        error,
      );
    }
  }

  /**
   * Delete an entire folder and all its contents from Supabase Storage
   * @param folderPath Path to the folder (e.g., "products/product-id")
   * @param bucketName Storage bucket name
   * @returns True if deletion was successful
   */
  private async deleteStorageFolder(
    folderPath: string,
    bucketName: string = 'product-images',
  ): Promise<boolean> {
    try {
      console.log(`🗑️  Attempting to delete folder: ${folderPath}`);

      // First, list all files in the folder
      const { data: files, error: listError } = await this.supabaseService
        .getClient()
        .storage.from(bucketName)
        .list(folderPath, {
          limit: 1000, // Adjust if you have more files
          sortBy: { column: 'name', order: 'asc' },
        });

      if (listError) {
        console.error(
          `❌ Error listing files in folder ${folderPath}:`,
          listError.message,
        );
        return false;
      }

      if (!files || files.length === 0) {
        console.log(`📁 Folder ${folderPath} is empty or doesn't exist`);
        return true; // Consider this a success since the goal is achieved
      }

      // Collect all file paths to delete
      const filesToDelete: string[] = [];

      for (const file of files) {
        const fullPath = `${folderPath}/${file.name}`;
        filesToDelete.push(fullPath);

        // If it's a folder, recursively get its contents
        if (file.metadata === null) {
          const subFolderFiles = await this.getAllFilesInFolder(
            `${folderPath}/${file.name}`,
            bucketName,
          );
          filesToDelete.push(...subFolderFiles);
        }
      }

      if (filesToDelete.length === 0) {
        console.log(`📁 No files to delete in folder: ${folderPath}`);
        return true;
      }

      console.log(
        `🗑️  Deleting ${filesToDelete.length} files from folder: ${folderPath}`,
      );

      // Delete all files at once
      const { error: deleteError } = await this.supabaseService
        .getClient()
        .storage.from(bucketName)
        .remove(filesToDelete);

      if (deleteError) {
        console.error(
          `❌ Error deleting files from folder ${folderPath}:`,
          deleteError.message,
        );
        return false;
      }

      console.log(
        `✅ Successfully deleted ${filesToDelete.length} files from folder: ${folderPath}`,
      );
      return true;
    } catch (error) {
      console.error(`❌ Exception while deleting folder ${folderPath}:`, error);
      return false;
    }
  }

  /**
   * Recursively get all files in a folder
   * @param folderPath Path to the folder
   * @param bucketName Storage bucket name
   * @returns Array of file paths
   */
  private async getAllFilesInFolder(
    folderPath: string,
    bucketName: string = 'product-images',
  ): Promise<string[]> {
    const filePaths: string[] = [];

    try {
      const { data: items, error } = await this.supabaseService
        .getClient()
        .storage.from(bucketName)
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error || !items) {
        return filePaths;
      }

      for (const item of items) {
        const fullPath = `${folderPath}/${item.name}`;

        if (item.metadata === null) {
          // It's a folder, recursively get its contents
          const subFiles = await this.getAllFilesInFolder(fullPath, bucketName);
          filePaths.push(...subFiles);
        } else {
          // It's a file
          filePaths.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error getting files in folder ${folderPath}:`, error);
    }

    return filePaths;
  }

  /**
   * Check if a URL is from Supabase Storage
   * @param url URL to check
   * @returns True if URL is from Supabase Storage
   */
  private isSupabaseStorageUrl(url: string): boolean {
    try {
      // Pattern match for Supabase Storage URLs (handles both old and new folder structures)
      return url.includes('/storage/v1/object/public/product-images/');
    } catch {
      return false;
    }
  }

  /**
   * Extract file path from Supabase Storage URL
   * @param url Supabase Storage URL
   * @returns File path or null
   */
  private getFilePathFromSupabaseUrl(url: string): string | null {
    try {
      // Find the storage path pattern
      const storagePattern = '/storage/v1/object/public/product-images/';
      const index = url.indexOf(storagePattern);

      if (index !== -1) {
        // Extract everything after the bucket path
        // This handles both old flat structure (filename.jpg) and new folder structure (products/id/main/filename.jpg)
        return url.substring(index + storagePattern.length);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param filePath File path in storage
   * @param bucketName Storage bucket name
   * @returns True if deleted successfully
   */
  private async deleteFileFromStorage(
    filePath: string,
    bucketName: string = 'product-images',
  ): Promise<boolean> {
    try {
      const { error } = await this.supabaseService
        .getClient()
        .storage.from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error(`❌ Error deleting file ${filePath}:`, error.message);
        return false;
      }

      console.log(`🗑️  Deleted file from storage: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Exception deleting file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Upload a file to Supabase storage with automatic image optimization
   * @param filePath Path to file or Buffer
   * @param filename The name to use for the file
   * @param bucketName The storage bucket name (default: 'product-images')
   * @param productId Product ID for organizing files
   * @param variantId Variant ID for organizing files (optional)
   * @param imageType Image type for folder organization (main, gallery, 360, etc.)
   * @returns The public URL of the uploaded file
   */
  private async uploadFileToStorage(
    filePath: string | Buffer,
    filename: string,
    bucketName: string = 'product-images',
    productId?: string,
    variantId?: string,
    imageType: string = 'main',
  ): Promise<string> {
    let fileBuffer: Buffer;
    let shouldCleanup = false;
    let actualFilePath: string = '';

    try {
      console.log(
        `Starting upload process for '${filename}' to bucket '${bucketName}'...`,
      );

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
        console.log(
          `Read file from disk: ${filePath}, size: ${this.formatBytes(fileBuffer.length)}`,
        );
      } else {
        // Use buffer directly
        fileBuffer = filePath;
        console.log(
          `Using buffer directly, size: ${this.formatBytes(fileBuffer.length)}`,
        );
      }

      // Validate buffer
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('File buffer is empty or invalid');
      }

      // Check if the file is an image that can be optimized
      const isImage =
        this.imageOptimizationService.isSupportedImageFormat(filename);

      let finalBuffer = fileBuffer;
      let finalFilename = filename;

      if (isImage) {
        try {
          console.log(`Optimizing image: ${filename}`);

          // Optimize the image
          const optimizationResult =
            await this.imageOptimizationService.optimizeImageFromBuffer(
              fileBuffer,
              {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 85,
                format: 'auto', // Let the service decide the best format
                progressive: true,
                removeMetadata: true,
              },
              filename,
            );

          finalBuffer = optimizationResult.buffer;
          finalFilename = optimizationResult.filename;

          console.log(
            `Image optimization complete: ` +
              `${this.formatBytes(optimizationResult.originalSize)} → ${this.formatBytes(optimizationResult.optimizedSize)} ` +
              `(${optimizationResult.compressionRatio.toFixed(1)}% reduction)`,
          );
        } catch (optimizationError) {
          // If optimization fails, log warning but continue with original image
          console.warn(
            `Image optimization failed for ${filename}: ${optimizationError.message}`,
          );
          console.warn('Continuing with original image...');
          // finalBuffer and finalFilename remain as original
        }
      } else {
        console.log(
          `File ${filename} is not an image or not supported for optimization, uploading as-is`,
        );
      }

      // Generate organized storage path based on product, variant, and image type
      let storagePath: string;
      const timestamp = Date.now();
      const baseFilename = `${timestamp}-${finalFilename}`;

      if (productId && variantId) {
        // Variant image: products/{productId}/variants/{variantId}/{imageType}/{filename}
        storagePath = `products/${productId}/variants/${variantId}/${imageType}/${baseFilename}`;
      } else if (productId) {
        // Product image: products/{productId}/{imageType}/{filename}
        storagePath = `products/${productId}/${imageType}/${baseFilename}`;
      } else {
        // Fallback to root level (for backward compatibility)
        storagePath = baseFilename;
      }

      console.log(
        `Uploading organized file '${storagePath}' to bucket '${bucketName}'...`,
      );

      // Upload the file to Supabase Storage
      const { error: uploadError } = await this.supabaseService
        .getClient()
        .storage.from(bucketName)
        .upload(storagePath, finalBuffer, {
          contentType: this.getContentType(finalFilename),
          upsert: true,
        });

      if (uploadError) {
        throw new Error(
          `Failed to upload file to Supabase: ${uploadError.message}`,
        );
      }

      console.log(
        `Successfully uploaded file to Supabase Storage at: ${storagePath}`,
      );

      // Get the public URL
      const { data } = this.supabaseService
        .getClient()
        .storage.from(bucketName)
        .getPublicUrl(storagePath);

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
          } else {
            console.log(`🔍 Temporary file already removed: ${actualFilePath}`);
          }
        } catch (cleanupError) {
          console.error(
            `❌ Failed to clean up temporary file ${actualFilePath}:`,
            cleanupError.message,
          );
          // Don't throw here as the main operation might have succeeded
        }
      }
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
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      tif: 'image/tiff',
      ico: 'image/x-icon',
      jfif: 'image/jpeg',
      pjpeg: 'image/jpeg',
      pjp: 'image/jpeg',
      avif: 'image/avif',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Get the maximum order value for images of a product or variant
   * @param productId Product ID
   * @param variantId Variant ID (null for product images)
   * @returns Maximum order value (0 if no images exist)
   */
  private async getMaxImageOrder(
    productId: string,
    variantId: string | null,
  ): Promise<number> {
    try {
      let query = this.supabaseService
        .getClient()
        .from('product_images')
        .select('order')
        .eq('product_id', productId);

      if (variantId) {
        query = query.eq('variant_id', variantId);
      } else {
        query = query.is('variant_id', null);
      }

      const { data, error } = await query
        .order('order', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error getting max image order:', error);
        return 0;
      }

      return data && data.length > 0 ? data[0].order || 0 : 0;
    } catch (error) {
      console.error('Error in getMaxImageOrder:', error);
      return 0;
    }
  }

  /**
   * Create multiple images for a product
   * @param productId Product ID
   * @param createImageDto Image data (supports multiple files)
   * @returns Array of newly created images
   */
  async createProductImages(
    productId: string,
    createImageDto: CreateImageDto,
  ): Promise<ProductImage[]> {
    console.log(
      'Service received DTO:',
      JSON.stringify({
        ...createImageDto,
        imageFiles: createImageDto.imageFiles
          ? `${createImageDto.imageFiles.length} files`
          : 'No files',
        imageFile: createImageDto.imageFile
          ? 'Single file present'
          : 'No single file',
      }),
    );

    // Check if product exists
    await this.findOne(productId);

    // Handle single URL case
    if (createImageDto.url && !createImageDto.getAllFiles().length) {
      const singleImage = await this.createProductImage(
        productId,
        createImageDto,
      );
      return [singleImage];
    }

    // Handle multiple files case
    const files = createImageDto.getAllFiles();
    if (!files.length) {
      throw new BadRequestException(
        'Either a URL or at least one file must be provided',
      );
    }

    // Collect file paths for cleanup
    const filePaths = files.map((file) => file.path).filter((path) => path);

    try {
      // Get the current maximum order for this product to calculate starting order
      const currentMaxOrder = await this.getMaxImageOrder(productId, null);
      const startingOrder =
        createImageDto.order !== undefined
          ? createImageDto.order
          : currentMaxOrder + 1;

      const createdImages: ProductImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageOrder = startingOrder + i;

        try {
          console.log(
            `Processing file ${i + 1}/${files.length} with order ${imageOrder}`,
          );

          const filename = file.originalname || `image-${Date.now()}-${i}.jpg`;

          // Upload to Supabase storage and get the URL
          const imageUrl = await this.uploadFileToStorage(
            file.path,
            filename,
            'product-images',
            productId,
            undefined,
            createImageDto.type,
          );

          console.log('Generated URL:', imageUrl);

          // Create image record in database
          const { data, error } = await this.supabaseService
            .getClient()
            .from('product_images')
            .insert({
              product_id: productId,
              variant_id: null,
              url: imageUrl,
              type: createImageDto.type,
              order: imageOrder,
            })
            .select()
            .single();

          if (error) {
            console.error('Supabase error when inserting image record:', error);
            throw new InternalServerErrorException(
              `Failed to create image record: ${error.message}`,
            );
          }

          if (!data) {
            throw new InternalServerErrorException(
              'Failed to create image record: No data returned',
            );
          }

          createdImages.push(data as unknown as ProductImage);
        } catch (error) {
          console.error(`Error processing file ${i + 1}:`, error);
          // Continue with other files but log the error
          if (files.length === 1) {
            // If only one file, throw the error
            throw new BadRequestException(
              `Failed to process file upload: ${error.message}`,
            );
          }
        }
      }

      if (createdImages.length === 0) {
        throw new BadRequestException('Failed to process any files');
      }

      console.log(
        `Successfully created ${createdImages.length} images for product ${productId}`,
      );
      return createdImages;
    } finally {
      // Always clean up uploaded files, regardless of success or failure
      await this.cleanupSpecificFiles(filePaths);
    }
  }

  /**
   * Create a new image for a product (legacy method for backward compatibility)
   * @param productId Product ID
   * @param createImageDto Image data
   * @returns Newly created image
   */
  async createProductImage(
    productId: string,
    createImageDto: CreateImageDto,
  ): Promise<ProductImage> {
    console.log(
      'Service received DTO:',
      JSON.stringify({
        ...createImageDto,
        imageFile: createImageDto.imageFile ? 'File object present' : 'No file',
      }),
    );

    // Check if product exists
    await this.findOne(productId);

    let imageUrl = createImageDto.url;
    let filePath: string | null = null;

    // If a file was uploaded, process it and get the URL
    if (createImageDto.imageFile && !createImageDto.url) {
      console.log('Processing file upload');
      try {
        const file = createImageDto.imageFile;
        filePath = file.path; // Store for cleanup
        console.log('File details:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        });

        const filename = file.originalname || `image-${Date.now()}.jpg`;

        // Upload to Supabase storage and get the URL
        imageUrl = await this.uploadFileToStorage(
          file.path,
          filename,
          'product-images',
          productId,
          undefined,
          createImageDto.type,
        );
        console.log('Generated URL:', imageUrl);
      } catch (error) {
        console.error('Error processing file:', error);
        // Clean up file on error
        if (filePath) {
          await this.cleanupSpecificFiles([filePath]);
        }
        throw new BadRequestException(
          `Failed to process file upload: ${error.message}`,
        );
      }
    } else if (!imageUrl) {
      console.error('No image URL or file provided');
      throw new BadRequestException('Either a file or URL must be provided');
    }

    try {
      // Create image record in database
      const { data, error } = await this.supabaseService
        .getClient()
        .from('product_images')
        .insert({
          product_id: productId,
          variant_id: null,
          url: imageUrl,
          type: createImageDto.type,
          order: createImageDto.order,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error when inserting image record:', error);
        throw new InternalServerErrorException(
          `Failed to create image record: ${error.message}`,
        );
      }

      if (!data) {
        throw new InternalServerErrorException(
          'Failed to create image record: No data returned',
        );
      }

      return data as unknown as ProductImage;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating product image:', error);
      throw new InternalServerErrorException(
        `Failed to create product image: ${error.message}`,
      );
    } finally {
      // Clean up uploaded file after processing (success or failure)
      if (filePath) {
        await this.cleanupSpecificFiles([filePath]);
      }
    }
  }

  /**
   * Create multiple images for a variant
   * @param variantId Variant ID
   * @param createImageDto Image data (supports multiple files)
   * @returns Array of newly created images
   */
  async createVariantImages(
    variantId: string,
    createImageDto: CreateImageDto,
  ): Promise<ProductImage[]> {
    // Check if variant exists
    const variant = await this.getVariant(variantId);

    console.log(
      'Service received DTO for variant:',
      JSON.stringify({
        ...createImageDto,
        imageFiles: createImageDto.imageFiles
          ? `${createImageDto.imageFiles.length} files`
          : 'No files',
        imageFile: createImageDto.imageFile
          ? 'Single file present'
          : 'No single file',
      }),
    );

    // Handle single URL case
    if (createImageDto.url && !createImageDto.getAllFiles().length) {
      const singleImage = await this.createVariantImage(
        variantId,
        createImageDto,
      );
      return [singleImage];
    }

    // Handle multiple files case
    const files = createImageDto.getAllFiles();
    if (!files.length) {
      throw new BadRequestException(
        'Either a URL or at least one file must be provided',
      );
    }

    // Collect file paths for cleanup
    const filePaths = files.map((file) => file.path).filter((path) => path);

    try {
      // Get the current maximum order for this variant to calculate starting order
      const currentMaxOrder = await this.getMaxImageOrder(
        variant.product_id,
        variantId,
      );
      const startingOrder =
        createImageDto.order !== undefined
          ? createImageDto.order
          : currentMaxOrder + 1;

      const createdImages: ProductImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageOrder = startingOrder + i;

        try {
          console.log(
            `Processing variant file ${i + 1}/${files.length} with order ${imageOrder}`,
          );

          const filename =
            file.originalname || `variant-image-${Date.now()}-${i}.jpg`;

          // Upload to Supabase storage and get the URL
          const imageUrl = await this.uploadFileToStorage(
            file.path,
            filename,
            'product-images',
            variant.product_id,
            variantId,
            createImageDto.type,
          );

          console.log('Generated URL:', imageUrl);

          // Create image record in database
          const { data, error } = await this.supabaseService
            .getClient()
            .from('product_images')
            .insert({
              product_id: variant.product_id,
              variant_id: variantId,
              url: imageUrl,
              type: createImageDto.type,
              order: imageOrder,
            })
            .select()
            .single();

          if (error) {
            console.error(
              'Supabase error when inserting variant image record:',
              error,
            );
            throw new InternalServerErrorException(
              `Failed to create variant image record: ${error.message}`,
            );
          }

          if (!data) {
            throw new InternalServerErrorException(
              'Failed to create variant image record: No data returned',
            );
          }

          createdImages.push(data as unknown as ProductImage);
        } catch (error) {
          console.error(`Error processing variant file ${i + 1}:`, error);
          // Continue with other files but log the error
          if (files.length === 1) {
            // If only one file, throw the error
            throw new BadRequestException(
              `Failed to process file upload: ${error.message}`,
            );
          }
        }
      }

      if (createdImages.length === 0) {
        throw new BadRequestException('Failed to process any files');
      }

      console.log(
        `Successfully created ${createdImages.length} images for variant ${variantId}`,
      );
      return createdImages;
    } finally {
      // Always clean up uploaded files, regardless of success or failure
      await this.cleanupSpecificFiles(filePaths);
    }
  }

  /**
   * Create a new image for a variant (legacy method for backward compatibility)
   * @param variantId Variant ID
   * @param createImageDto Image data
   * @returns Newly created image
   */
  async createVariantImage(
    variantId: string,
    createImageDto: CreateImageDto,
  ): Promise<ProductImage> {
    // Check if variant exists
    const variant = await this.getVariant(variantId);

    let imageUrl = createImageDto.url;
    let filePath: string | null = null;

    // If a file was uploaded, process it and get the URL
    if (createImageDto.imageFile && !createImageDto.url) {
      console.log('Processing variant image file upload');
      try {
        const file = createImageDto.imageFile;
        filePath = file.path; // Store for cleanup
        console.log('File details:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
        });

        const filename = file.originalname || `variant-image-${Date.now()}.jpg`;

        // Upload to Supabase storage and get the URL
        imageUrl = await this.uploadFileToStorage(
          file.path,
          filename,
          'product-images',
          variant.product_id,
          variantId,
          createImageDto.type,
        );
        console.log('Generated URL:', imageUrl);
      } catch (error) {
        console.error('Error processing variant file:', error);
        // Clean up file on error
        if (filePath) {
          await this.cleanupSpecificFiles([filePath]);
        }
        throw new BadRequestException(
          `Failed to process file upload: ${error.message}`,
        );
      }
    } else if (!imageUrl) {
      console.error('No image URL or file provided for variant');
      throw new BadRequestException('Either a file or URL must be provided');
    }

    try {
      // Create image
      const { data, error } = await this.supabaseService
        .getClient()
        .from('product_images')
        .insert({
          product_id: variant.product_id,
          variant_id: variantId,
          url: imageUrl,
          type: createImageDto.type,
          order: createImageDto.order,
        })
        .select()
        .single();

      if (error) {
        console.error(
          'Supabase error when inserting variant image record:',
          error,
        );
        throw new InternalServerErrorException(
          `Failed to create variant image record: ${error.message}`,
        );
      }

      if (!data) {
        throw new InternalServerErrorException(
          'Failed to create variant image record: No data returned',
        );
      }

      return data as unknown as ProductImage;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error creating variant image:', error);
      throw new InternalServerErrorException(
        `Failed to create variant image: ${error.message}`,
      );
    } finally {
      // Clean up uploaded file after processing (success or failure)
      if (filePath) {
        await this.cleanupSpecificFiles([filePath]);
      }
    }
  }

  /**
   * Update an existing image
   * @param id Image ID
   * @param updateImageDto Updated image data
   * @returns Updated image
   */
  async updateImage(
    id: string,
    updateImageDto: UpdateImageDto,
  ): Promise<ProductImage> {
    // Check if image exists
    const { data: existingImage, error: findError } = await this.supabaseService
      .getClient()
      .from('product_images')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existingImage) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Update the image
    const { data, error } = await this.supabaseService
      .getClient()
      .from('product_images')
      .update({
        ...updateImageDto,
        updated_at: new Date(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as ProductImage;
  }

  /**
   * Delete an image
   * @param id Image ID
   * @returns Deleted image
   */
  async removeImage(id: string): Promise<ProductImage> {
    // Check if image exists
    const { data: image, error: findError } = await this.supabaseService
      .getClient()
      .from('product_images')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Delete from Supabase Storage if it's stored there
    if (this.isSupabaseStorageUrl(image.url)) {
      const filePath = this.getFilePathFromSupabaseUrl(image.url);
      if (filePath) {
        await this.deleteFileFromStorage(filePath);
        console.log(`🗑️  Deleted image from storage: ${filePath}`);
      }
    } else {
      console.log(`⏭️  Skipping external URL deletion: ${image.url}`);
    }

    // Delete the image record from database
    const { error } = await this.supabaseService
      .getClient()
      .from('product_images')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return image as unknown as ProductImage;
  }

  /**
   * Get top selling products based on actual sales data
   * @param limit Number of top selling products to return
   * @param period Time period for determining top sellers
   * @param includeCategory Whether to include category details
   * @returns Array of top selling products (empty array if no sales data exists)
   */
  async findTopSellers(
    limit = 8,
    period: 'week' | 'month' | 'year' | 'all' = 'all',
    includeCategory = false,
  ): Promise<any[]> {
    // First try to use order_items to determine top sellers
    try {
      // Define the time range based on the period
      let timeConstraint = '';
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        timeConstraint = `and oi.created_at >= '${weekAgo.toISOString()}'`;
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        timeConstraint = `and oi.created_at >= '${monthAgo.toISOString()}'`;
      } else if (period === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        timeConstraint = `and oi.created_at >= '${yearAgo.toISOString()}'`;
      }

      // Query to get top selling products based on order_items
      const { data, error } = await this.supabaseService
        .getClient()
        .rpc('execute_sql', {
          query: `
          SELECT 
            p.id, 
            p.name, 
            p.base_price,
            p.discount_offer,
            p.category_id,
            COUNT(oi.id) as order_count,
            SUM(oi.quantity) as total_units_sold
          FROM 
            products p
          INNER JOIN 
            product_variants pv ON p.id = pv.product_id
          INNER JOIN 
            order_items oi ON pv.id = oi.variant_id
          WHERE 
            p.is_visible = true ${timeConstraint}
          GROUP BY 
            p.id, p.name, p.base_price, p.discount_offer, p.category_id
          ORDER BY 
            total_units_sold DESC
          LIMIT ${limit}
        `,
        });

      if (error) {
        console.error('Error getting top sellers from order_items:', error);
        // Return empty array if database error occurs
        return [];
      }

      if (!data || data.length === 0) {
        // No sales data exists - return empty array instead of fallback
        console.log(
          'No sales data found for top sellers - returning empty array',
        );
        return [];
      }

      // Get product IDs from sales data
      const productIds = data.map((item: any) => item.id);

      // Get main images for these products
      const { data: products, error: productsError } =
        await this.supabaseService
          .getClient()
          .from('products')
          .select(
            'id, name, category_id, base_price, discount_offer, main_image:product_images!inner(id, url, type, order)',
          )
          .in('id', productIds)
          .eq('is_visible', true) // Only show visible products
          .eq('product_images.type', 'main'); // Only get main images

      if (productsError) {
        console.error(
          'Error getting product details for top sellers:',
          productsError,
        );
        return [];
      }

      // Get variants for these products
      const { data: variants, error: variantsError } =
        await this.supabaseService
          .getClient()
          .from('product_variants')
          .select('id, product_id, sku, price, discount_offer, color, size, stock, featured')
          .in('product_id', productIds)
          .order('created_at', { ascending: true });

      if (variantsError) {
        console.error('Error getting variants for top sellers:', variantsError);
        return [];
      }

      // Group variants by product_id
      const variantsByProduct: { [key: string]: any[] } = {};
      if (variants) {
        variants.forEach((variant: any) => {
          if (!variantsByProduct[variant.product_id]) {
            variantsByProduct[variant.product_id] = [];
          }
          variantsByProduct[variant.product_id].push(variant);
        });
      }

      // Map sales data with product details
      const salesDataMap: { [key: string]: any } = {};
      data.forEach((item: any) => {
        salesDataMap[item.id] = {
          order_count: item.order_count,
          total_units_sold: item.total_units_sold,
        };
      });

      // Process products to create optimized response
      const processedProducts = (products || [])
        .map((product: any) => {
          const productVariants = variantsByProduct[product.id] || [];
          let defaultVariant = null;

          if (productVariants.length > 0) {
            // Use the first variant as default for top sellers
            defaultVariant = productVariants[0];
          }

          if (!defaultVariant) {
            return null; // Skip products without variants
          }

          // Clean up the main_image structure
          const mainImage = Array.isArray(product.main_image)
            ? product.main_image[0]
            : product.main_image;

          return {
            id: product.id,
            name: product.name,
            category_id: product.category_id,
            base_price: product.base_price,
            discount_offer: product.discount_offer,
            main_image: mainImage
              ? {
                  id: mainImage.id,
                  url: mainImage.url,
                }
              : null,
            default_variant: defaultVariant,
            // Include sales metrics for transparency
            sales_data: salesDataMap[product.id],
          };
        })
        .filter((product: any) => product !== null)
        // Sort by sales data to maintain top sellers order
        .sort(
          (a: any, b: any) =>
            b.sales_data.total_units_sold - a.sales_data.total_units_sold,
        );

      if (includeCategory && processedProducts.length > 0) {
        // Get category information for the products
        const categoryIds = [
          ...new Set(
            processedProducts.map((p: any) => p.category_id).filter(Boolean),
          ),
        ];

        if (categoryIds.length > 0) {
          const { data: categories } = await this.supabaseService
            .getClient()
            .from('categories')
            .select('id, name, slug')
            .in('id', categoryIds);

          // Map categories to products
          const categoriesMap: { [key: string]: any } = {};
          if (categories) {
            categories.forEach((cat: any) => {
              categoriesMap[cat.id] = cat;
            });
          }

          // Add category info to products
          processedProducts.forEach((product: any) => {
            if (product.category_id && categoriesMap[product.category_id]) {
              product.category = categoriesMap[product.category_id];
            }
          });
        }
      }

      return processedProducts;
    } catch (error) {
      console.error('Exception getting top sellers:', error);
      // Return empty array on any exception
      return [];
    }
  }

  /**
   * Get new arrivals products for homepage display
   * Returns recently added products with optimized response structure
   * @param limit Number of new arrival products to return
   * @param period Time period to consider ('week', 'month', 'year', 'all')
   * @param includeCategory Whether to include category details
   * @returns Array of new arrival products
   */
  async findNewArrivals(
    limit = 8,
    period: 'week' | 'month' | 'year' | 'all' = 'all',
    includeCategory = false,
  ): Promise<any[]> {
    try {
      // Define the time range based on the period for filtering new arrivals
      let timeFilter = '';
      const now = new Date();

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        timeFilter = `gte.created_at.${weekAgo.toISOString()}`;
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        timeFilter = `gte.created_at.${monthAgo.toISOString()}`;
      } else if (period === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        timeFilter = `gte.created_at.${yearAgo.toISOString()}`;
      }

      // Get only essential product fields and main image only, ordered by creation date (newest first)
      let query = this.supabaseService
        .getClient()
        .from('products')
        .select(
          'id, name, category_id, base_price, discount_offer, created_at, main_image:product_images!inner(id, url, type, order)',
        )
        .eq('product_images.type', 'main') // Only get main images
        .eq('is_visible', true) // Only show visible products
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply time filter if specified
      if (timeFilter && period !== 'all') {
        const timeDate = timeFilter.split('.')[2]; // Extract the date from the filter
        query = query.gte('created_at', timeDate);
      }

      const { data: products, error } = await query;

      if (error) {
        console.error('Error getting new arrivals:', error);
        return [];
      }

      if (!products || products.length === 0) {
        // No products found in the specified period
        console.log(`No new arrivals found for period: ${period}`);
        return [];
      }

      // Get the product IDs from the filtered results
      const productIds = products.map((p: any) => p.id);

      // Get all variants for these products
      const { data: variants, error: variantsError } =
        await this.supabaseService
          .getClient()
          .from('product_variants')
          .select('id, product_id, sku, price, discount_offer, color, size, stock, featured')
          .in('product_id', productIds)
          .order('featured', { ascending: false }) // Featured variants first
          .order('created_at', { ascending: true });

      if (variantsError) {
        console.error(
          'Error getting variants for new arrivals:',
          variantsError,
        );
        return [];
      }

      // Group variants by product_id
      const variantsByProduct: { [key: string]: any[] } = {};
      if (variants) {
        variants.forEach((variant: any) => {
          if (!variantsByProduct[variant.product_id]) {
            variantsByProduct[variant.product_id] = [];
          }
          variantsByProduct[variant.product_id].push(variant);
        });
      }

      // Process products to add default_variant field and clean up response
      const processedProducts = products
        .map((product: any) => {
          const productVariants = variantsByProduct[product.id] || [];
          let defaultVariant = null;

          if (productVariants.length > 0) {
            // Prioritize featured variants first, then use the first available variant
            defaultVariant =
              productVariants.find((v: any) => v.featured) ||
              productVariants[0];
          }

          if (!defaultVariant) {
            return null; // Skip products without variants
          }

          // Clean up the main_image structure - take only the first main image
          const mainImage = Array.isArray(product.main_image)
            ? product.main_image[0]
            : product.main_image;

          return {
            id: product.id,
            name: product.name,
            category_id: product.category_id,
            base_price: product.base_price,
            discount_offer: product.discount_offer,
            created_at: product.created_at,
            main_image: mainImage
              ? {
                  id: mainImage.id,
                  url: mainImage.url,
                }
              : null,
            default_variant: defaultVariant,
          };
        })
        .filter((product: any) => product !== null) // Filter out null products
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ); // Ensure newest first

      if (includeCategory && processedProducts.length > 0) {
        // Get category information for the filtered products
        const categoryIds = [
          ...new Set(
            processedProducts.map((p: any) => p.category_id).filter(Boolean),
          ),
        ];

        if (categoryIds.length > 0) {
          const { data: categories } = await this.supabaseService
            .getClient()
            .from('categories')
            .select('id, name, slug')
            .in('id', categoryIds);

          // Map categories to products
          const categoriesMap: { [key: string]: any } = {};
          if (categories) {
            categories.forEach((cat: any) => {
              categoriesMap[cat.id] = cat;
            });
          }

          // Add category info to products
          processedProducts.forEach((product: any) => {
            if (product.category_id && categoriesMap[product.category_id]) {
              product.category = categoriesMap[product.category_id];
            }
          });
        }
      }

      return processedProducts;
    } catch (error) {
      console.error('Error in findNewArrivals:', error);
      return [];
    }
  }

  /**
   * Get all variants of a specific color
   * @param color The color to filter by
   * @param page Page number for pagination
   * @param limit Items per page
   * @returns Array of variants with pagination metadata
   */
  async findVariantsByColor(
    color: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: variants,
      error,
      count,
    } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select(
        `
        *,
        product:products(*),
        images:product_images(*)
      `,
        { count: 'exact' },
      )
      .ilike('color', `%${color}%`) // Case-insensitive match
      .range(from, to);

    if (error) {
      throw error;
    }

    return {
      items: variants,
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get all variants of a specific size
   * @param size The size to filter by
   * @param page Page number for pagination
   * @param limit Items per page
   * @returns Array of variants with pagination metadata
   */
  async findVariantsBySize(
    size: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: variants,
      error,
      count,
    } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select(
        `
        *,
        product:products(*),
        images:product_images(*)
      `,
        { count: 'exact' },
      )
      .ilike('size', `%${size}%`) // Case-insensitive match
      .range(from, to);

    if (error) {
      throw error;
    }

    return {
      items: variants,
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get products in a specific category with a specific color variant
   * @param categoryId The category ID
   * @param color The color to filter by
   * @param page Page number for pagination
   * @param limit Items per page
   * @returns Array of products with matching color variants
   */
  async findProductsByCategoryAndColor(
    categoryId: string,
    color: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    // First, get all products in the category
    const { data: products, error: productsError } = await this.supabaseService
      .getClient()
      .from('products')
      .select('id')
      .eq('category_id', categoryId);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      return {
        items: [],
        meta: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }

    // Get the product IDs
    const productIds = products.map((product) => product.id);

    // Now get variants of those products with the specified color
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: variants,
      error: variantsError,
      count,
    } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select(
        `
        *,
        product:products(*),
        images:product_images(*)
      `,
        { count: 'exact' },
      )
      .in('product_id', productIds)
      .ilike('color', `%${color}%`) // Case-insensitive match
      .range(from, to);

    if (variantsError) {
      throw variantsError;
    }

    // Group variants by product to create product objects with associated variants
    const productMap = {};
    variants.forEach((variant) => {
      const productId = variant.product_id;
      if (!productMap[productId]) {
        productMap[productId] = {
          ...variant.product,
          variants: [],
          images: variant.images || [],
        };
      }
      productMap[productId].variants.push(variant);
    });

    return {
      items: Object.values(productMap),
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get products in a specific category with a specific size variant
   * @param categoryId The category ID
   * @param size The size to filter by
   * @param page Page number for pagination
   * @param limit Items per page
   * @returns Array of products with matching size variants
   */
  async findProductsByCategoryAndSize(
    categoryId: string,
    size: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    // First, get all products in the category
    const { data: products, error: productsError } = await this.supabaseService
      .getClient()
      .from('products')
      .select('id')
      .eq('category_id', categoryId);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      return {
        items: [],
        meta: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }

    // Get the product IDs
    const productIds = products.map((product) => product.id);

    // Now get variants of those products with the specified size
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: variants,
      error: variantsError,
      count,
    } = await this.supabaseService
      .getClient()
      .from('product_variants')
      .select(
        `
        *,
        product:products(*),
        images:product_images(*)
      `,
        { count: 'exact' },
      )
      .in('product_id', productIds)
      .ilike('size', `%${size}%`) // Case-insensitive match
      .range(from, to);

    if (variantsError) {
      throw variantsError;
    }

    // Group variants by product to create product objects with associated variants
    const productMap = {};
    variants.forEach((variant) => {
      const productId = variant.product_id;
      if (!productMap[productId]) {
        productMap[productId] = {
          ...variant.product,
          variants: [],
          images: variant.images || [],
        };
      }
      productMap[productId].variants.push(variant);
    });

    return {
      items: Object.values(productMap),
      meta: {
        page,
        limit,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get search initialization data for client-side search
   * This endpoint retrieves all products, categories, and subcategories
   * for building a local search index on the client
   */
  async getSearchInitializationData(): Promise<SearchDataResponseDto> {
    const [products, categories] = await Promise.all([
      this.getProductsForSearch(),
      this.categoriesService.findAll(true), // Get hierarchical categories
    ]);

    // For each product, enhance with category names for search
    const enhancedProducts =
      await this.enhanceProductsWithCategoryDetails(products);

    return {
      products: enhancedProducts,
      categories,
    };
  }

  /**
   * Get products specifically formatted for search functionality
   * @returns Array of products with their variants and images
   */
  private async getProductsForSearch(): Promise<Product[]> {
    // Query products with variants and images
    const { data, error } = await this.supabaseService
      .getClient()
      .from('products')
      .select(
        `
        *,
        variants:product_variants(*),
        images:product_images(*)
      `,
      )
      .eq('is_visible', true); // Only show visible products

    if (error) {
      throw error;
    }

    // Return properly typed products
    return data as unknown as Product[];
  }

  /**
   * Get detailed category information including parent category
   * @param categoryId Category ID
   * @returns Category with parent information
   */
  private async getCategoryWithParent(
    categoryId: string,
  ): Promise<CategoryWithParent | null> {
    if (!categoryId) return null;

    try {
      const { data: category, error } = await this.supabaseService
        .getClient()
        .from('categories')
        .select('*, parent:parent_id(*)')
        .eq('id', categoryId)
        .single();

      if (error) {
        console.error(`Error retrieving category ${categoryId}:`, error);
        return null;
      }

      return category as unknown as CategoryWithParent;
    } catch (error) {
      console.error(`Error retrieving category ${categoryId}:`, error);
      return null;
    }
  }

  /**
   * Enhance products with detailed category information
   * @param products Array of products to enhance
   * @returns Enhanced products with category details
   */
  private async enhanceProductsWithCategoryDetails(
    products: any[],
  ): Promise<any[]> {
    const productsCopy = [...products];

    for (let i = 0; i < productsCopy.length; i++) {
      const product = productsCopy[i] as ProductWithCategory;

      if (product.category && product.category.parent_id) {
        // If we already have basic category data, fetch the parent
        const { data: parentCategory, error } = await this.supabaseService
          .getClient()
          .from('categories')
          .select('*')
          .eq('id', product.category.parent_id)
          .single();

        if (!error && parentCategory) {
          product.category.parent = parentCategory as Category;
        }
      } else if (product.category_id) {
        // If we only have category_id, fetch the full category with parent
        const fullCategory = await this.getCategoryWithParent(
          product.category_id,
        );
        if (fullCategory) {
          product.category = fullCategory;
        }
      }
    }

    return productsCopy;
  }

  /**
   * Import products and variants from a CSV file
   * @param fileBuffer The CSV file buffer to import from
   * @param createCategories Whether to create categories if they don't exist
   * @param skipErrors Whether to skip rows with errors
   * @returns Results of the import operation
   */
  async importProductsFromCsv(
    fileBuffer: Buffer,
    createCategories = true,
    skipErrors = true,
  ): Promise<ProductImportResultDto> {
    console.log(
      `Starting CSV import with options: createCategories=${createCategories}, skipErrors=${skipErrors}`,
    );
    console.log(
      `File buffer type: ${typeof fileBuffer}, instanceof Buffer: ${fileBuffer instanceof Buffer}, length: ${fileBuffer ? fileBuffer.length : 'N/A'}`,
    );

    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('Received empty file buffer');
      throw new BadRequestException('Empty file buffer received');
    }

    // Check first few bytes of buffer to debug
    console.log(
      `First 50 bytes of buffer: ${fileBuffer.slice(0, 50).toString('hex')}`,
    );
    console.log(
      `File content preview: ${fileBuffer.slice(0, 200).toString('utf-8').replace(/\n/g, '\\n')}`,
    );

    // Parse CSV file
    let parsedCsv: ProductCsvRow[];
    try {
      console.log('Attempting to parse CSV file...');

      // Try with various options to see what works
      try {
        const options = {
          columns: true, // Use first row as column names
          skip_empty_lines: true,
          trim: true,
          // delimiter: ',', // Explicitly set delimiter
        };
        console.log('Parsing with options:', JSON.stringify(options));
        parsedCsv = csvParse(fileBuffer, options);
      } catch (parseError) {
        console.error(`First parse attempt failed: ${parseError.message}`);

        // Try alternative parsing approach
        console.log(
          'Trying alternative parsing approach with different options...',
        );
        const csvString = fileBuffer.toString('utf-8');
        console.log(
          `File as string length: ${csvString.length}, first 100 chars: ${csvString.substring(0, 100).replace(/\n/g, '\\n')}`,
        );

        parsedCsv = csvParse(csvString, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          // bom: true, // Handle BOM if present
        });
      }

      console.log(
        `CSV parsing completed. Result type: ${typeof parsedCsv}, isArray: ${Array.isArray(parsedCsv)}`,
      );

      // Log the parsed CSV content
      console.log('------------ PARSED CSV CONTENT ------------');
      console.log(`Total rows: ${parsedCsv.length}`);

      if (parsedCsv.length > 0) {
        console.log('First row keys:', Object.keys(parsedCsv[0]));
        parsedCsv.forEach((row, index) => {
          console.log(`\n[Row ${index + 1}]:`);
          console.log(JSON.stringify(row, null, 2));
        });
      } else {
        console.error('No rows were parsed from the CSV!');
      }

      console.log('-------------------------------------------');
    } catch (error) {
      console.error(`CSV parsing error: ${error.message}`);
      console.error('Error stack:', error.stack);
      throw new BadRequestException(
        `Failed to parse CSV file: ${error.message}`,
      );
    }

    // Results tracking
    const result: ProductImportResultDto = {
      totalRows: parsedCsv.length,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      importedProducts: [],
    };

    // Track product IDs to avoid duplicate imports
    const processedProducts = new Map<string, string>();

    // Process each row
    for (let rowIndex = 0; rowIndex < parsedCsv.length; rowIndex++) {
      const row = parsedCsv[rowIndex];
      const rowNumber = rowIndex + 2; // +2 because row 1 is header and we're 0-indexed

      console.log(
        `\n--- Processing Row ${rowNumber} (${row.name || 'unnamed'}) ---`,
      );

      try {
        // Basic validation
        console.log('Validating required fields...');

        if (!row.name || row.name.trim() === '') {
          console.error('Validation failed: Missing product name');
          throw new Error('Product name is required');
        }

        if (!row.sku || row.sku.trim() === '') {
          console.error(`Validation failed for "${row.name}": Missing SKU`);
          throw new Error('SKU is required');
        }

        // Check for base price
        if (!row.base_price || isNaN(parseFloat(row.base_price.toString()))) {
          console.error(
            `Validation failed for "${row.name}": Invalid base price`,
          );
          throw new Error('Valid base price is required');
        }

        if (!row.discount_offer || isNaN(parseFloat(row.discount_offer.toString()))) {
          console.error(
            `Validation failed for "${row.name}": Invalid discount offer`,
          );
          throw new Error('Valid discount offer is required');
        }

        // Check for stock
        if (!row.stock || isNaN(parseInt(row.stock.toString()))) {
          console.error(
            `Validation failed for "${row.name}": Invalid stock quantity`,
          );
          throw new Error('Valid stock quantity is required');
        }

        console.log(
          `Validation passed for product "${row.name}" (SKU: ${row.sku})`,
        );

        // Process category - find or create
        let categoryId: string | null = null;

        if (row.category_name && row.category_name.trim() !== '') {
          console.log(`Looking up category: "${row.category_name}"`);
          categoryId = await this.findOrCreateCategory(
            row.category_name,
            createCategories,
          );

          if (categoryId) {
            console.log(`Category resolved to ID: ${categoryId}`);
          } else {
            console.log(`Could not resolve category "${row.category_name}"`);
          }

          // If we couldn't find or create the category
          if (!categoryId && !skipErrors) {
            throw new Error(
              `Category "${row.category_name}" not found and createCategories is set to false`,
            );
          }
        } else {
          console.log('No category specified for this product');
        }

        // Check if this product already exists in current import batch
        let productId: string;
        if (processedProducts.has(row.name)) {
          // Product already created in this import, add variant only
          productId = processedProducts.get(row.name) as string;
          console.log(
            `Using existing product "${row.name}" with ID: ${productId}`,
          );
        } else {
          // Create a new product
          console.log(`Creating new product "${row.name}"...`);
          const newProduct = {
            name: row.name,
            description: row.description || null,
            base_price: parseFloat(row.base_price.toString()),
            discount_offer: row.discount_offer ? parseFloat(row.discount_offer.toString()) : null,
            category_id: categoryId,
          };

          console.log('Product data:', JSON.stringify(newProduct, null, 2));

          // Insert product in database
          const { data: product, error } = await this.supabaseService
            .getClient()
            .from('products')
            .insert(newProduct)
            .select()
            .single();

          if (error) {
            console.error(`Database error creating product: ${error.message}`);
            throw new Error(`Failed to create product: ${error.message}`);
          }

          productId = product.id;
          processedProducts.set(row.name, productId);
          console.log(`Created product with ID: ${productId}`);

          // Handle product images if present
          if (row.product_images) {
            const imageUrls = row.product_images
              .split('|')
              .map((url) => url.trim())
              .filter((url) => url);
            console.log(`Processing ${imageUrls.length} product images`);
            for (let i = 0; i < imageUrls.length; i++) {
              console.log(`Adding product image from URL: ${imageUrls[i]}`);
              await this.createProductImageFromUrl(
                productId,
                imageUrls[i],
                i === 0 ? 'main' : 'gallery',
                i,
              );
            }
          }
        }

        // Create variant
        console.log(
          `Creating variant for product "${row.name}" (SKU: ${row.sku})...`,
        );
        const variantPrice = row.variant_price
          ? parseFloat(row.variant_price.toString())
          : parseFloat(row.base_price.toString());

        const newVariant = {
          product_id: productId,
          sku: row.sku,
          price: variantPrice,
          color: row.color || null,
          size: row.size || null,
          stock: parseInt(row.stock.toString()),
        };

        console.log('Variant data:', JSON.stringify(newVariant, null, 2));

        // Insert variant in database
        const { data: variant, error: variantError } =
          await this.supabaseService
            .getClient()
            .from('product_variants')
            .insert(newVariant)
            .select()
            .single();

        if (variantError) {
          // If it's a unique violation on SKU, provide a clearer error
          if (
            variantError.code === '23505' &&
            variantError.details?.includes('sku')
          ) {
            console.error(`Duplicate SKU error: "${row.sku}" already exists`);
            throw new Error(`Duplicate SKU: "${row.sku}" already exists`);
          }
          console.error(
            `Database error creating variant: ${variantError.message}`,
          );
          throw new Error(`Failed to create variant: ${variantError.message}`);
        }

        console.log(`Created variant with ID: ${variant.id}`);

        // Handle variant images if present
        if (row.variant_images) {
          const imageUrls = row.variant_images
            .split('|')
            .map((url) => url.trim())
            .filter((url) => url);
          console.log(`Processing ${imageUrls.length} variant images`);
          for (let i = 0; i < imageUrls.length; i++) {
            console.log(`Adding variant image from URL: ${imageUrls[i]}`);
            await this.createVariantImageFromUrl(
              variant.id,
              productId,
              imageUrls[i],
              'gallery',
              i,
            );
          }
        }

        // Update success metrics
        result.successfulImports++;
        result.importedProducts.push({
          id: productId,
          name: row.name,
          sku: row.sku,
        });
        console.log(
          `Successfully processed row ${rowNumber}: ${row.name} (SKU: ${row.sku})`,
        );
      } catch (error) {
        result.failedImports++;
        result.errors.push({
          row: rowNumber,
          error: error.message,
        });
        console.error(`Error processing row ${rowNumber}: ${error.message}`);

        if (!skipErrors) {
          // If we're not skipping errors, abort the entire import
          console.error('Aborting import due to error (skipErrors=false)');
          throw new BadRequestException(
            `Error at row ${rowNumber}: ${error.message}`,
          );
        }
      }
    }

    console.log('\n------------ IMPORT SUMMARY ------------');
    console.log(`Total rows: ${result.totalRows}`);
    console.log(`Successful imports: ${result.successfulImports}`);
    console.log(`Failed imports: ${result.failedImports}`);
    console.log(
      `Errors: ${result.errors.length > 0 ? JSON.stringify(result.errors, null, 2) : 'None'}`,
    );
    console.log('-----------------------------------------');

    return result;
  }

  /**
   * Find or create a category based on path string
   * @param categoryPath Category path (e.g. "Furniture/Living Room/Sofas")
   * @param createIfNotExists Whether to create categories that don't exist
   * @returns Category ID if found or created, null otherwise
   */
  private async findOrCreateCategory(
    categoryPath: string,
    createIfNotExists: boolean,
  ): Promise<string | null> {
    // Split path into parts (e.g. "Furniture/Living Room/Sofas" => ["Furniture", "Living Room", "Sofas"])
    const categoryParts = categoryPath.split('/').map((part) => part.trim());

    let parentId: string | null = null;
    let finalCategoryId: string | null = null;

    // Process each part of the path
    for (const categoryName of categoryParts) {
      if (!categoryName) continue;

      // Try to find existing category at this level
      const { data: existingCategories, error } = await this.supabaseService
        .getClient()
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .eq('parent_id', parentId || null);

      if (error) {
        console.error(`Error finding category: ${error.message}`);
        return null;
      }

      if (existingCategories && existingCategories.length > 0) {
        // Category exists, use it as parent for next iteration
        finalCategoryId = existingCategories[0].id;
        parentId = finalCategoryId;
      } else if (createIfNotExists) {
        // Create new category
        const slug = this.generateSlug(categoryName);

        const { data: newCategory, error: createError } =
          await this.supabaseService
            .getClient()
            .from('categories')
            .insert({
              name: categoryName,
              slug,
              parent_id: parentId,
              order: 0, // Default order
            })
            .select()
            .single();

        if (createError) {
          console.error(`Error creating category: ${createError.message}`);
          return null;
        }

        finalCategoryId = newCategory.id;
        parentId = finalCategoryId;
      } else {
        // Category doesn't exist and we're not creating it
        return null;
      }
    }

    return finalCategoryId;
  }

  /**
   * Generate a slug from a string
   * @param text Text to generate slug from
   * @returns Slugified text
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  }

  /**
   * Create a product image from a URL
   * @param productId Product ID
   * @param url Image URL
   * @param type Image type
   * @param order Image order
   */
  private async createProductImageFromUrl(
    productId: string,
    url: string,
    type: string = 'gallery',
    order: number = 0,
  ): Promise<void> {
    try {
      await this.supabaseService.getClient().from('product_images').insert({
        product_id: productId,
        variant_id: null,
        url,
        type,
        order,
      });
    } catch (error) {
      console.error(`Error creating product image: ${error.message}`);
    }
  }

  /**
   * Create a variant image from a URL
   * @param variantId Variant ID
   * @param productId Product ID
   * @param url Image URL
   * @param type Image type
   * @param order Image order
   */
  private async createVariantImageFromUrl(
    variantId: string,
    productId: string,
    url: string,
    type: string = 'gallery',
    order: number = 0,
  ): Promise<void> {
    try {
      await this.supabaseService.getClient().from('product_images').insert({
        product_id: productId,
        variant_id: variantId,
        url,
        type,
        order,
      });
    } catch (error) {
      console.error(`Error creating variant image: ${error.message}`);
    }
  }

  /**
   * Clean up specific files immediately after processing
   * @param filePaths Array of file paths to clean up
   */
  private async cleanupSpecificFiles(filePaths: string[]): Promise<void> {
    if (!filePaths || filePaths.length === 0) {
      return;
    }

    console.log(`🧹 Cleaning up ${filePaths.length} uploaded files...`);

    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to clean up file ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Clean up old files from the uploads directory
   * This method can be called periodically to remove orphaned files
   * @param maxAgeMinutes Maximum age of files to keep (default: 60 minutes)
   */
  async cleanupUploadsDirectory(maxAgeMinutes: number = 60): Promise<void> {
    const uploadsDir =
      process.env.NODE_ENV === 'production' ? '/tmp/uploads' : './uploads';

    try {
      if (!fs.existsSync(uploadsDir)) {
        console.log(`📁 Uploads directory does not exist: ${uploadsDir}`);
        return;
      }

      const files = fs.readdirSync(uploadsDir);
      const now = Date.now();
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
      let cleanedCount = 0;

      console.log(`🧹 Starting cleanup of uploads directory: ${uploadsDir}`);
      console.log(`📄 Found ${files.length} files to check`);

      for (const file of files) {
        const filePath = `${uploadsDir}/${file}`;

        try {
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtime.getTime();

          if (fileAge > maxAge) {
            fs.unlinkSync(filePath);
            cleanedCount++;
            console.log(
              `🗑️ Removed old file: ${file} (age: ${Math.round(fileAge / 60000)}min)`,
            );
          }
        } catch (fileError) {
          console.warn(`⚠️ Error processing file ${file}:`, fileError.message);
        }
      }

      console.log(
        `✅ Cleanup completed. Removed ${cleanedCount} old files from ${uploadsDir}`,
      );
    } catch (error) {
      console.error(
        `❌ Error during uploads directory cleanup:`,
        error.message,
      );
    }
  }

  /**
   * Get the size of uploads directory and file count
   */
  getUploadsDirectoryInfo(): {
    exists: boolean;
    fileCount: number;
    totalSize: number;
    path: string;
  } {
    const uploadsDir =
      process.env.NODE_ENV === 'production' ? '/tmp/uploads' : './uploads';

    const info = {
      exists: false,
      fileCount: 0,
      totalSize: 0,
      path: uploadsDir,
    };

    try {
      if (fs.existsSync(uploadsDir)) {
        info.exists = true;
        const files = fs.readdirSync(uploadsDir);
        info.fileCount = files.length;

        for (const file of files) {
          try {
            const stats = fs.statSync(`${uploadsDir}/${file}`);
            info.totalSize += stats.size;
          } catch (fileError) {
            console.warn(
              `Error getting stats for file ${file}:`,
              fileError.message,
            );
          }
        }
      }
    } catch (error) {
      console.error('Error getting uploads directory info:', error.message);
    }

    return info;
  }
}
