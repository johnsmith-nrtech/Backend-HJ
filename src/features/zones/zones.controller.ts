import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ZonesService } from './zones.service';
import { CreateZonesDto } from './dto/create-zones.dto';
import { UpdateZonesDto } from './dto/update-zones.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Zones')
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  /**
   * Get all zones
   */
  @Get()
  @ApiOperation({ summary: 'Get all zones' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zones retrieved successfully',
  })
  findAll() {
    return this.zonesService.findAll();
  }

  /**
   * Get a single zone by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single zone by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Zone ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonesService.findOne(id);
  }

  /**
   * Create a new zone (admin only)
   */
  @Post('admin')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Create a new zone (Admin only)' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Zone created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  create(@Body() createZonesDto: CreateZonesDto) {
    return this.zonesService.create(createZonesDto);
  }

  /**
   * Update an existing zone (admin only)
   */
  @Put('admin/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Update an existing zone (Admin only)' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateZonesDto: UpdateZonesDto,
  ) {
    return this.zonesService.update(id, updateZonesDto);
  }

  /**
   * Delete a zone (admin only)
   */
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete a zone (Admin only)' })
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User does not have admin role',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Zone deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Zone not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.zonesService.remove(id);
  }
}
