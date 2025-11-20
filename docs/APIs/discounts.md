# Discounts API Documentation

## Table of Contents

- [1. List All Discounts](#1-list-all-discounts)
- [2. Get Discount by ID](#2-get-discount-by-id)
- [3. Get Discount by Code](#3-get-discount-by-code)
- [4. Create Discount (Admin)](#4-create-discount-admin)
- [5. Update Discount (Admin)](#5-update-discount-admin)
- [6. Delete Discount (Admin)](#6-delete-discount-admin)
- [7. Apply Discount to Categories (Admin)](#7-apply-discount-to-categories-admin)
- [8. Apply Discount to Products (Admin)](#8-apply-discount-to-products-admin)
- [9. Apply Discount to Variants (Admin)](#9-apply-discount-to-variants-admin)
- [10. Validate Discount](#10-validate-discount)
- [11. Admin Tips for Effective Discount Management](#11-admin-tips-for-effective-discount-management)

## Overview

The Discounts API provides functionality for creating, managing, and applying discounts to products, categories, and variants. It supports both percentage and fixed amount discount types with various conditions like validity periods, usage limits, and minimum order amounts.

### 1. List All Discounts

Get a paginated list of all discounts with optional filtering.

#### Request

```
GET /discounts
```

##### Query Parameters

| Parameter  | Type    | Required | Default | Description                         |
|------------|---------|----------|---------|-------------------------------------|
| search     | String  | No       | -       | Search by name or code              |
| type       | String  | No       | -       | Filter by discount type (percent/fixed) |
| active     | Boolean | No       | -       | Filter by active status             |
| limit      | Number  | No       | 20      | Number of items per page            |
| offset     | Number  | No       | 0       | Number of items to skip             |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/discounts?search=summer&type=percent&active=true&limit=10&offset=0"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Summer Sale",
      "code": "SUMMER20",
      "type": "percent",
      "value": 20,
      "start_date": "2023-06-01",
      "end_date": "2023-08-31",
      "is_active": true,
      "min_order_amount": 50.00,
      "max_discount_amount": 100.00,
      "usage_limit": 1000,
      "usage_count": 45,
      "created_at": "2023-05-01T10:00:00Z",
      "updated_at": "2023-05-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

### 2. Get Discount by ID

Get detailed information about a specific discount by its ID.

#### Request

```
GET /discounts/{id}
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Discount UUID   |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/discounts/f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Summer Sale",
  "code": "SUMMER20",
  "type": "percent",
  "value": 20,
  "start_date": "2023-06-01",
  "end_date": "2023-08-31",
  "is_active": true,
  "min_order_amount": 50.00,
  "max_discount_amount": 100.00,
  "usage_limit": 1000,
  "usage_count": 45,
  "created_at": "2023-05-01T10:00:00Z",
  "updated_at": "2023-05-01T10:00:00Z",
  "categories": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d490",
    "f47ac10b-58cc-4372-a567-0e02b2c3d491"
  ],
  "products": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d492"
  ],
  "variants": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d493"
  ]
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Discount with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found",
  "error": "Not Found"
}
```

### 3. Get Discount by Code

Get discount information using a discount code.

#### Request

```
GET /discounts/code/{code}
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| code      | String | Yes      | Discount code   |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/discounts/code/SUMMER20"
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Summer Sale",
  "code": "SUMMER20",
  "type": "percent",
  "value": 20,
  "start_date": "2023-06-01",
  "end_date": "2023-08-31",
  "is_active": true,
  "min_order_amount": 50.00,
  "max_discount_amount": 100.00,
  "usage_limit": 1000,
  "usage_count": 45,
  "created_at": "2023-05-01T10:00:00Z",
  "updated_at": "2023-05-01T10:00:00Z",
  "categories": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d490",
    "f47ac10b-58cc-4372-a567-0e02b2c3d491"
  ],
  "products": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d492"
  ],
  "variants": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d493"
  ]
}
```

##### 200: OK (Code Not Found)

If the code is not found or not active, the endpoint returns null:

```json
null
```

### 4. Create Discount (Admin)

Create a new discount. Requires admin privileges.

#### Request

```
POST /discounts
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |
| Authorization   | Bearer {token}      | JWT access token  |

##### Request Body

| Field               | Type    | Required | Description                              |
|---------------------|---------|----------|------------------------------------------|
| name                | String  | Yes      | Name of the discount                     |
| code                | String  | No       | Unique code for the discount             |
| type                | String  | Yes      | Type of discount (percent/fixed)         |
| value               | Number  | Yes      | Value of the discount                    |
| start_date          | Date    | No       | Start date for the discount validity     |
| end_date            | Date    | No       | End date for the discount validity       |
| is_active           | Boolean | No       | Whether the discount is active (default: true) |
| min_order_amount    | Number  | No       | Minimum order amount for the discount    |
| max_discount_amount | Number  | No       | Maximum discount amount that can be applied |
| usage_limit         | Number  | No       | Maximum number of times discount can be used |

##### Example Request Body

```json
{
  "name": "Summer Sale",
  "code": "SUMMER20",
  "type": "percent",
  "value": 20,
  "start_date": "2023-06-01",
  "end_date": "2023-08-31",
  "is_active": true,
  "min_order_amount": 50.00,
  "max_discount_amount": 100.00,
  "usage_limit": 1000
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/discounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{access_token}}" \
  -d '{
    "name": "Summer Sale",
    "code": "SUMMER20",
    "type": "percent",
    "value": 20,
    "start_date": "2023-06-01",
    "end_date": "2023-08-31",
    "is_active": true,
    "min_order_amount": 50.00,
    "max_discount_amount": 100.00,
    "usage_limit": 1000
  }'
```

#### Response

##### 201: Created

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Summer Sale",
  "code": "SUMMER20",
  "type": "percent",
  "value": 20,
  "start_date": "2023-06-01",
  "end_date": "2023-08-31",
  "is_active": true,
  "min_order_amount": 50.00,
  "max_discount_amount": 100.00,
  "usage_limit": 1000,
  "usage_count": 0,
  "created_at": "2023-05-01T10:00:00Z",
  "updated_at": "2023-05-01T10:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "type must be one of the following values: percent, fixed",
    "value must be a positive number"
  ],
  "error": "Bad Request"
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied. Required role: admin. Your role: customer",
  "error": "Forbidden"
}
```

##### 409: Conflict

```json
{
  "statusCode": 409,
  "message": "Discount with code 'SUMMER20' already exists",
  "error": "Conflict"
}
```

### 5. Update Discount (Admin)

Update an existing discount. Requires admin privileges.

#### Request

```
PATCH /discounts/{id}
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Discount UUID   |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |
| Authorization   | Bearer {token}      | JWT access token  |

##### Request Body

All fields are optional. Only provided fields will be updated.

| Field               | Type    | Required | Description                              |
|---------------------|---------|----------|------------------------------------------|
| name                | String  | No       | Name of the discount                     |
| code                | String  | No       | Unique code for the discount             |
| type                | String  | No       | Type of discount (percent/fixed)         |
| value               | Number  | No       | Value of the discount                    |
| start_date          | Date    | No       | Start date for the discount validity     |
| end_date            | Date    | No       | End date for the discount validity       |
| is_active           | Boolean | No       | Whether the discount is active           |
| min_order_amount    | Number  | No       | Minimum order amount for the discount    |
| max_discount_amount | Number  | No       | Maximum discount amount that can be applied |
| usage_limit         | Number  | No       | Maximum number of times discount can be used |

##### Example Request Body

```json
{
  "is_active": false,
  "end_date": "2023-07-31"
}
```

##### Curl Example

```bash
curl -X PATCH "http://localhost:4000/discounts/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{access_token}}" \
  -d '{
    "is_active": false,
    "end_date": "2023-07-31"
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Summer Sale",
  "code": "SUMMER20",
  "type": "percent",
  "value": 20,
  "start_date": "2023-06-01",
  "end_date": "2023-07-31",
  "is_active": false,
  "min_order_amount": 50.00,
  "max_discount_amount": 100.00,
  "usage_limit": 1000,
  "usage_count": 45,
  "created_at": "2023-05-01T10:00:00Z",
  "updated_at": "2023-05-01T11:30:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "value must be a positive number"
  ],
  "error": "Bad Request"
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied. Required role: admin. Your role: customer",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Discount with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found",
  "error": "Not Found"
}
```

##### 409: Conflict

```json
{
  "statusCode": 409,
  "message": "Discount with code 'SUMMER20' already exists",
  "error": "Conflict"
}
```

### 6. Delete Discount (Admin)

Delete an existing discount. Requires admin privileges.

#### Request

```
DELETE /discounts/{id}
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Discount UUID   |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/discounts/f47ac10b-58cc-4372-a567-0e02b2c3d479" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 204: No Content

No response body is returned for a successful deletion.

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied. Required role: admin. Your role: customer",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Discount with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found",
  "error": "Not Found"
}
```

### 7. Apply Discount to Categories (Admin)

Apply a discount to one or more categories. Requires admin privileges.

#### Request

```
POST /discounts/{id}/apply-to-categories
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Discount UUID   |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |
| Authorization   | Bearer {token}      | JWT access token  |

##### Request Body

| Field        | Type       | Required | Description                        |
|--------------|------------|----------|------------------------------------|
| categoryIds  | UUID Array | Yes      | Array of category IDs              |

##### Example Request Body

```json
{
  "categoryIds": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d490",
    "f47ac10b-58cc-4372-a567-0e02b2c3d491"
  ]
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/discounts/f47ac10b-58cc-4372-a567-0e02b2c3d479/apply-to-categories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{access_token}}" \
  -d '{
    "categoryIds": [
      "f47ac10b-58cc-4372-a567-0e02b2c3d490",
      "f47ac10b-58cc-4372-a567-0e02b2c3d491"
    ]
  }'
```

#### Response

##### 204: No Content

No response body is returned for a successful operation.

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "categoryIds must be a non-empty array of category IDs",
  "error": "Bad Request"
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied. Required role: admin. Your role: customer",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Discount with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found",
  "error": "Not Found"
}
```

### 8. Apply Discount to Products (Admin)

Apply a discount to one or more products. Requires admin privileges.

#### Request

```
POST /discounts/{id}/apply-to-products
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Discount UUID   |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |
| Authorization   | Bearer {token}      | JWT access token  |

##### Request Body

| Field        | Type       | Required | Description                        |
|--------------|------------|----------|------------------------------------|
| productIds   | UUID Array | Yes      | Array of product IDs               |

##### Example Request Body

```json
{
  "productIds": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d492",
    "f47ac10b-58cc-4372-a567-0e02b2c3d493"
  ]
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/discounts/f47ac10b-58cc-4372-a567-0e02b2c3d479/apply-to-products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{access_token}}" \
  -d '{
    "productIds": [
      "f47ac10b-58cc-4372-a567-0e02b2c3d492",
      "f47ac10b-58cc-4372-a567-0e02b2c3d493"
    ]
  }'
```

#### Response

##### 204: No Content

No response body is returned for a successful operation.

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "productIds must be a non-empty array of product IDs",
  "error": "Bad Request"
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied. Required role: admin. Your role: customer",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Discount with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found",
  "error": "Not Found"
}
```

### 9. Apply Discount to Variants (Admin)

Apply a discount to one or more product variants. Requires admin privileges.

#### Request

```
POST /discounts/{id}/apply-to-variants
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Discount UUID   |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Content-Type    | application/json    | JSON content type |
| Authorization   | Bearer {token}      | JWT access token  |

##### Request Body

| Field        | Type       | Required | Description                        |
|--------------|------------|----------|------------------------------------|
| variantIds   | UUID Array | Yes      | Array of variant IDs               |

##### Example Request Body

```json
{
  "variantIds": [
    "f47ac10b-58cc-4372-a567-0e02b2c3d494",
    "f47ac10b-58cc-4372-a567-0e02b2c3d495"
  ]
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/discounts/f47ac10b-58cc-4372-a567-0e02b2c3d479/apply-to-variants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {{access_token}}" \
  -d '{
    "variantIds": [
      "f47ac10b-58cc-4372-a567-0e02b2c3d494",
      "f47ac10b-58cc-4372-a567-0e02b2c3d495"
    ]
  }'
```

#### Response

##### 204: No Content

No response body is returned for a successful operation.

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "variantIds must be a non-empty array of variant IDs",
  "error": "Bad Request"
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Access denied. Required role: admin. Your role: customer",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Discount with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found",
  "error": "Not Found"
}
```

### 10. Validate Discount

Validate if a discount is currently applicable.

#### Request

```
GET /discounts/{id}/validate
```

##### Path Parameters

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| id        | UUID   | Yes      | Discount UUID   |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/discounts/f47ac10b-58cc-4372-a567-0e02b2c3d479/validate"
```

#### Response

##### 200: OK (Valid)

```json
{
  "valid": true
}
```

##### 200: OK (Invalid)

```json
{
  "valid": false,
  "message": "Discount has expired"
}
```

Other possible reasons for invalidity include:
- "Discount is not active"
- "Discount has not started yet"
- "Discount usage limit reached"

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Discount with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found",
  "error": "Not Found"
}
```

### 11. Admin Tips for Effective Discount Management

The following tips are designed to help administrators effectively manage discounts in the Sofa Deal e-commerce platform.

#### Planning Effective Discount Strategies

- **Seasonal Campaigns**: Schedule discounts to align with major shopping seasons (Black Friday, Summer Sales, etc.) using the `start_date` and `end_date` parameters.
- **Tiered Discounts**: Create multiple discounts with different `min_order_amount` values to encourage larger purchases.
- **Limited-Use Promotions**: Set `usage_limit` for exclusive offers to create urgency.
- **New Customer Acquisition**: Create special one-time use codes for first-time buyers.

#### Technical Implementation Tips

- **Category-Based Discounts**: When applying discounts to categories, remember that they apply to all products within that category. This is more efficient than selecting individual products.
- **Discount Stacking Control**: Set a `max_discount_amount` to prevent excessive discounting when multiple promotions might apply.
- **Code Naming Conventions**: Use clear, memorable discount codes (e.g., "SUMMER20" for 20% off summer items) to improve usability.
- **Monitoring Usage**: Regularly check the `usage_count` to track promotion performance and popularity.

#### Troubleshooting Common Issues

- **Discount Not Applying**: Verify that dates, active status, and min/max conditions are correctly configured.
- **Multiple Discounts Conflict**: Remember that if multiple discounts apply to the same product, the system will use the most favorable one for the customer.
- **Performance Considerations**: Applying discounts to a large number of products or categories simultaneously might temporarily impact system performance.

#### Analytics and Optimization

- **Measure Conversion Impact**: Compare sales before, during, and after discount periods to assess effectiveness.
- **A/B Testing**: Create similar discounts with different parameters (e.g., 10% off vs. fixed £5 off) to see which performs better.
- **Targeted vs. Broad Discounts**: For clearance of specific inventory, use variant-level discounts rather than category-wide promotions.

#### Regulatory Compliance

- **Pricing Transparency**: Ensure discounted prices are clearly shown in accordance with consumer protection regulations.
- **Terms and Conditions**: Document any restrictions on discount usage, including time limitations and exclusions.
- **Tax Implications**: Remember that discounts may affect how taxes are calculated. 