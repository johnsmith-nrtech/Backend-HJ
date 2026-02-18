import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiTags, ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from '@nestjs/swagger';

/**
 * Swagger tag for floor endpoints
 */
export const ApiFloorTag = ApiTags('Floors');

/**
 * Swagger decorators for GET /floors endpoint
 */
export const ApiGetFloors = applyDecorators(
  ApiOperation({
    summary: 'Get all floors',
    description: 'Retrieve a list of all floors',
  }),
  ApiResponse({
    status: 200,
    description: 'Floors retrieved successfully',
  })
);

/**
 * Swagger decorators for GET /floors/:id endpoint
 */
export const ApiGetFloor = applyDecorators(
  ApiOperation({
    summary: 'Get a specific floor',
    description: 'Retrieve details of a specific floor by ID',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Floor ID (UUID)',
    schema: { type: 'string', format: 'uuid' },
  }),
  ApiResponse({
    status: 200,
    description: 'Floor retrieved successfully',
  }),
  ApiResponse({
    status: 404,
    description: 'Floor not found',
  })
);

/**
 * Swagger decorators for POST /admin/floors endpoint
 */
export const ApiCreateFloor = applyDecorators(
  ApiOperation({
    summary: 'Create a floor (Admin only)',
    description: 'Create a new floor with name and charges',
  }),
  ApiBearerAuth(),
  ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
  ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
  ApiResponse({
    status: 201,
    description: 'Floor created successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
);

/**
 * Swagger decorators for PUT /admin/floors/:id endpoint
 */
export const ApiUpdateFloor = applyDecorators(
  ApiOperation({
    summary: 'Update a floor (Admin only)',
    description: 'Update an existing floor by ID',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Floor ID (UUID)',
    schema: { type: 'string', format: 'uuid' },
  }),
  ApiBearerAuth(),
  ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
  ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
  ApiResponse({
    status: 200,
    description: 'Floor updated successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  }),
  ApiResponse({
    status: 404,
    description: 'Floor not found',
  })
);

/**
 * Swagger decorators for DELETE /admin/floors/:id endpoint
 */
export const ApiDeleteFloor = applyDecorators(
  ApiOperation({
    summary: 'Delete a floor (Admin only)',
    description: 'Delete an existing floor by ID',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Floor ID (UUID)',
    schema: { type: 'string', format: 'uuid' },
  }),
  ApiBearerAuth(),
  ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
  ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' }),
  ApiResponse({
    status: 200,
    description: 'Floor deleted successfully',
  }),
  ApiResponse({
    status: 404,
    description: 'Floor not found',
  })
);
