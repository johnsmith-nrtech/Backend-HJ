import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
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
import { WorldpayPaymentService } from './services/worldpay-payment.service';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { Request } from 'express';
import { Floor } from '../floor/entities/floor.entity';
import { Zone } from '../zones/entities/zones.entity';
import { ZonesService } from '../zones/zones.service';
import { CouponService } from '../coupons/coupon.service';
import { v4 as uuidv4 } from 'uuid'; 
// Import other necessary services like ProductsService, CartService if needed for logic

/**
 * Helper types for Supabase error handling
 */
interface SupabaseErrorDetails {
  message: string;
  code?: string;
  hint?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // Selection string to embed order items with variant and product details
  private readonly orderSelectWithItemDetails = `*, items:order_items(
    id,
    order_id,
    variant_id,
    quantity,
    unit_price,
    original_price,
    discount_applied,
    assembly_required,
    created_at,
    variant:product_variants(
      id,
      product_id,
      sku,
      price,
      compare_price,
      size,
      color,
      discount_percentage,
      material,
      brand,
      assemble_charges,
      images:product_images(url, type, "order"),
      product:products(
        id,
        name,
        images:product_images(url, type, "order")
      )
    )
  )`;

  private pickBestImageUrl(item: any): string | undefined {
    const variantImages = item?.variant?.images as
      | Array<{ url: string; order?: number }>
      | undefined;
    const productImages = item?.variant?.product?.images as
      | Array<{ url: string; order?: number }>
      | undefined;
    const byOrder = (a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0);
    const v = (variantImages || []).slice().sort(byOrder)[0]?.url;
    if (v) return v;
    const p = (productImages || []).slice().sort(byOrder)[0]?.url;
    return p;
  }

