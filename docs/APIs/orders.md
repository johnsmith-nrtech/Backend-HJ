# Orders API Documentation

## Table of Contents

- [1. Process Checkout](#1-process-checkout)
- [2. Validate Checkout Data](#2-validate-checkout-data)
- [3. List User Orders](#3-list-user-orders)
- [4. Get Order Details](#4-get-order-details)
- [5. Cancel Order](#5-cancel-order)
- [6. List All Orders (Admin)](#6-list-all-orders-admin)
- [7. Update Order Status (Admin)](#7-update-order-status-admin)
- [7.5. Cancel Order with Reason (Admin)](#7-5-cancel-order-with-reason-admin)
- [8. Export Orders to CSV (Admin)](#8-export-orders-to-csv-admin)
- [9. Payment Gateway (Guest Checkout)](#9-payment-gateway-guest-checkout)
- [10. Order Status Workflow](#10-order-status-workflow)

## Overview

The Orders API provides functionality for processing checkouts, managing orders, and handling order-related administrative tasks. It supports both authenticated user orders and guest checkout processes with appropriate authorization controls.

For detailed payment integration information, please refer to the [Payment Integration Guide](./payment-integration.md).

### 1. Process Checkout

Process a checkout and create a new order. **Note:** This endpoint requires authentication and is primarily for internal use. For both authenticated and guest checkout flows that require immediate payment processing, use the [Payment Gateway endpoints](#9-payment-gateway-guest-checkout).

#### Request

```
POST /checkout
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |
| Authorization   | Bearer {token}      | JWT access token (optional) |

##### Request Body

| Field             | Type   | Required | Description                           |
|-------------------|--------|----------|---------------------------------------|
| shipping_address  | Object | Yes      | Shipping address details              |
| billing_address   | Object | Yes      | Billing address details               |
| items             | Array  | Yes      | Array of items to checkout            |
| payment_method_id | String | No       | Payment method identifier (e.g., Stripe token) |
| session_id        | String | No       | Session ID for guest checkout         |

##### Address Object

| Field           | Type   | Required | Description                         |
|-----------------|--------|----------|-------------------------------------|
| recipient_name  | String | Yes      | Recipient's full name               |
| line1           | String | Yes      | Address line 1                      |
| line2           | String | No       | Address line 2 (optional)           |
| city            | String | Yes      | City                                |
| state           | String | No       | State/Province/Region               |
| postal_code     | String | Yes      | Postal/ZIP code                     |
| country         | String | Yes      | Country code                        |
| phone           | String | No       | Phone number                        |

##### Item Object

| Field       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| variant_id  | UUID   | Yes      | UUID of the product variant        |
| quantity    | Number | Yes      | Quantity of the item               |

##### Example Request Body

```json
{
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "items": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1
    }
  ],
  "payment_method_id": "tok_visa"
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{access_token}}" \
  -d '{
    "shipping_address": {
      "recipient_name": "John Doe",
      "line1": "123 Main St",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "GB",
      "phone": "07123456789"
    },
    "billing_address": {
      "recipient_name": "John Doe",
      "line1": "123 Main St",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "GB",
      "phone": "07123456789"
    },
    "items": [
      {
        "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        "quantity": 1
      }
    ],
    "payment_method_id": "tok_visa"
  }'
```

#### Response

##### 201: Created

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "status": "pending",
  "total_amount": 199.99,
  "currency": "GBP",
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "created_at": "2023-05-10T14:23:45Z",
  "updated_at": "2023-05-10T14:23:45Z",
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1,
      "unit_price": 199.99,
      "discount_applied": 0,
      "created_at": "2023-05-10T14:23:45Z"
    }
  ]
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Insufficient stock for selected items",
  "error": "Bad Request"
}
```

### 2. Validate Checkout Data

Validate checkout data before processing a checkout.

#### Request

```
POST /checkout/validate
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field             | Type   | Required | Description                           |
|-------------------|--------|----------|---------------------------------------|
| shipping_address  | Object | No       | Shipping address details              |
| billing_address   | Object | No       | Billing address details               |
| items             | Array  | Yes      | Array of items to validate            |
| session_id        | String | No       | Session ID for guest validation       |

##### Example Request Body

```json
{
  "items": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1
    }
  ]
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/checkout/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        "quantity": 1
      }
    ]
  }'
```

#### Response

##### 200: OK

```json
{
  "isValid": true,
  "items": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1,
      "inStock": true,
      "currentPrice": 199.99
    }
  ],
  "total": 199.99,
  "currency": "GBP"
}
```

##### 400: Bad Request (Validation Failed)

```json
{
  "isValid": false,
  "errors": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "message": "Insufficient stock. Available: 0"
    }
  ]
}
```

### 3. List User Orders

List all orders for the authenticated user.

#### Request

```
GET /orders
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Query Parameters

| Parameter  | Type   | Required | Default | Description                                  |
|------------|--------|----------|---------|----------------------------------------------|
| page       | Number | No       | 1       | Page number for pagination                   |
| limit      | Number | No       | 10      | Number of items per page                     |
| sortBy     | String | No       | created_at | Field to sort by                         |
| sortOrder  | String | No       | desc    | Sort order (asc/desc)                       |
| status     | String | No       | -       | Filter by order status                       |
| date_from  | Date   | No       | -       | Filter orders created from date (YYYY-MM-DD) |
| date_to    | Date   | No       | -       | Filter orders created to date (YYYY-MM-DD)   |

##### Item payload shape

Each order includes `items`. Every item contains:
- image_url: single best image URL (variant image if available; otherwise first product image by lowest order)
- variant: id, product_id, sku, price, compare_price, size, color, discount_percentage, material, brand, product { id, name }
- unit_price: purchase price at order time (use this for display, not current variant price)

##### Curl Example

```bash
curl -X GET "http://localhost:4000/orders?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "status": "pending",
      "total_amount": 199.99,
      "currency": "GBP",
      "shipping_address": {
        "recipient_name": "John Doe",
        "line1": "123 Main St",
        "city": "London",
        "postal_code": "SW1A 1AA",
        "country": "GB",
        "phone": "07123456789"
      },
      "billing_address": {
        "recipient_name": "John Doe",
        "line1": "123 Main St",
        "city": "London",
        "postal_code": "SW1A 1AA",
        "country": "GB",
        "phone": "07123456789"
      },
      "created_at": "2023-05-10T14:23:45Z",
      "updated_at": "2023-05-10T14:23:45Z"
    }
  ],
  "meta": {
    "totalItems": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

### 4. Get Order Details

Get details of a specific order.

#### Request

```
GET /orders/{id}
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Order UUID      |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "status": "pending",
  "total_amount": 199.99,
  "currency": "GBP",
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "created_at": "2023-05-10T14:23:45Z",
  "updated_at": "2023-05-10T14:23:45Z",
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1,
      "unit_price": 199.99,
      "discount_applied": 0,
      "created_at": "2023-05-10T14:23:45Z",
      "image_url": "https://cdn.example.com/path/to/image.jpg",
      "variant": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        "product_id": "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        "sku": "VCS-GRY-LRG",
        "price": 199.99,
        "size": "Large",
        "color": "Grey",
        "product": { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d481", "name": "Product Name" }
      }
    }
  ]
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "You do not have permission to view this order",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Order with ID {id} not found",
  "error": "Not Found"
}
```

### 5. Cancel Order

Cancel an existing order.

#### Request

```
PUT /orders/{id}/cancel
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Order UUID      |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/orders/f47ac10b-58cc-4372-a567-0e02b2c3d479/cancel" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "status": "cancelled",
  "total_amount": 199.99,
  "currency": "GBP",
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "created_at": "2023-05-10T14:23:45Z",
  "updated_at": "2023-05-10T15:30:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Order in status 'shipped' cannot be cancelled",
  "error": "Bad Request"
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "You do not have permission to cancel this order",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Order with ID {id} not found",
  "error": "Not Found"
}
```

### 6. List All Orders (Admin)

Admin endpoint to list all orders with advanced filtering.

#### Request

```
GET /orders/admin
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Query Parameters

