# Cart API Documentation

## Table of Contents

- [1. Get Cart Items](#1-get-cart-items)
- [2. Add to Cart](#2-add-to-cart)
- [3. Update Cart Item](#3-update-cart-item)
- [4. Remove from Cart](#4-remove-from-cart)
- [5. Remove Multiple Items from Cart](#5-remove-multiple-items-from-cart)
- [6. Clear Cart](#6-clear-cart)

## Overview

The Cart API provides functionality for managing shopping carts for authenticated users only. The cart returns detailed variant and product information for each item, including images, pricing, and product details.

> **Note:** This API only works for authenticated users. Guest cart functionality should be handled by localStorage in the frontend.

### 1. Get Cart Items

Retrieve all items in the authenticated user's cart with detailed variant and product information.

#### Request

```
GET /cart
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/cart" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "user-uuid-1234",
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "quantity": 2,
      "created_at": "2023-05-10T14:23:45Z",
      "updated_at": "2023-05-10T14:23:45Z",
      "variant": {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        "product_id": "f47ac10b-58cc-4372-a567-0e02b2c3d481",
        "sku": "SOFA-001-RED-L",
        "price": 899.99,
        "size": "Large",
        "color": "Red",
        "stock": 10,
        "tags": "luxury,comfortable,premium",
        "material": "Premium Fabric",
        "brand": "SofaDeal",
        "featured": true,
        "created_at": "2023-05-10T14:20:00Z",
        "updated_at": "2023-05-10T14:20:00Z",
        "product": {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d481",
          "name": "Modern Living Room Sofa",
          "description": "Comfortable modern sofa for your living room",
          "category_id": "f47ac10b-58cc-4372-a567-0e02b2c3d485",
          "base_price": 799.99,
          "tags": "modern,comfortable,living room",
          "material": "Premium Fabric",
          "brand": "SofaDeal",
          "featured": true,
          "created_at": "2023-05-10T14:15:00Z",
          "updated_at": "2023-05-10T14:15:00Z",
          "category": {
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d485",
            "name": "Living Room",
            "slug": "living-room",
            "parent_id": null,
            "description": "Furniture for your living room",
            "order": 1,
            "image_url": "https://example.com/categories/living-room.jpg",
            "featured": true,
            "created_at": "2023-05-10T14:00:00Z",
            "updated_at": "2023-05-10T14:00:00Z"
          },
          "images": [
            {
              "id": "f47ac10b-58cc-4372-a567-0e02b2c3d486",
              "url": "https://example.com/images/sofa-main.jpg",
              "type": "main",
              "order": 1,
              "created_at": "2023-05-10T14:15:00Z",
              "updated_at": "2023-05-10T14:15:00Z"
            },
            {
              "id": "f47ac10b-58cc-4372-a567-0e02b2c3d487",
              "url": "https://example.com/images/sofa-gallery-1.jpg",
              "type": "gallery",
              "order": 2,
              "created_at": "2023-05-10T14:15:00Z",
              "updated_at": "2023-05-10T14:15:00Z"
            }
          ]
        },
        "variant_images": [
          {
            "id": "f47ac10b-58cc-4372-a567-0e02b2c3d488",
            "url": "https://example.com/images/sofa-red-large.jpg",
            "type": "main",
            "order": 1,
            "created_at": "2023-05-10T14:20:00Z",
            "updated_at": "2023-05-10T14:20:00Z"
          }
        ]
      }
    }
  ],
  "created_at": "2023-05-10T14:20:00Z",
  "updated_at": "2023-05-10T14:23:45Z"
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

### 2. Add to Cart

Add an item to the authenticated user's cart.

#### Request

```
POST /cart
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type   | Required | Description                           |
|-------------|--------|----------|---------------------------------------|
| variant_id  | UUID   | Yes      | UUID of the variant to add to cart    |
| quantity    | number | Yes      | Quantity of the item to add (min: 1)  |

##### Example Request Body

```json
{
  "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
  "quantity": 2
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/cart" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
    "quantity": 2
  }'
```

#### Response

##### 200: OK

```json
{
  "success": true,
  "message": "Item added to cart",
  "item": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
    "cart_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
    "quantity": 2,
    "created_at": "2023-05-10T14:23:45Z",
    "updated_at": "2023-05-10T14:23:45Z"
  }
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Not enough stock available. Available: 8",
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

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product variant not found",
  "error": "Not Found"
}
```

### 3. Update Cart Item

Update the quantity of an item in the authenticated user's cart.

#### Request

```
PUT /cart/{id}
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Cart item UUID  |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type   | Required | Description                                   |
|-------------|--------|----------|-----------------------------------------------|
| quantity    | number | Yes      | New quantity for the item (min: 1)            |

##### Example Request Body

```json
{
  "quantity": 3
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/cart/f47ac10b-58cc-4372-a567-0e02b2c3d480" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

#### Response

##### 200: OK

```json
{
  "success": true,
  "message": "Cart item updated",
  "item": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
    "cart_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
    "quantity": 3,
    "created_at": "2023-05-10T14:23:45Z",
    "updated_at": "2023-05-10T14:30:00Z"
  }
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Requested quantity (10) exceeds available stock (8)",
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

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Cart item not found",
  "error": "Not Found"
}
```

### 4. Remove from Cart

Remove an item from the authenticated user's cart.

#### Request

```
DELETE /cart/{id}
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Cart item UUID  |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/cart/f47ac10b-58cc-4372-a567-0e02b2c3d480" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "success": true,
  "message": "Item removed from cart"
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

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Cart item not found",
  "error": "Not Found"
}
```

### 5. Remove Multiple Items from Cart

Remove multiple items from the authenticated user's cart by their IDs.

#### Request

```
DELETE /cart/items
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type   | Required | Description     |
|-------------|--------|----------|-----------------|
| item_ids    | array  | Yes      | Array of cart item IDs to remove |

##### Example Request Body

```json
{
  "item_ids": ["f47ac10b-58cc-4372-a567-0e02b2c3d480", "f47ac10b-58cc-4372-a567-0e02b2c3d481"]
}
```

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/cart/items" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "item_ids": ["f47ac10b-58cc-4372-a567-0e02b2c3d480", "f47ac10b-58cc-4372-a567-0e02b2c3d481"]
  }'
```

#### Response

##### 200: OK

```json
{
  "success": true,
  "message": "Successfully removed 2 items from cart",
  "deleted_items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "cart_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 2,
      "created_at": "2023-05-10T14:23:45Z"
    },
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d481",
      "cart_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d483",
      "quantity": 1,
      "created_at": "2023-05-10T14:25:30Z"
    }
  ]
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "At least one item ID must be provided",
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

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Cart items not found: f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "error": "Not Found"
}
```

### 6. Clear Cart

Remove all items from the authenticated user's cart.

#### Request

```
DELETE /cart
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/cart" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "success": true,
  "message": "Cart cleared successfully"
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

## Data Structure Details

### Cart Item Structure

Each cart item now returns comprehensive information:

- **Basic cart item info**: `id`, `quantity`, timestamps
- **Variant details**: Complete variant information including `sku`, `price`, `size`, `color`, `stock`, `tags`, `material`, `brand`, `featured` status
- **Product details**: Full product information including `name`, `description`, `base_price`, product-level `tags`, `material`, `brand`, `featured` status
- **Category information**: Complete category details including `name`, `slug`, `description`, `image_url`, `featured` status
- **Images**: 
  - **Product images**: General product images (not variant-specific)
  - **Variant images**: Images specific to the selected variant
- **Metadata**: Creation and update timestamps for all entities

### Performance Considerations

The detailed cart response provides all necessary information for displaying cart items without requiring additional API calls to fetch product details. However, due to the comprehensive nature of the response:

- Response size is larger than the simple variant-only approach
- All joins are optimized with proper indexing
- Consider implementing response caching for frequently accessed carts
- Frontend should cache cart responses to minimize repeated requests 