  private attachItemImages(order: any): any {
    if (order?.items && Array.isArray(order.items)) {
      order.items = order.items.map((item) => {
        const imageUrl = this.pickBestImageUrl(item);
        // Create shallow copies and strip heavy image arrays from payload
        const nextItem: any = { ...item, image_url: imageUrl };
        if (nextItem.variant) {
          nextItem.variant = { ...nextItem.variant };
          if (nextItem.variant.images) {
            delete nextItem.variant.images;
          }
          if (nextItem.variant.product) {
            nextItem.variant.product = { ...nextItem.variant.product };
            if (nextItem.variant.product.images) {
              delete nextItem.variant.product.images;
            }
          }
        }
        return nextItem;
      });
    }
    return order;
  }

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly worldpayPaymentService: WorldpayPaymentService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly zonesService: ZonesService,
    private readonly couponService: CouponService,
  ) {}

  /**
   * Process Supabase database errors and convert them to NestJS exceptions
   */
  private handleSupabaseError(
    error: PostgrestError,
    customMessage?: string,
    resourceId?: string,
  ): never {
    this.logger.error(
      `Supabase error: ${error.message} (${error.code})`,
      error.details,
    );

    // Extract info from error to help with debugging
    const details: SupabaseErrorDetails = {
      message: error.message,
      code: error.code,
      hint: error.hint,
    };

    // Map common Supabase error codes to appropriate exceptions
    switch (error.code) {
      // Foreign key violation
      case '23503':
        throw new BadRequestException({
          message: customMessage || 'Referenced resource does not exist',
          details,
          resourceId,
        });

      // Not null violation
      case '23502':
        throw new BadRequestException({
          message: customMessage || 'Required fields are missing',
          details,
        });

      // Unique violation
      case '23505':
        throw new BadRequestException({
          message: customMessage || 'Resource already exists',
          details,
        });

      // Resource not found
      case 'PGRST116':
        throw new NotFoundException({
          message:
            customMessage ||
            `Resource ${resourceId ? `with ID ${resourceId}` : ''} not found`,
          details,
        });

      // Permission denied
      case '42501':
        throw new ForbiddenException({
          message: customMessage || 'Permission denied to access this resource',
          details,
        });

      // Default fallback
      default:
        throw new InternalServerErrorException({
          message: customMessage || 'An unexpected database error occurred',
          details,
        });
    }
  }

  /**
   * Safely execute Supabase queries with error handling
   */
  private async safeQueryExecution<T>(
    operation: () => Promise<PostgrestSingleResponse<T>>,
    errorMessage: string,
    resourceId?: string,
  ): Promise<T> {
    try {
      const { data, error } = await operation();

      if (error) {
        this.handleSupabaseError(error, errorMessage, resourceId);
      }

      if (data === null) {
        throw new NotFoundException({
          message: `Resource ${resourceId ? `with ID ${resourceId}` : ''} not found`,
          details: { operation: errorMessage },
        });
      }

      return data;
    } catch (err) {
      // If already a NestJS exception, rethrow it
      if (err.response && err.status) {
        throw err;
      }

      // Otherwise wrap in a generic error
      this.logger.error(
        `Error during Supabase operation: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException({
        message: errorMessage,
        error: err.message,
      });
    }
  }

  async processCheckout(
    processCheckoutDto: ProcessCheckoutDto,
    userId: string,
  ): Promise<Order> {
    try {
      // Preprocess items to handle the legacy nested property structure
      const processedItems = processCheckoutDto.items.map((item) => {
        // If the request has a nested property.quantity, use that value
        if (item.property && typeof item.property.quantity === 'number') {
          return {
            ...item,
            quantity: item.property.quantity,
          };
        }
        return item;
      });

      // Replace the original items with processed ones
      const processedDto = {
        ...processCheckoutDto,
        items: processedItems,
      };

      // First, validate all variants exist and have sufficient stock
      // Store variant data for later use in pricing
      const variantMap = new Map<
        string,
        { id: string; price: number; stock: number }
      >();

      // Check variants in parallel but handle results sequentially for better error messages
      const variantChecks = await Promise.all(
        processedItems.map(async (item) => {
          try {
            const result = await this.safeQueryExecution<{
              id: string;
              price: number;
              stock: number;
            }>(
              async () => {
                return await this.supabaseService
                  .getClient()
                  .from('product_variants')
                  .select('id, price, stock')
                  .eq('id', item.variant_id)
                  .single();
              },
              `Error validating variant ${item.variant_id}`,
              item.variant_id,
            );

            return { item, variant: result, error: null };
          } catch (error) {
            return { item, variant: null, error };
          }
        }),
      );

      // Process variant check results
      for (const result of variantChecks) {
        if (result.error) {
          // If it's already a NestJS exception, rethrow it
          if (result.error.response) {
            throw result.error;
          }

          // Otherwise create a meaningful error
          throw new BadRequestException(
            `Product variant with ID ${result.item.variant_id} not found or could not be accessed.`,
          );
        }

        const variant = result.variant;

        if (!variant) {
          throw new NotFoundException(
            `Product variant with ID ${result.item.variant_id} not found.`,
          );
        }

        if (variant.stock < result.item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant ${result.item.variant_id}. Available: ${variant.stock}, requested: ${result.item.quantity}`,
          );
        }

        // Store variant data for later use
        variantMap.set(result.item.variant_id, variant);
      }

      // Calculate total amount using actual prices from variants
      const totalAmount = processedItems.reduce((sum, item) => {
        const variant = variantMap.get(item.variant_id);
        const price = variant ? variant.price || 0 : 0;
        return sum + item.quantity * price;
      }, 0);

      // Create the order in the database
      const order = await this.safeQueryExecution<Order>(async () => {
        return await this.supabaseService
          .getClient()
          .from('orders')
          .insert({
            user_id: userId,
            status: OrderStatus.PENDING,
            total_amount: totalAmount,
            currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
            shipping_address: processedDto.shipping_address,
            billing_address: processedDto.billing_address,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .select()
          .single();
      }, 'Failed to create order');

      // Create order items with actual prices
      const orderItems = processedItems.map((item) => {
        const variant = variantMap.get(item.variant_id);
        return {
          order_id: order.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: variant ? variant.price || 0 : 0,
          created_at: new Date(),
        };
      });

      try {
        const items = await this.safeQueryExecution<OrderItem[]>(async () => {
          return await this.supabaseService
            .getClient()
            .from('order_items')
            .insert(orderItems)
            .select();
        }, 'Failed to create order items');

        // Return the complete order with items
        return {
          ...order,
          items,
        };
      } catch (error) {
        // If creating order items fails, rollback the order
        this.logger.warn(
          `Rolling back order ${order.id} due to error creating order items`,
        );

        await this.safeQueryExecution(async () => {
          return await this.supabaseService
            .getClient()
            .from('orders')
            .delete()
            .eq('id', order.id);
        }, `Failed to rollback order ${order.id}`);

        // Re-throw the original error
        throw error;
      }
    } catch (error) {
      // Log the error
      this.logger.error(
        `Error processing checkout: ${error.message}`,
        error.stack,
      );

      // If it's already a NestJS exception, rethrow it
      if (error.response) {
        throw error;
      }

      // Otherwise wrap in a BadRequestException
      throw new BadRequestException(`Error processing order: ${error.message}`);
    }
  }

  async validateCheckoutData(
    validateCheckoutDto: ValidateCheckoutDto,
  ): Promise<any> {
    try {
      // Preprocess items to handle the legacy nested property structure
      const processedItems = validateCheckoutDto.items.map((item) => {
        // If the request has a nested property.quantity, use that value
        if (item.property && typeof item.property.quantity === 'number') {
          return {
            ...item,
            quantity: item.property.quantity,
          };
        }
        return item;
      });

      // Replace the original items with processed ones
      const processedDto = {
        ...validateCheckoutDto,
        items: processedItems,
      };

      // Validate the items against the database
      const itemValidationResults = await Promise.all(
        processedItems.map(async (item) => {
          try {
            const { data: variant, error } = await this.supabaseService
              .getClient()
              .from('product_variants')
              .select('id, price, stock')
              .eq('id', item.variant_id)
              .single();

            if (error) {
              this.logger.warn(
                `Error validating variant ${item.variant_id}: ${error.message}`,
              );
              return {
                variant_id: item.variant_id,
                quantity: item.quantity,
                inStock: false,
                message: 'Product variant not found',
                currentPrice: null,
                error: error.message,
              };
            }

            if (!variant) {
              return {
                variant_id: item.variant_id,
                quantity: item.quantity,
                inStock: false,
                message: 'Product variant not found',
                currentPrice: null,
              };
            }

            const inStock = variant.stock >= item.quantity;

            return {
              variant_id: item.variant_id,
              quantity: item.quantity,
              inStock,
              message: inStock
                ? 'In stock'
                : `Insufficient stock. Available: ${variant.stock}`,
              currentPrice: variant.price || 0, // Always use the actual price from the database
            };
          } catch (err) {
            this.logger.error(
              `Unexpected error validating variant ${item.variant_id}: ${err.message}`,
              err.stack,
            );
            return {
              variant_id: item.variant_id,
              quantity: item.quantity,
              inStock: false,
              message: 'Error checking product availability',
              currentPrice: null,
              error: err.message,
            };
          }
        }),
      );

      // Calculate total
      const total = itemValidationResults
        .filter((item) => item.inStock && item.currentPrice !== null)
        .reduce((sum, item) => sum + item.quantity * item.currentPrice, 0);

      // Check if all items are valid
      const isValid = itemValidationResults.every((item) => item.inStock);

      // Format the response
      if (isValid) {
        return {
          isValid,
          items: itemValidationResults,
          total,
          currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
        };
      } else {
        return {
          isValid,
          errors: itemValidationResults
            .filter((item) => !item.inStock)
            .map((item) => ({
              variant_id: item.variant_id,
              message: item.message,
            })),
        };
      }
    } catch (error) {
      this.logger.error(
        `Error during checkout validation: ${error.message}`,
        error.stack,
      );

      // Return a validation response indicating failure
      return {
        isValid: false,
        errors: [
          {
            message: `Failed to validate checkout: ${error.message}`,
          },
        ],
      };
    }
  }

  async listUserOrders(
    userId: string,
    queryDto: ListOrdersQueryDto,
  ): Promise<{ items: Order[]; meta: any }> {
    try {
      // Use default values for pagination if not provided
      const page = queryDto.page ?? 1;
      const limit = queryDto.limit ?? 10;

      // Build the query
      let query = this.supabaseService
        .getClient()
        .from('orders')
        .select(this.orderSelectWithItemDetails)
        .eq('user_id', userId);

      // Apply filters
      if (queryDto.status) {
        query = query.eq('status', queryDto.status);
      }

      if (queryDto.date_from) {
        query = query.gte('created_at', queryDto.date_from.toISOString());
      }

      if (queryDto.date_to) {
        // Add one day to include the entire end date
        const endDate = new Date(queryDto.date_to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      // Apply sorting
      query = query.order(queryDto.sortBy || 'created_at', {
        ascending: queryDto.sortOrder === 'asc',
      });

      // Get total count
      const { count: totalCount, error: countError } =
        await this.supabaseService
          .getClient()
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

      if (countError) {
        this.handleSupabaseError(countError, 'Error counting orders');
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Execute the query
      const { data: orders, error } = await query;

      if (error) {
        this.handleSupabaseError(error, 'Error listing orders');
      }

      const totalPages = Math.ceil((totalCount || 0) / limit);
      const itemsWithImages = (orders as any[]).map((o) =>
        this.attachItemImages(o),
      );

      return {
        items: itemsWithImages as Order[],
        meta: {
          totalItems: totalCount || 0,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error listing user orders: ${error.message}`,
        error.stack,
      );

      // If it's already a NestJS exception, rethrow it
      if (error.response) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to list orders: ${error.message}`,
      );
    }
  }

  async getOrderDetails(
    orderId: string,
    userId?: string,
    isAdmin: boolean = false,
  ): Promise<Order> {
    try {
      // Validate orderId format
      if (
        !orderId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        throw new BadRequestException(`Invalid order ID format: ${orderId}`);
      }

      const { data, error } = await this.supabaseService
        .getClient()
        .from('orders')
        .select(this.orderSelectWithItemDetails)
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        this.handleSupabaseError(
          error,
          `Error retrieving order ${orderId}`,
          orderId,
        );
      }

      if (!data) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
      }

      // Check permissions - if not admin and user ID doesn't match
      if (!isAdmin && userId && data.user_id !== userId) {
        this.logger.warn(
          `User ${userId} attempted to access order ${orderId} belonging to user ${data.user_id}`,
        );
        throw new ForbiddenException(
          'You do not have permission to view this order.',
        );
      }

      return this.attachItemImages(data) as Order;
    } catch (error) {
      this.logger.error(
        `Error getting order details: ${error.message}`,
        error.stack,
      );

      // If it's already a NestJS exception, rethrow it
      if (error.response) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to get order details: ${error.message}`,
      );
    }
  }

  async cancelOrder(
    orderId: string,
    userId?: string,
    isAdmin: boolean = false,
  ): Promise<Order> {
    try {
      // Get the order first - this will check permissions too
      const order = await this.getOrderDetails(orderId, userId, isAdmin);

      // Ensure order is in a cancellable state
      if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
        throw new BadRequestException(
          `Order in status '${order.status}' cannot be cancelled.`,
        );
      }

      // Update the order status
      const { data, error } = await this.supabaseService
        .getClient()
        .from('orders')
        .update({
          status: OrderStatus.CANCELLED,
          updated_at: new Date(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        this.handleSupabaseError(
          error,
          `Error cancelling order ${orderId}`,
          orderId,
        );
      }

      if (!data) {
        throw new NotFoundException(
          `Order with ID ${orderId} not found after update.`,
        );
      }

      // Log the cancellation
      this.logger.log(
        `Order ${orderId} cancelled by ${isAdmin ? 'admin' : `user ${userId}`}`,
      );

      return data as Order;
    } catch (error) {
      this.logger.error(
        `Error cancelling order: ${error.message}`,
        error.stack,
      );

      // If it's already a NestJS exception, rethrow it
      if (error.response) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to cancel order: ${error.message}`,
      );
    }
  }

  async cancelOrderWithReasonAdmin(
    orderId: string,
    cancelDto: CancelOrderReasonDto,
  ): Promise<Order> {
    try {
      // First check if the order exists and is in a cancellable state
      const { data: order, error: fetchError } = await this.supabaseService
        .getClient()
        .from('orders')
        .select()
        .eq('id', orderId)
        .maybeSingle();

      if (fetchError) {
        this.handleSupabaseError(
          fetchError,
          `Error fetching order ${orderId}`,
          orderId,
        );
      }

      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found.`);
      }

      if (
        ![OrderStatus.PENDING, OrderStatus.PAID].includes(
          order.status as OrderStatus,
        )
      ) {
        throw new BadRequestException(
          `Order in status '${order.status}' cannot be cancelled.`,
        );
      }

      // Update the order with cancelled status and the provided reason
      const { data, error } = await this.supabaseService
        .getClient()
        .from('orders')
        .update({
          status: OrderStatus.CANCELLED,
          cancellation_reason: cancelDto.reason,
          updated_at: new Date(),
        })
        .eq('id', orderId)
        .select('*, items:order_items(*)')
        .single();

      if (error) {
        this.handleSupabaseError(
          error,
          `Error updating order ${orderId} with cancellation reason`,
          orderId,
        );
      }

      this.logger.log(
        `Order ${orderId} cancelled by admin with reason: ${cancelDto.reason}`,
      );

      return data as Order;
    } catch (error) {
      this.logger.error(
        `Error cancelling order with reason: ${error.message}`,
        error.stack,
      );

      // If it's already a NestJS exception, rethrow it
      if (error.response) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to cancel order with reason: ${error.message}`,
      );
    }
  }

  async listAllOrdersAdmin(
    queryDto: ListOrdersQueryDto,
  ): Promise<{ items: Order[]; meta: any }> {
    try {
      // Use default values for pagination if not provided
      const page = queryDto.page ?? 1;
      const limit = queryDto.limit ?? 10;

      // Build the query
      let query = this.supabaseService
        .getClient()
        .from('orders')
        .select(this.orderSelectWithItemDetails);

      // Apply filters
      if (queryDto.status) {
        query = query.eq('status', queryDto.status);
      }

      if (queryDto.user_id) {
        query = query.eq('user_id', queryDto.user_id);
      }

      if (queryDto.date_from) {
        query = query.gte('created_at', queryDto.date_from.toISOString());
      }

      if (queryDto.date_to) {
        // Add one day to include the entire end date
        const endDate = new Date(queryDto.date_to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      if (queryDto.search) {
        // Search in order ID or billing address recipient name
        query = query.or(
          `id::text.ilike.%${queryDto.search}%,billing_address->recipient_name.ilike.%${queryDto.search}%`,
        );
      }

      // Apply sorting
      query = query.order(queryDto.sortBy || 'created_at', {
        ascending: queryDto.sortOrder === 'asc',
      });

      // Get total count with same filters
      let countQuery = this.supabaseService
        .getClient()
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (queryDto.status) {
        countQuery = countQuery.eq('status', queryDto.status);
      }

      if (queryDto.user_id) {
        countQuery = countQuery.eq('user_id', queryDto.user_id);
      }

      if (queryDto.date_from) {
        countQuery = countQuery.gte(
          'created_at',
          queryDto.date_from.toISOString(),
        );
      }

      if (queryDto.date_to) {
        const endDate = new Date(queryDto.date_to);
        endDate.setDate(endDate.getDate() + 1);
        countQuery = countQuery.lt('created_at', endDate.toISOString());
      }

      if (queryDto.search) {
        countQuery = countQuery.or(
          `id::text.ilike.%${queryDto.search}%,billing_address->recipient_name.ilike.%${queryDto.search}%`,
        );
      }

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        this.handleSupabaseError(countError, 'Error counting orders');
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Execute the query
      const { data: orders, error } = await query;

      if (error) {
        this.handleSupabaseError(error, 'Error listing orders for admin');
      }

      const totalPages = Math.ceil((totalCount || 0) / limit);
      const itemsWithImages = (orders as any[]).map((o) =>
        this.attachItemImages(o),
      );

      return {
        items: itemsWithImages as Order[],
        meta: {
          totalItems: totalCount || 0,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error listing all orders for admin: ${error.message}`,
        error.stack,
      );

      // If it's already a NestJS exception, rethrow it
      if (error.response) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to list orders: ${error.message}`,
      );
    }
  }

async updateOrderStatusAdmin(
  orderId: string,
  updateOrderStatusDto: UpdateOrderStatusDto,
): Promise<Order> {
  try {
    const existingOrder = await this.getOrderDetails(orderId);

    const { data: paymentRecords } = await this.supabaseService
      .getClient()
      .from('payments')
      .select('provider')
      .eq('order_id', orderId)
      .limit(1);

    const isCodOrder =
      Array.isArray(paymentRecords) && paymentRecords[0]?.provider === 'cod';

    const isCodPendingToShipped =
      isCodOrder &&
      existingOrder.status === OrderStatus.PENDING &&
      updateOrderStatusDto.status === OrderStatus.SHIPPED;

    if (!isCodPendingToShipped) {
      this.validateStatusTransition(
        existingOrder.status,
        updateOrderStatusDto.status,
      );
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update({
        status: updateOrderStatusDto.status,
        updated_at: new Date(),
      })
      .eq('id', orderId)
      .select(this.orderSelectWithItemDetails)
      .single();

    if (error) {
      this.handleSupabaseError(
        error,
        `Error updating order status for ${orderId}`,
        orderId,
      );
    }

    if (!data) {
      throw new NotFoundException(
        `Order with ID ${orderId} not found after update.`,
      );
    }

    // ✅ Reduce stock when status changes to 'paid' OR 'shipped' (for COD)
    if (
      updateOrderStatusDto.status === OrderStatus.PAID
    ) {
      const orderWithItems = data as any;
      if (orderWithItems.items && Array.isArray(orderWithItems.items)) {
        for (const item of orderWithItems.items) {
          const { data: variant } = await this.supabaseService
            .getClient()
            .from('product_variants')
            .select('stock')
            .eq('id', item.variant_id)
            .single();

          if (variant) {
            const currentStock = variant.stock ?? 0;
            const newStock = Math.max(0, currentStock - item.quantity);

            const { error: stockError } = await this.supabaseService
              .getClient()
              .from('product_variants')
              .update({ stock: newStock })
              .eq('id', item.variant_id);

            if (stockError) {
              this.logger.error(
                `Failed to reduce stock for variant ${item.variant_id}: ${stockError.message}`,
              );
            } else {
              this.logger.log(
                `Stock reduced for variant ${item.variant_id}: ${currentStock} → ${newStock}`,
              );
            }
          }
        }
      }
    }

    // ✅ Email in try/catch — failure here won't affect status update
    try {
      const genericHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Order Status Update - Order #${orderId}</h2>
          <p>Hi ${data.shipping_address?.recipient_name || 'there'},</p>
          <p>Your order #${orderId} status has been updated to: <strong>${updateOrderStatusDto.status}</strong>.</p>
          <p>We'll keep you informed of any further updates.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>Best regards,</p>
            <p><strong>Sofa Deal</strong></p>
            <p>Phone: +44 7306 127481</p>
          </div>
        </div>
      `;

      const shippedHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Good News! Your Order #${orderId} Is On Its Way 🚚</h2>
          <p>Hi ${data.shipping_address?.recipient_name || 'there'},</p>
          <p>Your order #${orderId} has been shipped and is on its way to you. 🚀</p>
          <p>We'll notify you once it's been delivered.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>Thanks for shopping with <strong>Sofa Deal</strong></p>
            <p>Phone: +44 7306 127481</p>
          </div>
        </div>
      `;

      const deliveredHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your Order #${orderId} Has Been Delivered! 📦</h2>
          <p>Hi ${data.shipping_address?.recipient_name || 'there'},</p>
          <p>Your order #${orderId} has been successfully delivered. 🎁</p>
          <p>We hope you love your purchase!</p>
          <p>Thank you for shopping with <strong>Sofa Deal</strong>.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>Warm regards,</p>
            <p><strong>Sofa Deal</strong></p>
            <p>Phone: +44 7306 127481</p>
          </div>
        </div>
      `;

      const userEmail = await this.supabaseService
        .getClient()
        .from('users')
        .select('email')
        .eq('id', existingOrder.user_id)
        .limit(1);

      if (userEmail.data && userEmail.data.length > 0 && userEmail.data[0].email) {
        await this.mailService.sendEmail(
          userEmail.data[0].email,
          updateOrderStatusDto.status === 'shipped'
            ? `Good News! Your Order #${orderId} Is On Its Way 🚚`
            : updateOrderStatusDto.status === 'delivered'
              ? `Your Order #${orderId} Has Been Delivered! 📦`
              : 'Your Order Status Updated',
          updateOrderStatusDto.status === 'shipped'
            ? shippedHtml
            : updateOrderStatusDto.status === 'delivered'
              ? deliveredHtml
              : genericHtml,
        );
      }
    } catch (emailError) {
      this.logger.error(
        `Failed to send status update email for order ${orderId}: ${emailError.message}`,
      );
    }

    this.logger.log(
      `Order ${orderId} status updated to ${updateOrderStatusDto.status}`,
    );

    return this.attachItemImages(data) as Order;
  } catch (error) {
    console.log(error);
    this.logger.error(
      `Error updating order status: ${error.message}`,
      error.stack,
    );

    if (error.response) {
      throw error;
    }

    throw new InternalServerErrorException(
      `Failed to update order status: ${error.message}`,
    );
  }
}

  /**
   * Validate if a status transition is allowed
   */
  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    // Define valid transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [], // Cannot transition from cancelled
    };

    // Check if transition is valid
    if (
      !validTransitions[currentStatus].includes(newStatus) &&
      currentStatus !== newStatus
    ) {
      throw new BadRequestException(
        `Cannot transition order from status '${currentStatus}' to '${newStatus}'`,
      );
    }
  }

  async exportOrdersAdmin(queryDto: ListOrdersQueryDto): Promise<string> {
    try {
      // Build query to fetch orders based on filters
      let query = this.supabaseService.getClient().from('orders').select(`
          id, 
          user_id, 
          status, 
          total_amount, 
          currency, 
          created_at, 
          updated_at, 
          billing_address, 
          shipping_address,
          order_items(
            id,
            variant_id,
            quantity,
            unit_price,
            discount_applied,
            created_at
          )
        `);

      // Apply filters from query parameters
      if (queryDto.status) {
        query = query.eq('status', queryDto.status);
      }

      if (queryDto.user_id) {
        query = query.eq('user_id', queryDto.user_id);
      }

      if (queryDto.date_from) {
        query = query.gte('created_at', queryDto.date_from.toISOString());
      }

      if (queryDto.date_to) {
        // Add one day to include the entire end date
        const endDate = new Date(queryDto.date_to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString());
      }

      if (queryDto.search) {
        // Search in order ID or billing address recipient name
        query = query.or(
          `id.ilike.%${queryDto.search}%,billing_address->recipient_name.ilike.%${queryDto.search}%`,
        );
      }

      // Sort the results
      query = query.order(queryDto.sortBy || 'created_at', {
        ascending: queryDto.sortOrder === 'asc',
      });

      // Execute the query
      const { data: orders, error } = await query;

      if (error) {
        this.handleSupabaseError(error, 'Error exporting orders');
      }

      if (!orders || orders.length === 0) {
        return 'No orders found matching your criteria';
      }

      // Function to escape CSV fields
      const escapeCSV = (field: any): string => {
        if (field === null || field === undefined) {
          return '';
        }

        const stringField = String(field);

        // If field contains commas, quotes, or newlines, wrap in quotes and escape any quotes
        if (
          stringField.includes(',') ||
          stringField.includes('"') ||
          stringField.includes('\n')
        ) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }

        return stringField;
      };

      // Format as CSV
      // First, define the headers
      const headers = [
        'Order ID',
        'User ID',
        'Status',
        'Created At',
        'Updated At',
        'Total Amount',
        'Currency',
        'Recipient Name',
        'Email',
        'Phone',
        'Shipping Address',
        'Billing Address',
        'Items',
      ];

      // Then map the data to rows
      const rows = orders.map((order) => {
        const billingAddress = order.billing_address || {};
        const shippingAddress = order.shipping_address || {};

        // Format address for CSV
        const formatAddress = (address: any): string => {
          if (!address) return '';
          return [
            address.recipient_name || '',
            address.line1 || '',
            address.line2 || '',
            address.city || '',
            address.state || '',
            address.postal_code || '',
            address.country || '',
          ]
            .filter(Boolean)
            .join(', ');
        };

        // Format order items summary - using only fields that exist in the database
        const itemsSummary = Array.isArray(order.order_items)
          ? order.order_items
              .map(
                (item) =>
                  `${item.quantity}x variant:${item.variant_id} @ ${item.unit_price} ${order.currency}`,
              )
              .join('; ')
          : '';

        return [
          escapeCSV(order.id),
          escapeCSV(order.user_id),
          escapeCSV(order.status),
          escapeCSV(new Date(order.created_at).toLocaleString()),
          escapeCSV(new Date(order.updated_at).toLocaleString()),
          escapeCSV(order.total_amount),
          escapeCSV(order.currency),
          escapeCSV(billingAddress.recipient_name || ''),
          escapeCSV(billingAddress.email || ''),
          escapeCSV(billingAddress.phone || ''),
          escapeCSV(formatAddress(shippingAddress)),
          escapeCSV(formatAddress(billingAddress)),
          escapeCSV(itemsSummary),
        ].join(',');
      });

      // Combine headers and rows
      return [headers.join(','), ...rows].join('\n');
    } catch (error) {
      this.logger.error(
        `Error exporting orders: ${error.message}`,
        error.stack,
      );

      // If it's already a NestJS exception, rethrow it
      if (error.response) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to export orders: ${error.message}`,
      );
    }
  }

  /**
   * Creates an order and generates Worldpay payment form data
   * Phase 1: Simple implementation with subtotal only (no discounts, shipping, tax)
   */


async createPayment(
  createPaymentDto: CreatePaymentDto,
  req?: any,
): Promise<CreatePaymentResponseDto> {
  try {
    const userId = await this.extreactUserIdFromRequest(req);

    this.logger.log('Creating payment order', {
      customerEmail: createPaymentDto.contact_email,
      itemCount: createPaymentDto.cart_items.length,
      userId: userId || 'guest',
    });

    // Step 1: Validate cart items and calculate total
    const { variants, totalAmount } =
      await this.validateCartAndCalculateTotal(createPaymentDto.cart_items);

    // Step 2: Floor charges
    const floor = await this.fetchFloorInfo(
      createPaymentDto.shipping_address.floor_id,
    );

    // Step 3: Zone / delivery charges
    const zone = createPaymentDto.shipping_address.postal_code?.trim()
      ? await this.zonesService.findByZipCode(
          createPaymentDto.shipping_address.postal_code,
        )
      : null;

    if (createPaymentDto.shipping_address.postal_code?.trim() && !zone) {
      throw new BadRequestException(
        `Delivery is not available to the postal code: ${createPaymentDto.shipping_address.postal_code}`,
      );
    }

    // Step 4: Coupon / discount
    let discountAmount = createPaymentDto.discount_amount || 0;
    let couponCode = createPaymentDto.coupon_code;

    // Step 5: Create order record (discount_amount + coupon_code passed through)
    const order = await this.createOrderRecord(
      createPaymentDto,
      floor,
      zone ?? { zone_name: 'N/A', zip_code: '', delivery_charges: 0 },
      totalAmount,
      userId,
      discountAmount,
      couponCode,
    );

    // Step 6: Increment coupon usage count if applicable
    if (couponCode && discountAmount > 0) {
      try {
        const { data: coupon } = await this.supabaseService
          .getClient()
          .from('coupons')
          .select('id')
          .eq('code', couponCode)
          .single();

        if (coupon) {
          await this.couponService.incrementUsedCount(coupon.id);
          console.log('✅ Coupon incremented:', couponCode);
        }
      } catch (err) {
        console.error('❌ Coupon increment failed:', err);
      }
    }

    // Step 7: Create order items
    await this.createOrderItems(
      order.id,
      createPaymentDto.cart_items,
      variants,
    );

    // Step 8: Calculate final charge total
    // totalAmount (products) + floor charges + zone delivery charges - coupon discount
    const chargeTotal =
      totalAmount +
      floor.charges +
      (zone ? zone.delivery_charges : 0) -
      discountAmount;

    // Step 9: Create initial payment record (status: pending)
    await this.createInitialPaymentRecord(order.id, chargeTotal);

    // Step 10: Call Worldpay Access API — get hosted payment page URL
    const paymentUrl = await this.worldpayPaymentService.createPaymentUrl(
      createPaymentDto,
      order.id,
      chargeTotal,
    );

    this.logger.log('Payment order created successfully', {
      orderId: order.id,
      totalAmount,
      chargeTotal,
      discountAmount,
      floorCharges: floor.charges,
      zoneCharges: zone ? zone.delivery_charges : 0,
      currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
      gateway: 'worldpay-access',
    });

    return {
      success: true,
      order_id: order.id,
      total_amount: totalAmount,
      currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
      payment_url: paymentUrl,
    };
  } catch (error) {
    this.logger.error('Failed to create payment order', {
      error: error instanceof Error ? error.message : 'Unknown error',
      customerEmail: createPaymentDto.contact_email,
    });
    throw new BadRequestException(
      error.message || 'Failed to create payment order',
    );
  }
}

  private async extreactUserIdFromRequest(
    request: Request,
  ): Promise<string | null> {
    if (!request?.headers?.authorization) return null;

    const token = request.headers.authorization.split(' ')[1];
    if (!token) return null;

    try {
      const { data } = await this.supabaseService
        .getClient()
        .auth.getUser(token);
      return data?.user?.id || null;
    } catch (error) {
      this.logger.warn('Failed to extract user ID from token', {
        // error: error.message,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

/**
 * Creates an order using Cash on Delivery (COD)
 */
async createCodOrder(
  createPaymentDto: CreatePaymentDto,
  req: Request,
): Promise<{
  success: boolean;
  order_id: string;
  total_amount: number;
  currency: string;
  message: string;
  error?: string;
}> {
  try {
    const userId = await this.extreactUserIdFromRequest(req);

    this.logger.log('Creating COD order', {
      customerEmail: createPaymentDto.contact_email,
      itemCount: createPaymentDto.cart_items.length,
      userId: userId || 'guest',
    });

    const { variants, totalAmount } =
      await this.validateCartAndCalculateTotal(createPaymentDto.cart_items);

    const floor = await this.fetchFloorInfo(
      createPaymentDto.shipping_address.floor_id,
    );

    // const zone = await this.zonesService.findByZipCode(
    //   createPaymentDto.shipping_address.postal_code,
    // );

    // if (!zone) {
    //   throw new BadRequestException(
    //     `Delivery is not available to the postal code: ${createPaymentDto.shipping_address.postal_code}`,
    //   );
    // }

    const zone = createPaymentDto.shipping_address.postal_code?.trim()
  ? await this.zonesService.findByZipCode(createPaymentDto.shipping_address.postal_code)
  : null;

// Remove the !zone throw entirely, or change it to:
if (createPaymentDto.shipping_address.postal_code?.trim() && !zone) {
  throw new BadRequestException(
    `Delivery is not available to the postal code: ${createPaymentDto.shipping_address.postal_code}`,
  );
}

    let discountAmount = createPaymentDto.discount_amount || 0;
    let couponCode = createPaymentDto.coupon_code;

    // Create the order
    const order = await this.createOrderRecord(
      createPaymentDto,
      floor,
      zone ?? { zone_name: 'N/A', zip_code: '', delivery_charges: 0 },
      totalAmount,
      userId,
      discountAmount,
      couponCode,
    );
    
    // Create order items
    await this.createOrderItems(
      order.id,
      createPaymentDto.cart_items,
      variants,
    );
    
    // Create payment record
    await this.createInitialCodPaymentRecord(
      order.id,
      totalAmount + floor.charges + (zone ? zone.delivery_charges : 0) - discountAmount,
    );

    // ✅ FIX: INCREMENT COUPON USAGE FOR COD ORDERS
    // Process referral reward if it's a referral code
if (couponCode && discountAmount > 0 && userId) {
  try {
    const { data: referrer } = await this.supabaseService
      .getClient()
      .from('users')
      .select('id')
      .eq('referral_code', couponCode)
      .single();

    if (referrer) {
      await this.couponService.processReferralReward(
  userId,
  couponCode,
  order.id,
  discountAmount,
  totalAmount,
).catch(err => this.logger.error('Failed to process referral reward:', err));
    }
  } catch (err) {
    this.logger.error('❌ Failed to process referral reward for COD:', err);
  }
}

    return {
      success: true,
      order_id: order.id,
      total_amount: totalAmount,
      currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
      message: 'COD order created successfully',
    };
//   } catch (error) {
//     this.logger.error('Failed to create COD order', {
//       error: error.message,
//       customerEmail: createPaymentDto.contact_email,
//     });

//     return {
//       success: false,
//       order_id: '',
//       total_amount: 0,
//       currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
//       message: 'Failed to create COD order',
//       error: error.message || 'Failed to create COD order',
//     };
//   }
// }

  } catch (error) {
    this.logger.error('Failed to create COD order', {
      error: error instanceof Error ? error.message : 'Unknown error',
      customerEmail: createPaymentDto.contact_email,
    });
    throw new BadRequestException(
      error.message || 'Failed to create COD order'
    );
  }
}

  /**
   * Handles webhook notifications from Tyl payment gateway
   */
  async handlePaymentWebhook(
    webhookData: WebhookNotificationDto,
  ): Promise<void> {
    try {
      this.logger.log('Processing Worldpay webhook notification', {
        orderId: webhookData.oid,
        status: webhookData.status,
        approvalCode: webhookData.approval_code?.substring(0, 10) + '...', // Log partial for security
        refNumber: webhookData.refnumber,
      });

      // Step 1: Verify webhook authenticity
      const isValidWebhook = this.worldpayPaymentService.verifyWebhookHash(
        webhookData.approval_code,
        webhookData.chargetotal,
        webhookData.currency,
        webhookData.txndatetime,
        webhookData.storename,
        webhookData.notification_hash,
      );

      if (!isValidWebhook) {
        this.logger.warn('Invalid webhook hash received', {
          orderId: webhookData.oid,
          receivedHash: webhookData.notification_hash?.substring(0, 20) + '...',
        });
        throw new BadRequestException('Invalid webhook authentication');
      }

      // Step 2: Update payment record
      await this.updatePaymentRecord(webhookData);

      // Step 3: Update order status
      await this.updateOrderStatusFromWebhook(webhookData);

      this.logger.log('Webhook processed successfully', {
        orderId: webhookData.oid,
        status: webhookData.status,
      });
    } catch (error) {
      this.logger.error('Failed to process webhook', {
        error: error.message,
        orderId: webhookData.oid,
        status: webhookData.status,
      });
      throw error;
    }
  }

  /**
   * Validates cart items exist and calculates total amount
   */
private async validateCartAndCalculateTotal(
  cartItems: {
    variant_id: string;
    quantity: number;
    assembly_required: boolean;
    unit_price_override?: number;
  }[],
) {
  const variantIds = cartItems.map((item) => item.variant_id);

  const { data, error } = await this.supabaseService
    .getClient()
    .from('product_variants')
    .select('id, price, stock, assemble_charges, discount_percentage, compare_price')
    .in('id', variantIds);

  if (error) {
    this.handleSupabaseError(error, 'Failed to fetch product variants');
  }

  const variants = data as Array<{
    id: string;
    price: number;
    stock: number;
    assemble_charges: number;
    discount_percentage?: number;
    compare_price?: number;
  }>;

  if (!variants || variants.length !== cartItems.length) {
    const foundIds = variants?.map((v) => v.id) || [];
    const missingIds = variantIds.filter((id) => !foundIds.includes(id));
    throw new NotFoundException(
      `Product variants not found: ${missingIds.join(', ')}`,
    );
  }

  let totalAmount = 0;
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  for (const cartItem of cartItems) {
    const variant = variantMap.get(cartItem.variant_id);

    console.log(`price: ${variant?.price}, discount_percentage: ${variant?.discount_percentage}`);
    console.log(`calculated: ${variant?.price ?? 0 * (1 - (variant?.discount_percentage ?? 0) / 100)}`);
    console.log(`Math.round result: ${Math.round((variant?.price ?? 0) * (1 - (variant?.discount_percentage ?? 0) / 100))}`);

    if (!variant) {
      throw new NotFoundException(
        `Product variant not found: ${cartItem.variant_id}`,
      );
    }

    if (variant.stock < cartItem.quantity) {
      throw new BadRequestException(
        `Insufficient stock for variant ${cartItem.variant_id}. Available: ${variant.stock}, Requested: ${cartItem.quantity}`,
      );
    }


let basePrice = variant.price;

if (cartItem.unit_price_override) {
  basePrice = cartItem.unit_price_override;
} else if (variant.compare_price && variant.compare_price > variant.price) {
  // compare_price exists → calculate % from compare_price and apply on variant.price
  const pct = Math.round(((variant.compare_price - variant.price) / variant.compare_price) * 100);
  basePrice = Math.round((variant.price - (variant.price * pct / 100)) * 100) / 100;
} else if (variant.discount_percentage && Number(variant.discount_percentage) > 0) {
  // No compare_price → apply admin-set % discount on variant.price
  const pct = Number(variant.discount_percentage);
  basePrice = Math.round((variant.price - (variant.price * pct / 100)) * 100) / 100;
} else {
  basePrice = variant.price;
}

console.log(`Variant ${cartItem.variant_id}: compare=${variant.compare_price}, price=${variant.price}, finalBasePrice=${basePrice}`);

    totalAmount += basePrice * cartItem.quantity;

    if (cartItem.assembly_required) {
      console.log(`Adding assembly charges: ${variant.assemble_charges} for variant ${cartItem.variant_id}`);
      totalAmount += variant.assemble_charges * cartItem.quantity;
    }
  }

  return { variants, totalAmount };
}

  /**
   * Creates the main order record
   */
  private async createOrderRecord(
    createPaymentDto: CreatePaymentDto,
    floor: Floor,
    zone: { zone_name: string; zip_code: string; delivery_charges: number },
    totalAmount: number,
    userId?: string | null,
    discountAmount?: number, // ADD THIS PARAMETER
    couponCode?: string,     // ADD THIS PARAMETER
  ) {
    const billingAddress = createPaymentDto.use_different_billing_address
      ? createPaymentDto.billing_address
      : createPaymentDto.shipping_address;

    const orderData: any = {
      contact_first_name: createPaymentDto.contact_first_name,
      contact_last_name: createPaymentDto.contact_last_name,
      contact_email: createPaymentDto.contact_email,
      contact_phone: createPaymentDto.contact_phone,
      shipping_address: createPaymentDto.shipping_address,
      billing_address: billingAddress,
      use_different_billing_address:
        createPaymentDto.use_different_billing_address,
      order_notes: createPaymentDto.order_notes,
      total_amount: totalAmount,
      discount_amount: discountAmount || 0, // ← FIXED: Use the passed discount amount
      coupon_code: couponCode || null,      // ← ADD THIS
      shipping_cost: 0, // Phase 1: No shipping
      tax_amount: 0, // Phase 1: No tax
      status: 'pending',
      currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
    };

    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .insert({
        ...orderData,
        user_id: userId || null,
        floor: { id: floor.id, name: floor.name, charges: floor.charges },
        zone: {
          zone_name: zone.zone_name,
          zip_code: zone.zip_code,
          delivery_charges: zone.delivery_charges,
        },
      })
      .select()
      .single();

    if (error) {
      this.handleSupabaseError(error, 'Failed to create order');
    }

    return data as Order;
  }

  /**
   * Creates order items records
   */
  private async createOrderItems(
    orderId: string,
    cartItems: {
      variant_id: string;
      quantity: number;
      assembly_required: boolean;
      unit_price_override?: number;
    }[],
    variants: Array<{
      id: string;
      price: number;
      stock: number;
      assemble_charges: number;
      discount_percentage?: number;
      compare_price?: number;
    }>,
  ) {
    const variantMap = new Map(variants.map((v) => [v.id, v]));



    const orderItems = cartItems.map((cartItem) => {
  const variant = variantMap.get(cartItem.variant_id)!;





let originalPrice: number;
let discountedPrice: number;

if (cartItem.unit_price_override) {
  discountedPrice = cartItem.unit_price_override;
  originalPrice = variant.price;
} else if (variant.compare_price && variant.compare_price > variant.price) {
  // compare_price exists → calculate % from compare_price and apply on variant.price
  const pct = Math.round(((variant.compare_price - variant.price) / variant.compare_price) * 100);
  discountedPrice = Math.round((variant.price - (variant.price * pct / 100)) * 100) / 100;
  originalPrice = variant.compare_price;
} else if (variant.discount_percentage && Number(variant.discount_percentage) > 0) {
  // No compare_price → apply % on variant.price
  const pct = Number(variant.discount_percentage);
  discountedPrice = Math.round((variant.price - (variant.price * pct / 100)) * 100) / 100;
  originalPrice = variant.price;
} else {
  discountedPrice = variant.price;
  originalPrice = variant.price;
}

console.log(
  `Saving variant ${cartItem.variant_id}: ` +
  `original=${originalPrice}, discounted=${discountedPrice}`
);

return {
  order_id: orderId,
  variant_id: cartItem.variant_id,
  quantity: cartItem.quantity,
  unit_price: discountedPrice,
  original_price: originalPrice,
  assembly_required: cartItem.assembly_required,
  discount_applied: 0,
};
});

    const { error } = await this.supabaseService
      .getClient()
      .from('order_items')
      .insert(orderItems);

    if (error) {
      this.handleSupabaseError(error, 'Failed to create order items');
    }
  }

  /**
   * Creates initial payment record
   */
  private async createInitialPaymentRecord(
    orderId: string,
    totalAmount: number,
  ) {

    const paymentId = uuidv4();


    const paymentData = {
      order_id: orderId,
      provider: 'worldpay',
      payment_id: paymentId, // Use order ID as initial payment ID
      status: 'pending',
      amount: totalAmount,
      currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
    };

    const { error } = await this.supabaseService
      .getClient()
      .from('payments')
      .insert(paymentData);

     if (error) {
      this.logger.error(
        `Payment insert failed — code: ${error.code} | message: ${error.message} | details: ${error.details} | hint: ${error.hint}`,
      );
      this.handleSupabaseError(error, 'Failed to create payment record');
    }
  }

  /**
   * Creates initial COD payment record
   */
  private async createInitialCodPaymentRecord(
    orderId: string,
    totalAmount: number,
  ) {
    const paymentId = uuidv4();


    const paymentData = {
      order_id: orderId,
      provider: 'cod',
      payment_id: paymentId,
      status: 'pending',
      amount: totalAmount,
      currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
    };

    const { error } = await this.supabaseService
      .getClient()
      .from('payments')
      .insert(paymentData);

    if (error) {
      this.logger.error(
        `COD payment insert failed — code: ${error.code} | message: ${error.message} | details: ${error.details} | hint: ${error.hint}`,
      );
      this.handleSupabaseError(error, 'Failed to create COD payment record');
    }
  }

  /**
   * Updates payment record from webhook data
   */
  private async updatePaymentRecord(webhookData: WebhookNotificationDto) {
    const paymentStatus = this.worldpayPaymentService.mapTylStatusToPaymentStatus(
      webhookData.status,
    );

    const updateData = {
      status: paymentStatus,
      approval_code: webhookData.approval_code,
      reference_number: webhookData.refnumber,
      transaction_datetime: new Date(
        webhookData.txndate_processed || new Date(),
      ),
      response_hash: webhookData.notification_hash,
      processed_at: new Date(),
      payment_method: webhookData.ccbrand,
      card_brand: webhookData.ccbrand,
      failure_reason: webhookData.fail_reason,
    };

    const { error } = await this.supabaseService
      .getClient()
      .from('payments')
      .update(updateData)
      .eq('order_id', webhookData.oid);

    if (error) {
      this.handleSupabaseError(
        error,
        'Failed to update payment record',
        webhookData.oid,
      );
    }
  }

  /**
   * Updates order status from webhook data
   */
  private async updateOrderStatusFromWebhook(
    webhookData: WebhookNotificationDto,
  ) {
    const orderStatus = this.worldpayPaymentService.mapTylStatusToOrderStatus(
      webhookData.status,
    );

    const updateData: any = {
      status: orderStatus,
      updated_at: new Date(),
    };

    // If payment failed or was declined, add cancellation reason
    if (orderStatus === 'cancelled' && webhookData.fail_reason) {
      updateData.cancellation_reason = `Payment ${webhookData.status.toLowerCase()}: ${webhookData.fail_reason}`;
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('orders')
      .update(updateData)
      .eq('id', webhookData.oid);

    if (error) {
      this.handleSupabaseError(
        error,
        'Failed to update order status',
        webhookData.oid,
      );
    }
  }


/**
 * Handles payment success redirect from Tyl
 */
async handlePaymentSuccess(paymentData: any, res: any): Promise<void> {
  try {
    this.logger.log('Received payment success redirect', {
      orderId: paymentData.oid,
      status: paymentData.status,
    });

    const frontendBaseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
    const redirectUrl = `${frontendBaseUrl}/payment/success?orderId=${paymentData.oid}`;

    // Get order details
    const { data: orderDetails, error: orderError } = await this.supabaseService
      .getClient()
      .from('orders')
      .select('user_id, coupon_code, discount_amount')
      .eq('id', paymentData.oid)
      .single();

    if (orderError || !orderDetails) {
      this.logger.warn('Order not found');
      res.redirect(302, redirectUrl);
      return;
    }

    this.logger.log(`🔍 Order details:`, {
      coupon_code: orderDetails.coupon_code,
      discount_amount: orderDetails.discount_amount,
      order_id: paymentData.oid
    });

    // ✅ FIX: INCREMENT COUPON USAGE FOR CARD PAYMENTS
    // Process referral reward if it's a referral code
if (orderDetails.coupon_code && orderDetails.discount_amount > 0 && orderDetails.user_id) {
  try {
    const { data: referrer } = await this.supabaseService
      .getClient()
      .from('users')
      .select('id')
      .eq('referral_code', orderDetails.coupon_code)
      .single();

    if (referrer) {
      // Get order total for percentage reward calculation
      const { data: fullOrder } = await this.supabaseService
        .getClient()
        .from('orders')
        .select('total_amount')
        .eq('id', paymentData.oid)
        .single();

      await this.couponService.processReferralReward(
        orderDetails.user_id,
        orderDetails.coupon_code,
        paymentData.oid,
        orderDetails.discount_amount,
        fullOrder?.total_amount || 0,
      );
      this.logger.log(`✅ Referral reward processed for card order ${paymentData.oid}`);
    }
  } catch (err) {
    this.logger.error('❌ Failed to process referral reward for card payment:', err);
  }
}

    // Get user email for notification
    const { data: userEmail } = await this.supabaseService
      .getClient()
      .from('users')
      .select('email')
      .eq('id', orderDetails.user_id)
      .limit(1);

    if (!userEmail || userEmail.length === 0) {
      this.logger.warn('User email not found for order');
      res.redirect(302, redirectUrl);
      return;
    }

    // Get full order data for email
    const { data: orderData } = await this.supabaseService
      .getClient()
      .from('orders')
      .select('*')
      .eq('id', paymentData.oid)
      .single();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Your Order #${paymentData.oid} Has Been Successfully Placed! 🛍</h2>
        <p>Hi there,</p>
        <p>Thank you for shopping with us! 🎉</p>
        <p>Your order has been successfully placed and is now being processed.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Order Summary:</h3>
          <p><strong>Order ID:</strong> ${paymentData.oid}</p>
          <p><strong>Total Amount:</strong> ${orderData?.total_amount || 0} ${orderData?.currency || 'GBP'}</p>
        </div>
        <p>Thanks for choosing us!</p>
      </div>
    `;

    await this.mailService.sendEmail(
      userEmail[0].email,
      'Order Placed Successfully',
      html
    );

    res.redirect(302, redirectUrl);
  } catch (error) {
    this.logger.error('Failed to handle payment success:', error);
    const frontendBaseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
    res.redirect(302, `${frontendBaseUrl}/payment/failure`);
  }
}

  /**
   * Handles payment failure redirect from Tyl
   */
  async handlePaymentFailure(paymentData: any, res: any): Promise<void> {
    try {
      this.logger.log('Received payment failure redirect', {
        orderId: paymentData.oid,
        status: paymentData.status,
        failReason: paymentData.fail_reason,
      });

      const frontendBaseUrl =
        this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
      const redirectUrl = `${frontendBaseUrl}/payment/failure?orderId=${paymentData.oid}&status=${paymentData.status}&reason=${encodeURIComponent(paymentData.fail_reason || 'Payment failed')}`;

      const { data: order } = await this.supabaseService
        .getClient()
        .from('orders')
        .select('user_id')
        .eq('id', paymentData.oid)
        .single();

      if (!order) {
        this.logger.warn('Order not found for payment success redirect', {
          orderId: paymentData.oid,
        });
        res.redirect(302, redirectUrl);
        return;
      }

      const { data: userEmail } = await this.supabaseService
        .getClient()
        .from('users')
        .select('email')
        .eq('id', order.user_id)
        .limit(1);

      if (!userEmail || userEmail.length === 0) {
        this.logger.warn(
          'User email not found for order in payment success redirect',
          {
            orderId: paymentData.oid,
            userId: order.user_id,
          },
        );
        res.redirect(302, redirectUrl);
        return;
      }

      const html = `
      <p>There was a failure during payment</p>
      `;

      await this.mailService.sendEmail(
        userEmail[0].email,
        'Order Failure Notification',
        html,
      );

      res.redirect(302, redirectUrl);
    } catch (error) {
      console.log(error);

      this.logger.error('Failed to handle payment failure redirect', {
        error: error.message,
        orderId: paymentData.oid,
      });

      const frontendBaseUrl =
        this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
      const errorUrl = `${frontendBaseUrl}/payment/failure?error=redirect_failed`;
      res.redirect(302, errorUrl);
    }
  }

  /**
   * Fetch Floor Information
   */
  private async fetchFloorInfo(floorId: string): Promise<Floor> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('floors')
      .select('*')
      .eq('id', floorId)
      .single();

    if (error) {
      this.handleSupabaseError(
        error,
        `Failed to fetch floor information for ID: ${floorId}`,
      );
    }

    return data as Floor;
  }
}
