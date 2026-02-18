import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

/**
 * Swagger tag for zone endpoints
 */
export const ApiZoneTag = ApiTags('Zones');

/**
 * Swagger decorators for GET /zones endpoint
 */
export const ApiGetZones = applyDecorators(
  ApiOperation({
    summary: 'Get all zones',
    description: 'Retrieve a list of all zones',
  }),
  ApiResponse({
    status: 200,
    description: 'Zones retrieved successfully',
  }),
);

/**
 * Swagger decorators for GET /zones/:id endpoint
 */
export const ApiGetZone = applyDecorators(
  ApiOperation({
    summary: 'Get a specific zone',
    description: 'Retrieve details of a specific zone by ID',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Zone ID (UUID)',
    schema: { type: 'string', format: 'uuid' },
  }),
  ApiResponse({
    status: 200,
    description: 'Zone retrieved successfully',
  }),
  ApiResponse({
    status: 404,
    description: 'Zone not found',
  }),
);

/**
 * Swagger decorators for POST /admin/zones endpoint
 */
export const ApiCreateZone = applyDecorators(
  ApiOperation({
    summary: 'Create a zone (Admin only)',
    description: 'Create a new zone with zone name and zip codes',
  }),
  ApiBearerAuth(),
  ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  }),
  ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  }),
  ApiResponse({
    status: 201,
    description: 'Zone created successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  }),
);

/**
 * Swagger decorators for PUT /admin/zones/:id endpoint
 */
export const ApiUpdateZone = applyDecorators(
  ApiOperation({
    summary: 'Update a zone (Admin only)',
    description: 'Update an existing zone by ID',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Zone ID (UUID)',
    schema: { type: 'string', format: 'uuid' },
  }),
  ApiBearerAuth(),
  ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  }),
  ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  }),
  ApiResponse({
    status: 200,
    description: 'Zone updated successfully',
  }),
  ApiResponse({
    status: 400,
    description: 'Invalid input data',
  }),
  ApiResponse({
    status: 404,
    description: 'Zone not found',
  }),
);

/**
 * Swagger decorators for DELETE /admin/zones/:id endpoint
 */
export const ApiDeleteZone = applyDecorators(
  ApiOperation({
    summary: 'Delete a zone (Admin only)',
    description: 'Delete an existing zone by ID',
  }),
  ApiParam({
    name: 'id',
    required: true,
    description: 'Zone ID (UUID)',
    schema: { type: 'string', format: 'uuid' },
  }),
  ApiBearerAuth(),
  ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  }),
  ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  }),
  ApiResponse({
    status: 200,
    description: 'Zone deleted successfully',
  }),
  ApiResponse({
    status: 404,
    description: 'Zone not found',
  }),
);
