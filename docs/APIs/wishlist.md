# Wishlist API Documentation

## Table of Contents

- [1. Get Wishlist Items](#1-get-wishlist-items)
- [2. Add to Wishlist](#2-add-to-wishlist)
- [3. Remove from Wishlist](#3-remove-from-wishlist)
- [4. Clear Wishlist](#4-clear-wishlist)

## Overview

The Wishlist API provides functionality for managing user wishlists for authenticated users only. The wishlist returns detailed variant and product information for each item, including images, pricing, and product details.

> **Note:** This API only works for authenticated users. Guest wishlist functionality should be handled by localStorage in the frontend.

### 1. Get Wishlist Items

Retrieve all items in the authenticated user's wishlist with detailed variant and product information.

#### Request

```
GET /wishlist
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/wishlist" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
    "created_at": "2023-05-10T14:23:45Z",
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
]
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 2. Add to Wishlist

Add an item to the authenticated user's wishlist.

#### Request

```
POST /wishlist
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| variant_id  | uuid    | Yes      | UUID of the product variant to add to wishlist |

##### Example Request Body

```json
{
  "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482"
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/wishlist" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482"
  }'
```

#### Response

##### 200: OK

**Item Added Successfully:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "user_id": "user-uuid-1234",
  "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
  "created_at": "2023-05-10T14:23:45Z",
  "message": "Item added to wishlist"
}
```

**Item Already Exists:**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "user_id": "user-uuid-1234",
  "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
  "created_at": "2023-05-10T14:20:00Z",
  "message": "Item already in wishlist"
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Variant not found",
  "error": "Not Found"
}
```

### 3. Remove from Wishlist

Remove an item from the authenticated user's wishlist.

#### Request

```
DELETE /wishlist/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | uuid    | Yes      | Wishlist item UUID |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/wishlist/f47ac10b-58cc-4372-a567-0e02b2c3d480" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "user_id": "user-uuid-1234",
  "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
  "created_at": "2023-05-10T14:23:45Z"
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Wishlist item not found",
  "error": "Not Found"
}
```

### 4. Clear Wishlist

Remove all items from the authenticated user's wishlist.

#### Request

```
DELETE /wishlist
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (required) |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/wishlist" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
    "user_id": "user-uuid-1234",
    "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
    "created_at": "2023-05-10T14:23:45Z"
  },
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d483",
    "user_id": "user-uuid-1234",
    "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d485",
    "created_at": "2023-05-10T16:30:22Z"
  }
]
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

## Data Structure Details

### Wishlist Item Structure

Each wishlist item now returns comprehensive information:

- **Basic wishlist item info**: `id`, `created_at`
- **Variant details**: Complete variant information including `sku`, `price`, `size`, `color`, `stock`, `tags`, `material`, `brand`, `featured` status
- **Product details**: Full product information including `name`, `description`, `base_price`
- **Category information**: Complete category details including `name`, `slug`, `description`, `image_url`, `featured` status
- **Images**: 
  - **Product images**: General product images (not variant-specific)
  - **Variant images**: Images specific to the selected variant
- **Metadata**: Creation and update timestamps for all entities

### Performance Considerations

The detailed wishlist response provides all necessary information for displaying wishlist items without requiring additional API calls to fetch product details. However, due to the comprehensive nature of the response:

- Response size is larger than the simple variant-only approach
- All joins are optimized with proper indexing
- Consider implementing response caching for frequently accessed wishlists
- Frontend should cache wishlist responses to minimize repeated requests 