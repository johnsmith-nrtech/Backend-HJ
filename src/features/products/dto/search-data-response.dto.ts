import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';
import { Category } from '../../categories/entities/category.entity';

/**
 * Response DTO for the search initialization data endpoint
 * Provides all data needed for client-side search and filtering
 */
export class SearchDataResponseDto {
  /**
   * All products with their variants and category information
   */
  @ApiProperty({
    description: 'All products with their variants and category information',
    type: [Product],
  })
  products: Product[];

  /**
   * Hierarchical category structure including parent-child relationships
   */
  @ApiProperty({
    description: 'Hierarchical category structure including parent-child relationships',
    type: [Category],
  })
  categories: Category[];
} 