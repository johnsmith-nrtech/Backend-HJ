# Categories API Documentation

> **Important Note:** All category IDs are UUIDs, not integers. This is reflected in the examples below.

## Table of Contents

- [2.1. Get All Categories](#21-get-all-categories)
- [2.2. Get Category by ID](#22-get-category-by-id)
- [2.3. Get Subcategories](#23-get-subcategories)
- [2.4. Get Category Products](#24-get-category-products)
- [2.5. Create Category](#25-create-category)
- [2.6. Create Category Hierarchy](#26-create-category-hierarchy)
- [2.7. Update Category](#27-update-category)
- [2.8. Delete Category](#28-delete-category)
- [2.9. Update Category Order](#29-update-category-order)
- [2.10. Get Popular Categories](#210-get-popular-categories)
- [2.11. Get Featured Categories](#211-get-featured-categories)
- [2.12. Category Image Management](#212-category-image-management)
  - [Upload Category Image](#upload-category-image)
  - [Remove Category Image](#remove-category-image)
  - [Image Management & Storage Cleanup](#image-management--storage-cleanup)
  - [Clean Up Orphaned Images](#clean-up-orphaned-images)
  - [Example: Replacing a Category Image](#example-replacing-a-category-image)
  - [Example: Replacing Supabase Image with External URL](#example-replacing-supabase-image-with-external-url)
  - [Smart Detection Logic](#smart-detection-logic)
- [2.13. Featured Status Management](#213-featured-status-management)
- [2.14. Using Image and Featured Fields in Create/Update](#214-using-image-and-featured-fields-in-createupdate)
- [2.15. Frontend Guide: Working with Categories](#215-frontend-guide-working-with-categories)

## 2. Categories

The Categories API allows management of product categories in the Sofa Deal E-Commerce platform. Categories can be organized in a hierarchical structure with parent-child relationships.

### 2.1. Get All Categories

Retrieve a list of all categories with optional nesting of subcategories.

#### Request

```
GET /categories
```

##### Query Parameters

| Parameter | Type    | Required | Description                                           |
|-----------|---------|----------|-------------------------------------------------------|
| nested    | boolean | No       | Whether to include nested subcategories in the response |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/categories?nested=true" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Living Room Furniture",
    "slug": "living-room-furniture",
    "parent_id": null,
    "description": "Comfortable and stylish furniture for your living room",
    "order": 1,
    "image_url": "https://example.com/images/living-room-furniture.jpg",
    "featured": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "subcategories": [
      {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "name": "Sofas",
        "slug": "sofas",
        "parent_id": "123e4567-e89b-12d3-a456-426614174000",
        "description": "High-quality sofas for your home",
        "order": 1,
        "image_url": "https://example.com/images/sofas.jpg",
        "featured": false,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z",
        "subcategories": []
      }
    ]
  }
]
```

### 2.2. Get Category by ID

Retrieve details of a specific category by ID.

#### Request

```
GET /categories/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Category ID |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/categories/123e4567-e89b-12d3-a456-426614174000" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Living Room Furniture",
  "slug": "living-room-furniture",
  "parent_id": null,
  "description": "Comfortable and stylish furniture for your living room",
  "order": 1,
  "image_url": "https://example.com/images/living-room-furniture.jpg",
  "featured": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Category with ID 123e4567-e89b-12d3-a456-426614174000 not found",
  "error": "Not Found"
}
```

### 2.3. Get Subcategories

Retrieve all subcategories of a specific category.

#### Request

```
GET /categories/{id}/subcategories
```

##### Path Parameters

| Parameter | Type    | Required | Description      |
|-----------|---------|----------|------------------|
| id        | UUID    | Yes      | Parent category ID |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/categories/123e4567-e89b-12d3-a456-426614174000/subcategories" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "Sofas",
    "slug": "sofas",
    "parent_id": "123e4567-e89b-12d3-a456-426614174000",
    "description": "High-quality sofas for your home",
    "order": 1,
    "image_url": "https://example.com/images/sofas.jpg",
    "featured": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "323e4567-e89b-12d3-a456-426614174002",
    "name": "Coffee Tables",
    "slug": "coffee-tables",
    "parent_id": "123e4567-e89b-12d3-a456-426614174000",
    "description": "Stylish coffee tables for your living room",
    "order": 2,
    "image_url": "https://example.com/images/coffee-tables.jpg",
    "featured": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Category with ID 123e4567-e89b-12d3-a456-426614174000 not found",
  "error": "Not Found"
}
```

### 2.4. Get Category Products

Retrieve all products belonging to a specific category.

#### Request

```
GET /categories/{id}/products
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Category ID |

##### Query Parameters

| Parameter | Type    | Required | Description            | Default |
|-----------|---------|----------|------------------------|---------|
| page      | integer | No       | Page number            | 1       |
| limit     | integer | No       | Items per page         | 10      |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/categories/123e4567-e89b-12d3-a456-426614174000/products?page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174555",
      "name": "Modern Living Room Sofa",
      "price": 799.99,
      "description": "Comfortable modern sofa for your living room",
      "images": ["https://example.com/images/sofa1.jpg"],
      "category_id": "123e4567-e89b-12d3-a456-426614174000"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Category with ID 123e4567-e89b-12d3-a456-426614174000 not found",
  "error": "Not Found"
}
```

### 2.5. Create Category

Create a new product category. Requires admin role.

#### Request

```
POST /categories/admin
```

##### Authentication

| Auth Type | Required Roles |
|-----------|---------------|
| Bearer    | admin         |

##### Request Body

| Field       | Type    | Required | Description                                       |
|-------------|---------|----------|---------------------------------------------------|
| name        | string  | Yes      | Name of the category                              |
| slug        | string  | No       | URL-friendly identifier (auto-generated if not provided) |
| parent_id   | UUID    | No       | Parent category ID for hierarchical structure     |
| description | string  | No       | Description of the category                       |
| order       | integer | No       | Display order for sorting categories              |
| image_url   | string  | No       | Image URL for the category                        |
| featured    | boolean | No       | Whether this category is featured (defaults to false) |

##### Example Request Body

```json
{
  "name": "Bedroom Furniture",
  "slug": "bedroom-furniture",
  "parent_id": null,
  "description": "Elegant furniture for your bedroom",
  "order": 2,
  "image_url": "https://example.com/images/bedroom-furniture.jpg",
  "featured": true
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/categories/admin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "name": "Bedroom Furniture",
    "slug": "bedroom-furniture",
    "parent_id": null,
    "description": "Elegant furniture for your bedroom",
    "order": 2,
    "image_url": "https://example.com/images/bedroom-furniture.jpg",
    "featured": true
  }'
```

#### Response

##### 201: Created

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174004",
  "name": "Bedroom Furniture",
  "slug": "bedroom-furniture",
  "parent_id": null,
  "description": "Elegant furniture for your bedroom",
  "order": 2,
  "image_url": "https://example.com/images/bedroom-furniture.jpg",
  "featured": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["name must be a string", "name should not be empty"],
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden - User does not have admin role",
  "error": "Forbidden"
}
```

### 2.6. Create Category Hierarchy

Create a complete category hierarchy with up to 4 levels of nesting in a single operation. Requires admin role.

#### Request

```
POST /categories/admin/hierarchy
```

##### Authentication

| Auth Type | Required Roles |
|-----------|---------------|
| Bearer    | admin         |

##### Request Body

The request body follows a hierarchical structure with up to 4 levels of nesting:

| Level | Description |
|-------|-------------|
| Level 1 | Top-level category (e.g., "Sofa Beds") |
| Level 2 | Configuration/Type (e.g., "Corner Sofa Beds") |
| Level 3 | Material/Upholstery (e.g., "Fabric") |
| Level 4 | Features & Availability (e.g., "With Storage > In Stock") |

Each level in the hierarchy has the following structure:

| Field       | Type    | Required | Description                                       |
|-------------|---------|----------|---------------------------------------------------|
| name        | string  | Yes      | Name of the category                              |
| slug        | string  | No       | URL-friendly identifier (auto-generated if not provided) |
| description | string  | No       | Description of the category                       |
| order       | integer | No       | Display order for sorting categories              |
| image_url   | string  | No       | Image URL for the category                        |
| featured    | boolean | No       | Whether this category is featured (defaults to false) |
| subcategories | array  | No       | Array of child categories for the next level     |

##### Example Request Body

```json
{
  "name": "Sofa Beds",
  "slug": "sofa-beds",
  "description": "Comfortable and stylish convertible sofas that transform into beds",
  "order": 1,
  "image_url": "https://example.com/images/sofa-beds.jpg",
  "featured": true,
  "subcategories": [
    {
      "name": "Corner Sofa Beds",
      "slug": "corner-sofa-beds",
      "description": "L-shaped sofa beds perfect for maximizing seating and sleeping space",
      "order": 1,
      "image_url": "https://example.com/images/corner-sofa-beds.jpg",
      "featured": false,
      "subcategories": [
        {
          "name": "Fabric Sofas",
          "slug": "corner-fabric-sofa-beds",
          "description": "Corner sofa beds upholstered in premium fabrics",
          "order": 1,
          "image_url": "https://example.com/images/fabric-sofas.jpg",
          "featured": false,
          "subcategories": [
            {
              "name": "With Storage > In Stock",
              "slug": "corner-fabric-sofa-beds-with-storage-in-stock",
              "description": "Corner fabric sofa beds with built-in storage, available for immediate delivery",
              "order": 1,
              "image_url": "https://example.com/images/sofa-with-storage.jpg",
              "featured": false
            }
          ]
        }
      ]
    }
  ]
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/categories/admin/hierarchy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "name": "Sofa Beds",
    "slug": "sofa-beds",
    "description": "Comfortable and stylish convertible sofas that transform into beds",
    "order": 1,
    "image_url": "https://example.com/images/sofa-beds.jpg",
    "featured": true,
    "subcategories": [
      {
        "name": "Corner Sofa Beds",
        "slug": "corner-sofa-beds",
        "description": "L-shaped sofa beds perfect for maximizing seating and sleeping space",
        "order": 1,
        "image_url": "https://example.com/images/corner-sofa-beds.jpg",
        "featured": false,
        "subcategories": [
          {
            "name": "Fabric Sofas",
            "slug": "corner-fabric-sofa-beds",
            "description": "Corner sofa beds upholstered in premium fabrics",
            "order": 1,
            "image_url": "https://example.com/images/fabric-sofas.jpg",
            "featured": false,
            "subcategories": [
              {
                "name": "With Storage > In Stock",
                "slug": "corner-fabric-sofa-beds-with-storage-in-stock",
                "description": "Corner fabric sofa beds with built-in storage, available for immediate delivery",
                "order": 1,
                "image_url": "https://example.com/images/sofa-with-storage.jpg",
                "featured": false
              }
            ]
          }
        ]
      }
    ]
  }'
```

#### Response

##### 201: Created

A successful response returns the created category hierarchy with generated database IDs for all categories:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Sofa Beds",
  "slug": "sofa-beds",
  "parent_id": null,
  "description": "Comfortable and stylish convertible sofas that transform into beds",
  "order": 1,
  "image_url": "https://example.com/images/sofa-beds.jpg",
  "featured": true,
  "created_at": "2023-05-15T12:00:00Z",
  "updated_at": "2023-05-15T12:00:00Z",
  "subcategories": [
    {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "name": "Corner Sofa Beds",
      "slug": "corner-sofa-beds",
      "parent_id": "123e4567-e89b-12d3-a456-426614174000",
      "description": "L-shaped sofa beds perfect for maximizing seating and sleeping space",
      "order": 1,
      "image_url": "https://example.com/images/corner-sofa-beds.jpg",
      "featured": false,
      "created_at": "2023-05-15T12:00:00Z",
      "updated_at": "2023-05-15T12:00:00Z",
      "subcategories": [
        {
          "id": "323e4567-e89b-12d3-a456-426614174002",
          "name": "Fabric Sofas",
          "slug": "corner-fabric-sofa-beds",
          "parent_id": "223e4567-e89b-12d3-a456-426614174001",
          "description": "Corner sofa beds upholstered in premium fabrics",
          "order": 1,
          "image_url": "https://example.com/images/fabric-sofas.jpg",
          "featured": false,
          "created_at": "2023-05-15T12:00:00Z",
          "updated_at": "2023-05-15T12:00:00Z",
          "subcategories": [
            {
              "id": "423e4567-e89b-12d3-a456-426614174003",
              "name": "With Storage > In Stock",
              "slug": "corner-fabric-sofa-beds-with-storage-in-stock",
              "parent_id": "323e4567-e89b-12d3-a456-426614174002",
              "description": "Corner fabric sofa beds with built-in storage, available for immediate delivery",
              "order": 1,
              "image_url": "https://example.com/images/sofa-with-storage.jpg",
              "featured": false,
              "created_at": "2023-05-15T12:00:00Z",
              "updated_at": "2023-05-15T12:00:00Z",
              "subcategories": []
            }
          ]
        }
      ]
    }
  ]
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["name must be a string", "name should not be empty"],
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden - User does not have admin role",
  "error": "Forbidden"
}
```

### 2.7. Update Category

Update an existing product category. Requires admin role.

#### Request

```
PUT /categories/admin/:id
```

##### Authentication

| Auth Type | Required Roles |
|-----------|---------------|
| Bearer    | admin         |

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Category ID |

##### Request Body

| Field       | Type    | Required | Description                                   |
|-------------|---------|----------|-----------------------------------------------|
| name        | string  | No       | Name of the category                          |
| slug        | string  | No       | URL-friendly identifier                       |
| parent_id   | UUID    | No       | Parent category ID for hierarchical structure |
| description | string  | No       | Description of the category                   |
| order       | integer | No       | Display order for sorting categories          |
| image_url   | string  | No       | Image URL for the category                    |
| featured    | boolean | No       | Whether this category is featured             |

##### Example Request Body

```json
{
  "name": "Updated Bedroom Furniture",
  "description": "Updated description for bedroom furniture",
  "image_url": "https://example.com/images/updated-bedroom-furniture.jpg",
  "featured": false
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/categories/admin/423e4567-e89b-12d3-a456-426614174004" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "name": "Updated Bedroom Furniture",
    "description": "Updated description for bedroom furniture",
    "image_url": "https://example.com/images/updated-bedroom-furniture.jpg",
    "featured": false
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174004",
  "name": "Updated Bedroom Furniture",
  "slug": "bedroom-furniture",
  "parent_id": null,
  "description": "Updated description for bedroom furniture",
  "order": 2,
  "image_url": "https://example.com/images/updated-bedroom-furniture.jpg",
  "featured": false,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["name must be a string"],
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden - User does not have admin role",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Category with ID 423e4567-e89b-12d3-a456-426614174004 not found",
  "error": "Not Found"
}
```

### 2.8. Delete Category

Delete an existing product category. Requires admin role.

#### Request

```
DELETE /categories/admin/:id
```

##### Authentication

| Auth Type | Required Roles |
|-----------|---------------|
| Bearer    | admin         |

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Category ID |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/categories/admin/423e4567-e89b-12d3-a456-426614174004" \
  -H "Authorization: Bearer {your_access_token}"
```

#### Response

##### 200: OK

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174004",
  "name": "Updated Bedroom Furniture",
  "slug": "bedroom-furniture",
  "parent_id": null,
  "description": "Updated description for bedroom furniture",
  "order": 2,
  "image_url": "https://example.com/images/updated-bedroom-furniture.jpg",
  "featured": false,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden - User does not have admin role",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Category with ID 423e4567-e89b-12d3-a456-426614174004 not found",
  "error": "Not Found"
}
```

### 2.9. Update Category Order

Change the display order of a category. Requires admin role.

#### Request

```
PUT /categories/admin/:id/order
```

##### Authentication

| Auth Type | Required Roles |
|-----------|---------------|
| Bearer    | admin         |

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Category ID |

##### Request Body

| Field | Type    | Required | Description                |
|-------|---------|----------|----------------------------|
| order | integer | Yes      | New display order position |

##### Example Request Body

```json
{
  "order": 3
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/categories/admin/423e4567-e89b-12d3-a456-426614174004/order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "order": 3
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "423e4567-e89b-12d3-a456-426614174004",
  "name": "Updated Bedroom Furniture",
  "slug": "bedroom-furniture",
  "parent_id": null,
  "description": "Updated description for bedroom furniture",
  "order": 3,
  "image_url": "https://example.com/images/updated-bedroom-furniture.jpg",
  "featured": false,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["order must be a number", "order must not be less than 0"],
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

##### 403: Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden - User does not have admin role",
  "error": "Forbidden"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Category with ID 423e4567-e89b-12d3-a456-426614174004 not found",
  "error": "Not Found"
}
```

### 2.10. Get Popular Categories

Retrieve a list of popular categories for showcase display on the homepage.

#### Request

```
GET /categories/popular
```

##### Query Parameters

| Parameter     | Type    | Required | Description                                | Default |
|---------------|---------|----------|--------------------------------------------|---------|
| limit         | integer | No       | Maximum number of categories to return     | 4       |
| includeImages | boolean | No       | Whether to include product images          | true    |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/categories/popular?limit=4&includeImages=true" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174111",
    "name": "Divan Beds",
    "slug": "divan-beds",
    "parent_id": null,
    "description": "Comfortable divan beds for your bedroom",
    "order": 1,
    "image_url": "https://example.com/images/divan-bed.jpg",
    "featured": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174112",
    "name": "Ottoman Beds",
    "slug": "ottoman-beds",
    "parent_id": null,
    "description": "Ottoman beds with storage",
    "order": 2,
    "image_url": "https://example.com/images/ottoman-bed.jpg",
    "featured": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "323e4567-e89b-12d3-a456-426614174113",
    "name": "Mattresses",
    "slug": "mattresses",
    "parent_id": null,
    "description": "Comfortable mattresses for a good night's sleep",
    "order": 3,
    "image_url": "https://example.com/images/mattress.jpg",
    "featured": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "423e4567-e89b-12d3-a456-426614174114",
    "name": "Upholstered Beds",
    "slug": "upholstered-beds",
    "parent_id": null,
    "description": "Stylish upholstered beds",
    "order": 4,
    "image_url": "https://example.com/images/upholstered-bed.jpg",
    "featured": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

### 2.11. Get Featured Categories

Retrieve a list of featured categories.

#### Request

```
GET /categories/featured
```

##### Query Parameters

| Parameter | Type    | Required | Description                                | Default |
|-----------|---------|----------|--------------------------------------------|---------|
| limit     | integer | No       | Maximum number of categories to return     | No limit |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/categories/featured?limit=5" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174111",
    "name": "Divan Beds",
    "slug": "divan-beds",
    "parent_id": null,
    "description": "Comfortable divan beds for your bedroom",
    "order": 1,
    "image_url": "https://example.com/images/divan-bed.jpg",
    "featured": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174112",
    "name": "Ottoman Beds",
    "slug": "ottoman-beds",
    "parent_id": null,
    "description": "Ottoman beds with storage",
    "order": 2,
    "image_url": "https://example.com/images/ottoman-bed.jpg",
    "featured": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "323e4567-e89b-12d3-a456-426614174113",
    "name": "Mattresses",
    "slug": "mattresses",
    "parent_id": null,
    "description": "Comfortable mattresses for a good night's sleep",
    "order": 3,
    "image_url": "https://example.com/images/mattress.jpg",
    "featured": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

### 2.12. Category Image Management

#### Upload Category Image

**Endpoint:** `POST /categories/admin/{id}/image`

**Description:** Upload an image for a category. Supports both file uploads and direct URL input.

**Headers:**
- Content-Type: multipart/form-data (for file uploads)
- Authorization: Bearer {token} (admin only)

**Parameters:**
- `id` (path): Category UUID

**Request Body (File Upload):**
```http
POST /categories/admin/123e4567-e89b-12d3-a456-426614174000/image
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="imageFile"; filename="living-room.jpg"
Content-Type: image/jpeg

[binary image data]
--boundary--
```

**Request Body (URL):**
```json
{
  "url": "https://example.com/images/living-room-furniture.jpg"
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Living Room Furniture",
  "slug": "living-room-furniture",
  "parent_id": null,
  "description": "Comfortable and stylish living room furniture",
  "order": 1,
  "image_url": "https://your-supabase-url.co/storage/v1/object/public/category-images/categories/1699999999999-living-room_optimized.webp",
  "featured": false,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**cURL Example (File Upload):**
```bash
curl -X POST "http://localhost:4000/categories/admin/123e4567-e89b-12d3-a456-426614174000/image" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "imageFile=@/path/to/your/image.jpg"
```

**cURL Example (URL):**
```bash
curl -X POST "http://localhost:4000/categories/admin/123e4567-e89b-12d3-a456-426614174000/image" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/images/living-room-furniture.jpg"
  }'
```

#### Remove Category Image

**Endpoint:** `DELETE /categories/admin/{id}/image`

**Description:** Remove the image from a category.

**Headers:**
- Authorization: Bearer {token} (admin only)

**Parameters:**
- `id` (path): Category UUID

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Living Room Furniture",
  "slug": "living-room-furniture",
  "parent_id": null,
  "description": "Comfortable and stylish living room furniture",
  "order": 1,
  "image_url": null,
  "featured": false,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X DELETE "http://localhost:4000/categories/admin/123e4567-e89b-12d3-a456-426614174000/image" \
  -H "Authorization: Bearer your-jwt-token"
```

#### Image Management & Storage Cleanup

**Important:** When you upload a new image or update an existing one, the system automatically:
1. ✅ **Uploads the new image** to Supabase storage
2. ✅ **Updates the database** with the new image URL
3. ✅ **Deletes the old image** from storage (prevents orphaned files)

This automatic cleanup prevents storage bloat and reduces costs.

#### Clean Up Orphaned Images

**Endpoint:** `POST /categories/admin/cleanup-images`

**Description:** Manually clean up orphaned image files that are no longer referenced by any category.

**Headers:**
- Authorization: Bearer {token} (admin only)

**Response:**
```json
{
  "message": "Orphaned category images cleanup completed successfully"
}
```

**cURL Example:**
```bash
curl -X POST "http://localhost:4000/categories/admin/cleanup-images" \
  -H "Authorization: Bearer your-jwt-token"
```

**When to use this:**
- After bulk category deletions
- Periodic maintenance to free up storage space
- When you suspect there are orphaned files

#### Example: Replacing a Category Image

Here's what happens when you replace an existing category image:

**Step 1: Category has an existing image**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Living Room Furniture",
  "image_url": "https://your-supabase-url.co/storage/v1/object/public/category-images/categories/1699999999999-old-image.webp"
}
```

**Step 2: Upload a new image**
```bash
curl -X POST "http://localhost:4000/categories/admin/123e4567-e89b-12d3-a456-426614174000/image" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "imageFile=@/path/to/new-image.jpg"
```

**Step 3: System automatically:**
1. ✅ Uploads new image → `new-image_optimized.webp`
2. ✅ Updates database with new URL
3. ✅ Deletes old file → `old-image.webp` (cleaned up automatically)

**Step 4: Category now has the new image**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Living Room Furniture", 
  "image_url": "https://your-supabase-url.co/storage/v1/object/public/category-images/categories/1700000000000-new-image_optimized.webp"
}
```

**No manual cleanup needed!** 🎉

#### Example: Replacing Supabase Image with External URL

This is your exact scenario - you have a Supabase image and want to replace it with an external URL:

**Step 1: Category has a Supabase image**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Bedroom Furniture",
  "image_url": "https://your-project.supabase.co/storage/v1/object/public/category-images/categories/1699999999999-bedroom.webp"
}
```

**Step 2: Update with external URL**
```bash
curl -X POST "http://localhost:4000/categories/admin/123e4567-e89b-12d3-a456-426614174000/image" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://cdn.example.com/images/new-bedroom-furniture.jpg"
  }'
```

**Step 3: System automatically:**
1. ✅ **Detects old Supabase URL** → `bedroom.webp`
2. ✅ **Sets new external URL** → `https://cdn.example.com/...`
3. ✅ **Deletes Supabase file** → `bedroom.webp` (cleaned up automatically!)
4. ✅ **Skips external URLs** → No attempt to delete external images

**Step 4: Category now uses external URL, Supabase storage is clean**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Bedroom Furniture",
  "image_url": "https://cdn.example.com/images/new-bedroom-furniture.jpg"
}
```

#### Smart Detection Logic

The system automatically detects and handles different URL types:

| Old Image Source | New Image Source | Cleanup Action |
|------------------|------------------|----------------|
| **Supabase Storage** | External URL | ✅ **Deletes old Supabase file** |
| **Supabase Storage** | New File Upload | ✅ **Deletes old Supabase file** |
| **External URL** | New File Upload | ✅ **Skips external URL, uploads new file** |
| **External URL** | Different External URL | ✅ **Skips both external URLs** |
| **External URL** | Same External URL | ✅ **No action needed** |

**The system is smart enough to:**
- 🎯 **Only delete files from YOUR Supabase storage**
- 🛡️ **Never attempt to delete external URLs**  
- 🧹 **Clean up automatically in all scenarios**

### 2.13. Featured Status Management

#### Toggle Featured Status

**Endpoint:** `PUT /categories/admin/{id}/featured`

**Description:** Mark a category as featured or unfeatured.

**Headers:**
- Authorization: Bearer {token} (admin only)
- Content-Type: application/json

**Parameters:**
- `id` (path): Category UUID

**Request Body:**
```json
{
  "featured": true
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Living Room Furniture",
  "slug": "living-room-furniture",
  "parent_id": null,
  "description": "Comfortable and stylish living room furniture",
  "order": 1,
  "image_url": "https://your-supabase-url.co/storage/v1/object/public/category-images/categories/1699999999999-living-room_optimized.webp",
  "featured": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**cURL Example (Mark as Featured):**
```bash
curl -X PUT "http://localhost:4000/categories/admin/123e4567-e89b-12d3-a456-426614174000/featured" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "featured": true
  }'
```

**cURL Example (Remove from Featured):**
```bash
curl -X PUT "http://localhost:4000/categories/admin/123e4567-e89b-12d3-a456-426614174000/featured" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "featured": false
  }'
```

### 2.14. Using Image and Featured Fields in Create/Update

#### Create Category with Image and Featured Status

When creating a category, you can include both `image_url` and `featured` fields:

**Request Body:**
```json
{
  "name": "Premium Sofas",
  "description": "High-quality premium sofas for your living room",
  "parent_id": "123e4567-e89b-12d3-a456-426614174000",
  "order": 5,
  "image_url": "https://example.com/images/premium-sofas.jpg",
  "featured": true
}
```

#### Update Category with Image and Featured Status

You can update both fields using the existing update endpoint:

**Request Body:**
```json
{
  "name": "Premium Living Room Sofas",
  "image_url": "https://example.com/images/new-premium-sofas.jpg",
  "featured": false
}
```

#### Hierarchy Creation with Images and Featured Status

All hierarchy levels support image and featured fields:

**Level 1 Category:**
```json
{
  "name": "Furniture",
  "description": "All types of furniture",
  "order": 1,
  "image_url": "https://example.com/images/furniture-main.jpg",
  "featured": true
}
```

**Level 2 Category:**
```json
{
  "level2": {
    "name": "Living Room",
    "description": "Living room furniture",
    "order": 1,
    "image_url": "https://example.com/images/living-room.jpg",
    "featured": true
  }
}
```

**Complete 4-Level Hierarchy:**
```json
{
  "name": "Furniture",
  "description": "All types of furniture",
  "order": 1,
  "image_url": "https://example.com/images/furniture.jpg",
  "featured": true,
  "level2": {
    "name": "Living Room",
    "description": "Living room furniture",
    "order": 1,
    "image_url": "https://example.com/images/living-room.jpg",
    "featured": false,
    "level3": {
      "name": "Seating",
      "description": "Chairs, sofas, and other seating",
      "order": 1,
      "image_url": "https://example.com/images/seating.jpg",
      "featured": false,
      "level4": {
        "name": "Sofas",
        "description": "Comfortable sofas for your living room",
        "order": 1,
        "image_url": "https://example.com/images/sofas.jpg",
        "featured": true
      }
    }
  }
}
```

### 2.15. Frontend Guide: Working with Categories

This section provides guidance for frontend developers on how to work with categories in the Sofa Deal E-Commerce platform.

#### What is a Slug?

A slug is a URL-friendly version of a string, typically a category or product name. It's used in URLs to create human-readable and SEO-friendly web addresses. For example:

- Category name: "Corner Sofa Beds"
- Slug: "corner-sofa-beds"
- URL: `https://sofadeal.com/category/corner-sofa-beds`

Characteristics of a slug:
- All lowercase letters
- Spaces replaced with hyphens
- Special characters removed
- No leading or trailing hyphens

If you don't provide a slug when creating a category, the system will automatically generate one from the name.

#### Adding a New Category

To add a single category, follow these steps:

1. **Authentication**: Ensure you have an admin access token
2. **Determine Category Level**: Decide if this is a top-level category or a subcategory
3. **Prepare Category Data**:
   ```javascript
   const categoryData = {
     name: "L-Shaped Sofas",
     description: "L-shaped sofas to maximize seating in your living space",
     slug: "l-shaped-sofas", // Optional, will be auto-generated if not provided
     parent_id: "123e4567-e89b-12d3-a456-426614174000", // If this is a subcategory, include the parent ID (UUID format)
     order: 1 // Optional, determines the display order
   };
   ```
4. **Submit the Request**:
   ```javascript
   // Example using fetch API
   const response = await fetch('http://localhost:4000/admin/categories', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${adminToken}`
     },
     body: JSON.stringify(categoryData)
   });
   
   const newCategory = await response.json();
   console.log('Created category:', newCategory);
   ```

#### Adding Multiple Categories with Hierarchy

For creating a complete taxonomy with multiple levels of categories (up to 4 levels deep), use the hierarchy endpoint:

1. **Prepare Hierarchy Data**:
   ```javascript
   const hierarchyData = {
     name: "Sofa Beds",
     slug: "sofa-beds",
     description: "Convertible sofas that transform into beds",
     order: 1,
     subcategories: [
       {
         name: "Corner Sofa Beds",
         slug: "corner-sofa-beds",
         description: "L-shaped sofa beds",
         order: 1,
         subcategories: [
           {
             name: "Fabric Sofas",
             slug: "corner-fabric-sofa-beds",
             description: "Corner sofa beds in fabric",
             order: 1,
             subcategories: [
               {
                 name: "With Storage",
                 slug: "corner-fabric-sofa-beds-with-storage",
                 description: "Corner fabric sofa beds with storage",
                 order: 1
               }
             ]
           }
         ]
       }
     ]
   };
   ```

2. **Submit the Request**:
   ```javascript
   const response = await fetch('http://localhost:4000/categories/admin/hierarchy', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${adminToken}`
     },
     body: JSON.stringify(hierarchyData)
   });
   
   const categoryHierarchy = await response.json();
   console.log('Created hierarchy:', categoryHierarchy);
   ```

#### Best Practices for Category Management

1. **Consistent Naming**: Use consistent naming patterns across your categories
2. **Optimal Depth**: Aim for 2-3 levels of nesting for most use cases, only use 4 levels when necessary
3. **Descriptive Slugs**: Create meaningful, descriptive slugs for better SEO
4. **Hierarchical Structure**:
   - Level 1: Main category (e.g., "Sofa Beds")
   - Level 2: Configuration/Type (e.g., "Corner Sofa Beds")
   - Level 3: Material/Upholstery (e.g., "Fabric")
   - Level 4: Features & Availability (e.g., "With Storage > In Stock")
5. **Order Numbering**: Use consistent increments for the order field (e.g., 1, 2, 3...)
6. **Category Images**: Consider using product images to represent categories in UI displays

By following these guidelines, you can create a well-organized and user-friendly category structure for your e-commerce application. 