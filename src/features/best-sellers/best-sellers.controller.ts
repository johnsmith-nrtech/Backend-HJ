/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { BestSellersService } from './best-sellers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('best-sellers')
export class BestSellersController {
  constructor(private readonly bestSellersService: BestSellersService) {}

  @Get()
  findAll() {
    return this.bestSellersService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() body: { product_id: string }) {
    return this.bestSellersService.create(body.product_id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bestSellersService.remove(id);
  }
}