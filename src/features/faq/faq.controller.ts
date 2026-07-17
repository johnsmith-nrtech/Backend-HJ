import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { ReorderFaqDto } from './dto/reorder-faq.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // ─── Public: Get active FAQs ────────────────────────────────────────────────
  @Get()
  findAllActive() {
    return this.faqService.findAllActive();
  }

  // ─── Admin: Get all FAQs (including inactive) ───────────────────────────────
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.faqService.findAll();
  }

  // ─── Admin: Get single FAQ ───────────────────────────────────────────────────
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  // ─── Admin: Create FAQ ────────────────────────────────────────────────────────
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() createFaqDto: CreateFaqDto) {
    return this.faqService.create(createFaqDto);
  }

  // ─── Admin: Reorder FAQs ──────────────────────────────────────────────────────
  @Patch('admin/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  reorder(@Body() reorderFaqDto: ReorderFaqDto) {
    return this.faqService.reorder(reorderFaqDto);
  }

  // ─── Admin: Update FAQ ─────────────────────────────────────────────────────────
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqService.update(id, updateFaqDto);
  }

  // ─── Admin: Delete FAQ ─────────────────────────────────────────────────────────
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}