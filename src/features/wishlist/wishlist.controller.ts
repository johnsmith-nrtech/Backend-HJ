import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Request,
  ParseUUIDPipe,
  UseGuards
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';

import { WishlistService } from './wishlist.service';
import { WishlistItemDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * Get wishlist items for authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Get wishlist items' })
  @ApiResponse({ status: 200, description: 'Wishlist items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWishlist(@Request() req) {
    return this.wishlistService.getUserWishlist(req.user.id);
  }

  /**
   * Add item to wishlist
   */
  @Post()
  @ApiOperation({ summary: 'Add item to wishlist' })
  @ApiBody({ type: WishlistItemDto })
  @ApiResponse({ status: 200, description: 'Item added to wishlist successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  async addToWishlist(@Request() req, @Body() item: WishlistItemDto) {
    return this.wishlistService.addToWishlist(req.user.id, item);
  }

  /**
   * Remove item from wishlist
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  @ApiParam({ name: 'id', description: 'Wishlist item ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Item removed from wishlist successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wishlist item not found' })
  async removeFromWishlist(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.wishlistService.removeFromWishlist(req.user.id, id);
  }

  /**
   * Clear wishlist
   */
  @Delete()
  @ApiOperation({ summary: 'Clear wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearWishlist(@Request() req) {
    return this.wishlistService.clearWishlist(req.user.id);
  }
} 