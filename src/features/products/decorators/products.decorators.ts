import { applyDecorators } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiParam, 
  ApiQuery, 
  ApiBearerAuth, 
  ApiResponse, 
  ApiUnauthorizedResponse, 
  ApiForbiddenResponse,
  ApiBody,
  ApiConsumes,
  ApiProduces
} from '@nestjs/swagger';
import { SearchDataResponseDto } from '../dto/search-data-response.dto';

export const ApiProductsTag = () => {
  return applyDecorators(
    ApiTags('products')
  );
};

// Featured Products
export const ApiFeaturedProducts = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get featured products' }),
    ApiQuery({ name: 'limit', required: false, description: 'Number of featured products to return', type: Number }),
    ApiResponse({ status: 200, description: 'Returns featured products' })
  );
};

// Top Sellers
export const ApiTopSellers = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get top selling products' }),
    ApiQuery({ name: 'limit', required: false, description: 'Number of top selling products to return', type: Number }),
    ApiQuery({ name: 'period', required: false, description: 'Time period to consider for top sellers', enum: ['week', 'month', 'year', 'all'] }),
    ApiResponse({ status: 200, description: 'Returns top selling products' })
  );
};

// Related Products
export const ApiRelatedProducts = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get products related to a specific product' }),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiQuery({ name: 'limit', required: false, description: 'Number of related products to return', type: Number }),
    ApiResponse({ status: 200, description: 'Returns related products' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Get Product by ID
export const ApiGetProduct = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get a product by ID' }),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiQuery({ name: 'includeVariants', required: false, description: 'Include variants', type: Boolean }),
    ApiQuery({ name: 'includeImages', required: false, description: 'Include images', type: Boolean }),
    ApiQuery({ name: 'includeCategory', required: false, description: 'Include category details', type: Boolean }),
    ApiResponse({ status: 200, description: 'Returns the product' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Get All Products
export const ApiGetAllProducts = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get all products' }),
    ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID', type: String }),
    ApiQuery({ name: 'search', required: false, description: 'Search term' }),
    ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number }),
    ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number }),
    ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field', enum: ['id', 'name', 'base_price', 'created_at'] }),
    ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', enum: ['asc', 'desc'] }),
    ApiQuery({ name: 'includeVariants', required: false, description: 'Include variants', type: Boolean }),
    ApiQuery({ name: 'includeImages', required: false, description: 'Include images', type: Boolean }),
    ApiResponse({ status: 200, description: 'Returns a list of products with pagination metadata' })
  );
};

// Get Product Variants
export const ApiGetProductVariants = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get product variants' }),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiResponse({ status: 200, description: 'Returns product variants' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Get Product Images
export const ApiGetProductImages = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get product images' }),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiResponse({ status: 200, description: 'Returns product images' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Create Product
export const ApiCreateProduct = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new product (Admin only)' }),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 201, description: 'Returns the created product' })
  );
};

// Update Product
export const ApiUpdateProduct = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Update an existing product (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns the updated product' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Delete Product
export const ApiDeleteProduct = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a product (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns the deleted product' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Get Variant by ID
export const ApiGetVariant = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get a variant by ID' }),
    ApiParam({ name: 'id', description: 'Variant ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiResponse({ status: 200, description: 'Returns the variant' }),
    ApiResponse({ status: 404, description: 'Variant not found' })
  );
};

// Get 360° View Images
export const ApiGet360Images = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get 360° view images for a product' }),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiResponse({ status: 200, description: 'Returns 360° view images' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Get Variant Images
export const ApiGetVariantImages = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get images for a specific variant' }),
    ApiParam({ name: 'id', description: 'Variant ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiResponse({ status: 200, description: 'Returns variant images' }),
    ApiResponse({ status: 404, description: 'Variant not found' })
  );
};

// Get Low Stock Products
export const ApiGetLowStock = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get products with low stock (Admin only)' }),
    ApiBearerAuth(),
    ApiQuery({ name: 'threshold', required: false, description: 'Low stock threshold', type: Number }),
    ApiQuery({ name: 'limit', required: false, description: 'Number of products to return', type: Number }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns products with low stock' })
  );
};

// Create Variant
export const ApiCreateVariant = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Add a variant to a product (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 201, description: 'Returns the created variant' }),
    ApiResponse({ status: 404, description: 'Product not found' })
  );
};

// Update Variant
export const ApiUpdateVariant = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Update a product variant (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Variant ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns the updated variant' }),
    ApiResponse({ status: 404, description: 'Variant not found' })
  );
};

// Delete Variant
export const ApiDeleteVariant = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a product variant (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Variant ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns the deleted variant' }),
    ApiResponse({ status: 404, description: 'Variant not found' })
  );
};

// Update Stock
export const ApiUpdateStock = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Update stock level of a variant (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Variant ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns the updated variant' }),
    ApiResponse({ status: 404, description: 'Variant not found' })
  );
};

