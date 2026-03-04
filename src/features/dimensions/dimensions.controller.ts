import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DimensionsService } from './dimensions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dimensions')
export class DimensionsController {
  constructor(private readonly dimensionsService: DimensionsService) {}

  // ─── Public: Get current hero settings ───────────────────────────────────
  @Get()
  getSettings() {
    return this.dimensionsService.getSettings();
  }

  // ─── Admin: Upload hero image ─────────────────────────────────────────────
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.dimensionsService.uploadImage(file, req.user?.id);
  }

  // ─── Admin: Update dimensions ─────────────────────────────────────────────
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateDimensions(
    @Body() body: { width: number; height: number; label: string },
    @Request() req,
  ) {
    return this.dimensionsService.updateDimensions(
      Number(body.width),
      Number(body.height),
      body.label,
      req.user?.id,
    );
  }

  // ─── Admin: Delete image ──────────────────────────────────────────────────
  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteImage(@Request() req) {
    return this.dimensionsService.deleteImage(req.user?.id);
  }
}