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
import { CardstreamPaymentService } from './services/cardstream-payment.service';
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
    private readonly cardstreamPaymentService: CardstreamPaymentService,
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
    } catch (err: unknown) {
      if ((err as any).response && (err as any).status) {
      throw err;
    }
      this.logger.error(`Error during Supabase operation: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : '');
      throw new InternalServerErrorException({
      message: errorMessage,
      error: err instanceof Error ? err.message : String(err),
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
          if ((result.error as any).response) {
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
    } catch (error: unknown) {
      this.logger.error(`Error processing checkout: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      if ((error as any).response) { throw error; }
      throw new BadRequestException(`Error processing order: ${error instanceof Error ? error.message : String(error)}`);
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
          } catch (err: unknown) {
            this.logger.error(`Unexpected error validating variant ${item.variant_id}: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : '');
            return {
              variant_id: item.variant_id,
              quantity: item.quantity,
              inStock: false,
              message: 'Error checking product availability',
              currentPrice: null,
              error: err instanceof Error ? err.message : String(err),
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
    } catch (error: unknown) {
      this.logger.error(`Error during checkout validation: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      return {
        isValid: false,
        errors: [{ message: `Failed to validate checkout: ${error instanceof Error ? error.message : String(error)}` }],
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
    } catch (error: unknown) {
      this.logger.error(`Error listing user orders: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      if ((error as any).response) { throw error; }
      throw new InternalServerErrorException(`Failed to list orders: ${error instanceof Error ? error.message : String(error)}`);
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
    } catch (error: unknown) {
      this.logger.error(`Error getting order details: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      if ((error as any).response) { throw error; }
      throw new InternalServerErrorException(`Failed to get order details: ${error instanceof Error ? error.message : String(error)}`);
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
    } catch (error: unknown) {
      this.logger.error(`Error cancelling order: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      if ((error as any).response) { throw error; }
      throw new InternalServerErrorException(`Failed to cancel order: ${error instanceof Error ? error.message : String(error)}`);
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
    } catch (error: unknown) {
      this.logger.error(`Error cancelling order with reason: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      if ((error as any).response) { throw error; }
      throw new InternalServerErrorException(`Failed to cancel order with reason: ${error instanceof Error ? error.message : String(error)}`);
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
    } catch (error: unknown) {
      this.logger.error(`Error listing all orders for admin: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      if ((error as any).response) { throw error; }
      throw new InternalServerErrorException(`Failed to list orders: ${error instanceof Error ? error.message : String(error)}`);
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

if (updateOrderStatusDto.status === OrderStatus.LOAN_APPROVED && updateOrderStatusDto.deposit_amount) {
  await this.supabaseService
    .getClient()
    .from('orders')
    .update({
      deposit_amount: updateOrderStatusDto.deposit_amount,
      deposit_percentage: updateOrderStatusDto.deposit_percentage,
      installment_term: (updateOrderStatusDto as any).installment_term,
      admin_deposit_percentage: (updateOrderStatusDto as any).admin_deposit_percentage,
      admin_installment_term: (updateOrderStatusDto as any).admin_installment_term,
    })
    .eq('id', orderId);
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

    // Reset abandoned cart email flag so future abandonments still trigger email
    await this.supabaseService
      .getClient()
      .from('carts')
      .update({ abandoned_email_sent_at: null })
      .eq('user_id', existingOrder.user_id);


    try {
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

      // ✅ Send to contact_email directly — works for both guests and registered users
      const recipientEmail = data.contact_email || existingOrder.contact_email;

      if (recipientEmail && updateOrderStatusDto.status === OrderStatus.SHIPPED) {
    await this.mailService.sendEmail(
      recipientEmail,
      `Good News! Your Order #${orderId} Is On Its Way 🚚`,
      shippedHtml,
    );
  } else if (recipientEmail && updateOrderStatusDto.status === OrderStatus.DELIVERED) {
    await this.mailService.sendEmail(
      recipientEmail,
      `Your Order #${orderId} Has Been Delivered! 📦`,
      deliveredHtml,
    );
  }
    } catch (emailError: unknown) {
      this.logger.error(`Failed to send status update email for order ${orderId}: ${emailError instanceof Error ? emailError.message : String(emailError)}`);
    }




// if (updateOrderStatusDto.status === OrderStatus.LOAN_APPROVED) {
//   try {
//     const frontendBaseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
//     const magicLink = `${frontendBaseUrl}/loan-approved/${orderId}`;

//     // ✅ Use contact_email directly — works for guests and registered users
//     const loanRecipientEmail = data.contact_email || existingOrder.contact_email;

//     if (loanRecipientEmail) {
//       const loanApprovedHtml = `
//   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
//     <h2 style="color: #333;">🎉 Your Loan Has Been Approved!</h2>
//     <p>Hi ${data.shipping_address?.recipient_name || 'there'},</p>
//     <p>Great news! Your finance application for order <strong>#${orderId}</strong> has been approved.</p>
//     <p>You can now pay your deposit to confirm your order. Click the button below:</p>
//     <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
//       <p><strong>Deposit Required:</strong> ${updateOrderStatusDto.deposit_percentage}% — £${((updateOrderStatusDto.deposit_amount || 0)).toFixed(2)}</p>
//       <p><strong>Repayment Term:</strong> ${(updateOrderStatusDto as any).installment_term} Months</p>
//     </div>
//     <div style="text-align: center; margin: 30px 0;">
//       <a href="${magicLink}" 
//          style="background-color: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
//         Pay Your Deposit Now
//       </a>
//     </div>
//     <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
//       <p>Best regards,</p>
//       <p><strong>Sofa Deal</strong></p>
//     </div>
//   </div>
// `;

//       await this.mailService.sendEmail(
//         loanRecipientEmail,
//         '🎉 Your Loan Has Been Approved — Pay Your Deposit Now',
//         loanApprovedHtml,
//       );
//     }
//   } catch (loanEmailError: unknown) {
//     this.logger.error(`Failed to send loan approved email for order ${orderId}: ${loanEmailError instanceof Error ? loanEmailError.message : String(loanEmailError)}`);
//   }
// }


if (updateOrderStatusDto.status === OrderStatus.LOAN_APPROVED) {
  try {
    const frontendBaseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
    const magicLink = `${frontendBaseUrl}/loan-approved/${orderId}`;
    const loanRecipientEmail = data.contact_email || existingOrder.contact_email;
    const recipientName = data.shipping_address?.recipient_name || 'there';

    if (loanRecipientEmail) {
      await this.mailService.sendLoanApprovedEmail({
        toEmail: loanRecipientEmail,
        recipientName,
        orderId,
        depositPercentage: updateOrderStatusDto.deposit_percentage ?? 0,
        depositAmount: updateOrderStatusDto.deposit_amount ?? 0,
        installmentTerm: (updateOrderStatusDto as any).installment_term ?? 0,
        magicLink,
      });
    }
  } catch (loanEmailError: unknown) {
    this.logger.error(
      `Failed to send loan approved email for order ${orderId}: ${
        loanEmailError instanceof Error ? loanEmailError.message : String(loanEmailError)
      }`,
    );
  }
}


    this.logger.log(
      `Order ${orderId} status updated to ${updateOrderStatusDto.status}`,
    );

    return this.attachItemImages(data) as Order;
  } catch (error: unknown) {
    console.log(error);
    this.logger.error(`Error updating order status: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
    if ((error as any).response) { throw error; }
    throw new InternalServerErrorException(`Failed to update order status: ${error instanceof Error ? error.message : String(error)}`);
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
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.LOAN_APPROVED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.LOAN_APPROVED]: [OrderStatus.PAID, OrderStatus.CANCELLED],
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
    } catch (error: unknown) {
      this.logger.error(`Error exporting orders: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : '');
      if ((error as any).response) { throw error; }
      throw new InternalServerErrorException(`Failed to export orders: ${error instanceof Error ? error.message : String(error)}`);
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

      this.logger.log(`Step 1 done. totalAmount: ${totalAmount}`);
      this.logger.log(`floor_id being fetched: ${createPaymentDto.shipping_address.floor_id}`);


    // Step 2: Floor charges
    const floor = await this.fetchFloorInfo(
      createPaymentDto.shipping_address.floor_id,
    );

    this.logger.log(`Step 2 done. floor: ${JSON.stringify(floor)}`);

    // Step 3: Zone / delivery charges
    const zone = createPaymentDto.shipping_address.postal_code?.trim()
      ? await this.zonesService.findByZipCode(
          createPaymentDto.shipping_address.postal_code,
        )
      : null;
      this.logger.log(`Step 3 done. zone: ${JSON.stringify(zone)}`);

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
    this.logger.log(`Step 5 done. order id: ${order.id}`);

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
    this.logger.log(`Step 7 done`);

    // Step 8: Calculate final charge total
    // totalAmount (products) + floor charges + zone delivery charges - coupon discount
    const chargeTotal =
      totalAmount +
      floor.charges +
      (zone ? zone.delivery_charges : 0) -
      discountAmount;

    // Step 9: Create initial payment record (status: pending)
    await this.createInitialPaymentRecord(order.id, chargeTotal);
    this.logger.log(`Step 9 done. chargeTotal: ${chargeTotal}`);

    // Step 10: Return fields for POST form submission (NOT a GET URL)
const { gatewayUrl, fields } = this.cardstreamPaymentService.createPaymentFields(
  createPaymentDto,
  order.id,
  chargeTotal,
);
this.logger.log(`Step 10 done. fields: ${JSON.stringify(fields)}`);

return {
  success: true,
  order_id: order.id,
  total_amount: totalAmount,
  currency: this.configService.get<string>('CURRENCY_NAME') || 'GBP',
  payment_url: gatewayUrl,      // base URL only, no query string
  payment_fields: fields,        // signed fields returned separately
};
  } catch (error: unknown) {
    this.logger.error('Failed to create payment order', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : '',
      customerEmail: createPaymentDto.contact_email,
    });
    throw new BadRequestException(error instanceof Error ? error.message : 'Failed to create payment order');
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

    const zone = createPaymentDto.shipping_address.postal_code?.trim()
  ? await this.zonesService.findByZipCode(createPaymentDto.shipping_address.postal_code)
  : null;


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
  } catch (error: unknown) {
    this.logger.error('Failed to create COD order', {
      error: error instanceof Error ? error.message : 'Unknown error',
      customerEmail: createPaymentDto.contact_email,
    });
    throw new BadRequestException(error instanceof Error ? error.message : 'Failed to create COD order');
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
      const isValidWebhook = this.cardstreamPaymentService.verifyWebhookHash(
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
    } catch (error: unknown) {
      this.logger.error('Failed to process webhook', {
      error: error instanceof Error ? error.message : String(error),
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
      provider: 'cardstream',
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
    const paymentStatus = this.cardstreamPaymentService.mapTylStatusToPaymentStatus(
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
    const orderStatus = this.cardstreamPaymentService.mapTylStatusToOrderStatus(
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

    // Reset abandoned cart email flag on successful card payment
    if (orderStatus === 'paid') {
      const { data: order } = await this.supabaseService
        .getClient()
        .from('orders')
        .select('user_id')
        .eq('id', webhookData.oid)
        .single();

      if (order?.user_id) {
        await this.supabaseService
          .getClient()
          .from('carts')
          .update({ abandoned_email_sent_at: null })
          .eq('user_id', order.user_id);
      }
    }
  }


/**
 * Handles payment success redirect from cardstream
 */
async handlePaymentSuccess(paymentData: any, res: any): Promise<void> {
  try {
    this.logger.log('Raw payment data received:', JSON.stringify(paymentData));

    const orderId = paymentData.oid || paymentData.orderRef || paymentData.order_id;
    const frontendBaseUrl = this.configService.getOrThrow<string>('FRONTEND_BASE_URL');
    const redirectUrl = `${frontendBaseUrl}/payment/success?orderId=${orderId}`;

    const { data: orderDetails, error: orderError } = await this.supabaseService
      .getClient()
      .from('orders')
      .select('user_id, coupon_code, discount_amount, contact_email, total_amount, currency, tracking_id')
      .eq('id', orderId)
      .single();

    if (orderError || !orderDetails) {
      this.logger.warn('Order not found for ID:', orderId);
      res.redirect(302, redirectUrl);
      return;
    }

    // Process referral reward
    if (orderDetails.coupon_code && orderDetails.discount_amount > 0 && orderDetails.user_id) {
      try {
        const { data: referrer } = await this.supabaseService
          .getClient()
          .from('users')
          .select('id')
          .eq('referral_code', orderDetails.coupon_code)
          .single();

        if (referrer) {
          await this.couponService.processReferralReward(
            orderDetails.user_id,
            orderDetails.coupon_code,
            orderId,
            orderDetails.discount_amount,
            orderDetails.total_amount || 0,
          );
        }
      } catch (err) {
        this.logger.error('Failed to process referral reward:', err);
      }
    }

    // Send confirmation email using contact_email (works for guests + registered)
    const recipientEmail = orderDetails.contact_email;

    if (recipientEmail) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your Order Has Been Successfully Placed! 🛍</h2>
          <p>Hi there,</p>
          <p>Thank you for shopping with us! 🎉</p>
          <p>Your order has been successfully placed and is now being processed.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Order Summary:</h3>
            <p><strong>Order Tracking ID:</strong> #${orderDetails.tracking_id}</p>
            <p><strong>Total Amount:</strong> ${orderDetails.total_amount || 0} ${orderDetails.currency || 'GBP'}</p>
          </div>
          <p>You can use your tracking ID <strong>#${orderDetails.tracking_id}</strong> to track your order.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.getOrThrow<string>('FRONTEND_BASE_URL')}/trackorder?id=${orderDetails.tracking_id}"
            style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block;">
              Track Order
            </a>
          </div>
          <p>Thanks for choosing us!</p>
        </div>
      `;

      await this.mailService.sendEmail(recipientEmail, 'Order Placed Successfully', html);
    }

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
    } catch (error: unknown) {
      console.log(error);
      this.logger.error('Failed to handle payment failure redirect', {
        error: error instanceof Error ? error.message : String(error),
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

/**
 * Find a single order by its short display ID (first 8 hex chars of UUID).
 * The display ID shown in the UI is: uuid.replace(/-/g,'').slice(0,8).toUpperCase()
 * e.g. "2a705755-1071-418f-b2e8-03d21936ba8e" → "2A705755"
 */

async findOrderByShortId(
  shortId: string,
  userId?: string | null,
): Promise<Order | null> {
  try {
    const normalizedShortId = shortId
      .replace(/^#/, '')
      .trim()
      .toUpperCase();

    if (normalizedShortId.length !== 8) {
      return null;
    }

    
    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .select(this.orderSelectWithItemDetails)
      .like('tracking_id', `${normalizedShortId}%`)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error searching order by tracking ID: ${error.message}`);
      return null;
    }

    if (!data) return null;

    return this.attachItemImages(data) as Order;
  } catch (error: unknown) {
    this.logger.error(
      `Error finding order by short ID: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}


async updateDepositInfo(
  orderId: string,
  depositAmount: number,
  depositPercentage: number,
  installmentTerm?: number,
): Promise<void> {
  const { error } = await this.supabaseService
    .getClient()
    .from('orders')
    .update({
      deposit_amount: depositAmount,
      deposit_percentage: depositPercentage,
      ...(installmentTerm && { installment_term: installmentTerm }),
    })
    .eq('id', orderId);

  if (error) {
    this.logger.error(`Failed to update deposit info for order ${orderId}: ${error.message}`);
    this.handleSupabaseError(error, 'Failed to update deposit info');
  }

  this.logger.log(`Deposit info saved for order ${orderId}: ${depositPercentage}% = £${depositAmount}`);
}

// async createDepositPayment(
//   orderId: string,
//   userId: string,
// ): Promise<CreatePaymentResponseDto> {
//   // Fetch order
//   const { data: order, error } = await this.supabaseService
//     .getClient()
//     .from('orders')
//     .select('*, items:order_items(*)')
//     .eq('id', orderId)
//     .eq('user_id', userId)
//     .single();

//   if (error || !order) {
//     throw new NotFoundException(`Order ${orderId} not found`);
//   }

async createDepositPayment(
  orderId: string,
  userId: string | null,
): Promise<CreatePaymentResponseDto> {
  // ✅ For guests userId is null — just look up by orderId alone
  let query = this.supabaseService
    .getClient()
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('id', orderId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: order, error } = await query.single();

  if (error || !order) {
    throw new NotFoundException(`Order ${orderId} not found`);
  }

  if (order.status !== 'loan_approved') {
    throw new BadRequestException('Order is not in loan_approved status');
  }

  if (!order.deposit_amount || order.deposit_amount <= 0) {
    throw new BadRequestException('No deposit amount set for this order');
  }

  // Create payment fields for DEPOSIT AMOUNT ONLY
  const depositAmount = order.deposit_amount;

  const createPaymentDto: any = {
    contact_first_name: order.contact_first_name,
    contact_last_name: order.contact_last_name,
    contact_email: order.contact_email,
    contact_phone: order.contact_phone,
    shipping_address: order.shipping_address,
    billing_address: order.billing_address,
    use_different_billing_address: order.use_different_billing_address,
    cart_items: [],
  };

  const { gatewayUrl, fields } = this.cardstreamPaymentService.createPaymentFields(
    createPaymentDto,
    orderId,
    depositAmount, // ✅ deposit amount only
  );

  return {
    success: true,
    order_id: orderId,
    total_amount: depositAmount,
    currency: order.currency || 'GBP',
    payment_url: gatewayUrl,
    payment_fields: fields,
  };
}


}


