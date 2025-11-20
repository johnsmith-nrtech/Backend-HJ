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
  DefaultValuePipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileUploadInterceptor } from '../../common/interceptors/file-upload.interceptor';
import {
  ApiProductsTag,
  ApiFeaturedProducts,
  ApiTopSellers,
  ApiRelatedProducts,
  ApiGetProduct,
  ApiGetAllProducts,
  ApiGetProductVariants,
  ApiGetProductImages,
  ApiCreateProduct,
  ApiUpdateProduct,
  ApiDeleteProduct,
  ApiGetVariant,
  ApiGet360Images,
  ApiGetVariantImages,
  ApiGetLowStock,
  ApiCreateVariant,
  ApiUpdateVariant,
  ApiDeleteVariant,
  ApiUpdateStock,
  ApiCreateProductImage,
  ApiCreateVariantImage,
  ApiUpdateImage,
  ApiDeleteImage,
  ApiGetVariantsByColor,
  ApiGetVariantsBySize,
  ApiGetProductsByCategoryAndColor,
  ApiGetProductsByCategoryAndSize,
  ApiSearchInitData,
  ApiConsumes,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiQuery,
} from './decorators/products.decorators';
import { SearchDataResponseDto } from './dto/search-data-response.dto';
import {
  ProductImportDto,
  ProductImportResultDto,
} from './dto/product-import.dto';

/**
 * Controller for handling product-related endpoints
 */
