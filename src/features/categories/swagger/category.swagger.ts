import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

/**
 * Swagger decorators for GET /categories endpoint
 */
export const ApiGetCategories = applyDecorators(
  ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieve a list of all categories, with optional nesting of subcategories',
  }),
  ApiQuery({
    name: 'nested',
    required: false,
    type: Boolean,
    description: 'Whether to include nested subcategories in the response',
  }),
  ApiResponse({
    status: 200,
    description: 'List of categories retrieved successfully',
  })
);

/**
 * Swagger decorators for GET /popular-categories endpoint
 */
export const ApiGetPopularCategories = applyDecorators(
  ApiOperation({
    summary: 'Get popular categories',
    description: 'Retrieve a list of popular categories for showcase display',
  }),
  ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of categories to return',
    example: 4
  }),
  ApiQuery({
    name: 'includeImages',
    required: false,
    type: Boolean,
    description: 'Whether to include representative product images',
    example: true
  }),
  ApiResponse({
    status: 200,
    description: 'Popular categories retrieved successfully',
  })
);

/**
 * Swagger decorators for GET /categories/:id endpoint
 */
export const ApiGetCategory = applyDecorators(
  ApiOperation({
    summary: 'Get a specific category',
    description: 'Retrieve details of a specific category by ID',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Category ID',
    schema: { type: 'integer' },
  }),
  ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
  }),
  ApiResponse({
    status: 404,
    description: 'Category not found',
  })
);

/**
 * Swagger decorators for GET /categories/:id/subcategories endpoint
 */
export const ApiGetSubcategories = applyDecorators(
  ApiOperation({
    summary: 'Get subcategories',
    description: 'Retrieve all subcategories of a specific category',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Parent category ID',
    schema: { type: 'integer' },
  }),
  ApiResponse({
    status: 200,
    description: 'Subcategories retrieved successfully',
  }),
  ApiResponse({
    status: 404,
    description: 'Parent category not found',
  })
);

/**
 * Swagger decorators for GET /categories/:id/products endpoint
 */
export const ApiGetCategoryProducts = applyDecorators(
  ApiOperation({
    summary: 'Get products in category',
    description: 'Retrieve all products belonging to a specific category',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Category ID',
    schema: { type: 'integer' },
  }),
  ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  }),
  ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  }),
  ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
  }),
  ApiResponse({
    status: 404,
    description: 'Category not found',
  })
);

/**
 * Swagger decorators for POST /admin/categories endpoint
 */
export const ApiCreateCategory = applyDecorators(
  ApiOperation({
    summary: 'Create a category',
    description: 'Create a new product category',
  }),
  ApiResponse({
    status: 201,
    description: 'Category created successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  })
);

/**
 * Swagger decorators for PUT /admin/categories/:id endpoint
 */
export const ApiUpdateCategory = applyDecorators(
  ApiOperation({
    summary: 'Update a category',
    description: 'Update an existing product category',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Category ID',
    schema: { type: 'integer' },
  }),
  ApiResponse({
    status: 200,
    description: 'Category updated successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  }),
  ApiResponse({
    status: 404,
    description: 'Category not found',
  })
);

/**
 * Swagger decorators for DELETE /admin/categories/:id endpoint
 */
export const ApiDeleteCategory = applyDecorators(
  ApiOperation({
    summary: 'Delete a category',
    description: 'Delete an existing product category',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Category ID',
    schema: { type: 'integer' },
  }),
  ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  }),
  ApiResponse({
    status: 404,
    description: 'Category not found',
  })
);

/**
 * Swagger decorators for PUT /admin/categories/:id/order endpoint
 */
export const ApiUpdateCategoryOrder = applyDecorators(
  ApiOperation({
    summary: 'Update category order',
    description: 'Change the display order of a category',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Category ID',
    schema: { type: 'integer' },
  }),
  ApiResponse({
    status: 200,
    description: 'Category order updated successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  }),
  ApiResponse({
    status: 404,
    description: 'Category not found',
  })
);

/**
 * Swagger decorators for POST /admin/categories/hierarchy endpoint
 */
export const ApiCreateCategoryHierarchy = applyDecorators(
  ApiOperation({
    summary: 'Create a category hierarchy',
    description: 'Create a new category hierarchy with up to 4 levels of nesting',
  }),
  ApiResponse({
    status: 201,
    description: 'Category hierarchy created successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden - requires admin role',
  })
);

/**
 * Swagger tag for category endpoints
 */
export const ApiCategoryTag = ApiTags('Categories'); 