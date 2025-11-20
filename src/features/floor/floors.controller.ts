import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Floors')
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  /**
   * Get all floors
   */
  @Get()
  @ApiOperation({ summary: 'Get all floors' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Floors retrieved successfully' })
  findAll() {
    return this.floorsService.findAll();
  }

  /**
   * Get a single floor by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single floor by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Floor ID (UUID)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Floor retrieved successfully' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.floorsService.findOne(id);
  }

  /**
   * Create a new floor (admin only)
   */
  @Post('/admin')
  @ApiOperation({ summary: 'Create a new floor (Admin only)' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Floor created successfully' })
  create(@Body() createFloorDto: CreateFloorDto) {
    return this.floorsService.create(createFloorDto);
  }

  /**
   * Update an existing floor (admin only)
   */
  @Put('/admin/:id')
  @ApiOperation({ summary: 'Update an existing floor (Admin only)' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Floor updated successfully' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    return this.floorsService.update(id, updateFloorDto);
  }

  /**
   * Delete a floor (admin only)
   */
  @Delete('/admin/:id')
  @ApiOperation({ summary: 'Delete a floor (Admin only)' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not have admin role' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Floor deleted successfully' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.floorsService.remove(id);
  }
}
