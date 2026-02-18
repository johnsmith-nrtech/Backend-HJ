import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { ProcessCheckoutDto } from './dto/process-checkout.dto';
import { ValidateCheckoutDto } from './dto/validate-checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { CancelOrderReasonDto } from './dto/cancel-order-reason.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  CreatePaymentResponseDto,
  WebhookNotificationDto,
} from './dto/payment-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Order } from './entities/order.entity';
import { Response } from 'express';

@ApiTags('Orders & Checkout')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('/checkout')
  @Roles('customer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process checkout and create order' })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: Order,
  })
  @ApiResponse({ status: 400, description: 'Invalid checkout data' })
  async processCheckout(
    @Body() processCheckoutDto: ProcessCheckoutDto,
    @Req() req,
  ) {
    return this.ordersService.processCheckout(processCheckoutDto, req.user.id);
  }

  @Post('/checkout/validate')
  @Public()
  @ApiOperation({ summary: 'Validate checkout data' })
  @ApiResponse({ status: 200, description: 'Checkout data validation status' })
  validateCheckoutData(@Body() validateCheckoutDto: ValidateCheckoutDto) {
    return this.ordersService.validateCheckoutData(validateCheckoutDto);
  }

  @Get()
  @Roles('customer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: "List current user's orders" })
  @ApiResponse({
    status: 200,
    description: 'List of user orders',
    type: [Order],
  })
  listUserOrders(@Req() req, @Query() queryDto: ListOrdersQueryDto) {
    return this.ordersService.listUserOrders(req.user.id, queryDto);
  }

  // Admin Endpoints (placed before dynamic :id routes)
  @Get('/admin')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all orders (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'List of all orders',
    type: [Order],
  })
  listAllOrdersAdmin(@Query() queryDto: ListOrdersQueryDto) {
    return this.ordersService.listAllOrdersAdmin(queryDto);
  }

  @Put('/admin/:id/status')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status (Admin)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated',
    type: Order,
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateOrderStatusAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatusAdmin(id, updateOrderStatusDto);
  }

  @Put('/admin/:id/cancel')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order with reason (Admin)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully with reason',
    type: Order,
  })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  cancelOrderWithReasonAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelOrderReasonDto: CancelOrderReasonDto,
  ) {
    return this.ordersService.cancelOrderWithReasonAdmin(
      id,
      cancelOrderReasonDto,
    );
  }

  @Get('/admin/export')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export orders to CSV (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'CSV data of orders',
    content: { 'text/csv': {} },
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status',
  })
  @ApiQuery({
    name: 'user_id',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'date_from',
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'date_to',
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by order ID or customer name',
  })
  async exportOrdersAdmin(
    @Query() queryDto: ListOrdersQueryDto,
    @Res() res: Response,
  ) {
    const csvData = await this.ordersService.exportOrdersAdmin(queryDto);

    // Generate a meaningful filename with current date
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    let filename = `orders-export-${formattedDate}`;

    // Add filters to filename if available
    if (queryDto.status) {
      filename += `-${queryDto.status}`;
    }

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csvData);
  }

  // Dynamic routes that expect UUIDs (placed after admin routes)
  @Get(':id')
  @Roles('customer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of a specific order' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Order details', type: Order })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  getOrderDetails(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const isAdmin = req.user.role === 'admin';
    return this.ordersService.getOrderDetails(id, req.user.id, isAdmin);
  }

  @Put(':id/cancel')
  @Roles('customer', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    type: Order,
  })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  cancelOrder(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const isAdmin = req.user.role === 'admin';
    return this.ordersService.cancelOrder(id, req.user.id, isAdmin);
  }

  // Payment Gateway Endpoints

  @Post('/create-payment')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create payment and generate Tyl payment form',
    description:
      'Creates an order and returns payment form data for Tyl payment gateway submission',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment form created successfully',
    type: CreatePaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payment data or insufficient stock',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more product variants not found',
  })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req,
  ): Promise<CreatePaymentResponseDto> {
    return this.ordersService.createPayment(createPaymentDto, req);
  }

  @Post('/payment/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Tyl payment webhook notifications',
    description: 'Processes payment status updates from Tyl payment gateway',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  @ApiResponse({ status: 401, description: 'Webhook authentication failed' })
  async handlePaymentWebhook(
    @Body() webhookData: WebhookNotificationDto,
  ): Promise<{ success: boolean }> {
    await this.ordersService.handlePaymentWebhook(webhookData);
    return { success: true };
  }

  @Post('/payment/success')
  @Public()
  @ApiOperation({
    summary: 'Handle Tyl payment success redirect',
    description:
      'Receives POST data from Tyl on successful payment and redirects to frontend',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend success page',
  })
  async handlePaymentSuccess(
    @Body() paymentData: any,
    @Res() res: Response,
  ): Promise<void> {
    await this.ordersService.handlePaymentSuccess(paymentData, res);
  }

  @Post('/payment/failure')
  @Public()
  @ApiOperation({
    summary: 'Handle Tyl payment failure redirect',
    description:
      'Receives POST data from Tyl on failed payment and redirects to frontend',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend failure page',
  })
  async handlePaymentFailure(
    @Body() paymentData: any,
    @Res() res: Response,
  ): Promise<void> {
    await this.ordersService.handlePaymentFailure(paymentData, res);
  }

  // COD Endpoint
  @Post('/create-cod-order')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Cash on Delivery (COD) order',
    description:
      'Creates an order for COD. Works for both guests and logged-in users. No payment form is returned.',
  })
  @ApiResponse({ status: 200, description: 'COD order created' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or insufficient stock',
  })
  async createCodOrder(@Body() createPaymentDto: CreatePaymentDto, @Req() req) {
    return this.ordersService.createCodOrder(createPaymentDto, req);
  }
}
