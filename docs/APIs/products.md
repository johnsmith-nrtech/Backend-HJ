# Products API Documentation

> **Latest Schema Update:** The API now includes comprehensive e-commerce fields including delivery information, dimensions, payment options, pricing comparisons, warranty details, and more. All new fields are automatically included in API responses.

> **Enhanced Features:** 
> - **Automatic Discount Calculation**: Compare prices and discount percentages are calculated automatically
> - **Complete Dimensions**: Products include detailed measurements in both metric and imperial units
> - **Payment Options**: Support for installment plans like Klarna
> - **Delivery Information**: Customizable delivery timeframes and shipping details
> - **Rich Product Data**: Warranty, care instructions, assembly information, and weight data

> **API Update:** As of the latest version, product endpoints now include variants by default. The `includeVariants` parameter defaults to `true` for better developer experience. You can still exclude variants by explicitly setting `includeVariants=false`.

> **Visibility Control:** All product endpoints now respect the `is_visible` flag. Only visible products are returned in all product listings, search results, and related product suggestions by default. This allows for temporary hiding of products without deleting them from the database.

## 🚀 New E-commerce Features

### Product Visibility Control

The Products API now includes built-in visibility control for products:

- All product endpoints now respect the `is_visible` flag
- Only visible products (`is_visible = true`) are returned in public endpoints
- Products can be temporarily hidden without deleting them
- Default value for new products is `is_visible = true`
- Admin endpoints still provide access to all products regardless of visibility

**Common Use Cases:**
- Temporarily hide products that are out of stock
- Prepare new products before making them publicly available
- Remove seasonal items without deleting their data
- Hide discontinued products while maintaining order history

### Enhanced Product Data Structure

The Products API now includes comprehensive e-commerce fields to support modern shopping experiences:

#### **Product Level Fields:**
- 🚚 **Delivery Information**: Customizable delivery timeframes (`delivery_info`)
- 🛡️ **Warranty Details**: Product warranty information (`warranty_info`)
- 🧽 **Care Instructions**: Maintenance and care guidelines (`care_instructions`)
- 🔧 **Assembly Information**: Assembly requirements and instructions (`assembly_required`, `assembly_instructions`)

#### **Variant Level Fields:**
- 💰 **Smart Pricing**: Compare prices with automatic discount calculation (`compare_price`, `discount_percentage`)
- 📏 **Complete Dimensions**: Detailed measurements in both CM and Inches (`dimensions`)
- ⚖️ **Shipping Weight**: Product weight for accurate shipping (`weight_kg`)
- 💳 **Payment Options**: Installment plans like Klarna (`payment_options`)

#### **Automatic Features:**
- ✨ **Auto-Discount Calculation**: Discount percentages calculated automatically from price vs compare_price
- 🌍 **Dual Unit Support**: All dimensions automatically support both metric and imperial units
- 📊 **Rich API Responses**: All new fields included by default in API responses

#### **Enhanced Image Upload System:**
- 📸 **Multiple File Upload**: Upload up to 10 images at once for products or variants
- 🗂️ **Smart Ordering**: Automatic order calculation based on existing images
- 🔄 **Backward Compatibility**: Single file uploads still supported via `imageFile` parameter
- 🗜️ **Image Optimization**: Automatic compression and format conversion (WebP when optimal)
- 📁 **Organized Storage**: Structured file organization in Supabase storage by product/variant/type
- ⚡ **Performance**: Optimized image processing with quality settings and progressive loading
- 🧹 **Auto Cleanup**: Automatic cleanup of temporary files after upload (success or failure)

### Quick Integration Examples

**Frontend Display Examples:**

```javascript
// Show delivery time
const deliveryText = product.delivery_info?.text; // "3 To 4 Days Delivery"

// Display pricing with discount
const currentPrice = variant.price; // 799.99
const originalPrice = variant.compare_price; // 959.99
const discount = variant.discount_percentage; // 17 (auto-calculated)

// Render dimensions table
const dimensions = variant.dimensions;
console.log(`Width: ${dimensions.width.cm} CM / ${dimensions.width.inches} Inches`);

// Show payment options
variant.payment_options?.forEach(option => {
  if (option.provider === 'klarna') {
    console.log(option.description); // "Make 3 Payments Of $266.66"
  }
});

// Multiple image upload example
const uploadMultipleImages = async (productId, files) => {
  const formData = new FormData();
  
  // Add multiple files
  files.forEach(file => {
    formData.append('imageFiles', file);
  });
  
  formData.append('type', 'gallery');
  // Order will be auto-calculated based on existing images
  
  const response = await fetch(`/products/admin/products/${productId}/images`, {
    method: 'POST',
    body: formData
  });
  
  const images = await response.json();
  console.log(`Uploaded ${images.length} images successfully`);
};
```

## Table of Contents

