import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WishlistItemDto } from './dto';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Add item to authenticated user's wishlist
   */
  async addToWishlist(userId: string, item: WishlistItemDto) {
    try {
      this.logger.log(`Adding to wishlist for user ID: ${userId}`);
      const supabase = this.supabaseService.getClient();
      
      // Check if variant exists
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('id')
        .eq('id', item.variant_id)
        .single();
          
      if (variantError || !variant) {
        throw new HttpException('Variant not found', HttpStatus.NOT_FOUND);
      }
      
      // First check if the item already exists in wishlist
      const { data: existingItem } = await supabase
        .from('wishlists')
        .select('id, user_id, variant_id, created_at')
        .eq('user_id', userId)
        .eq('variant_id', item.variant_id)
        .single();
      
      if (existingItem) {
        // Item already exists, return success with existing item
        this.logger.log(`Item already exists in wishlist for user ${userId}, variant ${item.variant_id}`);
        return {
          ...existingItem,
          message: 'Item already in wishlist'
        };
      }
      
      // Add to wishlist
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: userId,
          variant_id: item.variant_id,
        })
        .select('id, user_id, variant_id, created_at')
        .single();
        
      if (error) {
        // Handle unique constraint violation specifically
        if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique')) {
          this.logger.log(`Duplicate wishlist item detected for user ${userId}, variant ${item.variant_id}`);
          
          // Get the existing item and return it
          const { data: existingData } = await supabase
            .from('wishlists')
            .select('id, user_id, variant_id, created_at')
            .eq('user_id', userId)
            .eq('variant_id', item.variant_id)
            .single();
            
          return {
            ...existingData,
            message: 'Item already in wishlist'
          };
        }
        
        this.logger.error(`Error adding to wishlist: ${error.message}`);
        throw new HttpException('Failed to add to wishlist', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      return {
        ...data,
        message: 'Item added to wishlist'
      };
    } catch (error) {
      this.logger.error(`Failed to add to wishlist: ${error.message}`);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to add to wishlist',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get authenticated user's wishlist with detailed variant and product information
   */
  async getUserWishlist(userId: string) {
    try {
      this.logger.log(`Getting wishlist for user ID: ${userId}`);
      const supabase = this.supabaseService.getClient();
      
      // Fetch wishlist items with detailed variant and product information
      const { data: items, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          created_at,
          variant:product_variants(
            id,
            product_id,
            sku,
            price,
            size,
            color,
            stock,
            tags,
            material,
            brand,
            featured,
            created_at,
            updated_at,
            product:products(
              id,
              name,
              description,
              category_id,
              base_price,
              created_at,
              updated_at,
              category:categories(
                id,
                name,
                slug,
                parent_id,
                description,
                order,
                image_url,
                featured,
                created_at,
                updated_at
              )
            ),
            variant_images:product_images!variant_id(
              id,
              url,
              type,
              order,
              created_at,
              updated_at
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        this.logger.error(`Error fetching wishlist: ${error.message}`);
        throw new HttpException('Failed to fetch wishlist', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Also get product-level images for each item
      const itemsWithImages = await Promise.all(
        (items || []).map(async (item: any) => {
          if (item.variant?.product) {
            // Get product-level images (not variant-specific)
            const { data: productImages, error: imageError } = await supabase
              .from('product_images')
              .select('id, url, type, order, created_at, updated_at')
              .eq('product_id', item.variant.product.id)
              .is('variant_id', null)
              .order('order');

            if (!imageError && productImages) {
              item.variant.product.images = productImages;
            }
          }
          return item;
        })
      );
      
      return itemsWithImages || [];
    } catch (error) {
      this.logger.error(`Failed to get user wishlist: ${error.message}`);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to fetch wishlist',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Remove item from authenticated user's wishlist
   */
  async removeFromWishlist(userId: string, wishlistItemId: string) {
    try {
      this.logger.log(`Removing from wishlist for user ID: ${userId}, item ID: ${wishlistItemId}`);
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistItemId)
        .eq('user_id', userId)
        .select('id, user_id, variant_id, created_at')
        .single();
        
      if (error || !data) {
        throw new HttpException('Wishlist item not found', HttpStatus.NOT_FOUND);
      }
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to remove from wishlist: ${error.message}`);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to remove from wishlist',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Clear all items from authenticated user's wishlist
   */
  async clearWishlist(userId: string) {
    try {
      this.logger.log(`Clearing wishlist for user ID: ${userId}`);
      const supabase = this.supabaseService.getClient();
      
      const { data, error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .select('id, user_id, variant_id, created_at');
        
      if (error) {
        this.logger.error(`Error clearing wishlist: ${error.message}`);
        throw new HttpException('Failed to clear wishlist', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      return data || [];
    } catch (error) {
      this.logger.error(`Failed to clear wishlist: ${error.message}`);
      throw error instanceof HttpException ? error : new HttpException(
        'Failed to clear wishlist',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 