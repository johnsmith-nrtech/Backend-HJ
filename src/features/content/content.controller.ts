import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ContentService, PageSection } from './content.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ─── Public: Get all pages ────────────────────────────────────────────────
  @Get()
  findAll() {
    return this.contentService.findAll();
  }

  // ─── Public: Get single page by slug ─────────────────────────────────────
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.contentService.findBySlug(slug);
  }

  // ─── Admin: Create new page ───────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() body: { title: string }) {
    return this.contentService.create(body.title);
  }

  // ─── Admin: Update page content ───────────────────────────────────────────
  @Put(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('slug') slug: string,
    @Body() body: { title: string; sections: PageSection[] },
  ) {
    return this.contentService.update(slug, body.title, body.sections);
  }

  // ─── Admin: Delete page ───────────────────────────────────────────────────
  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  delete(@Param('slug') slug: string) {
    return this.contentService.delete(slug);
  }
}