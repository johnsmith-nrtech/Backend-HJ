import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsHeroService } from './products-hero.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : './uploads';
      const fs = require('fs');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
 fileFilter: (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files allowed'), false);
  }
  cb(null, true);
},
};

@Controller('products-hero')
export class ProductsHeroController {
  constructor(private readonly productsHeroService: ProductsHeroService) {}

  @Get()
  getSettings() {
    return this.productsHeroService.getSettings();
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image', multerConfig))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    return this.productsHeroService.uploadImage(file);
  }

  @Delete('image/:index')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteImage(@Param('index', ParseIntPipe) index: number) {
    return this.productsHeroService.deleteImage(index);
  }
}