import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
  ParseBoolPipe,
  DefaultValuePipe,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateCategoryOrderDto } from './dto/update-order.dto';
import { CreateCategoryImageDto } from './dto/create-category-image.dto';
import { CreateCategoryHierarchyDto } from './dto/create-category-hierarchy.dto';
import { CategoryWithSubcategories } from './types/category.types';
import { FileUploadInterceptor } from '../../common/interceptors/file-upload.interceptor';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiCategoryTag,
  ApiCreateCategory,
  ApiDeleteCategory,
  ApiGetCategories,
  ApiGetCategory,
  ApiGetCategoryProducts,
  ApiGetSubcategories,
  ApiUpdateCategory,
  ApiUpdateCategoryOrder,
  ApiGetPopularCategories,
  ApiCreateCategoryHierarchy,
} from './swagger/category.swagger';
import { 
  ApiTags, 
  ApiOperation, 
  ApiParam, 
  ApiQuery, 
  ApiBearerAuth, 
  ApiResponse, 
  ApiUnauthorizedResponse, 
  ApiForbiddenResponse,
  ApiConsumes,
  ApiBody
} from '@nestjs/swagger';

/**
 * Controller for handling category-related endpoints
 */
@Controller('categories')
@ApiCategoryTag
export class CategoriesController {
  // Multer configuration for file uploads
  private static multerConfig = {
    // Store in memory since we'll upload to Supabase
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        const filename = `category-${uniqueSuffix}${ext}`;
        callback(null, filename);
      }
    }),
    // File size limit to 10MB
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    // File filter to accept only images
    fileFilter: (req, file, callback) => {
      // Regular expression for common image file types
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|ico|jfif|pjpeg|pjp|avif)$/i)) {
        return callback(new Error('Only image files are allowed! Supported formats: JPG, JPEG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, JFIF, AVIF'), false);
      }
      callback(null, true);
    }
  };

  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Get all categories with optional nesting
   */
  @Get()
  @ApiGetCategories
  findAll(
    @Query('nested', new DefaultValuePipe(false), ParseBoolPipe) nested: boolean,
  ) {
    return this.categoriesService.findAll(nested);
  }

  /**
   * Get popular categories for showcase display
   * Using a distinct endpoint path to avoid conflict with the :id parameter
   */
  @Get('/popular')
  @ApiGetPopularCategories
  findPopular(
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
    @Query('includeImages', new DefaultValuePipe(true), ParseBoolPipe) includeImages: boolean,
  ) {
    return this.categoriesService.findPopularCategories(limit, includeImages);
  }

  /**
   * Get featured categories
   */
  @Get('/featured')
  @ApiOperation({ summary: 'Get featured categories' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of categories to return' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Featured categories retrieved successfully' })
  findFeatured(
    @Query('limit', new DefaultValuePipe(0), ParseIntPipe) limit: number,
  ) {
    return this.categoriesService.findFeaturedCategories(limit > 0 ? limit : undefined);
  }

  /**
   * Get a specific category by ID
   */
  @Get(':id')
  @ApiGetCategory
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  /**
   * Get all subcategories of a specific category
   */
  @Get(':id/subcategories')
  @ApiGetSubcategories
  findSubcategories(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findSubcategories(id);
  }

  /**
   * Get all products in a specific category
   */
  @Get(':id/products')
  @ApiGetCategoryProducts
  findProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.categoriesService.findProducts(id, page, limit);
  }

  /**
   * Create a new category (admin only)
   */
  @Post('/admin')
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  @ApiCreateCategory
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * Create a hierarchy of categories with up to 4 levels of nesting (admin only)
   */
  @Post('/admin/hierarchy')
  @ApiCreateCategoryHierarchy
  createHierarchy(@Body() createHierarchyDto: CreateCategoryHierarchyDto): Promise<CategoryWithSubcategories> {
    return this.categoriesService.createCategoryHierarchy(createHierarchyDto);
  }

  /**
   * Update an existing category (admin only)
   */
  @Put('/admin/:id')
  @ApiOperation({ summary: 'Update an existing category (Admin only)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  @ApiUpdateCategory
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * Delete a category (admin only)
   */
  @Delete('/admin/:id')
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  @ApiDeleteCategory
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }

  /**
   * Update a category's display order (admin only)
   */
  @Put('/admin/:id/order')
  @ApiOperation({ summary: 'Update a category display order (Admin only)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  @ApiUpdateCategoryOrder
  updateOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateCategoryOrderDto,
  ) {
    return this.categoriesService.updateOrder(id, updateOrderDto);
  }

  /**
   * Upload image for a category (admin only)
   */
  @Post('/admin/:id/image')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @UseInterceptors(
    FileInterceptor('imageFile', CategoriesController.multerConfig),
    new FileUploadInterceptor('imageFile')
  )
  @ApiOperation({ summary: 'Upload image for a category (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Category image upload',
    schema: {
      type: 'object',
      properties: {
        imageFile: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload'
        },
        url: {
          type: 'string',
          description: 'Image URL (alternative to file upload)'
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image uploaded successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createImageDto: CreateCategoryImageDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    console.log('Controller received file:', file);
    console.log('Controller received DTO:', createImageDto);
    
    if (file) {
      createImageDto.imageFile = file;
    }
    return this.categoriesService.uploadCategoryImage(id, createImageDto);
  }

  /**
   * Remove image from a category (admin only)
   */
  @Delete('/admin/:id/image')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @ApiOperation({ summary: 'Remove image from a category (Admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image removed successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  removeImage(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.removeCategoryImage(id);
  }

  /**
   * Toggle featured status of a category (admin only)
   */
  @Put('/admin/:id/featured')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @ApiOperation({ summary: 'Toggle featured status of a category (Admin only)' })
  @ApiBody({
    description: 'Featured status',
    schema: {
      type: 'object',
      properties: {
        featured: {
          type: 'boolean',
          description: 'Whether the category should be featured'
        }
      },
      required: ['featured']
    }
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Featured status updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  toggleFeatured(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { featured: boolean }
  ) {
    return this.categoriesService.toggleFeatured(id, body.featured);
  }

  /**
   * Clean up orphaned image files from category storage (admin only)
   */
  @Post('/admin/cleanup-images')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @ApiOperation({ 
    summary: 'Clean up orphaned image files from category storage',
    description: 'Remove category image files that are no longer referenced by any category. Use with caution!'
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cleanup completed successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  async cleanupOrphanedImages() {
    await this.categoriesService.cleanupOrphanedCategoryImages();
    return { 
      message: 'Orphaned category images cleanup completed successfully'
    };
  }
} 