| Parameter  | Type   | Required | Default | Description                                  |
|------------|--------|----------|---------|----------------------------------------------|
| page       | Number | No       | 1       | Page number for pagination                   |
| limit      | Number | No       | 10      | Number of items per page                     |
| sortBy     | String | No       | created_at | Field to sort by                         |
| sortOrder  | String | No       | desc    | Sort order (asc/desc)                       |
| status     | String | No       | -       | Filter by order status                       |
| user_id    | UUID   | No       | -       | Filter by user ID                            |
| search     | String | No       | -       | Search term for order ID or customer details |
| date_from  | Date   | No       | -       | Filter orders created from date (YYYY-MM-DD) |
| date_to    | Date   | No       | -       | Filter orders created to date (YYYY-MM-DD)   |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/orders/admin?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "status": "pending",
      "total_amount": 199.99,
      "currency": "GBP",
      "shipping_address": {
        "recipient_name": "John Doe",
        "line1": "123 Main St",
        "city": "London",
        "postal_code": "SW1A 1AA",
        "country": "GB",
        "phone": "07123456789"
      },
      "billing_address": {
        "recipient_name": "John Doe",
        "line1": "123 Main St",
        "city": "London",
        "postal_code": "SW1A 1AA",
        "country": "GB",
        "phone": "07123456789"
      },
      "created_at": "2023-05-10T14:23:45Z",
      "updated_at": "2023-05-10T14:23:45Z"
    }
  ],
  "meta": {
    "totalItems": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied: requires admin role",
  "error": "Forbidden"
}
```

### 7. Update Order Status (Admin)

Admin endpoint to update the status of an order.

#### Request

```
PUT /orders/admin/{id}/status
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Order UUID      |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| status      | String | Yes      | New status for the order           |

