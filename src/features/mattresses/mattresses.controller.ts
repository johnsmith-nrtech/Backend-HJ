import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MattressesService } from './mattresses.service';
import { CreateMattressTypeDto } from './dto/create-mattress-type.dto';
import { UpdateMattressTypeDto } from './dto/update-mattress-type.dto';
import { CreateMattressDto } from './dto/create-mattress.dto';
import { UpdateMattressDto } from './dto/update-mattress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('mattresses')
@ApiTags('mattresses')
export class MattressesController {
  constructor(private readonly mattressesService: MattressesService) {}

  // ── Types ─────────────────────────────────────────────────────
  @Get('types')
  @ApiOperation({ summary: 'Get all mattress types (with nested mattresses)' })
  findAllTypes(@Query('onlyActive', new DefaultValuePipe(false)) onlyActive: boolean) {
    return this.mattressesService.findAllTypes(onlyActive);
  }

  @Get('types/:id')
  findOneType(@Param('id', ParseUUIDPipe) id: string) {
    return this.mattressesService.findOneType(id);
  }

  @Post('types/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a mattress type (Admin only)' })
  createType(@Body() dto: CreateMattressTypeDto) {
    return this.mattressesService.createType(dto);
  }

  @Put('types/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateType(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMattressTypeDto) {
    return this.mattressesService.updateType(id, dto);
  }

  @Delete('types/admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeType(@Param('id', ParseUUIDPipe) id: string) {
    return this.mattressesService.removeType(id);
  }

  @Post('types/admin/:id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('imageFile', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `mattress-type-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadTypeImage(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    return this.mattressesService.uploadTypeImage(id, file);
  }

  // ── Mattresses ────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get mattresses, optionally filtered by type' })
  findAllMattresses(
    @Query('typeId') typeId?: string,
    @Query('onlyActive', new DefaultValuePipe(false)) onlyActive?: boolean,
  ) {
    return this.mattressesService.findAllMattresses(typeId, onlyActive);
  }

  @Get(':id')
  findOneMattress(@Param('id', ParseUUIDPipe) id: string) {
    return this.mattressesService.findOneMattress(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a mattress (Admin only)' })
  createMattress(@Body() dto: CreateMattressDto) {
    return this.mattressesService.createMattress(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateMattress(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMattressDto) {
    return this.mattressesService.updateMattress(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  removeMattress(@Param('id', ParseUUIDPipe) id: string) {
    return this.mattressesService.removeMattress(id);
  }
}