// Create Product Image(s)
export const ApiCreateProductImage = () => {
  return applyDecorators(
    ApiOperation({ 
      summary: 'Upload images for a product (Admin only)',
      description: 'Supports both single and multiple file uploads. Use imageFiles for multiple files or imageFile for single file (backward compatibility). Order is automatically calculated based on existing images.'
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Product ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          imageFiles: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary'
            },
            description: 'Multiple image files to upload (up to 10 files)'
          },
          imageFile: {
            type: 'string',
            format: 'binary',
            description: 'Single image file to upload (for backward compatibility)'
          },
          url: {
            type: 'string',
            description: 'Direct URL to image (alternative to file upload)',
            example: 'https://example.com/images/sofa1.jpg'
          },
          type: {
            type: 'string',
            enum: ['main', 'gallery', '360'],
            description: 'Type of image',
            default: 'gallery'
          },
          order: {
            type: 'number',
            description: 'Starting order for images (auto-calculated if not provided)',
            minimum: 0
          }
        }
      }
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ 
      status: 201, 
      description: 'Returns array of created images',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            product_id: { type: 'string' },
            variant_id: { type: 'string', nullable: true },
            url: { type: 'string' },
            type: { type: 'string' },
            order: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Product not found' }),
    ApiResponse({ status: 400, description: 'Bad request - Invalid file format or no files provided' })
  );
};

// Create Variant Image(s)
export const ApiCreateVariantImage = () => {
  return applyDecorators(
    ApiOperation({ 
      summary: 'Upload images for a variant (Admin only)',
      description: 'Supports both single and multiple file uploads. Use imageFiles for multiple files or imageFile for single file (backward compatibility). Order is automatically calculated based on existing variant images.'
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Variant ID', type: String, example: '123e4567-e89b-12d3-a456-426614174222' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          imageFiles: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary'
            },
            description: 'Multiple image files to upload (up to 10 files)'
          },
          imageFile: {
            type: 'string',
            format: 'binary',
            description: 'Single image file to upload (for backward compatibility)'
          },
          url: {
            type: 'string',
            description: 'Direct URL to image (alternative to file upload)',
            example: 'https://example.com/images/variant-image.jpg'
          },
          type: {
            type: 'string',
            enum: ['main', 'gallery', '360'],
            description: 'Type of image',
            default: 'gallery'
          },
          order: {
            type: 'number',
            description: 'Starting order for images (auto-calculated if not provided)',
            minimum: 0
          }
        }
      }
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ 
      status: 201, 
      description: 'Returns array of created images',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            product_id: { type: 'string' },
            variant_id: { type: 'string' },
            url: { type: 'string' },
            type: { type: 'string' },
            order: { type: 'number' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' }
          }
        }
      }
    }),
    ApiResponse({ status: 404, description: 'Variant not found' }),
    ApiResponse({ status: 400, description: 'Bad request - Invalid file format or no files provided' })
  );
};

// Update Image
export const ApiUpdateImage = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Update image details (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Image ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns the updated image' }),
    ApiResponse({ status: 404, description: 'Image not found' })
  );
};

// Delete Image
export const ApiDeleteImage = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Delete an image (Admin only)' }),
    ApiBearerAuth(),
    ApiParam({ name: 'id', description: 'Image ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
    ApiResponse({ status: 200, description: 'Returns the deleted image' }),
    ApiResponse({ status: 404, description: 'Image not found' })
  );
};

// Get Variants by Color
export const ApiGetVariantsByColor = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get all variants of a specific color' }),
    ApiQuery({ name: 'color', required: true, description: 'Color to filter by' }),
    ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number }),
    ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number }),
    ApiResponse({ status: 200, description: 'Returns variants with the specified color' })
  );
};

// Get Variants by Size
export const ApiGetVariantsBySize = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get all variants of a specific size' }),
    ApiQuery({ name: 'size', required: true, description: 'Size to filter by' }),
    ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number }),
    ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number }),
    ApiResponse({ status: 200, description: 'Returns variants with the specified size' })
  );
};

// Get Products by Category and Color
export const ApiGetProductsByCategoryAndColor = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get products in a category with a specific color' }),
    ApiParam({ name: 'id', description: 'Category ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiQuery({ name: 'color', required: true, description: 'Color to filter by' }),
    ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number }),
    ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number }),
    ApiResponse({ status: 200, description: 'Returns products with the specified color in the category' }),
    ApiResponse({ status: 404, description: 'Category not found' })
  );
};

// Get Products by Category and Size
export const ApiGetProductsByCategoryAndSize = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get products in a category with a specific size' }),
    ApiParam({ name: 'id', description: 'Category ID', type: String, example: '123e4567-e89b-12d3-a456-426614174000' }),
    ApiQuery({ name: 'size', required: true, description: 'Size to filter by' }),
    ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number }),
    ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number }),
    ApiResponse({ status: 200, description: 'Returns products with the specified size in the category' }),
    ApiResponse({ status: 404, description: 'Category not found' })
  );
};

/**
 * Swagger decorator for the search initialization data endpoint
 */
export const ApiSearchInitData = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get search initialization data',
      description: 'Retrieves all products with variants, parent categories, and subcategories for client-side search functionality'
    }),
    ApiResponse({
      status: 200,
      description: 'The search initialization data',
      type: SearchDataResponseDto
    })
  );
};

// Re-export NestJS Swagger decorators for convenience
export { 
  ApiOperation, 
  ApiParam, 
  ApiQuery, 
  ApiResponse, 
  ApiBody, 
  ApiConsumes,
  ApiProduces
}; 