- [🚀 New E-commerce Features](#-new-e-commerce-features)
- [Product Visibility Control](#product-visibility-control)
- [3.1. Get All Products](#31-get-all-products)
- [3.2. Get Product by ID](#32-get-product-by-id)
- [3.3. Get Featured Products](#33-get-featured-products)
- [3.4. Get Top Selling Products](#34-get-top-selling-products)
- [3.5. Get New Arrivals](#35-get-new-arrivals)
- [3.6. Get Related Products](#36-get-related-products)
- [3.7. Get Product Variants](#37-get-product-variants)
- [3.8. Get Variants by Color](#38-get-variants-by-color)
- [3.9. Get Variants by Size](#39-get-variants-by-size)
- [3.10. Get Products in Category by Color](#310-get-products-in-category-by-color)
- [3.11. Get Products in Category by Size](#311-get-products-in-category-by-size)
- [3.12. Get Product Images](#312-get-product-images)
- [3.13. Create Product](#313-create-product)
- [3.14. Update Product](#314-update-product)
- [3.15. Delete Product](#315-delete-product)
- [3.16. Get Variant by ID](#316-get-variant-by-id)
- [3.17. Get 360° View Images](#317-get-360-view-images)
- [3.18. Get Variant Images](#318-get-variant-images)
- [3.19. Get Products with Low Stock](#319-get-products-with-low-stock)
- [3.20. Create Product Variant](#320-create-product-variant)
- [3.21. Update Product Variant](#321-update-product-variant)
- [3.22. Delete Product Variant](#322-delete-product-variant)
- [3.23. Update Variant Stock](#323-update-variant-stock)
- [3.24. Upload Product Images](#324-upload-product-images)
- [3.25. Upload Variant Images](#325-upload-variant-images)
- [3.26. Update Image Details](#326-update-image-details)
- [3.27. Delete Image](#327-delete-image)
- [3.28. Get Search Initialization Data](#328-get-search-initialization-data)
- [3.29. Bulk Import Products from CSV](#329-bulk-import-products-from-csv)

## 3. Products

The Products API allows browsing and management of products in the Sofa Deal E-Commerce platform.

### 3.28. Get Search Initialization Data

Retrieve all products with their variants and category information for client-side search functionality. This endpoint is designed to provide comprehensive data for building a local search index on the frontend.

#### Request

```
GET /products/search-init-data
```

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/search-init-data" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "products": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Modern Living Room Sofa",
      "description": "Comfortable modern sofa for your living room",
      "category_id": "123e4567-e89b-12d3-a456-426614174111",
      "base_price": 799.99,
      "tags": "modern,comfortable,living room",
      "material": "Premium Fabric",
      "brand": "SofaDeal",
      "featured": true,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "category": {
        "id": "123e4567-e89b-12d3-a456-426614174111",
        "name": "Living Room",
        "slug": "living-room",
        "parent_id": null,
        "description": "Furniture for your living room",
        "order": 1,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      },
      "variants": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174222",
          "product_id": "123e4567-e89b-12d3-a456-426614174000",
          "sku": "SOFA-001-RED-L",
          "price": 899.99,
          "size": "Large",
          "color": "Red",
          "stock": 10,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "images": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174333",
          "product_id": "123e4567-e89b-12d3-a456-426614174000",
          "variant_id": null,
          "url": "https://example.com/images/sofa1.jpg",
          "type": "main",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "categories": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Living Room",
      "slug": "living-room",
      "parent_id": null,
      "description": "Furniture for your living room",
      "order": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "children": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174444",
          "name": "Sofas",
          "slug": "sofas",
          "parent_id": "123e4567-e89b-12d3-a456-426614174111",
          "description": "Comfortable sofas for your living room",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### 3.29. Bulk Import Products from CSV

Import multiple products and their variants from a CSV file.

#### Request

```
POST /products/admin/import
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Request Body (multipart/form-data)

| Field            | Type    | Required | Description                                   |
|------------------|---------|----------|-----------------------------------------------|
| file             | file    | Yes      | CSV file containing products and variants     |
| createCategories | boolean | No       | Create categories if they don't exist (default: true) |
| skipErrors       | boolean | No       | Continue import if errors are encountered (default: true) |

##### CSV Format

The CSV file should have the following columns:

| Column          | Required | Description                                   |
|-----------------|----------|-----------------------------------------------|
| name            | Yes      | Product name                                  |
| description     | No       | Product description                           |
| base_price      | Yes      | Base price of the product                     |
| category_name   | No       | Category name/path (e.g., "Furniture/Living Room/Sofas") |
| sku             | Yes      | Stock Keeping Unit (must be unique)           |
| variant_price   | No       | Price of this specific variant (if different from base_price) |
| color           | No       | Color of the variant                          |
| size            | No       | Size of the variant                           |
| stock           | Yes      | Stock quantity                                |
| product_images  | No       | Comma-separated URLs of product images        |
| variant_images  | No       | Comma-separated URLs of variant images        |
| tags            | No       | Comma-separated tags                          |
| material        | No       | Material information                          |
| brand           | No       | Brand name                                    |
| featured        | No       | Whether the product is featured (true/false)  |

##### CSV Example

```
name,description,base_price,category_name,sku,color,size,stock,product_images
Modern Sofa,"Comfortable modern sofa",799.99,"Furniture/Living Room/Sofas",SOFA-001-BLK,Black,3 Seater,10,https://example.com/images/sofa1.jpg
Modern Sofa,"Comfortable modern sofa",799.99,"Furniture/Living Room/Sofas",SOFA-001-RED,Red,3 Seater,5,
Modern Sofa,"Comfortable modern sofa",799.99,"Furniture/Living Room/Sofas",SOFA-001-BLU,Blue,2 Seater,8,
Dining Table,"Elegant dining table",499.99,"Furniture/Dining Room",TABLE-001,Oak,6 Seater,12,https://example.com/images/table1.jpg
```

##### Important Notes

1. Products with the same name will be treated as the same product with different variants
2. Each row represents one product variant
3. The `category_name` can include the full path separated by slashes
4. If `createCategories` is true, missing categories will be created automatically
5. If `skipErrors` is true, rows with errors will be skipped, and the import will continue

##### Curl Example

```bash
curl -X POST "http://localhost:4000/products/admin/import" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/products.csv" \
  -F "createCategories=true" \
  -F "skipErrors=true"
```

#### Response

##### 201: Created

```json
{
  "totalRows": 4,
  "successfulImports": 4,
  "failedImports": 0,
  "errors": [],
  "importedProducts": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Modern Sofa",
      "sku": "SOFA-001-BLK"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Dining Table",
      "sku": "TABLE-001"
    }
  ]
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Failed to parse CSV file: Invalid CSV format",
  "error": "Bad Request"
}
```

or with specific row errors when `skipErrors` is false:

```json
{
  "statusCode": 400,
  "message": "Error at row 3: Duplicate SKU: \"SOFA-001-RED\" already exists",
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

### 3.1. Get All Products

Retrieve a list of all products with optional filtering, pagination, and sorting.

> **🚀 Updated Behavior**: By default, this endpoint returns ALL products without any limit. Pagination is only applied when you explicitly provide a `limit` parameter. This is perfect for frontend applications that need to load all products for search functionality or product catalogs.

#### Request

```
GET /products
```

##### Query Parameters

| Parameter       | Type    | Required | Description                                | Default |
|-----------------|---------|----------|--------------------------------------------|---------|
| categoryId      | UUID    | No       | Filter products by category ID             |         |
| search          | string  | No       | Search term to filter products             |         |
| page            | integer | No       | Page number                                | 1       |
| limit           | integer | No       | Items per page (if not provided, returns all products) | none    |
| sortBy          | string  | No       | Field to sort by                           | id      |
| sortOrder       | string  | No       | Sort order (asc or desc)                   | asc     |
| includeVariants | boolean | No       | Include product variants in response       | true    |
| includeImages   | boolean | No       | Include product images in response         | false   |
| includeCategory | boolean | No       | Include category details in response       | true    |

##### Curl Example

```bash
# Get ALL products (no limit) - variants and categories included by default
curl -X GET "http://localhost:4000/products" \
  -H "Accept: application/json"

# Get ALL products with search filter
curl -X GET "http://localhost:4000/products?search=sofa&sortBy=name&sortOrder=asc" \
  -H "Accept: application/json"

# Get products with pagination (when you want to limit results)
curl -X GET "http://localhost:4000/products?page=1&limit=10&sortBy=name&sortOrder=asc" \
  -H "Accept: application/json"

# Get ALL products with all optional includes
curl -X GET "http://localhost:4000/products?includeImages=true&includeCategory=true" \
  -H "Accept: application/json"

# Get products by category (returns all products in that category)
curl -X GET "http://localhost:4000/products?categoryId=123e4567-e89b-12d3-a456-426614174111" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Modern Living Room Sofa",
      "description": "Comfortable modern sofa for your living room",
      "category_id": "123e4567-e89b-12d3-a456-426614174111",
      "base_price": 799.99,
      "is_visible": true,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "variants": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174222",
          "product_id": "123e4567-e89b-12d3-a456-426614174000",
          "sku": "SOFA-001-RED-L",
          "price": 899.99,
          "size": "Large",
          "color": "Red",
          "stock": 10,
          "tags": "modern,comfortable,living room",
          "material": "Premium Fabric",
          "brand": "SofaDeal",
          "featured": true,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "images": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174333",
          "product_id": "123e4567-e89b-12d3-a456-426614174000",
          "variant_id": null,
          "url": "https://example.com/images/sofa1.jpg",
          "type": "main",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": null,
    "totalItems": 24,
    "totalPages": 1
  }
}
```

**Response Notes:**
- ✅ **All Products Returned**: When no `limit` is provided, all products are returned (24 in this example)
- ✅ **No Pagination**: `limit: null` and `totalPages: 1` indicate all results are in this response
- ✅ **Frontend Ready**: Perfect for loading complete product catalogs or search functionality

### 3.2. Get Product by ID

Retrieve details of a specific product by ID.

#### Request

```
GET /products/:id
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Query Parameters

| Parameter       | Type    | Required | Description                                | Default |
|-----------------|---------|----------|--------------------------------------------|---------|
| includeVariants | boolean | No       | Include product variants in response       | true    |
| includeImages   | boolean | No       | Include product images in response         | false   |
| includeCategory | boolean | No       | Include category details in response       | false   |

##### Curl Example

```bash
# Basic request - variants included by default
curl -X GET "http://localhost:4000/products/123e4567-e89b-12d3-a456-426614174000" \
  -H "Accept: application/json"

# Request with all optional includes
curl -X GET "http://localhost:4000/products/123e4567-e89b-12d3-a456-426614174000?includeImages=true&includeCategory=true" \
  -H "Accept: application/json"

# Exclude variants if needed
curl -X GET "http://localhost:4000/products/123e4567-e89b-12d3-a456-426614174000?includeVariants=false" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

**Complete Product Response with All E-commerce Fields:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Lanto Turkish Sofa Bed",
  "description": "Stylish Lanto Turkish sofa bed offering exceptional comfort and durability. Ideal for modern homes with space-saving needs. Easy-to-use conversion mechanism.",
  "category_id": "123e4567-e89b-12d3-a456-426614174111",
  "base_price": 799.99,
  "delivery_info": {
    "min_days": 3,
    "max_days": 4,
    "text": "3 To 4 Days Delivery",
    "shipping_method": "standard",
    "free_shipping_threshold": 500
  },
  "warranty_info": "2 year manufacturer warranty included",
  "care_instructions": "Clean with damp cloth. Avoid direct sunlight. Professional cleaning recommended for tough stains.",
  "assembly_required": true,
  "assembly_instructions": "Assembly instructions included in package. Professional assembly available for additional fee.",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "variants": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174222",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "sku": "LANTO-BLU-3S",
      "price": 799.99,
      "compare_price": 959.99,
      "discount_percentage": 17,
      "size": "3 Seater",
      "color": "Blue",
      "stock": 10,
      "weight_kg": 45.5,
      "dimensions": {
        "width": {"cm": 215, "inches": 84.65},
        "depth": {"cm": 96, "inches": 37.80},
        "height": {"cm": 88, "inches": 34.65},
        "seat_width": {"cm": 180, "inches": 70.87},
        "seat_depth": {"cm": 56, "inches": 22.05},
        "seat_height": {"cm": 52, "inches": 20.47},
        "bed_width": {"cm": 180, "inches": 70.87},
        "bed_length": {"cm": 110, "inches": 43.31}
      },
      "payment_options": [
        {
          "provider": "klarna",
          "type": "installment",
          "installments": 3,
          "amount_per_installment": 266.66,
          "total_amount": 799.99,
          "description": "Make 3 Payments Of $266.66"
        }
      ],
      "tags": "turkish sofa bed,convertible,modern,comfortable",
      "material": "Premium Fabric",
      "brand": "SofaDeal",
      "featured": true,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  ],
  "images": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174333",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "variant_id": null,
      "url": "https://example.com/images/lanto-sofa-main.jpg",
      "type": "main",
      "order": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174334",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "variant_id": "123e4567-e89b-12d3-a456-426614174222",
      "url": "https://example.com/images/lanto-sofa-blue.jpg",
      "type": "gallery",
      "order": 2,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  ],
  "category": {
    "id": "123e4567-e89b-12d3-a456-426614174111",
    "name": "Sofa Beds",
    "slug": "sofa-beds",
    "parent_id": "123e4567-e89b-12d3-a456-426614174444",
    "description": "Convertible furniture for modern living",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "parent": {
      "id": "123e4567-e89b-12d3-a456-426614174444",
      "name": "Living Room",
      "slug": "living-room",
      "parent_id": null,
      "description": "Living room furniture",
      "order": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  }
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.3. Get Featured Products

Retrieve a list of featured products for showcasing on the homepage or special sections. This endpoint has been optimized to return only essential data for better performance.

**Important:** This endpoint only returns products that have at least one variant marked as `featured = true` in the `product_variants` table. Featured variants are prioritized as the `default_variant` in the response.

#### Request

```
GET /products/featured
```

##### Query Parameters

| Parameter       | Type    | Required | Description                                | Default |
|-----------------|---------|----------|--------------------------------------------|---------|
| limit           | integer | No       | Number of featured products to return      | 6       |
| includeCategory | boolean | No       | Include category details in response       | false   |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/featured?limit=6&includeCategory=true" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

**Optimized Response Structure:**
- Only products with featured variants (`product_variants.featured = true`)
- Only essential product fields (id, name, category_id, base_price)
- Only main image (id, url)
- Featured variants prioritized as `default_variant`
- Category info (id, name, slug) when requested

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Elisa Turkish Sofa Bed",
    "category_id": "123e4567-e89b-12d3-a456-426614174111",
    "base_price": 799.99,
    "main_image": {
      "id": "123e4567-e89b-12d3-a456-426614174333",
      "url": "https://example.com/images/elisa-sofa-bed.jpg"
    },
    "default_variant": {
      "id": "123e4567-e89b-12d3-a456-426614174222",
      "sku": "ELISA-GRY-3S",
      "price": 899.99,
      "color": "Grey",
      "size": "3 Seater",
      "stock": 10,
      "featured": true
    },
    "category": {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Sofa Beds",
      "slug": "sofa-beds"
    }
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "name": "Lanto Turkish Sofa Bed",
    "category_id": "123e4567-e89b-12d3-a456-426614174111",
    "base_price": 699.99,
    "main_image": {
      "id": "123e4567-e89b-12d3-a456-426614174334",
      "url": "https://example.com/images/lanto-sofa-bed.jpg"
    },
    "default_variant": {
      "id": "123e4567-e89b-12d3-a456-426614174223",
      "sku": "LANTO-BLU-3S",
      "price": 799.99,
      "color": "Blue",
      "size": "3 Seater", 
      "stock": 8,
      "featured": false
    }
  }
]
```

**Key Optimizations:**
- ✅ **Featured variants only**: Only returns products with `featured = true` variants
- ✅ **Prioritized featured variants**: Featured variants are selected as `default_variant`
- ❌ Removed: `description`, `search_vector`, gallery images
- ❌ Removed: Variant fields like `tags`, `material`, `brand`
- ✅ Only main image with essential fields
- ✅ Default variant with cart-ready information
- ✅ Minimal category data when requested

### 3.4. Get Top Selling Products

Retrieve a list of top selling products based on actual order quantities. This endpoint has been optimized to return only essential data for better performance.

**Important:** This endpoint only returns products with actual sales data from the `order_items` table. If no products have been sold yet, it returns an empty array `[]` instead of fallback data.

#### Request

```
GET /products/top-sellers
```

##### Query Parameters

| Parameter       | Type    | Required | Description                                           | Default |
|-----------------|---------|----------|-------------------------------------------------------|---------|
| limit           | integer | No       | Number of top selling products to return              | 8       |
| period          | string  | No       | Time period to consider ('week', 'month', 'year', 'all') | 'all'   |
| includeCategory | boolean | No       | Include category details in response                  | false   |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/top-sellers?limit=8&period=month&includeCategory=true" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

**Optimized Response Structure:**
- Only products with actual sales data from `order_items` table
- Only essential product fields (id, name, category_id, base_price)
- Only main image (id, url)
- Essential variant fields for cart/wishlist functionality
- Sales metrics included for transparency
- Category info (id, name, slug) when requested

**When sales data exists:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174002",
    "name": "Nisa Turkish Sofa Bed",
    "category_id": "123e4567-e89b-12d3-a456-426614174111",
    "base_price": 949.99,
    "main_image": {
      "id": "123e4567-e89b-12d3-a456-426614174335",
      "url": "https://example.com/images/nisa-sofa-bed.jpg"
    },
    "default_variant": {
      "id": "123e4567-e89b-12d3-a456-426614174224",
      "sku": "NISA-BLK-3S",
      "price": 949.99,
      "color": "Black",
      "size": "3 Seater",
      "stock": 15,
      "featured": false
    },
    "sales_data": {
      "order_count": 47,
      "total_units_sold": 52
    },
    "category": {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Sofa Beds",
      "slug": "sofa-beds"
    }
  }
]
```

**When no sales data exists:**
```json
[]
```

**Key Features:**
- ✅ **Honest data**: Only returns products with actual sales
- ✅ **Empty array**: Returns `[]` when no sales data exists (no misleading fallbacks)
- ✅ **Sales transparency**: Includes `sales_data` with order count and units sold
- ✅ **Period filtering**: Respects time period constraints (week/month/year/all)
- ✅ **Optimized payload**: Only essential data for homepage display
- ✅ **Sort by sales**: Products ordered by actual sales volume

**Note:** This endpoint reflects true business performance. If no products have been sold in the specified period, an empty array is returned rather than showing placeholder or recent products.

### 3.5. Get New Arrivals

Retrieve a list of recently added products for showcasing on the homepage or "New Arrivals" sections. This endpoint has been optimized to return only essential data for better performance.

**Important:** This endpoint returns products ordered by their creation date (`created_at` timestamp) in descending order (newest first). Products can be filtered by time period to show arrivals from specific timeframes.

#### Request

```
GET /products/new-arrivals
```

##### Query Parameters

| Parameter       | Type    | Required | Description                                           | Default |
|-----------------|---------|----------|-------------------------------------------------------|---------|
| limit           | integer | No       | Number of new arrival products to return              | 8       |
| period          | string  | No       | Time period to consider ('week', 'month', 'year', 'all') | 'all'   |
| includeCategory | boolean | No       | Include category details in response                  | true    |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/new-arrivals?limit=8&period=month&includeCategory=true" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

**Optimized Response Structure:**
- Products ordered by creation date (newest first)
- Only essential product fields (id, name, category_id, base_price, created_at)
- Only main image (id, url)
- Essential variant fields for cart/wishlist functionality
- Category info (id, name, slug) when requested

**When new arrivals exist:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174003",
    "name": "Luxury Ottoman Bed",
    "category_id": "123e4567-e89b-12d3-a456-426614174111",
    "base_price": 1199.99,
    "created_at": "2023-12-01T10:30:00Z",
    "main_image": {
      "id": "123e4567-e89b-12d3-a456-426614174336",
      "url": "https://example.com/images/luxury-ottoman-bed.jpg"
    },
    "default_variant": {
      "id": "123e4567-e89b-12d3-a456-426614174225",
      "sku": "OTTO-LUX-KNG-BLK",
      "price": 1299.99,
      "color": "Black",
      "size": "King",
      "stock": 12,
      "featured": true
    },
    "category": {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Ottoman Beds",
      "slug": "ottoman-beds"
    }
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174004",
    "name": "Contemporary Dining Set",
    "category_id": "123e4567-e89b-12d3-a456-426614174222",
    "base_price": 899.99,
    "created_at": "2023-11-28T14:15:00Z",
    "main_image": {
      "id": "123e4567-e89b-12d3-a456-426614174337",
      "url": "https://example.com/images/contemporary-dining-set.jpg"
    },
    "default_variant": {
      "id": "123e4567-e89b-12d3-a456-426614174226",
      "sku": "DINING-CONT-6S-OAK",
      "price": 899.99,
      "color": "Oak",
      "size": "6 Seater",
      "stock": 8,
      "featured": false
    },
    "category": {
      "id": "123e4567-e89b-12d3-a456-426614174222",
      "name": "Dining Sets",
      "slug": "dining-sets"
    }
  }
]
```

**When no new arrivals exist in the specified period:**
```json
[]
```

**Key Features:**
- ✅ **Time-based filtering**: Supports week, month, year, or all-time periods
- ✅ **Newest first**: Products ordered by creation date (most recent first)
- ✅ **Empty array**: Returns `[]` when no products found in specified period
- ✅ **Optimized payload**: Only essential data for homepage display
- ✅ **Creation timestamp**: Includes `created_at` for transparency
- ✅ **Variant priority**: Featured variants prioritized as `default_variant`

**Note:** This endpoint helps showcase the latest additions to your product catalog. The `created_at` timestamp is included in the response to show when each product was added to the system.

### 3.6. Get Related Products

Retrieve products related to a specific product using an intelligent multi-factor algorithm.

#### Request

```
GET /products/related/:id
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Query Parameters

| Parameter       | Type    | Required | Description                                | Default |
|-----------------|---------|----------|--------------------------------------------|---------|
| limit           | integer | No       | Number of related products to return       | 4       |
| includeCategory | boolean | No       | Include category details in response       | false   |

##### Algorithm Behavior

The endpoint uses a smart prioritization system to find related products up to the requested `limit`:

1. **Same category products** (highest priority) - Products from the same category as the requested product
2. **Attribute matching** - Only if more products are needed to reach the limit, it finds products with similar attributes (matching colors or sizes)
3. **Sibling categories** - Only if still below the limit, it looks for products from sibling categories (categories with the same parent)
4. **Recent products** - Only as a final fallback if the above strategies don't yield enough products

This cascading approach ensures the API always tries to return the exact number of products requested in the `limit` parameter, prioritizing the most relevant matches first.

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/related/123e4567-e89b-12d3-a456-426614174000?limit=4&includeCategory=true" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 2,
    "name": "Contemporary L-Shaped Sofa",
    "description": "L-shaped sofa perfect for corners",
    "category_id": 1,
    "base_price": 1299.99,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "images": [
      {
        "id": 3,
        "product_id": 2,
        "variant_id": null,
        "url": "https://example.com/images/l-sofa1.jpg",
        "type": "main",
        "order": 1,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ],
    "category": {
      "id": 1,
      "name": "Sofas",
      "slug": "sofas",
      "parent_id": 5,
      "description": "High-quality sofas for your home",
      "order": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "parent": {
        "id": 5,
        "name": "Living Room",
        "slug": "living-room",
        "parent_id": null,
        "description": "Living room furniture",
        "order": 1,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    }
  }
]
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.7. Get Product Variants

Retrieve all variants of a specific product.

#### Request

```
GET /products/:id/variants
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/123e4567-e89b-12d3-a456-426614174000/variants" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "product_id": 1,
    "sku": "SOFA-001-RED-L",
    "price": 899.99,
    "size": "Large",
    "color": "Red",
    "stock": 10,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "images": [
      {
        "id": 2,
        "product_id": 1,
        "variant_id": 1,
        "url": "https://example.com/images/sofa1-red.jpg",
        "type": "gallery",
        "order": 1,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ]
  },
  {
    "id": 2,
    "product_id": 1,
    "sku": "SOFA-001-BLUE-L",
    "price": 899.99,
    "size": "Large",
    "color": "Blue",
    "stock": 5,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "images": [
      {
        "id": 3,
        "product_id": 1,
        "variant_id": 2,
        "url": "https://example.com/images/sofa1-blue.jpg",
        "type": "gallery",
        "order": 1,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ]
  }
]
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.8. Get Variants by Color

Retrieve all product variants of a specific color across all products.

#### Request

```
GET /products/variants/by-color
```

##### Query Parameters

| Parameter | Type    | Required | Description                 | Default |
|-----------|---------|----------|-----------------------------|---------|
| color     | string  | Yes      | Color name to filter by     |         |
| page      | integer | No       | Page number                 | 1       |
| limit     | integer | No       | Items per page              | 10      |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/variants/by-color?color=black&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "sku": "SOFA-001-BLK-L",
      "price": 899.99,
      "size": "Large",
      "color": "Black",
      "stock": 10,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "product": {
        "id": 1,
        "name": "Modern Living Room Sofa",
        "description": "Comfortable modern sofa for your living room",
        "category_id": 1,
        "base_price": 799.99,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      },
      "images": [
        {
          "id": 2,
          "product_id": 1,
          "variant_id": 1,
          "url": "https://example.com/images/sofa1-black.jpg",
          "type": "gallery",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    },
    {
      "id": 5,
      "product_id": 3,
      "sku": "BED-001-BLK-Q",
      "price": 749.99,
      "size": "Queen",
      "color": "Black",
      "stock": 8,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "product": {
        "id": 3,
        "name": "Ottoman Storage Bed",
        "description": "Stylish ottoman bed with storage",
        "category_id": 2,
        "base_price": 649.99,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      },
      "images": [
        {
          "id": 8,
          "product_id": 3,
          "variant_id": 5,
          "url": "https://example.com/images/bed-black.jpg",
          "type": "gallery",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

### 3.9. Get Variants by Size

Retrieve all product variants of a specific size across all products.

#### Request

```
GET /products/variants/by-size
```

##### Query Parameters

| Parameter | Type    | Required | Description                 | Default |
|-----------|---------|----------|-----------------------------|---------|
| size      | string  | Yes      | Size name to filter by      |         |
| page      | integer | No       | Page number                 | 1       |
| limit     | integer | No       | Items per page              | 10      |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/variants/by-size?size=4%20feet&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": 3,
      "product_id": 2,
      "sku": "BED-001-WHI-4F",
      "price": 549.99,
      "size": "4 feet",
      "color": "White",
      "stock": 12,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "product": {
        "id": 2,
        "name": "Divan Storage Bed",
        "description": "Comfortable divan bed with storage drawers",
        "category_id": 2,
        "base_price": 499.99,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      },
      "images": [
        {
          "id": 5,
          "product_id": 2,
          "variant_id": 3,
          "url": "https://example.com/images/divan-white-4ft.jpg",
          "type": "gallery",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    },
    {
      "id": 4,
      "product_id": 2,
      "sku": "BED-001-GRY-4F",
      "price": 549.99,
      "size": "4 feet",
      "color": "Grey",
      "stock": 8,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "product": {
        "id": 2,
        "name": "Divan Storage Bed",
        "description": "Comfortable divan bed with storage drawers",
        "category_id": 2,
        "base_price": 499.99,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      },
      "images": [
        {
          "id": 6,
          "product_id": 2,
          "variant_id": 4,
          "url": "https://example.com/images/divan-grey-4ft.jpg",
          "type": "gallery",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

### 3.10. Get Products in Category by Color

Retrieve all products in a specific category that have variants of a given color.

#### Request

```
GET /products/categories/:id/products/by-color
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Category ID |

##### Query Parameters

| Parameter | Type    | Required | Description                 | Default |
|-----------|---------|----------|-----------------------------|---------|
| color     | string  | Yes      | Color name to filter by     |         |
| page      | integer | No       | Page number                 | 1       |
| limit     | integer | No       | Items per page              | 10      |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/categories/123e4567-e89b-12d3-a456-426614174111/products/by-color?color=black&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": 3,
      "name": "Ottoman Storage Bed",
      "description": "Stylish ottoman bed with storage",
      "category_id": 2,
      "base_price": 649.99,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "variants": [
        {
          "id": 5,
          "product_id": 3,
          "sku": "BED-001-BLK-Q",
          "price": 749.99,
          "size": "Queen",
          "color": "Black",
          "stock": 8,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        },
        {
          "id": 6,
          "product_id": 3,
          "sku": "BED-001-BLK-K",
          "price": 849.99,
          "size": "King",
          "color": "Black",
          "stock": 5,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "images": [
        {
          "id": 8,
          "product_id": 3,
          "variant_id": 5,
          "url": "https://example.com/images/bed-black.jpg",
          "type": "gallery",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    },
    {
      "id": 4,
      "name": "Upholstered Bed Frame",
      "description": "Elegant upholstered bed frame",
      "category_id": 2,
      "base_price": 599.99,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "variants": [
        {
          "id": 9,
          "product_id": 4,
          "sku": "BED-002-BLK-D",
          "price": 599.99,
          "size": "Double",
          "color": "Black",
          "stock": 7,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "images": [
        {
          "id": 12,
          "product_id": 4,
          "variant_id": 9,
          "url": "https://example.com/images/upholstered-black.jpg",
          "type": "gallery",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Category with ID 2 not found",
  "error": "Not Found"
}
```

### 3.11. Get Products in Category by Size

Retrieve all products in a specific category that have variants of a given size.

#### Request

```
GET /products/categories/:id/products/by-size
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Category ID |

##### Query Parameters

| Parameter | Type    | Required | Description                 | Default |
|-----------|---------|----------|-----------------------------|---------|
| size      | string  | Yes      | Size name to filter by      |         |
| page      | integer | No       | Page number                 | 1       |
| limit     | integer | No       | Items per page              | 10      |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/categories/123e4567-e89b-12d3-a456-426614174111/products/by-size?size=4%20feet&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": 2,
      "name": "Divan Storage Bed",
      "description": "Comfortable divan bed with storage drawers",
      "category_id": 2,
      "base_price": 499.99,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "variants": [
        {
          "id": 3,
          "product_id": 2,
          "sku": "BED-001-WHI-4F",
          "price": 549.99,
          "size": "4 feet",
          "color": "White",
          "stock": 12,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        },
        {
          "id": 4,
          "product_id": 2,
          "sku": "BED-001-GRY-4F",
          "price": 549.99,
          "size": "4 feet",
          "color": "Grey",
          "stock": 8,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "images": [
        {
          "id": 5,
          "product_id": 2,
          "variant_id": 3,
          "url": "https://example.com/images/divan-white-4ft.jpg",
          "type": "gallery",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
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
  "message": "Category with ID 2 not found",
  "error": "Not Found"
}
```

### 3.12. Get Product Images

Retrieve all images of a specific product.

#### Request

```
GET /products/:id/images
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/123e4567-e89b-12d3-a456-426614174000/images" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "product_id": 1,
    "variant_id": null,
    "url": "https://example.com/images/sofa1.jpg",
    "type": "main",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "product_id": 1,
    "variant_id": 1,
    "url": "https://example.com/images/sofa1-red.jpg",
    "type": "gallery",
    "order": 2,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.13. Create Product

Create a new product with optional variant information.

> **Note on Visibility Control:** By default, all newly created products have `is_visible` set to `true`. To create an invisible product, explicitly set the `is_visible` field to `false`.

#### Request

```
POST /products/admin/products
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Request Body

**Product Level Fields:**

| Field                  | Type    | Required | Description                                   |
|------------------------|---------|----------|-----------------------------------------------|
| name                   | string  | Yes      | Name of the product                           |
| description            | string  | No       | Description of the product                    |
| category_id            | UUID    | No       | Category ID the product belongs to            |
| base_price             | number  | Yes      | Base price of the product                     |
| delivery_info          | object  | No       | Delivery timeframe and shipping details       |
| warranty_info          | string  | No       | Warranty information text                     |
| care_instructions      | string  | No       | Care and maintenance instructions             |
| assembly_required      | boolean | No       | Whether the product requires assembly         |
| assembly_instructions  | string  | No       | Assembly instructions or URL                  |

**Default Variant Fields:**

| Field           | Type    | Required | Description                                   |
|-----------------|---------|----------|-----------------------------------------------|
| default_color   | string  | No       | Default color for the initial variant         |
| default_size    | string  | No       | Default size for the initial variant          |
| initial_stock   | integer | No       | Initial stock quantity (default: 0)           |
| default_sku     | string  | No       | Custom SKU for the variant (auto-generated if not provided) |
| compare_price   | number  | No       | Original price for showing discounts          |
| weight_kg       | number  | No       | Weight in kilograms for shipping              |
| dimensions      | object  | No       | Complete dimensional data (CM + Inches)       |
| payment_options | array   | No       | Available payment options (e.g., Klarna)      |
| tags            | string  | No       | Comma-separated tags (applies to the variant) |
| material        | string  | No       | Material (applies to the variant)             |
| brand           | string  | No       | Brand (applies to the variant)                |
| featured        | boolean | No       | Whether the variant should be featured        |
| is_visible      | boolean | No       | Controls product visibility in all public endpoints (default: true) |

> **Note:** Variant fields like `tags`, `material`, `brand`, and `featured` are applied to the automatically created default variant, not the product itself.

##### Example Request Body

**Complete Product Creation with All E-commerce Fields:**

```json
{
  "name": "Lanto Turkish Sofa Bed",
  "description": "Stylish Lanto Turkish sofa bed offering exceptional comfort and durability. Ideal for modern homes with space-saving needs. Easy-to-use conversion mechanism.",
  "category_id": "123e4567-e89b-12d3-a456-426614174111",
  "base_price": 799.99,
  "delivery_info": {
    "min_days": 3,
    "max_days": 4,
    "text": "3 To 4 Days Delivery",
    "shipping_method": "standard",
    "free_shipping_threshold": 500
  },
  "warranty_info": "2 year manufacturer warranty included",
  "care_instructions": "Clean with damp cloth. Avoid direct sunlight. Professional cleaning recommended for tough stains.",
  "assembly_required": true,
  "assembly_instructions": "Assembly instructions included in package. Professional assembly available for additional fee.",
  "default_color": "Blue",
  "default_size": "3 Seater",
  "initial_stock": 10,
  "default_sku": "LANTO-BLU-3S",
  "compare_price": 959.99,
  "weight_kg": 45.5,
  "dimensions": {
    "width": {"cm": 215, "inches": 84.65},
    "depth": {"cm": 96, "inches": 37.80},
    "height": {"cm": 88, "inches": 34.65},
    "seat_width": {"cm": 180, "inches": 70.87},
    "seat_depth": {"cm": 56, "inches": 22.05},
    "seat_height": {"cm": 52, "inches": 20.47},
    "bed_width": {"cm": 180, "inches": 70.87},
    "bed_length": {"cm": 110, "inches": 43.31}
  },
  "payment_options": [
    {
      "provider": "klarna",
      "type": "installment",
      "installments": 3,
      "amount_per_installment": 266.66,
      "total_amount": 799.99,
      "description": "Make 3 Payments Of $266.66"
    }
  ],
  "tags": "turkish sofa bed,convertible,modern,comfortable",
  "material": "Premium Fabric",
  "brand": "SofaDeal",
  "featured": true
}
```

**Minimal Example (Required Fields Only):**

```json
{
  "name": "Simple Product",
  "base_price": 299.99
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/products/admin/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "name": "Modern Living Room Sofa",
    "description": "Comfortable modern sofa for your living room",
    "category_id": "123e4567-e89b-12d3-a456-426614174111",
    "base_price": 799.99,
    "tags": "modern,comfortable,living room",
    "material": "Premium Fabric",
    "brand": "SofaDeal",
    "featured": true,
    "default_color": "White",
    "default_size": "4 feet",
    "initial_stock": 10
  }'
```

#### Response

##### 201: Created

**Complete Product Creation Response:**

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Lanto Turkish Sofa Bed",
  "description": "Stylish Lanto Turkish sofa bed offering exceptional comfort and durability. Ideal for modern homes with space-saving needs. Easy-to-use conversion mechanism.",
  "category_id": "123e4567-e89b-12d3-a456-426614174111",
  "base_price": 799.99,
  "delivery_info": {
    "min_days": 3,
    "max_days": 4,
    "text": "3 To 4 Days Delivery",
    "shipping_method": "standard",
    "free_shipping_threshold": 500
  },
  "warranty_info": "2 year manufacturer warranty included",
  "care_instructions": "Clean with damp cloth. Avoid direct sunlight. Professional cleaning recommended for tough stains.",
  "assembly_required": true,
  "assembly_instructions": "Assembly instructions included in package. Professional assembly available for additional fee.",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z",
  "default_variant": {
    "id": "123e4567-e89b-12d3-a456-426614174222",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "sku": "LANTO-BLU-3S",
    "price": 799.99,
    "compare_price": 959.99,
    "discount_percentage": 17,
    "color": "Blue",
    "size": "3 Seater",
    "stock": 10,
    "weight_kg": 45.5,
    "dimensions": {
      "width": {"cm": 215, "inches": 84.65},
      "depth": {"cm": 96, "inches": 37.80},
      "height": {"cm": 88, "inches": 34.65},
      "seat_width": {"cm": 180, "inches": 70.87},
      "seat_depth": {"cm": 56, "inches": 22.05},
      "seat_height": {"cm": 52, "inches": 20.47},
      "bed_width": {"cm": 180, "inches": 70.87},
      "bed_length": {"cm": 110, "inches": 43.31}
    },
    "payment_options": [
      {
        "provider": "klarna",
        "type": "installment",
        "installments": 3,
        "amount_per_installment": 266.66,
        "total_amount": 799.99,
        "description": "Make 3 Payments Of $266.66"
      }
    ],
    "tags": "turkish sofa bed,convertible,modern,comfortable",
    "material": "Premium Fabric",
    "brand": "SofaDeal",
    "featured": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["name must be a string", "name should not be empty", "base_price must be a positive number"],
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

### 3.14. Update Product

Update an existing product.

> **Visibility Management:** Use this endpoint to toggle a product's visibility by updating the `is_visible` field. Setting it to `false` will hide the product from all public API endpoints while keeping it in the database.

#### Request

```
PUT /products/admin/products/:id
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Request Body

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| name        | string  | No       | Name of the product                   |
| description | string  | No       | Description of the product            |
| category_id | UUID    | No       | Category ID the product belongs to    |
| base_price  | number  | No       | Base price of the product             |

> **Note:** The fields `tags`, `material`, `brand`, and `featured` have been moved to the product_variants table and should be updated via the Update Variant endpoint instead.

##### Example Request Body

```json
{
  "name": "Updated Modern Living Room Sofa",
  "base_price": 899.99
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/products/admin/products/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "name": "Updated Modern Living Room Sofa",
    "base_price": 899.99,
    "tags": "modern,comfortable,premium,living room",
    "featured": true,
    "is_visible": true
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Modern Living Room Sofa",
  "description": "Comfortable modern sofa for your living room",
  "category_id": "123e4567-e89b-12d3-a456-426614174111",
  "base_price": 899.99,
  "is_visible": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["name must be a string", "base_price must be a positive number"],
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
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.15. Delete Product

Delete an existing product.

#### Request

```
DELETE /products/admin/products/:id
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/products/admin/products/123e4567-e89b-12d3-a456-426614174000"
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "name": "Updated Modern Living Room Sofa",
  "description": "Comfortable modern sofa for your living room",
  "category_id": "123e4567-e89b-12d3-a456-426614174111",
  "base_price": 899.99,
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
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.16. Get Variant by ID

Retrieve details of a specific product variant by ID.

#### Request

```
GET /products/variants/:id
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Variant ID  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/variants/123e4567-e89b-12d3-a456-426614174222" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "product_id": 1,
  "sku": "SOFA-001-RED-L",
  "price": 899.99,
  "size": "Large",
  "color": "Red",
  "stock": 10,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Variant with ID 1 not found",
  "error": "Not Found"
}
```

### 3.17. Get 360° View Images

Retrieve 360° view images of a specific product.

#### Request

```
GET /products/:id/images/360
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/123e4567-e89b-12d3-a456-426614174000/images/360" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "product_id": 1,
    "variant_id": null,
    "url": "https://example.com/images/sofa1-360-1.jpg",
    "type": "360-view",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "product_id": 1,
    "variant_id": null,
    "url": "https://example.com/images/sofa1-360-2.jpg",
    "type": "360-view",
    "order": 2,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.18. Get Variant Images

Retrieve images of a specific product variant.

#### Request

```
GET /products/variants/:id/images
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Variant ID  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/variants/123e4567-e89b-12d3-a456-426614174222/images" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "product_id": 1,
    "variant_id": 1,
    "url": "https://example.com/images/sofa1-red.jpg",
    "type": "gallery",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": 2,
    "product_id": 1,
    "variant_id": 1,
    "url": "https://example.com/images/sofa1-red-2.jpg",
    "type": "gallery",
    "order": 2,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Variant with ID 1 not found",
  "error": "Not Found"
}
```

### 3.19. Get Products with Low Stock

Retrieve products with low stock.

#### Request

```
GET /products/admin/products/low-stock
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Query Parameters

| Parameter | Type    | Required | Description            | Default |
|-----------|---------|----------|------------------------|---------|
| threshold | integer | No       | Stock level threshold to consider low  | 5       |
| limit     | integer | No       | Number of products to return  | 20      |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/admin/products/low-stock?threshold=5&limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "name": "Modern Living Room Sofa",
    "description": "Comfortable modern sofa for your living room",
    "category_id": "123e4567-e89b-12d3-a456-426614174111",
    "base_price": 799.99,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "variants": [
      {
        "id": 1,
        "product_id": 1,
        "sku": "SOFA-001-RED-L",
        "price": 899.99,
        "size": "Large",
        "color": "Red",
        "stock": 5,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ],
    "images": [
      {
        "id": 1,
        "product_id": 1,
        "variant_id": null,
        "url": "https://example.com/images/sofa1.jpg",
        "type": "main",
        "order": 1,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ]
  }
]
```

### 3.20. Create Product Variant

Create a new product variant.

#### Request

```
POST /products/admin/products/:id/variants
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Product ID  |

##### Request Body

| Field           | Type    | Required | Description                                   |
|-----------------|---------|----------|-----------------------------------------------|
| sku             | string  | Yes      | Stock Keeping Unit (SKU)                      |
| price           | number  | Yes      | Price of the variant                          |
| compare_price   | number  | No       | Original price for showing discounts          |
| size            | string  | No       | Size of the variant                           |
| color           | string  | No       | Color of the variant                          |
| stock           | integer | Yes      | Quantity of the variant                       |
| weight_kg       | number  | No       | Weight in kilograms for shipping              |
| dimensions      | object  | No       | Complete dimensional data (CM + Inches)       |
| payment_options | array   | No       | Available payment options (e.g., Klarna)      |
| tags            | string  | No       | Comma-separated tags for the variant          |
| material        | string  | No       | Material of the variant                       |
| brand           | string  | No       | Brand of the variant                          |
| featured        | boolean | No       | Whether the variant should be featured        |
| is_visible      | boolean | No       | Controls variant visibility in all public endpoints | |

> **Note:** The `discount_percentage` field is automatically calculated when you provide both `price` and `compare_price`.

##### Example Request Body

**Complete Variant with All E-commerce Fields:**

```json
{
  "sku": "LANTO-NAV-3S",
  "price": 849.99,
  "compare_price": 999.99,
  "size": "3 Seater",
  "color": "Navy",
  "stock": 8,
  "weight_kg": 47.2,
  "dimensions": {
    "width": {"cm": 220, "inches": 86.61},
    "depth": {"cm": 98, "inches": 38.58},
    "height": {"cm": 90, "inches": 35.43},
    "seat_width": {"cm": 185, "inches": 72.83},
    "seat_depth": {"cm": 58, "inches": 22.83},
    "seat_height": {"cm": 54, "inches": 21.26},
    "bed_width": {"cm": 185, "inches": 72.83},
    "bed_length": {"cm": 115, "inches": 45.28}
  },
  "payment_options": [
    {
      "provider": "klarna",
      "type": "installment",
      "installments": 3,
      "amount_per_installment": 283.33,
      "total_amount": 849.99,
      "description": "Make 3 Payments Of $283.33"
    }
  ],
  "tags": "turkish sofa bed,convertible,navy,premium",
  "material": "Premium Fabric",
  "brand": "SofaDeal",
  "featured": false
}
```

**Minimal Example (Required Fields Only):**

```json
{
  "sku": "SIMPLE-VARIANT-001",
  "price": 299.99,
  "stock": 5
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/products/admin/products/123e4567-e89b-12d3-a456-426614174000/variants" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "sku": "SOFA-001-RED-L",
    "price": 899.99,
    "size": "Large",
    "color": "Red",
    "stock": 10
  }'
```

#### Response

##### 201: Created

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174222",
  "product_id": "123e4567-e89b-12d3-a456-426614174000",
  "sku": "SOFA-001-RED-L",
  "price": 899.99,
  "size": "Large",
  "color": "Red",
  "stock": 10,
  "tags": "modern,comfortable,living room",
  "material": "Premium Fabric",
  "brand": "SofaDeal",
  "featured": true,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["sku must be a string", "sku should not be empty", "price must be a positive number", "stock must be a positive number"],
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
  "message": "Product with ID 1 not found",
  "error": "Not Found"
}
```

### 3.21. Update Product Variant

Update an existing product variant.

#### Request

```
PUT /products/admin/variants/:id
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Variant ID  |

##### Request Body

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| sku         | string  | No       | Stock Keeping Unit (SKU)               |
| price       | number  | No       | Price of the variant                   |
| size        | string  | No       | Size of the variant                    |
| color       | string  | No       | Color of the variant                    |
| stock       | integer | No       | Quantity of the variant                |

##### Example Request Body

```json
{
  "sku": "SOFA-001-RED-L",
  "price": 899.99,
  "size": "Large",
  "color": "Red",
  "stock": 10
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/products/admin/variants/123e4567-e89b-12d3-a456-426614174222" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "sku": "SOFA-001-RED-L",
    "price": 899.99,
    "size": "Large",
    "color": "Red",
    "stock": 10
  }'
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "product_id": 1,
  "sku": "SOFA-001-RED-L",
  "price": 899.99,
  "size": "Large",
  "color": "Red",
  "stock": 10,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["sku must be a string", "sku should not be empty", "price must be a positive number", "stock must be a positive number"],
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
  "message": "Variant with ID 1 not found",
  "error": "Not Found"
}
```

### 3.22. Delete Product Variant

Delete an existing product variant.

#### Request

```
DELETE /products/admin/variants/:id
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Variant ID  |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/products/admin/variants/123e4567-e89b-12d3-a456-426614174222" \
  -H "Authorization: Bearer {your_access_token}"
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "product_id": 1,
  "sku": "SOFA-001-RED-L",
  "price": 899.99,
  "size": "Large",
  "color": "Red",
  "stock": 10,
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
  "message": "Variant with ID 1 not found",
  "error": "Not Found"
}
```

### 3.23. Update Variant Stock

Update the stock of a specific product variant.

#### Request

```
PUT /products/admin/variants/:id/stock
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Variant ID  |

##### Request Body

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| stock       | integer | Yes      | New quantity of the variant            |

##### Example Request Body

```json
{
  "stock": 10
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/products/admin/variants/123e4567-e89b-12d3-a456-426614174222/stock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {your_access_token}" \
  -d '{
    "stock": 10
  }'
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "product_id": 1,
  "sku": "SOFA-001-RED-L",
  "price": 899.99,
  "size": "Large",
  "color": "Red",
  "stock": 10,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["stock must be a positive number"],
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
  "message": "Variant with ID 1 not found",
  "error": "Not Found"
}
```

### 3.24. Upload Product Images

Upload one or multiple product images. Supports both direct URL input and multiple file uploads with automatic image compression, optimization, and cleanup of temporary files.

#### Request

**Multiple Files Upload:**
```
POST /products/admin/products/:id/images
```

**Single File Upload (Backward Compatibility):**
```
POST /products/admin/products/:id/image
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Request Body (Multipart Form)

**Multiple File Upload:**

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| imageFiles  | file[]  | Yes*     | Multiple image files to upload (up to 10 files) (*Either url or imageFiles must be provided) |
| type        | string  | Yes      | Image type (e.g., "main", "gallery", "360") |
| order       | integer | No       | Starting order for images (auto-calculated based on existing images if not provided) |

**Single File Upload (Backward Compatibility):**

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| imageFile   | file    | Yes*     | Single image file to upload (*Either url or imageFile must be provided) |
| type        | string  | Yes      | Image type (e.g., "main", "gallery", "360") |
| order       | integer | No       | Starting order for images (auto-calculated based on existing images if not provided) |

**Note**: Validation occurs at the controller level after file processing, ensuring proper file upload handling.

##### Request Body (JSON)

When providing a direct URL:

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| url         | string  | Yes*     | URL of the image (*Either url or file upload must be provided) |
| type        | string  | Yes      | Image type (e.g., "main", "gallery", "360") |
| order       | integer | No       | Starting order for images (auto-calculated based on existing images if not provided) |

##### Curl Example (Multiple File Upload)

```bash
curl -X POST "http://localhost:4000/products/admin/products/123e4567-e89b-12d3-a456-426614174000/images" \
  -F "imageFiles=@/path/to/image1.jpg" \
  -F "imageFiles=@/path/to/image2.jpg" \
  -F "imageFiles=@/path/to/image3.jpg" \
  -F "type=gallery" \
  -F "order=1"
```

##### Curl Example (Single File Upload - Backward Compatibility)

```bash
curl -X POST "http://localhost:4000/products/admin/products/123e4567-e89b-12d3-a456-426614174000/image" \
  -F "imageFile=@/path/to/your/image.jpg" \
  -F "type=main" \
  -F "order=1"
```

##### Curl Example (Direct URL)

```bash
curl -X POST "http://localhost:4000/products/admin/products/123e4567-e89b-12d3-a456-426614174000/images" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/images/sofa1.jpg",
    "type": "main",
    "order": 1
  }'
```

#### Response

##### 201: Created

**Multiple Images Upload Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174333",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": null,
    "url": "https://example.com/images/sofa1_optimized.webp",
    "type": "gallery",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174334",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": null,
    "url": "https://example.com/images/sofa2_optimized.webp",
    "type": "gallery",
    "order": 2,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174335",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": null,
    "url": "https://example.com/images/sofa3_optimized.webp",
    "type": "gallery",
    "order": 3,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

**Single Image Upload Response (Backward Compatibility):**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174333",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": null,
    "url": "https://example.com/images/sofa1_optimized.webp",
    "type": "main",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["Either url or imageFile must be provided", "type must be a string", "type should not be empty", "order must be a number"],
  "error": "Bad Request"
}
```

### 3.25. Upload Variant Images

Upload one or multiple variant images. Supports both direct URL input and multiple file uploads with automatic image compression, optimization, and cleanup of temporary files.

#### Request

**Multiple Files Upload:**
```
POST /products/admin/variants/:id/images
```

**Single File Upload (Backward Compatibility):**
```
POST /products/admin/variants/:id/image
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Request Body (Multipart Form)

**Multiple File Upload:**

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| imageFiles  | file[]  | Yes*     | Multiple image files to upload (up to 10 files) (*Either url or imageFiles must be provided) |
| type        | string  | Yes      | Image type (e.g., "gallery")          |
| order       | integer | No       | Starting order for images (auto-calculated based on existing variant images if not provided) |

**Single File Upload (Backward Compatibility):**

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| imageFile   | file    | Yes*     | Single image file to upload (*Either url or imageFile must be provided) |
| type        | string  | Yes      | Image type (e.g., "gallery")          |
| order       | integer | No       | Starting order for images (auto-calculated based on existing variant images if not provided) |

**Note**: Validation occurs at the controller level after file processing, ensuring proper file upload handling.

##### Request Body (JSON)

When providing a direct URL:

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| url         | string  | Yes*     | URL of the image (*Either url or file upload must be provided) |
| type        | string  | Yes      | Image type (e.g., "gallery")          |
| order       | integer | No       | Starting order for images (auto-calculated based on existing variant images if not provided) |

##### Curl Example (Multiple File Upload)

```bash
curl -X POST "http://localhost:4000/products/admin/variants/123e4567-e89b-12d3-a456-426614174222/images" \
  -F "imageFiles=@/path/to/variant1.jpg" \
  -F "imageFiles=@/path/to/variant2.jpg" \
  -F "imageFiles=@/path/to/variant3.jpg" \
  -F "type=gallery" \
  -F "order=1"
```

##### Curl Example (Single File Upload - Backward Compatibility)

```bash
curl -X POST "http://localhost:4000/products/admin/variants/123e4567-e89b-12d3-a456-426614174222/image" \
  -F "imageFile=@/path/to/your/image.jpg" \
  -F "type=gallery" \
  -F "order=1"
```

##### Curl Example (Direct URL)

```bash
curl -X POST "http://localhost:4000/products/admin/variants/123e4567-e89b-12d3-a456-426614174222/images" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/images/sofa1-red.jpg",
    "type": "gallery",
    "order": 1
  }'
```

#### Response

##### 201: Created

**Multiple Images Upload Response:**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174333",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": "123e4567-e89b-12d3-a456-426614174222",
    "url": "https://example.com/images/variant1_optimized.webp",
    "type": "gallery",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174334",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": "123e4567-e89b-12d3-a456-426614174222",
    "url": "https://example.com/images/variant2_optimized.webp",
    "type": "gallery",
    "order": 2,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174335",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": "123e4567-e89b-12d3-a456-426614174222",
    "url": "https://example.com/images/variant3_optimized.webp",
    "type": "gallery",
    "order": 3,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

**Single Image Upload Response (Backward Compatibility):**

```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174333",
    "product_id": "123e4567-e89b-12d3-a456-426614174000",
    "variant_id": "123e4567-e89b-12d3-a456-426614174222",
    "url": "https://example.com/images/sofa1-red_optimized.webp",
    "type": "gallery",
    "order": 1,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
]
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["Either url or imageFile must be provided", "type must be a string", "type should not be empty", "order must be a number"],
  "error": "Bad Request"
}
```

### 3.26. Update Image Details

Update details of an existing product image.

#### Request

```
PUT /products/admin/images/:id
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Request Body

| Field       | Type    | Required | Description                           |
|-------------|---------|----------|---------------------------------------|
| type        | string  | No       | Image type (e.g., "main", "gallery") |
| order       | integer | No       | Image order                           |

##### Example Request Body

```json
{
  "type": "main",
  "order": 1
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/products/admin/images/123e4567-e89b-12d3-a456-426614174333" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "main",
    "order": 1
  }'
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "product_id": 1,
  "variant_id": null,
  "url": "https://example.com/images/sofa1.jpg",
  "type": "main",
  "order": 1,
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["type must be a string", "order must be a number"],
  "error": "Bad Request"
}
```

### 3.27. Delete Image

Delete an existing product image.

#### Request

```
DELETE /products/admin/images/:id
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | UUID    | Yes      | Image ID    |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/products/admin/images/123e4567-e89b-12d3-a456-426614174333"
```

#### Response

##### 200: OK

```json
{
  "id": 1,
  "product_id": 1,
  "variant_id": null,
  "url": "https://example.com/images/sofa1.jpg",
  "type": "main",
  "order": 1,
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
  "message": "Image with ID 1 not found",
  "error": "Not Found"
}
```

### 3.27. Get Search Initialization Data

Retrieve all products with their variants and category information for client-side search functionality. This endpoint is designed to provide comprehensive data for building a local search index on the frontend.

#### Request

```
GET /products/search-init-data
```

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/search-init-data" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "products": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Modern Living Room Sofa",
      "description": "Comfortable modern sofa for your living room",
      "category_id": "123e4567-e89b-12d3-a456-426614174111",
      "base_price": 799.99,
      "tags": "modern,comfortable,living room",
      "material": "Premium Fabric",
      "brand": "SofaDeal",
      "featured": true,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "category": {
        "id": "123e4567-e89b-12d3-a456-426614174111",
        "name": "Living Room",
        "slug": "living-room",
        "parent_id": null,
        "description": "Furniture for your living room",
        "order": 1,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      },
      "variants": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174222",
          "product_id": "123e4567-e89b-12d3-a456-426614174000",
          "sku": "SOFA-001-RED-L",
          "price": 899.99,
          "size": "Large",
          "color": "Red",
          "stock": 10,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ],
      "images": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174333",
          "product_id": "123e4567-e89b-12d3-a456-426614174000",
          "variant_id": null,
          "url": "https://example.com/images/sofa1.jpg",
          "type": "main",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ],
  "categories": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Living Room",
      "slug": "living-room",
      "parent_id": null,
      "description": "Furniture for your living room",
      "order": 1,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "children": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174444",
          "name": "Sofas",
          "slug": "sofas",
          "parent_id": "123e4567-e89b-12d3-a456-426614174111",
          "description": "Comfortable sofas for your living room",
          "order": 1,
          "created_at": "2023-01-01T00:00:00Z",
          "updated_at": "2023-01-01T00:00:00Z"
        }
      ]
    }
  ]
}
```

### 3.28. Bulk Import Products from CSV

Import multiple products and their variants from a CSV file.

#### Request

```
POST /products/admin/import
```

##### Authentication

No authentication required (Authentication has been temporarily disabled).

##### Request Body (multipart/form-data)

| Field            | Type    | Required | Description                                   |
|------------------|---------|----------|-----------------------------------------------|
| file             | file    | Yes      | CSV file containing products and variants     |
| createCategories | boolean | No       | Create categories if they don't exist (default: true) |
| skipErrors       | boolean | No       | Continue import if errors are encountered (default: true) |

##### CSV Format

The CSV file should have the following columns:

| Column          | Required | Description                                   |
|-----------------|----------|-----------------------------------------------|
| name            | Yes      | Product name                                  |
| description     | No       | Product description                           |
| base_price      | Yes      | Base price of the product                     |
| category_name   | No       | Category name/path (e.g., "Furniture/Living Room/Sofas") |
| sku             | Yes      | Stock Keeping Unit (must be unique)           |
| variant_price   | No       | Price of this specific variant (if different from base_price) |
| color           | No       | Color of the variant                          |
| size            | No       | Size of the variant                           |
| stock           | Yes      | Stock quantity                                |
| product_images  | No       | Comma-separated URLs of product images        |
| variant_images  | No       | Comma-separated URLs of variant images        |
| tags            | No       | Comma-separated tags                          |
| material        | No       | Material information                          |
| brand           | No       | Brand name                                    |
| featured        | No       | Whether the product is featured (true/false)  |

##### CSV Example

```
name,description,base_price,category_name,sku,color,size,stock,product_images
Modern Sofa,"Comfortable modern sofa",799.99,"Furniture/Living Room/Sofas",SOFA-001-BLK,Black,3 Seater,10,https://example.com/images/sofa1.jpg
Modern Sofa,"Comfortable modern sofa",799.99,"Furniture/Living Room/Sofas",SOFA-001-RED,Red,3 Seater,5,
Modern Sofa,"Comfortable modern sofa",799.99,"Furniture/Living Room/Sofas",SOFA-001-BLU,Blue,2 Seater,8,
Dining Table,"Elegant dining table",499.99,"Furniture/Dining Room",TABLE-001,Oak,6 Seater,12,https://example.com/images/table1.jpg
```

##### Important Notes

1. Products with the same name will be treated as the same product with different variants
2. Each row represents one product variant
3. The `category_name` can include the full path separated by slashes
4. If `createCategories` is true, missing categories will be created automatically
5. If `skipErrors` is true, rows with errors will be skipped, and the import will continue

##### Curl Example

```bash
curl -X POST "http://localhost:4000/products/admin/import" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/products.csv" \
  -F "createCategories=true" \
  -F "skipErrors=true"
```

#### Response

##### 201: Created

```json
{
  "totalRows": 4,
  "successfulImports": 4,
  "failedImports": 0,
  "errors": [],
  "importedProducts": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Modern Sofa",
      "sku": "SOFA-001-BLK"
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Dining Table",
      "sku": "TABLE-001"
    }
  ]
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Failed to parse CSV file: Invalid CSV format",
  "error": "Bad Request"
}
```

or with specific row errors when `skipErrors` is false:

```json
{
  "statusCode": 400,
  "message": "Error at row 3: Duplicate SKU: \"SOFA-001-RED\" already exists",
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

### 3.5. Get New Arrivals

Retrieve a list of recently added products for showcasing on the homepage or "New Arrivals" sections. This endpoint has been optimized to return only essential data for better performance.

**Important:** This endpoint returns products ordered by their creation date (`created_at` timestamp) in descending order (newest first). Products can be filtered by time period to show arrivals from specific timeframes.

#### Request

```
GET /products/new-arrivals
```

##### Query Parameters

| Parameter       | Type    | Required | Description                                           | Default |
|-----------------|---------|----------|-------------------------------------------------------|---------|
| limit           | integer | No       | Number of new arrival products to return              | 8       |
| period          | string  | No       | Time period to consider ('week', 'month', 'year', 'all') | 'all'   |
| includeCategory | boolean | No       | Include category details in response                  | true    |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/products/new-arrivals?limit=8&period=month&includeCategory=true" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

**Optimized Response Structure:**
- Products ordered by creation date (newest first)
- Only essential product fields (id, name, category_id, base_price, created_at)
- Only main image (id, url)
- Essential variant fields for cart/wishlist functionality
- Category info (id, name, slug) when requested

**When new arrivals exist:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174003",
    "name": "Luxury Ottoman Bed",
    "category_id": "123e4567-e89b-12d3-a456-426614174111",
    "base_price": 1199.99,
    "created_at": "2023-12-01T10:30:00Z",
    "main_image": {
      "id": "123e4567-e89b-12d3-a456-426614174336",
      "url": "https://example.com/images/luxury-ottoman-bed.jpg"
    },
    "default_variant": {
      "id": "123e4567-e89b-12d3-a456-426614174225",
      "sku": "OTTO-LUX-KNG-BLK",
      "price": 1299.99,
      "color": "Black",
      "size": "King",
      "stock": 12,
      "featured": true
    },
    "category": {
      "id": "123e4567-e89b-12d3-a456-426614174111",
      "name": "Ottoman Beds",
      "slug": "ottoman-beds"
    }
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174004",
    "name": "Contemporary Dining Set",
    "category_id": "123e4567-e89b-12d3-a456-426614174222",
    "base_price": 899.99,
    "created_at": "2023-11-28T14:15:00Z",
    "main_image": {
      "id": "123e4567-e89b-12d3-a456-426614174337",
      "url": "https://example.com/images/contemporary-dining-set.jpg"
    },
    "default_variant": {
      "id": "123e4567-e89b-12d3-a456-426614174226",
      "sku": "DINING-CONT-6S-OAK",
      "price": 899.99,
      "color": "Oak",
      "size": "6 Seater",
      "stock": 8,
      "featured": false
    },
    "category": {
      "id": "123e4567-e89b-12d3-a456-426614174222",
      "name": "Dining Sets",
      "slug": "dining-sets"
    }
  }
]
```

**When no new arrivals exist in the specified period:**
```json
[]
```

**Key Features:**
- ✅ **Time-based filtering**: Supports week, month, year, or all-time periods
- ✅ **Newest first**: Products ordered by creation date (most recent first)
- ✅ **Empty array**: Returns `[]` when no products found in specified period
- ✅ **Optimized payload**: Only essential data for homepage display
- ✅ **Creation timestamp**: Includes `created_at` for transparency
- ✅ **Variant priority**: Featured variants prioritized as `default_variant`

**Note:** This endpoint helps showcase the latest additions to your product catalog. The `created_at` timestamp is included in the response to show when each product was added to the system.