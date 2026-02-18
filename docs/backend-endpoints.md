# Sofa Deal E-Commerce Backend API Endpoints

This document provides a comprehensive list of all API endpoints required for the Sofa Deal E-Commerce platform, organized by module. Each endpoint includes its HTTP method, path, purpose, and access level.

## Access Levels
- **Public**: Accessible without authentication
- **User**: Requires user authentication
- **Admin**: Requires administrator or editor role

## Categories Module

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/categories` | List all categories (with optional nesting) | Public |
| GET | `/categories/:id` | Get details of a specific category | Public |
| GET | `/categories/:id/subcategories` | Get subcategories of a category | Public |
| GET | `/categories/:id/products` | Get products in a category | Public |
| POST | `/admin/categories` | Create a new category | Admin |
| PUT | `/admin/categories/:id` | Update a category | Admin |
| DELETE | `/admin/categories/:id` | Delete a category | Admin |
| PUT | `/admin/categories/:id/order` | Change display order of categories | Admin |

## Products Module

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/products` | List products with filtering and pagination | Public |
| GET | `/products/:id` | Get details of a specific product | Public |
| GET | `/products/featured` | Get featured/highlighted products | Public |
| GET | `/products/related/:id` | Get products related to a specific product | Public |
| POST | `/admin/products` | Create a new product | Admin |
| PUT | `/admin/products/:id` | Update a product | Admin |
| DELETE | `/admin/products/:id` | Delete a product | Admin |
| POST | `/admin/products/import` | Bulk import products (CSV) | Admin |
| GET | `/admin/products/export` | Export products to CSV | Admin |

## Product Variants

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/products/:id/variants` | Get all variants of a product | Public |
| GET | `/variants/:id` | Get details of a specific variant | Public |
| POST | `/admin/products/:id/variants` | Add a variant to a product | Admin |
| PUT | `/admin/variants/:id` | Update a product variant | Admin |
| DELETE | `/admin/variants/:id` | Delete a product variant | Admin |
| PUT | `/admin/variants/:id/stock` | Update stock level of a variant | Admin |
| GET | `/admin/products/low-stock` | Get products with low stock | Admin |

## Product Images

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/products/:id/images` | Get all images of a product | Public |
| GET | `/products/:id/images/360` | Get 360° view images | Public |
| GET | `/variants/:id/images` | Get images specific to a variant | Public |
| POST | `/admin/products/:id/images` | Upload images for a product | Admin |
| POST | `/admin/variants/:id/images` | Upload images for a variant | Admin |
| PUT | `/admin/images/:id` | Update image details (type, order) | Admin |
| DELETE | `/admin/images/:id` | Delete an image | Admin |

## Shopping Cart

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/cart` | Get current user's cart | Public (with session) |
| POST | `/cart` | Create a new cart (for guests) | Public |
| DELETE | `/cart` | Clear the cart | Public (with session) |
| GET | `/cart/items` | List items in the cart | Public (with session) |
| POST | `/cart/items` | Add item to cart | Public (with session) |
| PUT | `/cart/items/:id` | Update cart item (quantity) | Public (with session) |
| DELETE | `/cart/items/:id` | Remove item from cart | Public (with session) |
| POST | `/cart/merge` | Merge guest cart with user cart | User |

## Wishlist

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/wishlist` | Get wishlist items | Public (with session) |
| POST | `/wishlist` | Add item to wishlist | User |
| DELETE | `/wishlist/:id` | Remove item from wishlist | User |
| DELETE | `/wishlist` | Clear wishlist | User |
| POST | `/wishlist/guest` | Add item to guest wishlist | Public (with session) |
| DELETE | `/wishlist/guest/:id` | Remove item from guest wishlist | Public (with session) |
| POST | `/wishlist/migrate` | Migrate guest wishlist to user account | User |