##### Example Request Body

```json
{
  "status": "shipped"
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/orders/admin/f47ac10b-58cc-4372-a567-0e02b2c3d479/status" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "shipped"
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "status": "shipped",
  "total_amount": 199.99,
  "currency": "GBP",
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "created_at": "2023-05-10T14:23:45Z",
  "updated_at": "2023-05-10T15:30:00Z",
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1,
      "unit_price": 199.99,
      "discount_applied": 0,
      "created_at": "2023-05-10T14:23:45Z"
    }
  ]
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied: requires admin role",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Order with ID {id} not found",
  "error": "Not Found"
}
```

### 7.5. Cancel Order with Reason (Admin)

Admin endpoint to cancel an order with a specified reason.

#### Request

```
PUT /orders/admin/{id}/cancel
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Order UUID      |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type   | Required | Description                        |
|-------------|--------|----------|------------------------------------|
| reason      | String | Yes      | Reason for cancelling the order    |

##### Example Request Body

```json
{
  "reason": "Customer requested cancellation due to delayed shipment"
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/orders/admin/f47ac10b-58cc-4372-a567-0e02b2c3d479/cancel" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Customer requested cancellation due to delayed shipment"
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "status": "cancelled",
  "cancellation_reason": "Customer requested cancellation due to delayed shipment",
  "total_amount": 199.99,
  "currency": "GBP",
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "created_at": "2023-05-10T14:23:45Z",
  "updated_at": "2023-05-10T15:30:00Z",
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1,
      "unit_price": 199.99,
      "discount_applied": 0,
      "created_at": "2023-05-10T14:23:45Z"
    }
  ]
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Order in status 'shipped' cannot be cancelled",
  "error": "Bad Request"
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied: requires admin role",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Order with ID {id} not found",
  "error": "Not Found"
}
```

### 8. Export Orders to CSV (Admin)

Admin endpoint to export orders to CSV format.

#### Request

```
GET /orders/admin/export
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Query Parameters

