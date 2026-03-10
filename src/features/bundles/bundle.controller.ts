import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BundleService } from './bundle.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (
      !file.originalname.match(
        /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|ico|jfif|pjpeg|pjp|avif)$/i,
      )
    ) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
  },
};

@Controller('bundles')
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  // ─── Public: Get all active bundles ──────────────────────────
  @Get()
  findAll(@Query('onlyActive') onlyActive?: string) {
    return this.bundleService.findAll(onlyActive === 'true');
  }

  // ─── Public: Get single bundle ────────────────────────────────
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bundleService.findOne(id);
  }

  // ─── Admin: Create bundle ─────────────────────────────────────
  @Post('admin/bundles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('bundleimage', multerConfig))
  async create(
    @Body() createBundleDto: CreateBundleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // productIds comes as JSON string from multipart form
    if (typeof createBundleDto.productIds === 'string') {
      try {
        createBundleDto.productIds = JSON.parse(createBundleDto.productIds);
      } catch {
        throw new BadRequestException('Invalid productIds format');
      }
    }

    if (createBundleDto.bundleprice !== undefined) {
      createBundleDto.bundleprice = Number(createBundleDto.bundleprice);
    }

    if (createBundleDto.discount_value !== undefined) {
      createBundleDto.discount_value = Number(createBundleDto.discount_value);
    }

    return this.bundleService.create(createBundleDto, file?.path);
  }

  // ─── Admin: Update bundle ─────────────────────────────────────
  @Put('admin/bundles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('bundleimage', multerConfig))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBundleDto: UpdateBundleDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (typeof updateBundleDto.productIds === 'string') {
      try {
        updateBundleDto.productIds = JSON.parse(updateBundleDto.productIds);
      } catch {
        throw new BadRequestException('Invalid productIds format');
      }
    }

    if (updateBundleDto.bundleprice !== undefined) {
      updateBundleDto.bundleprice = Number(updateBundleDto.bundleprice);
    }

    if (updateBundleDto.discount_value !== undefined) {
      updateBundleDto.discount_value = Number(updateBundleDto.discount_value);
    }

    return this.bundleService.update(id, updateBundleDto, file?.path);
  }

  // ─── Admin: Delete bundle ─────────────────────────────────────
  @Delete('admin/bundles/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bundleService.remove(id);
  }
}