/**
 * Represents a row in the CSV import file for products and variants
 * This helps understand the expected format for the import
 */
export interface ProductCsvRow {
  // Product base details
  name: string;
  description?: string;
  base_price: number;
  
  // Category information (can be name or path)
  category_name: string; // Category name with optional path e.g. "Furniture/Living Room/Sofas"
  
  // Variant details (a product needs at least one variant)
  sku: string;
  variant_price?: number; // If different from base_price
  color?: string;
  size?: string;
  stock: number;
  
  // Optional fields for future use
  tags?: string; // Comma-separated tags
  material?: string;
  brand?: string;
  featured?: boolean;
  
  // Image URLs (comma-separated)
  product_images?: string; // Main product images
  variant_images?: string; // Variant-specific images
} 