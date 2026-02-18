import { Category } from '../entities/category.entity';

/**
 * Interface representing a category with nested subcategories
 */
export interface CategoryWithSubcategories extends Category {
  subcategories: CategoryWithSubcategories[];
} 