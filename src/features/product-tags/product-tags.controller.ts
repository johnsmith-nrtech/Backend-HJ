import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { ProductTagsService } from './product-tags.service';
import { CreateProductTagDto, UpdateProductTagDto } from './dto';
import { ProductTag } from './entities/product-tag.entity';

@ApiTags('Product Tags')
@Controller('product-tags')
export class ProductTagsController {
  constructor(private readonly productTagsService: ProductTagsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Create a new product tag',
    description: 'Creates a new product tag that can be used for categorizing products'
  })
  @ApiResponse({
    status: 201,
    description: 'Product tag created successfully',
    type: ProductTag,
  })
  @ApiConflictResponse({
    description: 'A tag with this name already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createProductTagDto: CreateProductTagDto): Promise<ProductTag> {
    return this.productTagsService.create(createProductTagDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all product tags',
    description: 'Retrieve all product tags with optional search and pagination'
  })
  @ApiResponse({
    status: 200,
    description: 'List of product tags retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/ProductTag' },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            totalItems: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for tag names' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (default: name)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: asc)' })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.productTagsService.findAll({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('suggestions')
  @ApiOperation({ 
    summary: 'Get tag suggestions',
    description: 'Get popular/recent tags for product creation suggestions'
  })
  @ApiResponse({
    status: 200,
    description: 'Tag suggestions retrieved successfully',
    type: [ProductTag],
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of suggestions (default: 20)' })
  async getTagSuggestions(
    @Query('limit') limit?: string,
  ): Promise<ProductTag[]> {
    return this.productTagsService.getTagSuggestions(
      limit ? parseInt(limit, 10) : undefined
    );
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search tags by name pattern',
    description: 'Search for tags matching a pattern (for autocomplete)'
  })
  @ApiResponse({
    status: 200,
    description: 'Matching tags retrieved successfully',
    type: [ProductTag],
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of results (default: 10)' })
  async searchByPattern(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<ProductTag[]> {
    return this.productTagsService.findByNamePattern(
      query,
      limit ? parseInt(limit, 10) : undefined
    );
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get a product tag by ID',
    description: 'Retrieve a specific product tag by its ID'
  })
  @ApiParam({ name: 'id', description: 'Product tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Product tag retrieved successfully',
    type: ProductTag,
  })
  @ApiNotFoundResponse({
    description: 'Product tag not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductTag> {
    return this.productTagsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a product tag',
    description: 'Update an existing product tag'
  })
  @ApiParam({ name: 'id', description: 'Product tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Product tag updated successfully',
    type: ProductTag,
  })
  @ApiNotFoundResponse({
    description: 'Product tag not found',
  })
  @ApiConflictResponse({
    description: 'A tag with this name already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductTagDto: UpdateProductTagDto,
  ): Promise<ProductTag> {
    return this.productTagsService.update(id, updateProductTagDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Delete a product tag',
    description: 'Remove a product tag from the system'
  })
  @ApiParam({ name: 'id', description: 'Product tag ID' })
  @ApiResponse({
    status: 200,
    description: 'Product tag deleted successfully',
    type: ProductTag,
  })
  @ApiNotFoundResponse({
    description: 'Product tag not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ProductTag> {
    return this.productTagsService.remove(id);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Bulk create product tags',
    description: 'Create multiple tags from an array of names. Returns existing tags if they already exist.'
  })
  @ApiResponse({
    status: 201,
    description: 'Tags created/retrieved successfully',
    type: [ProductTag],
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  async bulkCreate(
    @Body() body: { tagNames: string[] }
  ): Promise<ProductTag[]> {
    return this.productTagsService.bulkCreateTags(body.tagNames);
  }
} 