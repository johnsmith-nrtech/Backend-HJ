import { 
  Controller, 
  Get, 
  Put, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseGuards
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth, 
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserDto, CreateAddressDto, UpdateAddressDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Request() req) {
    return this.usersService.getUserProfile(req.user.id);
  }

  @Put('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUserProfile(req.user.id, updateUserDto);
  }

  @Get('addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user\'s saved addresses' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserAddresses(@Request() req) {
    return this.usersService.getUserAddresses(req.user.id);
  }

  @Post('addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new address' })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addAddress(@Request() req, @Body() createAddressDto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.id, createAddressDto);
  }

  @Put('addresses/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'id', description: 'Address ID', type: 'number' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateAddress(
    @Request() req, 
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateAddressDto: UpdateAddressDto
  ) {
    return this.usersService.updateAddress(req.user.id, id, updateAddressDto);
  }

  @Delete('addresses/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'id', description: 'Address ID', type: 'number' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteAddress(req.user.id, id);
  }
}

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term for name or email', example: 'john' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role', example: 'customer' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by', example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Sort order (asc or desc)', example: 'desc' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy: string = 'created_at',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    return this.usersService.getAllUsers(page, limit, search, role, sortBy, sortOrder);
  }

  @Put(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto
  ) {
    return this.usersService.updateUserRole(id, updateRoleDto);
  }
} 