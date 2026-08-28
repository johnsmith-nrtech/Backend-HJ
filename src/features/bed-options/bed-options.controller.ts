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
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BedOptionsService } from './bed-options.service';
import { CreateBedOptionDto } from './dto/create-bed-option.dto';
import { UpdateBedOptionDto } from './dto/update-bed-option.dto';
import { BedOptionType } from './entities/bed-option.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bed-options')
@ApiTags('bed-options')
export class BedOptionsController {
  constructor(private readonly bedOptionsService: BedOptionsService) {}

  /**
   * Get bed options — public (used by both admin dropdowns and, if ever needed, storefront)
   */
  @Get()
  @ApiOperation({ summary: 'Get bed options, optionally filtered by type' })
  findAll(
    @Query('type') type?: BedOptionType,
    @Query('onlyActive', new DefaultValuePipe(false)) onlyActive?: boolean,
  ) {
    return this.bedOptionsService.findAll(type, onlyActive);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bedOptionsService.findOne(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a bed option (Admin only)' })
  create(@Body() dto: CreateBedOptionDto) {
    return this.bedOptionsService.create(dto);
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update a bed option (Admin only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBedOptionDto) {
    return this.bedOptionsService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a bed option (Admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bedOptionsService.remove(id);
  }
}