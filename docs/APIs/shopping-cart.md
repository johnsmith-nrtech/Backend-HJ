# Shopping Cart API Documentation

## Table of Contents

- [5.1. Get Cart Items](#51-get-cart-items)
- [5.2. Add to Cart (Authenticated User)](#52-add-to-cart-authenticated-user)
- [5.3. Update Cart Item (Authenticated User)](#53-update-cart-item-authenticated-user)
- [5.4. Remove from Cart (Authenticated User)](#54-remove-from-cart-authenticated-user)
- [5.5. Clear Cart (Authenticated User)](#55-clear-cart-authenticated-user)
- [5.6. Add to Guest Cart](#56-add-to-guest-cart)
- [5.7. Update Guest Cart Item](#57-update-guest-cart-item)
- [5.8. Remove from Guest Cart](#58-remove-from-guest-cart)
- [5.9. Clear Guest Cart](#59-clear-guest-cart)
- [5.10. Migrate Guest Cart](#510-migrate-guest-cart)

## 5. Shopping Cart

The Shopping Cart API manages items that users intend to purchase. It supports both authenticated users and guest users via session cookies.

### 5.1. Get Cart Items

Retrieve all items in the user's shopping cart. Works for both authenticated and guest users.

#### Request

```
GET /cart
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token (optional) |

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
  "items": [
    {
      "id": 1,
      "product_id": 5,
      "variant_id": 12,
      "quantity": 2,
      "created_at": "2023-05-10T14:23:45Z",
      "products": {
        "id": 5,
        "name": "Velvet Corner Sofa",
        "description": "Luxurious velvet corner sofa with chaise lounge",
        "base_price": 1299.99,
        "images": [
          {
            "url": "https://example.com/images/velvet-sofa.jpg",
            "type": "main",
            "order": 1
          }
        ]
      },
      "variants": {
        "id": 12,
        "sku": "VCS-GRY-LRG",
        "price": 1499.99,
        "size": "Large",
        "color": "Grey",
        "stock": 8
      }
    }
  ],
  "total_items": 2,
  "subtotal": 2999.98,
  "estimated_tax": 239.99,
  "total": 3239.97
}
```

### 5.2. Add to Cart (Authenticated User)

Add an item to the authenticated user's shopping cart.

#### Request

```
POST /cart
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| product_id  | integer | Yes      | ID of the product to add to cart         |
| variant_id  | integer | Yes      | ID of the specific variant to add to cart |
| quantity    | integer | Yes      | Quantity of the item to add              |

##### Example Request Body

```json
{
  "product_id": 5,
  "variant_id": 12,
  "quantity": 1
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/cart" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 5,
    "variant_id": 12,
    "quantity": 1
  }'
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "user_id": "user-uuid-1234",
  "product_id": 5,
  "variant_id": 12,
  "quantity": 1,
  "created_at": "2023-05-10T14:23:45Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Insufficient stock for variant 12",
  "error": "Bad Request"
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
  "error": "Unauthorized"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product or variant not found",
  "error": "Not Found"
}
```

### 5.3. Update Cart Item (Authenticated User)

Update the quantity of an item in the authenticated user's shopping cart.

#### Request

```
PUT /cart/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | integer | Yes      | Cart item ID |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field    | Type    | Required | Description               |
|----------|---------|----------|---------------------------|
| quantity | integer | Yes      | New quantity for the item |

##### Example Request Body

```json
{
  "quantity": 3
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/cart/1" \
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
  "id": 1,
  "user_id": "user-uuid-1234",
  "product_id": 5,
  "variant_id": 12,
  "quantity": 3,
  "updated_at": "2023-05-10T14:30:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Insufficient stock for variant 12",
  "error": "Bad Request"
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
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

### 5.4. Remove from Cart (Authenticated User)

Remove an item from the authenticated user's shopping cart.

#### Request

```
DELETE /cart/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | integer | Yes      | Cart item ID |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/cart/1" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "user_id": "user-uuid-1234",
  "product_id": 5,
  "variant_id": 12,
  "quantity": 3,
  "updated_at": "2023-05-10T14:30:00Z"
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
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

### 5.5. Clear Cart (Authenticated User)

Remove all items from the authenticated user's shopping cart.

#### Request

```
DELETE /cart
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/cart" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "user_id": "user-uuid-1234",
    "product_id": 5,
    "variant_id": 12,
    "quantity": 3,
    "updated_at": "2023-05-10T14:30:00Z"
  },
  {
    "id": 2,
    "user_id": "user-uuid-1234",
    "product_id": 8,
    "variant_id": 15,
    "quantity": 1,
    "created_at": "2023-05-10T16:30:22Z"
  }
]
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
  "error": "Unauthorized"
}
```

### 5.6. Add to Guest Cart

Add an item to a guest user's shopping cart using cookie-based sessions.

#### Request

```
POST /cart/guest
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| product_id  | integer | Yes      | ID of the product to add to cart         |
| variant_id  | integer | Yes      | ID of the specific variant to add to cart |
| quantity    | integer | Yes      | Quantity of the item to add              |

##### Example Request Body

```json
{
  "product_id": 5,
  "variant_id": 12,
  "quantity": 1
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/cart/guest" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 5,
    "variant_id": 12,
    "quantity": 1
  }'
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "product_id": 5,
  "variant_id": 12,
  "quantity": 1,
  "created_at": "2023-05-10T14:23:45Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Insufficient stock for variant 12",
  "error": "Bad Request"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product or variant not found",
  "error": "Not Found"
}
```

### 5.7. Update Guest Cart Item

Update the quantity of an item in a guest user's shopping cart.

#### Request

```
PUT /cart/guest/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | integer | Yes      | Cart item ID |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field    | Type    | Required | Description               |
|----------|---------|----------|---------------------------|
| quantity | integer | Yes      | New quantity for the item |

##### Example Request Body

```json
{
  "quantity": 3
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/cart/guest/1" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "product_id": 5,
  "variant_id": 12,
  "quantity": 3,
  "updated_at": "2023-05-10T14:30:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Insufficient stock for variant 12",
  "error": "Bad Request"
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

### 5.8. Remove from Guest Cart

Remove an item from a guest user's shopping cart.

#### Request

```
DELETE /cart/guest/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | integer | Yes      | Cart item ID |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/cart/guest/1"
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "product_id": 5,
  "variant_id": 12,
  "quantity": 3,
  "updated_at": "2023-05-10T14:30:00Z"
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

### 5.9. Clear Guest Cart

Remove all items from a guest user's shopping cart.

#### Request

```
DELETE /cart/guest
```

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/cart/guest"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "product_id": 5,
    "variant_id": 12,
    "quantity": 3,
    "updated_at": "2023-05-10T14:30:00Z"
  },
  {
    "id": 2,
    "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "product_id": 8,
    "variant_id": 15,
    "quantity": 1,
    "created_at": "2023-05-10T16:30:22Z"
  }
]
```

### 5.10. Migrate Guest Cart

After a guest user signs in, migrate their shopping cart items to their authenticated account.

#### Request

```
POST /cart/migrate
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type    | Required | Description                      |
|-------------|---------|----------|----------------------------------|
| session_id  | string  | Yes      | Guest session ID to migrate from |

##### Example Request Body

```json
{
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/cart/migrate" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }'
```

#### Response

##### 200: OK

```json
{
  "migrated": 2,
  "items": [
    {
      "id": 3,
      "user_id": "user-uuid-1234",
      "product_id": 5,
      "variant_id": 12,
      "quantity": 1,
      "created_at": "2023-05-10T14:30:00Z"
    },
    {
      "id": 4,
      "user_id": "user-uuid-1234",
      "product_id": 8,
      "variant_id": 15,
      "quantity": 2,
      "created_at": "2023-05-10T14:30:00Z"
    }
  ]
}
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
  "error": "Unauthorized"
}
``` 