/* eslint-disable prettier/prettier */
import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { WhyChooseUsService, CreateWhyChooseUsDto, UpdateWhyChooseUsDto } from './why-choose-us.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('why-choose-us')
export class WhyChooseUsController {
  constructor(private readonly whyChooseUsService: WhyChooseUsService) {}

  @Get()
  findAll() {
    return this.whyChooseUsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.whyChooseUsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateWhyChooseUsDto) {
    return this.whyChooseUsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateWhyChooseUsDto) {
    return this.whyChooseUsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.whyChooseUsService.remove(id);
  }
}