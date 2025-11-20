import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CartService } from './cart.service';
import { CartItemDto, UpdateCartItemDto, DeleteCartItemsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Get cart items for authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Get cart items' })
  @ApiResponse({
    status: 200,
    description: 'Cart items retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCart(@Request() req) {
    return this.cartService.getUserCart(req.user.id);
  }

  /**
   * Add item to cart
   */
  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: CartItemDto })
  @ApiResponse({ status: 200, description: 'Item added to cart successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Not enough stock available',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  async addToCart(@Request() req, @Body() item: CartItemDto) {
    return this.cartService.addToCart(req.user.id, item);
  }

  /**
   * Update cart item quantity
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update cart item quantity and assembly requirement',
  })
  @ApiParam({ name: 'id', description: 'Cart item ID', type: 'string' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Not enough stock available',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateCartItem(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(req.user.id, id, updateDto);
  }

  /**
   * Remove multiple items from cart
   */
  @Delete('items')
  @ApiOperation({ summary: 'Remove multiple items from cart' })
  @ApiBody({ type: DeleteCartItemsDto })
  @ApiResponse({
    status: 200,
    description: 'Items removed from cart successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid item IDs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'One or more cart items not found' })
  async removeMultipleFromCart(
    @Request() req,
    @Body() deleteDto: DeleteCartItemsDto,
  ) {
    return this.cartService.removeCartItems(req.user.id, deleteDto.item_ids);
  }

  /**
   * Remove item from cart
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'id', description: 'Cart item ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeFromCart(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.cartService.removeCartItem(req.user.id, id);
  }

  /**
   * Clear cart
   */
  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.id);
  }

  /**
   * Sync cart
   */
  @Post('sync')
  @ApiOperation({ summary: 'Sync cart' })
  @ApiBody({ type: [CartItemDto] })
  @ApiResponse({ status: 200, description: 'Cart synced successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async syncCart(@Request() req, @Body() items: CartItemDto[]) {
    console.log('Syncing cart for user:', req.user.id, 'with items:', items);
    return this.cartService.syncCart(req.user.id, items);
  }
}