| Parameter  | Type   | Required | Default | Description                                  |
|------------|--------|----------|---------|----------------------------------------------|
| status     | String | No       | -       | Filter by order status                       |
| user_id    | UUID   | No       | -       | Filter by user ID                            |
| date_from  | Date   | No       | -       | Filter orders created from date (YYYY-MM-DD) |
| date_to    | Date   | No       | -       | Filter orders created to date (YYYY-MM-DD)   |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/orders/admin/export?status=delivered&user_id=f47ac10b-58cc-4372-a567-0e02b2c3d480&date_from=2023-01-01&date_to=2023-12-31" \
  -H "Authorization: Bearer {{access_token}}" \
  --output orders-export.csv
```

#### Response

##### 200: OK

Response will be a CSV file with headers and order data:

```
order_id,user_id,status,total_amount,currency,created_at
f47ac10b-58cc-4372-a567-0e02b2c3d479,f47ac10b-58cc-4372-a567-0e02b2c3d480,pending,199.99,GBP,2023-05-10T14:23:45Z
...
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied: requires admin role",
  "error": "Forbidden"
}
```

### 9. Payment Gateway (Unified Checkout)

The payment gateway endpoints allow for processing orders with or without user authentication, making them suitable for both authenticated and guest checkout flows.

#### Create Payment

Create a payment and generate a payment form for Tyl payment gateway. This endpoint creates an order for both guests and logged-in users. When an Authorization header with a valid JWT token is provided, the order will be associated with the user's account.

##### Request

```
POST /orders/create-payment
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field                    | Type    | Required | Description                               |
|--------------------------|---------|----------|-------------------------------------------|
| contact_first_name       | String  | Yes      | Customer's first name                     |
| contact_last_name        | String  | Yes      | Customer's last name                      |
| contact_email            | String  | Yes      | Customer's email address                  |
| contact_phone            | String  | No       | Customer's phone number                   |
| shipping_address         | Object  | Yes      | Shipping address details                  |
| billing_address          | Object  | No       | Billing address details                   |
| use_different_billing_address | Boolean | Yes | Whether to use different billing address  |
| cart_items               | Array   | Yes      | Array of items to purchase                |
| order_notes              | String  | No       | Special instructions or notes             |

##### Shipping/Billing Address Object

| Field           | Type    | Required | Description                            |
|-----------------|---------|----------|----------------------------------------|
| street_address   | String  | Yes      | Street address                        |
| address_line_2  | String  | No       | Address line 2 (optional)              |
| city            | String  | Yes      | City name                              |
| state           | String  | No       | State/province (optional)              |
| postal_code     | String  | Yes      | Postal/ZIP code                        |
| country         | String  | Yes      | ISO 2-letter country code              |
| country_name    | String  | Yes      | Full country name                      |

##### Cart Item Object

| Field       | Type    | Required | Description                       |
|-------------|---------|----------|-----------------------------------|
| variant_id  | UUID    | Yes      | UUID of the product variant       |
| quantity    | Number  | Yes      | Quantity of the item              |

##### Example Request Body

```json
{
  "contact_first_name": "John",
  "contact_last_name": "Doe",
  "contact_email": "john.doe@example.com",
  "contact_phone": "+44 20 7123 4567",
  "shipping_address": {
    "street_address": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "use_different_billing_address": false,
  "cart_items": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1
    }
  ],
  "order_notes": "Please deliver after 6 PM"
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/orders/create-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "contact_email": "john.doe@example.com",
    "contact_phone": "+44 20 7123 4567",
    "shipping_address": {
      "street_address": "123 Main St",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "use_different_billing_address": false,
    "cart_items": [
      {
        "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        "quantity": 1
      }
    ],
    "order_notes": "Please deliver after 6 PM"
  }'
```

##### Response

###### 200: OK

