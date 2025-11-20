import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Discount, DiscountType } from './entities/discount.entity';

@ApiTags('discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new discount' })
  @ApiResponse({
    status: 201,
    description: 'The discount has been successfully created.',
    type: Discount,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiBody({ type: CreateDiscountDto })
  async create(@Body() createDiscountDto: CreateDiscountDto): Promise<Discount> {
    return this.discountsService.create(createDiscountDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all discounts' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of discounts',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/Discount' },
        },
        total: {
          type: 'number',
          example: 100,
        },
      },
    },
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or code' })
  @ApiQuery({ 
    name: 'type', 
    required: false, 
    description: 'Filter by discount type',
    enum: DiscountType,
  })
  @ApiQuery({ 
    name: 'active', 
    required: false, 
    description: 'Filter by active status',
    type: Boolean,
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of items to skip', type: Number })
  async findAll(
    @Query('search') search?: string,
    @Query('type') type?: DiscountType,
    @Query('active') active?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    let activeBoolean: boolean | undefined = undefined;
    if (active !== undefined) {
      activeBoolean = active === 'true';
    }
    
    return this.discountsService.findAll({
      search,
      type,
      active: activeBoolean,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a discount by ID' })
  @ApiParam({ name: 'id', description: 'Discount ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the discount',
    type: Discount,
  })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async findOne(@Param('id') id: string): Promise<Discount> {
    return this.discountsService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a discount by code' })
  @ApiParam({ name: 'code', description: 'Discount code' })
  @ApiResponse({
    status: 200,
    description: 'Returns the discount or null if not found',
    type: Discount,
  })
  async findByCode(@Param('code') code: string): Promise<Discount | null> {
    return this.discountsService.findByCode(code);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a discount' })
  @ApiParam({ name: 'id', description: 'Discount ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the updated discount',
    type: Discount,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  @ApiBody({ type: UpdateDiscountDto })
  async update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ): Promise<Discount> {
    return this.discountsService.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a discount' })
  @ApiParam({ name: 'id', description: 'Discount ID' })
  @ApiResponse({ status: 204, description: 'Discount successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.discountsService.remove(id);
  }

  @Post(':id/apply-to-categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply discount to categories' })
  @ApiParam({ name: 'id', description: 'Discount ID' })
  @ApiResponse({ status: 204, description: 'Discount applied to categories successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        categoryIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of category IDs',
        },
      },
    },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async applyToCategories(
    @Param('id') id: string,
    @Body('categoryIds') categoryIds: string[],
  ): Promise<void> {
    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      throw new BadRequestException('categoryIds must be a non-empty array of category IDs');
    }
    
    return this.discountsService.applyToCategories(id, categoryIds);
  }

  @Post(':id/apply-to-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply discount to products' })
  @ApiParam({ name: 'id', description: 'Discount ID' })
  @ApiResponse({ status: 204, description: 'Discount applied to products successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of product IDs',
        },
      },
    },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async applyToProducts(
    @Param('id') id: string,
    @Body('productIds') productIds: string[],
  ): Promise<void> {
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new BadRequestException('productIds must be a non-empty array of product IDs');
    }
    
    return this.discountsService.applyToProducts(id, productIds);
  }

  @Post(':id/apply-to-variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply discount to product variants' })
  @ApiParam({ name: 'id', description: 'Discount ID' })
  @ApiResponse({ status: 204, description: 'Discount applied to variants successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variantIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Array of variant IDs',
        },
      },
    },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async applyToVariants(
    @Param('id') id: string,
    @Body('variantIds') variantIds: string[],
  ): Promise<void> {
    if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
      throw new BadRequestException('variantIds must be a non-empty array of variant IDs');
    }
    
    return this.discountsService.applyToVariants(id, variantIds);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate if a discount is currently applicable' })
  @ApiParam({ name: 'id', description: 'Discount ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns validation result',
    schema: {
      type: 'object',
      properties: {
        valid: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'Discount has expired',
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Discount not found' })
  async validateDiscount(
    @Param('id') id: string,
  ): Promise<{ valid: boolean; message?: string }> {
    return this.discountsService.validateDiscount(id);
  }
} 