@Controller('products')
@ApiProductsTag()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  // Multer configuration for file uploads
  private static multerConfig = {
    // Store in memory since we'll upload to Supabase
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        const filename = `${uniqueSuffix}${ext}`;
        callback(null, filename);
      },
    }),
    // Increased file size limit to 20MB since we're now compressing images
    limits: {
      fileSize: 20 * 1024 * 1024,
    },
    // File filter to accept only images
    fileFilter: (req, file, callback) => {
      // Regular expression for common image file types
      if (
        !file.originalname.match(
          /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|ico|jfif|pjpeg|pjp|avif)$/i,
        )
      ) {
        return callback(
          new Error(
            'Only image files are allowed! Supported formats: JPG, JPEG, PNG, GIF, WEBP, BMP, SVG, TIFF, ICO, JFIF, AVIF',
          ),
          false,
        );
      }
      callback(null, true);
    },
  };

  constructor(private readonly productsService: ProductsService) {
    this.logger.log('ProductsController initialized');
  }

  /**
   * Bulk import products and variants from CSV file (Admin only)
   * Route: POST /products/admin/import
   */
  @Post('admin/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', {
      ...ProductsController.multerConfig,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size for CSV
      },
      fileFilter: (req, file, callback) => {
        // Accept only CSV files
        if (!file.originalname.match(/\.(csv)$/i)) {
          return callback(new Error('Only CSV files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import products and variants from CSV file' })
  @ApiBody({
    description: 'CSV file containing products and variants to import',
    type: ProductImportDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Import successful',
    type: ProductImportResultDto,
  })
  async importProducts(
    @UploadedFile() file: Express.Multer.File,
    @Body() importDto: ProductImportDto,
  ): Promise<ProductImportResultDto> {
    this.logger.log('Import Products endpoint called');

    if (!file) {
      this.logger.error('CSV file is missing in the request');
      throw new BadRequestException('CSV file is required');
    }

    this.logger.log(
      `Received CSV file: ${file.originalname}, size: ${file.size} bytes, mimetype: ${file.mimetype}`,
    );
    this.logger.log(
      `Import options: createCategories=${importDto.createCategories !== false}, skipErrors=${importDto.skipErrors !== false}`,
    );

    // More detailed debugging for file content
    if (file.buffer) {
      this.logger.log(`File buffer length: ${file.buffer.length} bytes`);
      const previewSize = Math.min(file.buffer.length, 500);
      this.logger.log(
        `File content preview: ${file.buffer.slice(0, previewSize).toString('utf-8').replace(/\n/g, '\\n')}`,
      );

      // Count lines to verify content
      const lines = file.buffer.toString('utf-8').split('\n');
      this.logger.log(`Number of lines in file: ${lines.length}`);

      // Log first few lines for debugging
      this.logger.log(`First line: ${lines[0]}`);
      if (lines.length > 1) this.logger.log(`Second line: ${lines[1]}`);

      // Check for potential encoding issues
      const bufferHex = file.buffer.slice(0, 20).toString('hex');
      this.logger.log(`Buffer hex preview: ${bufferHex}`);
    }

    let result: ProductImportResultDto;

    // Try using the file path from disk instead of buffer
    if (file.path) {
      this.logger.log(`File saved at path: ${file.path}`);

      // Read from disk directly as an alternative method
      const fs = require('fs');
      try {
        const diskContent = fs.readFileSync(file.path, 'utf8');
        const diskLines = diskContent.split('\n');
        this.logger.log(`Lines in disk file: ${diskLines.length}`);

        // Use the file content from disk instead of buffer
        result = await this.productsService.importProductsFromCsv(
          Buffer.from(diskContent),
          importDto.createCategories !== false,
          importDto.skipErrors !== false,
        );
      } catch (err) {
        this.logger.error(`Error reading from disk: ${err.message}`);

        // Fallback to buffer if disk read failed
        result = await this.productsService.importProductsFromCsv(
          file.buffer,
          importDto.createCategories !== false,
          importDto.skipErrors !== false,
        );
      }
    } else {
      // Use buffer if no file path available
      result = await this.productsService.importProductsFromCsv(
        file.buffer,
        importDto.createCategories !== false,
        importDto.skipErrors !== false,
      );
    }

    // After processing, delete the file from uploads directory
    if (file.path) {
      try {
        const fs = require('fs');
        fs.unlinkSync(file.path);
        this.logger.log(`Deleted file from uploads: ${file.path}`);
      } catch (err) {
        this.logger.error(`Error deleting file: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Get search initialization data for client-side search
   * This endpoint retrieves all products, categories, and subcategories
   * for building a local search index on the client
   */
  @Get('search-init-data')
  @ApiSearchInitData()
  getSearchInitializationData(): Promise<SearchDataResponseDto> {
    return this.productsService.getSearchInitializationData();
  }

  /**
   * Get featured products
   */
  @Get('featured')
  @ApiFeaturedProducts()
  findFeatured(
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
    @Query('includeCategory', new DefaultValuePipe(true))
    includeCategory: boolean,
  ) {
    return this.productsService.findFeatured(limit, includeCategory);
  }

  /**
   * Get top selling products
   */
  @Get('top-sellers')
  @ApiTopSellers()
  findTopSellers(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
    @Query('period', new DefaultValuePipe('all'))
    period: 'week' | 'month' | 'year' | 'all',
    @Query('includeCategory', new DefaultValuePipe(true))
    includeCategory: boolean,
  ) {
    this.logger.log(
      `Get Top Sellers endpoint called with limit: ${limit}, period: ${period}, includeCategory: ${includeCategory}`,
    );
    return this.productsService.findTopSellers(limit, period, includeCategory);
  }

  /**
   * Get new arrival products for homepage display
   * Route: GET /products/new-arrivals
   */
  @Get('new-arrivals')
  @ApiOperation({ summary: 'Get new arrival products for homepage display' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of new arrival products to return',
    example: 8,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period to consider for new arrivals',
    enum: ['week', 'month', 'year', 'all'],
    example: 'all',
  })
  @ApiQuery({
    name: 'includeCategory',
    required: false,
    description: 'Include category details in response',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'New arrival products retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          name: { type: 'string', example: 'Modern Living Room Sofa' },
          category_id: {
            type: 'string',
            example: '123e4567-e89b-12d3-a456-426614174111',
          },
          base_price: { type: 'number', example: 799.99 },
          created_at: { type: 'string', example: '2023-12-01T10:30:00Z' },
          main_image: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174333',
              },
              url: {
                type: 'string',
                example: 'https://example.com/images/sofa1.jpg',
              },
            },
          },
          default_variant: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174222',
              },
              sku: { type: 'string', example: 'SOFA-001-RED-L' },
              price: { type: 'number', example: 899.99 },
              color: { type: 'string', example: 'Red' },
              size: { type: 'string', example: 'Large' },
              stock: { type: 'number', example: 10 },
              featured: { type: 'boolean', example: false },
            },
          },
          category: {
            type: 'object',
            nullable: true,
            properties: {
              id: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174111',
              },
              name: { type: 'string', example: 'Sofas' },
              slug: { type: 'string', example: 'sofas' },
            },
          },
        },
      },
    },
  })
  findNewArrivals(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
    @Query('period', new DefaultValuePipe('all'))
    period: 'week' | 'month' | 'year' | 'all',
    @Query('includeCategory', new DefaultValuePipe(true))
    includeCategory: boolean,
  ) {
    this.logger.log(
      `Get New Arrivals endpoint called with limit: ${limit}, period: ${period}, includeCategory: ${includeCategory}`,
    );
    return this.productsService.findNewArrivals(limit, period, includeCategory);
  }

  /**
   * Get products related to a specific product
   */
  @Get('related/:id')
  @ApiRelatedProducts()
  findRelated(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
    @Query('includeCategory', new DefaultValuePipe(true))
    includeCategory: boolean,
  ) {
    return this.productsService.findRelated(id, limit, includeCategory);
  }

  /**
   * Get a specific product by ID
   */
  @Get(':id')
  @ApiGetProduct()
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeVariants', new DefaultValuePipe(true))
    includeVariants: boolean,
    @Query('includeImages', new DefaultValuePipe(false)) includeImages: boolean,
    @Query('includeCategory', new DefaultValuePipe(false))
    includeCategory: boolean,
  ) {
    return this.productsService.findOne(
      id,
      includeVariants,
      includeImages,
      includeCategory,
    );
  }

  /**
   * Get all products with optional filtering, pagination, and sorting
   */
  @Get()
  @ApiGetAllProducts()
  async findAll(
    @Query('categoryId', new DefaultValuePipe(undefined)) categoryId?: string,
    @Query('size', new DefaultValuePipe(undefined)) size?: string,
    @Query('material', new DefaultValuePipe(undefined)) material?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit') limit?: string,
    @Query('sortBy', new DefaultValuePipe('id')) sortBy?: string,
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder?: 'asc' | 'desc',
    @Query('priceRange', new DefaultValuePipe(undefined)) priceRange?: string,
    @Query('includeVariants', new DefaultValuePipe(true))
    includeVariants?: boolean,
    @Query('includeImages', new DefaultValuePipe(false))
    includeImages?: boolean,
    @Query('includeCategory', new DefaultValuePipe(true))
    includeCategory?: boolean,
  ) {
    return this.productsService.findAll({
      categoryId,
      material,
      size,
      search,
      page,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy: sortBy as any,
      priceRange: priceRange as any,
      includeVariants,
      includeImages,
      includeCategory,
    });
  }

  /**
   * Get product variants
   */
  @Get(':id/variants')
  @ApiGetProductVariants()
  findVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findVariants(id);
  }

  /**
   * Get product images
   */
  @Get(':id/images')
  @ApiGetProductImages()
  findImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findImages(id);
  }

  /**
   * Create a new product (admin only)
   */
  @Post('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiCreateProduct()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  /**
   * Update an existing product (admin only)
   */
  @Put('admin/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiUpdateProduct()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * Delete a product (admin only)
   */
  @Delete('admin/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiDeleteProduct()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  /**
   * Get a specific variant by ID
   */
  @Get('variants/:id')
  @ApiGetVariant()
  getVariant(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getVariant(id);
  }

  /**
   * Get 360° view images for a product
   */
  @Get(':id/images/360')
  @ApiGet360Images()
  get360Images(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.get360Images(id);
  }

  /**
   * Get images for a specific variant
   */
  @Get('variants/:id/images')
  @ApiGetVariantImages()
  getVariantImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getVariantImages(id);
  }

  /**
   * Get products with low stock (admin only)
   */
  @Get('admin/products/low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiGetLowStock()
  getLowStock(
    @Query('threshold', new DefaultValuePipe(5), ParseIntPipe)
    threshold: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productsService.getLowStock(threshold, limit);
  }

  /**
   * Add a variant to a product (admin only)
   */
  @Post('admin/products/:id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiCreateVariant()
  createVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createVariantDto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(id, createVariantDto);
  }

  /**
   * Update a product variant (admin only)
   */
  @Put('admin/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiUpdateVariant()
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(id, updateVariantDto);
  }

  /**
   * Delete a product variant (admin only)
   */
  @Delete('admin/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiDeleteVariant()
  removeVariant(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.removeVariant(id);
  }

  /**
   * Update stock level of a variant (admin only)
   */
  @Put('admin/variants/:id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiUpdateStock()
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(id, updateStockDto);
  }

  /**
   * Upload images for a product (Admin only)
   * Supports both single and multiple file uploads
   */
  @Post('admin/products/:id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FilesInterceptor('imageFiles', 10, ProductsController.multerConfig), // Support up to 10 files
  )
  @ApiCreateProductImage()
  createProductImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createImageDto: CreateImageDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    console.log('Controller received files:', files);
    console.log('Controller received DTO:', createImageDto);

    // Validate that either files or URL is provided
    if ((!files || files.length === 0) && !createImageDto.url) {
      throw new BadRequestException(
        'Either file uploads or URL must be provided',
      );
    }

    // Handle files upload
    if (files && files.length > 0) {
      createImageDto.imageFiles = files;
    }

    return this.productsService.createProductImages(id, createImageDto);
  }

  /**
   * Upload single image for a product (Admin only - Backward Compatibility)
   * Legacy endpoint for single file uploads
   */
  @Post('admin/products/:id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('imageFile', ProductsController.multerConfig),
  )
  @ApiCreateProductImage()
  createProductImageSingle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createImageDto: CreateImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('Controller received single file:', file);
    console.log('Controller received DTO:', createImageDto);

    // Validate that either a file or URL is provided
    if (!file && !createImageDto.url) {
      throw new BadRequestException(
        'Either a file upload or URL must be provided',
      );
    }

    // Handle single file upload
    if (file) {
      createImageDto.imageFile = file;
    }

    return this.productsService.createProductImages(id, createImageDto);
  }

  /**
   * Upload images for a variant (Admin only)
   * Supports both single and multiple file uploads
   */
  @Post('admin/variants/:id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FilesInterceptor('imageFiles', 10, ProductsController.multerConfig), // Support up to 10 files
  )
  @ApiCreateVariantImage()
  createVariantImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createImageDto: CreateImageDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    console.log('Controller received files:', files);
    console.log('Controller received DTO:', createImageDto);

    // Validate that either files or URL is provided
    if ((!files || files.length === 0) && !createImageDto.url) {
      throw new BadRequestException(
        'Either file uploads or URL must be provided',
      );
    }

    // Handle files upload
    if (files && files.length > 0) {
      createImageDto.imageFiles = files;
    }

    return this.productsService.createVariantImages(id, createImageDto);
  }

  /**
   * Upload single image for a variant (Admin only - Backward Compatibility)
   * Legacy endpoint for single file uploads
   */
  @Post('admin/variants/:id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('imageFile', ProductsController.multerConfig),
  )
  @ApiCreateVariantImage()
  createVariantImageSingle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createImageDto: CreateImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('Controller received single file:', file);
    console.log('Controller received DTO:', createImageDto);

    // Validate that either a file or URL is provided
    if (!file && !createImageDto.url) {
      throw new BadRequestException(
        'Either a file upload or URL must be provided',
      );
    }

    // Handle single file upload
    if (file) {
      createImageDto.imageFile = file;
    }

    return this.productsService.createVariantImages(id, createImageDto);
  }

  /**
   * Update image details (admin only)
   */
  @Put('admin/images/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiUpdateImage()
  updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateImageDto: UpdateImageDto,
  ) {
    return this.productsService.updateImage(id, updateImageDto);
  }

  /**
   * Delete an image (admin only)
   */
  @Delete('admin/images/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiDeleteImage()
  removeImage(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.removeImage(id);
  }

  /**
   * Get all variants of a specific color
   */
  @Get('variants/by-color')
  @ApiGetVariantsByColor()
  findVariantsByColor(
    @Query('color') color: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findVariantsByColor(color, page, limit);
  }

  /**
   * Get all variants of a specific size
   */
  @Get('variants/by-size')
  @ApiGetVariantsBySize()
  findVariantsBySize(
    @Query('size') size: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findVariantsBySize(size, page, limit);
  }

  /**
   * Get products in a category with a specific color
   */
  @Get('categories/:id/products/by-color')
  @ApiGetProductsByCategoryAndColor()
  findProductsByCategoryAndColor(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Query('color') color: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findProductsByCategoryAndColor(
      categoryId,
      color,
      page,
      limit,
    );
  }

  /**
   * Get products in a category with a specific size
   */
  @Get('categories/:id/products/by-size')
  @ApiGetProductsByCategoryAndSize()
  findProductsByCategoryAndSize(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Query('size') size: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findProductsByCategoryAndSize(
      categoryId,
      size,
      page,
      limit,
    );
  }

  /**
   * Clean up old files from uploads directory (admin only)
   */
  @Post('admin/cleanup-uploads')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @ApiOperation({
    summary: 'Clean up old files from uploads directory',
    description:
      'Remove temporary files older than specified minutes from the uploads directory',
  })
  @ApiQuery({
    name: 'maxAgeMinutes',
    required: false,
    description: 'Maximum age of files to keep in minutes (default: 60)',
    type: Number,
  })
  async cleanupUploads(
    @Query('maxAgeMinutes', new DefaultValuePipe(60), ParseIntPipe)
    maxAgeMinutes: number,
  ) {
    await this.productsService.cleanupUploadsDirectory(maxAgeMinutes);
    return {
      message: 'Cleanup completed successfully',
      maxAgeMinutes,
    };
  }

  /**
   * Get uploads directory information (admin only)
   */
  @Get('admin/uploads-info')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  @ApiOperation({
    summary: 'Get uploads directory information',
    description:
      'Get information about the uploads directory including file count and total size',
  })
  getUploadsInfo() {
    const info = this.productsService.getUploadsDirectoryInfo();
    return {
      ...info,
      totalSizeFormatted: `${(info.totalSize / 1024 / 1024).toFixed(2)} MB`,
    };
  }
}