```json
{
  "success": true,
  "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "total_amount": 199.99,
  "currency": "GBP",
  "payment_form": {
    "action_url": "https://payment-gateway.com/form",
    "method": "POST",
    "fields": {
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "amount": "199.99",
      "currency": "GBP"
    }
  }
}
```

###### 400: Bad Request

```json
{
  "success": false,
  "order_id": "",
  "total_amount": 0,
  "currency": "GBP",
  "payment_form": {
    "action_url": "",
    "method": "POST",
    "fields": {}
  },
  "error": "Insufficient stock for variant f47ac10b-58cc-4372-a567-0e02b2c3d482"
}
```

#### Payment Webhook

Handles payment webhook notifications from the payment gateway.

```
POST /orders/payment/webhook
```

#### Payment Success

Handles payment success redirects.

```
POST /orders/payment/success
```

#### Payment Failure

Handles payment failure redirects.

```
POST /orders/payment/failure
```

#### Create COD Order

Create a Cash on Delivery order (no online payment). Works for both guests and logged-in users.

##### Request

```
POST /orders/create-cod-order
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |

##### Request Body

Use the same body as Create Payment (above):

- contact_first_name, contact_last_name, contact_email, contact_phone?
- shipping_address (and optionally billing_address with use_different_billing_address)
- cart_items
- order_notes?

##### Example Request Body

```json
{
  "contact_first_name": "John",
  "contact_last_name": "Doe",
  "contact_email": "john.doe@example.com",
  "contact_phone": "+44 20 7123 4567",
  "shipping_address": {
    "street_address": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "use_different_billing_address": false,
  "cart_items": [
    { "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482", "quantity": 1 }
  ],
  "order_notes": "Please deliver after 6 PM"
}
```

##### Response

###### 200: OK

```json
{
  "success": true,
  "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "total_amount": 199.99,
  "currency": "GBP",
  "message": "COD order created successfully"
}
```

###### 400: Bad Request

```json
{
  "success": false,
  "order_id": "",
  "total_amount": 0,
  "currency": "GBP",
  "message": "Failed to create COD order",
  "error": "Insufficient stock for variant f47ac10b-58cc-4372-a567-0e02b2c3d482"
}
```

### 10. Order Status Workflow

Orders in the system follow a specific workflow with controlled transitions between statuses. The backend enforces these transitions to maintain data integrity and ensure a proper order fulfillment process.

#### Available Order Statuses

| Status      | Description                                            |
|-------------|--------------------------------------------------------|
| `pending`   | Initial status when an order is created                |
| `paid`      | Order has been paid for but not yet shipped            |
| `shipped`   | Order has been dispatched/shipped to the customer      |
| `delivered` | Order has been delivered to the customer               |
| `cancelled` | Order has been cancelled (by customer or admin)        |

#### Allowed Status Transitions

The system enforces the following status transitions:

- From `pending`: Can transition to → `paid` or `cancelled`
- From `pending` (COD orders only): Can transition to → `shipped`
- From `paid`: Can transition to → `shipped` or `cancelled`
- From `shipped`: Can transition to → `delivered` or `cancelled`
- From `delivered`: Can only transition to → `cancelled`
- From `cancelled`: Cannot transition to any other status

#### Status Transition Errors

Attempting to make a disallowed status transition will result in a `400 Bad Request` error. For example:

```json
{
  "statusCode": 400,
  "message": "Cannot transition order from status 'pending' to 'shipped'",
  "error": "Bad Request",
  "details": null,
  "timestamp": "2025-05-14T17:02:20.756Z",
  "path": "/admin/orders/{id}/status"
}
```

#### Order Status Flow Diagram

```
pending → paid → shipped → delivered
  ↘        ↓       ↓         ↓
   shipped (COD)
  ↓
  cancelled
```

Note: COD orders do not create an online payment form. They create a `payments` record with provider `cod` and status `pending`. Admins can mark them as `shipped` directly from `pending`.

All orders start as `pending` and must follow this progression. Orders can be cancelled at any stage before delivery. Once cancelled, an order cannot transition to any other status.