## Discounts

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/discounts` | List active discounts | Public |
| GET | `/discounts/:id` | Get details of a discount | Public |
| POST | `/cart/apply-discount` | Apply discount code to cart | Public (with session) |
| POST | `/admin/discounts` | Create a new discount | Admin |
| PUT | `/admin/discounts/:id` | Update a discount | Admin |
| DELETE | `/admin/discounts/:id` | Delete a discount | Admin |
| POST | `/admin/discounts/:id/categories/:categoryId` | Apply discount to category | Admin |
| POST | `/admin/discounts/:id/products/:productId` | Apply discount to product | Admin |
| POST | `/admin/discounts/:id/variants/:variantId` | Apply discount to variant | Admin |
| DELETE | `/admin/discounts/:id/categories/:categoryId` | Remove discount from category | Admin |
| DELETE | `/admin/discounts/:id/products/:productId` | Remove discount from product | Admin |
| DELETE | `/admin/discounts/:id/variants/:variantId` | Remove discount from variant | Admin |

## Orders & Checkout

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/checkout` | Process checkout and create order | Public (with session) |
| POST | `/checkout/validate` | Validate checkout data | Public (with session) |
| GET | `/orders` | List user's orders | User |
| GET | `/orders/:id` | Get details of a specific order | User (own) / Admin (any) |
| PUT | `/orders/:id/cancel` | Cancel an order | User (own) / Admin (any) |
| GET | `/admin/orders` | List all orders with filtering | Admin |
| PUT | `/admin/orders/:id/status` | Update order status | Admin |
| GET | `/admin/orders/export` | Export orders to CSV | Admin |

## Payments

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/payments/create-intent` | Create payment intent (Stripe) | Public (with session) |
| POST | `/payments/create-paypal-order` | Create PayPal order | Public (with session) |
| POST | `/payments/confirm` | Confirm payment | Public (with session) |
| POST | `/webhooks/stripe` | Webhook for Stripe events | Stripe |
| POST | `/webhooks/paypal` | Webhook for PayPal events | PayPal |
| GET | `/admin/payments` | List all payments | Admin |
| PUT | `/admin/payments/:id/refund` | Process refund | Admin |

## Notifications

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/notifications/send-test` | Send test notification | Admin |
| GET | `/admin/notifications/templates` | List notification templates | Admin |
| PUT | `/admin/notifications/templates/:id` | Update notification template | Admin |
| POST | `/notifications/subscribe` | Subscribe to notifications | User |
| PUT | `/users/preferences/notifications` | Update notification preferences | User |

## User Account

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/users/me` | Get current user profile | User |
| PUT | `/users/me` | Update user profile | User |
| GET | `/users/addresses` | Get user's saved addresses | User |
| POST | `/users/addresses` | Add new address | User |
| PUT | `/users/addresses/:id` | Update an address | User |
| DELETE | `/users/addresses/:id` | Delete an address | User |
| GET | `/admin/users` | List all users with filtering and pagination | Admin |
| GET | `/admin/users/:id` | Get detailed user information | Admin |
| PUT | `/admin/users/:id/role` | Update user role | Admin |
| DELETE | `/admin/users/:id` | Delete a user (or deactivate) | Admin |

## System & Utilities

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/health` | System health check | Public |
| GET | `/settings/public` | Get public settings (currencies, countries) | Public |
| GET | `/admin/settings` | Get all system settings | Admin |
| PUT | `/admin/settings` | Update system settings | Admin |
| GET | `/admin/logs` | View system logs | Admin |
| POST | `/admin/cache/clear` | Clear system caches | Admin |

## Data Import/Export

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/admin/import/products` | Import products (CSV/JSON) | Admin |
| GET | `/admin/export/products` | Export products (CSV/JSON) | Admin |
| POST | `/admin/import/categories` | Import categories (CSV/JSON) | Admin |
| GET | `/admin/export/categories` | Export categories (CSV/JSON) | Admin |
| GET | `/admin/export/orders` | Export orders (CSV/JSON) | Admin |
| GET | `/admin/export/customers` | Export customer data (CSV/JSON) | Admin |

## Reports & Analytics

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/reports/sales` | Get sales reports | Admin |
| GET | `/admin/reports/inventory` | Get inventory reports | Admin |
| GET | `/admin/reports/customers` | Get customer reports | Admin |
| GET | `/admin/reports/products` | Get product performance reports | Admin |
| GET | `/admin/dashboard` | Get dashboard statistics | Admin |

## Implementation Notes

- All endpoints should support appropriate HTTP status codes
- Error responses should follow a consistent format
- Admin endpoints should be protected by role-based access control
- Public endpoints with session should validate session token or cookie
- All list endpoints should support pagination
- Search and filter endpoints should support sorting
- Consider implementing rate limiting for public endpoints
- Ensure idempotency for payment and order operations
- Use proper validation for all input data
- Consider adding versioning to the API (e.g., `/v1/products`)

This endpoint list provides a comprehensive foundation for the e-commerce backend. Additional endpoints may be needed depending on specific business requirements or as the application evolves. 