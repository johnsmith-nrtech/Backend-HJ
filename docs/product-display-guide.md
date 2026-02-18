# Product Display Guide: Handling Variants & Dynamic Information

## Overview

This guide provides instructions for frontend developers on how to properly handle product variants and update product information dynamically based on user selections. When implementing the product detail page, it's crucial to ensure that variant attributes (color, size, material) properly filter each other and that all product information (dimensions, price, availability, images) updates correctly.

## Table of Contents

- [API Endpoint: GET /products/:id](#api-endpoint-get-productsid)
- [Understanding Product Variant Structure](#understanding-product-variant-structure)
- [Implementing the UI Components](#implementing-the-ui-components)
- [Dynamic Information Updates](#dynamic-information-updates)
- [Variant Filtering Logic](#variant-filtering-logic)
- [Image Management](#image-management)
- [Displaying Product & Variant Images from GET /products/:id](#displaying-product-\-variant-images-from-get-productsid)
- [Handling Out-of-Stock Variants](#handling-out-of-stock-variants)
- [Adding to Cart and Checkout](#adding-to-cart-and-checkout)
- [Example Implementation](#example-implementation)

## API Endpoint: GET /products/:id

### Endpoint Details

To fetch a product with all its variants, use the following endpoint:

```
GET /products/:id
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id        | UUID | Yes      | Product ID  |

#### Query Parameters

| Parameter       | Type    | Required | Description                                | Default |
|-----------------|---------|----------|--------------------------------------------|----------|
| includeVariants | boolean | No       | Include product variants in response       | true    |
| includeImages   | boolean | No       | Include product images in response         | true    |
| includeCategory | boolean | No       | Include category details in response       | false   |

### Example Request

```javascript
// Fetch product with ID, including variants, images, and category
const fetchProduct = async (productId) => {
  try {
    const response = await fetch(
      `/products/${productId}?includeVariants=true&includeImages=true&includeCategory=true`, 
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Error fetching product: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch product:', error);
    throw error;
  }
};
```

### Response Structure

The response includes the complete product data with all its variants, dimensions, and other details:

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Lanto Turkish Sofa Bed",
  "description": "Stylish Lanto Turkish sofa bed offering exceptional comfort and durability.",
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
  "care_instructions": "Clean with damp cloth. Avoid direct sunlight.",
  "assembly_required": true,
  "assembly_instructions": "Assembly instructions included in package.",
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
      "material": "Premium Fabric",
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
          "description": "Make 3 Payments Of £266.66"
        }
      ]
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174223",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "sku": "LANTO-RED-2S",
      "price": 699.99,
      "compare_price": 859.99,
      "discount_percentage": 19,
      "size": "2 Seater",
      "color": "Red",
      "material": "Premium Fabric",
      "stock": 5,
      "dimensions": {
        "width": {"cm": 180, "inches": 70.87},
        "depth": {"cm": 96, "inches": 37.80},
        "height": {"cm": 88, "inches": 34.65}
      }
    }
  ],
  "images": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174333",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "variant_id": null,
      "url": "https://example.com/images/lanto-sofa-main.jpg",
      "type": "main",
      "order": 1
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174334",
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "variant_id": "123e4567-e89b-12d3-a456-426614174222",
      "url": "https://example.com/images/lanto-sofa-blue.jpg",
      "type": "gallery",
      "order": 2
    }
  ],
  "category": {
    "id": "123e4567-e89b-12d3-a456-426614174111",
    "name": "Sofa Beds",
    "slug": "sofa-beds",
    "parent_id": "123e4567-e89b-12d3-a456-426614174444",
    "description": "Convertible furniture for modern living"
  }
}
```

### Important API Response Notes

1. **Variant Structure**: Each variant contains its specific color, size, material, price, stock level, and dimensions.

2. **Images**: Images can be associated with:
   - The entire product (`variant_id: null`) - these are general product images
   - A specific variant (`variant_id: [UUID]`) - these show the specific color/material

3. **Dimensions**: Dimension data may vary between variants:
   - Some variants may have complete dimension details (width, height, depth, etc.)
   - Others might have only basic dimensions
   - All dimensions include both metric (cm) and imperial (inches) units when available

4. **Payment Options**: Some variants may include special payment options like installment plans

5. **Inconsistent Data**: Not all variants will have the same level of detail. Your frontend code should handle missing fields gracefully.

## Understanding Product Variant Structure

In our system, a product can have multiple variants, each with its own:

- **Color**: Visual appearance (e.g., Grey, Red, Blue)
- **Size**: Product size/dimensions (e.g., 1 Seater, 2 Seater, 3 Seater) 
- **Material**: Fabric type (e.g., Premium Fabric, Leather, Velvet)

Each variant has a unique combination of these attributes, with its own:

- SKU
- Price
- Stock availability
- Dimensions
- Images
- Payment options

### Key Point: Not All Combinations Exist

For example, a sofa product might have:
- Grey color in 1 Seater and 2 Seater sizes
- Red color only in 1 Seater size

The frontend must intelligently show only valid combinations based on the user's selections.

## Implementing the UI Components

Your product detail page should include these key components:

1. **Primary Image Display**: Shows the main image of the current variant selection
2. **Image Gallery**: Additional images for the selected variant
3. **Variant Selectors**:
   - Color selector (usually visual swatches)
   - Size selector (text buttons or dropdown)
   - Material selector (text buttons or dropdown)
4. **Product Information**:
   - Price
   - Dimensions
   - Stock availability
   - Delivery information
   - Payment options

## Fetching Product Data

Use the `GET /products/:id` endpoint to retrieve comprehensive product information:

```javascript
// Fetch product by ID with variants, images, and category info
const fetchProductDetails = async (productId) => {
  try {
    const response = await fetch(
      `http://localhost:4000/products/${productId}?includeVariants=true&includeImages=true&includeCategory=true`
    );
    
    if (!response.ok) {
      throw new Error('Product not found');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching product details:', error);
    throw error;
  }
};
```

## Variant Filtering Logic

### Understanding Variant Relationships and Dependencies

Before diving into code, it's important to understand how variant attributes relate to each other:

1. **Hierarchical Relationships**: In most furniture products, color is typically the primary attribute, followed by size, then material. This means when a user selects a color, they're limiting the available sizes and materials.

2. **Incomplete Combinations**: Not all combinations exist. For example, the "Grey" color might come in "1 Seater" and "2 Seater" sizes, while the "Red" color might only be available in "1 Seater". This is why dynamic filtering is essential.

3. **Real-time Dependency Updates**: When a user selects one attribute (e.g., color), the UI must immediately update to show only valid options for the other attributes (size, material).

### The User Experience Flow

A well-implemented variant selection system should work as follows:

1. **Initial Load**: When the page loads, all available variants are analyzed to extract unique colors, sizes, and materials.

2. **First Selection**: User selects a color (e.g., Grey)
   - System filters variants to only those with Grey color
   - Available sizes are updated (e.g., only 1 Seater and 2 Seater remain selectable)
   - Available materials are updated based on Grey variants

3. **Second Selection**: User selects a size (e.g., 2 Seater)
   - System further filters to Grey + 2 Seater variants
   - Available materials are updated again, now only showing materials available in Grey 2 Seater

4. **Final Display**: The system displays the exact variant matching all selected attributes, updating:
   - Price and stock
   - Dimensions
   - Images specific to this variant
   - Payment options

Follow these steps to implement proper variant filtering:

### 1. Organize Variants by Attributes

When the product data loads, organize variants into mappings for efficient filtering:

```javascript
const organizeVariantData = (product) => {
  // Extract unique values for each attribute
  const colors = [...new Set(product.variants.map(v => v.color))];
  const sizes = [...new Set(product.variants.map(v => v.size))];
  const materials = [...new Set(product.variants.map(v => v.material))];
  
  // Create lookup maps for filtering
  const variantsByColor = {};
  const variantsBySize = {};
  const variantsByMaterial = {};
  
  // Populate lookup maps
  colors.forEach(color => { variantsByColor[color] = product.variants.filter(v => v.color === color); });
  sizes.forEach(size => { variantsBySize[size] = product.variants.filter(v => v.size === size); });
  materials.forEach(material => { variantsByMaterial[material] = product.variants.filter(v => v.material === material); });
  
  return {
    colors,
    sizes,
    materials,
    variantsByColor,
    variantsBySize,
    variantsByMaterial,
    allVariants: product.variants
  };
};
```

### 2. Filtering Available Options Based on Selection

When a user selects a color, update available sizes and materials based on that selection:

```javascript
const updateAvailableOptions = (selectedColor, selectedSize, selectedMaterial) => {
  // Start with all variants
  let filteredVariants = [...allVariants];
  
  // Apply color filter if selected
  if (selectedColor) {
    filteredVariants = filteredVariants.filter(v => v.color === selectedColor);
  }
  
  // Apply size filter if selected
  if (selectedSize) {
    filteredVariants = filteredVariants.filter(v => v.size === selectedSize);
  }
  
  // Apply material filter if selected
  if (selectedMaterial) {
    filteredVariants = filteredVariants.filter(v => v.material === selectedMaterial);
  }
  
  // Get available options based on current filters
  const availableColors = [...new Set(filteredVariants.map(v => v.color))];
  const availableSizes = [...new Set(filteredVariants.map(v => v.size))];
  const availableMaterials = [...new Set(filteredVariants.map(v => v.material))];
  
  return {
    availableColors,
    availableSizes,
    availableMaterials,
    filteredVariants
  };
};
```

### 3. Finding the Currently Selected Variant

Determine which specific variant to display based on selections:

```javascript
const findSelectedVariant = (selectedColor, selectedSize, selectedMaterial, allVariants) => {
  // Find exact match for all selected attributes
  const exactMatch = allVariants.find(v => 
    v.color === selectedColor && 
    v.size === selectedSize && 
    v.material === selectedMaterial
  );
  
  if (exactMatch) return exactMatch;
  
  // If no exact match, try to find best partial match
  // This helps when user has only selected some attributes
  
  // Priority: Color > Size > Material
  if (selectedColor) {
    // Try to match color + size
    if (selectedSize) {
      const colorSizeMatch = allVariants.find(v => 
        v.color === selectedColor && v.size === selectedSize
      );
      if (colorSizeMatch) return colorSizeMatch;
    }
    
    // Try to match color + material
    if (selectedMaterial) {
      const colorMaterialMatch = allVariants.find(v => 
        v.color === selectedColor && v.material === selectedMaterial
      );
      if (colorMaterialMatch) return colorMaterialMatch;
    }
    
    // Try just color
    const colorMatch = allVariants.find(v => v.color === selectedColor);
    if (colorMatch) return colorMatch;
  }
  
  // Default to first variant if nothing else matches
  return allVariants[0];
};
```

## Dynamic Information Updates

### How Product Information Changes Between Variants

When a user selects different variants, multiple aspects of the product display need to update simultaneously:

1. **Price and Availability**: Each variant can have its own price and stock level. The price shown should always match the currently selected variant, and the stock availability message should update accordingly.

2. **Dimensions**: This is particularly important for furniture products. Different sizes of the same product will have completely different dimensions. For example, a "1 Seater" sofa will have smaller width dimensions compared to a "3 Seater" version.

3. **Images**: Each variant might have its own set of images showing the specific color, material, or size. The image gallery should update to show only images relevant to the current selection.

4. **Payment Options**: Financing options like Klarna payments might differ based on the variant's price.

5. **Shipping Information**: Delivery timeframes and costs might vary based on the variant's size and weight.

### Challenge: Inconsistent Data Formats

A key challenge in e-commerce systems is handling inconsistent data across variants:

- Some variants might have detailed dimension information with both metric and imperial units
- Others might only have basic dimensions or only one unit system
- Some might be missing certain measurement fields altogether (e.g., has width and height but no depth)

Your code must be resilient enough to handle these inconsistencies without breaking the UI.

When a variant is selected, update all product information:

```javascript
const updateProductDisplay = (variant) => {
  // Update price
  document.getElementById('product-price').textContent = `£${variant.price.toFixed(2)}`;
  
  // Update stock status
  const stockElement = document.getElementById('stock-status');
  stockElement.textContent = variant.stock > 0 ? `In Stock (${variant.stock} available)` : 'Out of Stock';
  stockElement.className = variant.stock > 0 ? 'in-stock' : 'out-of-stock';
  
  // Update dimensions - handle potential inconsistency in dimension format
  if (variant.dimensions) {
    // Create a dimension rendering helper function
    const renderDimension = (dimensionObj, defaultText = 'N/A') => {
      if (!dimensionObj) return defaultText;
      if (dimensionObj.cm && dimensionObj.inches) {
        return `${dimensionObj.cm}cm / ${dimensionObj.inches}"`;  
      } else if (dimensionObj.cm) {
        return `${dimensionObj.cm}cm`;
      } else if (dimensionObj.inches) {
        return `${dimensionObj.inches}"`;
      }
      return defaultText;
    };
    
    // Clear all dimension elements first
    const dimensionElements = document.querySelectorAll('.dimension-value');
    dimensionElements.forEach(el => el.textContent = 'N/A');
    
    // Create a dimensions container
    const dimensionsContainer = document.getElementById('dimensions-container');
    dimensionsContainer.innerHTML = '';
    
    // Dynamically generate dimension rows for whatever fields exist
    const dimensionFields = [
      { key: 'width', label: 'Width' },
      { key: 'depth', label: 'Depth' },
      { key: 'height', label: 'Height' },
      { key: 'seat_width', label: 'Seat Width' },
      { key: 'seat_depth', label: 'Seat Depth' },
      { key: 'seat_height', label: 'Seat Height' },
      { key: 'arm_height', label: 'Arm Height' },
      { key: 'leg_height', label: 'Leg Height' }
    ];
    
    // Special case for bed dimensions
    if (variant.dimensions.bed_width && variant.dimensions.bed_length) {
      dimensionFields.push({ 
        key: 'bed_dimensions', 
        label: 'Bed Size',
        customRender: () => {
          const width = renderDimension(variant.dimensions.bed_width, 'N/A');
          const length = renderDimension(variant.dimensions.bed_length, 'N/A');
          return `${width} × ${length}`;
        }
      });
    }
    
    // Render each dimension that exists in the variant
    dimensionFields.forEach(field => {
      // Skip if the dimension doesn't exist
      if (field.key === 'bed_dimensions' || variant.dimensions[field.key]) {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        const valueCell = document.createElement('td');
        
        labelCell.textContent = field.label + ':';
        labelCell.className = 'dimension-label';
        
        valueCell.className = 'dimension-value';
        if (field.customRender) {
          valueCell.innerHTML = field.customRender();
        } else {
          valueCell.textContent = renderDimension(variant.dimensions[field.key]);
        }
        
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        dimensionsContainer.appendChild(row);
      }
    });
  } else {
    // No dimensions available
    document.getElementById('dimensions-section').style.display = 'none';
  }
  
  // Update payment options if available
  if (variant.payment_options && variant.payment_options.length > 0) {
    const paymentOptionsContainer = document.getElementById('payment-options');
    paymentOptionsContainer.innerHTML = '';
    
    variant.payment_options.forEach(option => {
      const optionElement = document.createElement('div');
      optionElement.className = 'payment-option';
      optionElement.textContent = option.description;
      paymentOptionsContainer.appendChild(optionElement);
    });
  }
  
  // Enable/disable Add to Cart button based on stock
  const addToCartButton = document.getElementById('add-to-cart');
  addToCartButton.disabled = variant.stock <= 0;
};
```

## Image Management

### Variant-Specific vs. Product-Level Images

In our e-commerce system, images can be associated with:

1. **The product as a whole** (variant_id = null): These are general images that apply to all variants, typically showing the product from different angles in a default color/configuration.

2. **A specific variant** (variant_id = [variant UUID]): These images show the exact color, material, or size selected by the user.

When a user changes variants (e.g., switches from Grey to Red color), the image gallery should update to show the images specific to that variant. However, if a variant doesn't have its own dedicated images, the system should fall back to the product's general images.

### Image Priority and Organization

Images have different types and priorities:

1. **Main images** (type = 'main'): The primary image shown in the large viewer
2. **Gallery images** (type = 'gallery'): Additional views shown in the thumbnail gallery
3. **360° images** (type = '360'): Used for 360-degree product viewers if available

The order field determines the sequence in which images appear, with lower numbers appearing first.

Update images when variants change:

```javascript
const updateProductImages = (product, variant, allImages) => {
  // Get images for this specific variant
  const variantImages = allImages.filter(img => img.variant_id === variant.id);
  
  // If no variant-specific images, use product's main images
  const productImages = allImages.filter(img => img.variant_id === null);
  
  // Determine which images to show (prioritize variant images if available)
  const imagesToDisplay = variantImages.length > 0 ? variantImages : productImages;
  
  // Update main image
  const mainImage = imagesToDisplay.find(img => img.type === 'main') || imagesToDisplay[0];
  document.getElementById('main-product-image').src = mainImage.url;
  
  // Update gallery
  const galleryContainer = document.getElementById('image-gallery');
  galleryContainer.innerHTML = '';
  
  imagesToDisplay.forEach(image => {
    const imgElement = document.createElement('img');
    imgElement.src = image.url;
    imgElement.alt = product.name;
    imgElement.onclick = () => { document.getElementById('main-product-image').src = image.url; };
    galleryContainer.appendChild(imgElement);
  });
};
```

### Displaying Product & Variant Images from GET /products/:id

Use the product-detail response to decide which images to show. Images exist at two levels:

- Product-level: `variant_id = null` (applies to all variants)
- Variant-level: `variant_id = <variant UUID>` (specific to a color/size/material)

Simple rules aligned with our current code:

- Initial load: show product-level images. Use `type` for priority (display `main` in the large viewer, then `gallery` thumbnails by `order`).
- When a variant is selected: prefer that variant’s images (`variant_id === selectedVariant.id`). If present, use its `main` (or first) as the large image; thumbnails are the rest, sorted by `order`.
- Fallback: if the selected variant has no images, fall back to product-level images so the gallery is never empty.
- Optional combine: after showing variant images, you may append product-level gallery images for extra context. Keep each group’s `order`.
- Special: if any item has `type = '360'`, expose a separate 360-view trigger.

#### Example response (as provided)

```json
{
    "id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
    "name": "Chestnut Sofa Corner",
    "description": "Stylish Chestnut Sofa Corner offering exceptional comfort and durability. Ideal for modern homes with space-saving needs. Easy-to-use conversion mechanism.",
    "category_id": "945e50b8-3606-473c-961e-b9de946b70f5",
    "base_price": 899.9,
    "created_at": "2025-07-23T17:29:11.383942+00:00",
    "updated_at": "2025-07-23T17:52:48.988+00:00",
    "search_vector": "'chestnut':1A,5B 'comfort':10B 'convers':26B 'corner':3A,7B 'durabl':12B 'easi':23B 'easy-to-us':22B 'except':9B 'home':16B 'ideal':13B 'mechan':27B 'modern':15B 'need':21B 'offer':8B 'save':20B 'sofa':2A,6B 'space':19B 'space-sav':18B 'stylish':4B 'use':25B",
    "delivery_info": {
        "text": "3 to 5 Days Delivery",
        "max_days": 5,
        "min_days": 3
    },
    "warranty_info": null,
    "care_instructions": null,
    "assembly_required": false,
    "assembly_instructions": "Yes, instructions included",
    "is_visible": true,
    "variants": [
        {
            "id": "63f02c51-5ba0-4991-908c-574cd3e139d2",
            "sku": "945-Florence Sofa 3+2+1-Beige",
            "size": "normal",
            "tags": null,
            "brand": null,
            "color": "Beige",
            "price": 899.99,
            "stock": 10,
            "featured": false,
            "material": null,
            "weight_kg": null,
            "created_at": "2025-07-23T17:47:11.448574+00:00",
            "dimensions": {},
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:47:11.448574+00:00",
            "compare_price": null,
            "payment_options": [],
            "discount_percentage": 0
        },
        {
            "id": "4ff94bdd-78d2-4567-a1be-11dfecae4d78",
            "sku": "LANTO-BLU-3S",
            "size": "3 Seater",
            "tags": "turkish sofa bed,convertible,modern,comfortable",
            "brand": "SofaDeal",
            "color": "Grey",
            "price": 799.99,
            "stock": 10,
            "featured": true,
            "material": "Premium Fabric",
            "weight_kg": null,
            "created_at": "2025-07-23T17:29:12.088836+00:00",
            "dimensions": {},
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:29:12.088836+00:00",
            "compare_price": null,
            "payment_options": [],
            "discount_percentage": 0
        },
        {
            "id": "add11185-506e-42e5-9248-60a0c617eb1c",
            "sku": "945-Florence Sofa 3+2+1-Mocha",
            "size": "normal",
            "tags": null,
            "brand": null,
            "color": "Mocha",
            "price": 899.99,
            "stock": 10,
            "featured": false,
            "material": null,
            "weight_kg": null,
            "created_at": "2025-07-23T17:48:35.085231+00:00",
            "dimensions": {},
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:48:35.085231+00:00",
            "compare_price": null,
            "payment_options": [],
            "discount_percentage": 0
        }
    ],
    "images": [
        {
            "id": "b4882abe-4a20-4896-8e4b-b497c06bced7",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/4ff94bdd-78d2-4567-a1be-11dfecae4d78/gallery/1753292558432-Florence%20Sofa%203+2+1%20Grey%20seater%20Listing-05_optimized.webp",
            "type": "gallery",
            "order": 1,
            "created_at": "2025-07-23T17:42:44.744926+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:42:44.744926+00:00",
            "variant_id": "4ff94bdd-78d2-4567-a1be-11dfecae4d78"
        },
        {
            "id": "92662c32-e4d6-47be-bc98-9c6554a55ca3",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/4ff94bdd-78d2-4567-a1be-11dfecae4d78/gallery/1753292565945-Florence%20Sofa%203+2+1%20Grey%20seater%20Listing-06_optimized.webp",
            "type": "gallery",
            "order": 2,
            "created_at": "2025-07-23T17:42:48.002941+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:42:48.002941+00:00",
            "variant_id": "4ff94bdd-78d2-4567-a1be-11dfecae4d78"
        },
        {
            "id": "ae2ea33b-e185-4e72-9cde-56648f5b1a3d",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/4ff94bdd-78d2-4567-a1be-11dfecae4d78/gallery/1753292569802-Florence%20Sofa%203+2+1%20Grey%20seater%20Listing-07_optimized.webp",
            "type": "gallery",
            "order": 3,
            "created_at": "2025-07-23T17:42:50.905861+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:42:50.905861+00:00",
            "variant_id": "4ff94bdd-78d2-4567-a1be-11dfecae4d78"
        },
        {
            "id": "00da80ac-2196-4265-9885-c459b4daa740",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/4ff94bdd-78d2-4567-a1be-11dfecae4d78/gallery/1753292573144-Florence%20Sofa%203+2+1%20Grey%20seater%20Listing-02_optimized.webp",
            "type": "gallery",
            "order": 4,
            "created_at": "2025-07-23T17:42:54.944935+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:42:54.944935+00:00",
            "variant_id": "4ff94bdd-78d2-4567-a1be-11dfecae4d78"
        },
        {
            "id": "5f7700ef-a45a-4295-b3b4-8647332bb689",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/4ff94bdd-78d2-4567-a1be-11dfecae4d78/gallery/1753292576324-Florence%20Sofa%203+2+1%20Grey%20seater%20Listing-03_optimized.webp",
            "type": "gallery",
            "order": 5,
            "created_at": "2025-07-23T17:42:57.307013+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:42:57.307013+00:00",
            "variant_id": "4ff94bdd-78d2-4567-a1be-11dfecae4d78"
        },
        {
            "id": "e91caa25-cc83-4d6b-b6f5-7effeb0c70f4",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/4ff94bdd-78d2-4567-a1be-11dfecae4d78/gallery/1753292578274-Florence%20Sofa%203+2+1%20Grey%20seater%20Listing-04_optimized.webp",
            "type": "gallery",
            "order": 6,
            "created_at": "2025-07-23T17:42:59.577324+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:42:59.577324+00:00",
            "variant_id": "4ff94bdd-78d2-4567-a1be-11dfecae4d78"
        },
        {
            "id": "1b20d11f-458a-439b-aa3e-4d06157a1b19",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/main/1753292593816-Florence%20Sofa%203+2+1%20Grey%20seater%20Listing-01_optimized.webp",
            "type": "main",
            "order": 1,
            "created_at": "2025-07-23T17:43:14.85092+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:43:14.85092+00:00",
            "variant_id": null
        },
        {
            "id": "aa768b74-cc19-4632-aed9-ecc3faa85a5e",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/63f02c51-5ba0-4991-908c-574cd3e139d2/gallery/1753292877212-Florence%20Sofa%203+2+1%20Beige%20seater%20Listing-05_optimized.webp",
            "type": "gallery",
            "order": 1,
            "created_at": "2025-07-23T17:47:58.993897+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:47:58.993897+00:00",
            "variant_id": "63f02c51-5ba0-4991-908c-574cd3e139d2"
        },
        {
            "id": "54d261e8-cd71-45b1-ab83-811759056e3d",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/63f02c51-5ba0-4991-908c-574cd3e139d2/gallery/1753292879623-Florence%20Sofa%203+2+1%20Beige%20seater%20Listing-06_optimized.webp",
            "type": "gallery",
            "order": 2,
            "created_at": "2025-07-23T17:48:01.758287+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:48:01.758287+00:00",
            "variant_id": "63f02c51-5ba0-4991-908c-574cd3e139d2"
        },
        {
            "id": "6201de3c-8e99-4f58-802d-894852e1a497",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/63f02c51-5ba0-4991-908c-574cd3e139d2/gallery/1753292882586-Florence%20Sofa%203+2+1%20Beige%20seater%20Listing-02_optimized.webp",
            "type": "gallery",
            "order": 3,
            "created_at": "2025-07-23T17:48:03.687809+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:48:03.687809+00:00",
            "variant_id": "63f02c51-5ba0-4991-908c-574cd3e139d2"
        },
        {
            "id": "de6928fd-4beb-4746-81e9-3e2785ed233a",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/63f02c51-5ba0-4991-908c-574cd3e139d2/gallery/1753292884082-Florence%20Sofa%203+2+1%20Beige%20seater%20Listing-07_optimized.webp",
            "type": "gallery",
            "order": 4,
            "created_at": "2025-07-23T17:48:05.341256+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:48:05.341256+00:00",
            "variant_id": "63f02c51-5ba0-4991-908c-574cd3e139d2"
        },
        {
            "id": "89b0357f-215c-491c-89cc-069dbb59ed29",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/63f02c51-5ba0-4991-908c-574cd3e139d2/gallery/1753292885734-Florence%20Sofa%203+2+1%20Beige%20seater%20Listing-03_optimized.webp",
            "type": "gallery",
            "order": 5,
            "created_at": "2025-07-23T17:48:06.650966+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:48:06.650966+00:00",
            "variant_id": "63f02c51-5ba0-4991-908c-574cd3e139d2"
        },
        {
            "id": "da452090-25ce-4574-8f4f-d8c2e1243876",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/63f02c51-5ba0-4991-908c-574cd3e139d2/gallery/1753292887251-Florence%20Sofa%203+2+1%20Beige%20seater%20Listing-04_optimized.webp",
            "type": "gallery",
            "order": 6,
            "created_at": "2025-07-23T17:48:08.19653+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:48:08.19653+00:00",
            "variant_id": "63f02c51-5ba0-4991-908c-574cd3e139d2"
        },
        {
            "id": "a54119f4-b6d5-4ffc-a65a-ef4ee62575bc",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/63f02c51-5ba0-4991-908c-574cd3e139d2/gallery/1753292888403-Florence%20Sofa%203+2+1%20Beige%20seater%20Listing-01_optimized.webp",
            "type": "gallery",
            "order": 7,
            "created_at": "2025-07-23T17:48:09.234004+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:48:09.234004+00:00",
            "variant_id": "63f02c51-5ba0-4991-908c-574cd3e139d2"
        },
        {
            "id": "16b81201-9460-46ba-986b-359fcd0fb4a6",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/add11185-506e-42e5-9248-60a0c617eb1c/gallery/1753292995232-Florence%20Sofa%203+2+1%20Mocha%20seater%20Listing-05_optimized.webp",
            "type": "gallery",
            "order": 1,
            "created_at": "2025-07-23T17:49:59.149609+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:49:59.149609+00:00",
            "variant_id": "add11185-506e-42e5-9248-60a0c617eb1c"
        },
        {
            "id": "cf78b45a-eeec-4c22-884d-2886c795934f",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/add11185-506e-42e5-9248-60a0c617eb1c/gallery/1753292999636-Florence%20Sofa%203+2+1%20Mocha%20seater%20Listing-06_optimized.webp",
            "type": "gallery",
            "order": 2,
            "created_at": "2025-07-23T17:50:02.08157+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:50:02.08157+00:00",
            "variant_id": "add11185-506e-42e5-9248-60a0c617eb1c"
        },
        {
            "id": "00b6d2b7-77b7-4b63-a6aa-4d3d7acc4425",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/add11185-506e-42e5-9248-60a0c617eb1c/gallery/1753293006511-Florence%20Sofa%203+2+1%20Mocha%20seater%20Listing-03_optimized.webp",
            "type": "gallery",
            "order": 5,
            "created_at": "2025-07-23T17:50:07.621418+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:50:07.621418+00:00",
            "variant_id": "add11185-506e-42e5-9248-60a0c617eb1c"
        },
        {
            "id": "ecb70824-24b7-4303-95a1-2cb7edffc168",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/add11185-506e-42e5-9248-60a0c617eb1c/gallery/1753293009054-Florence%20Sofa%203+2+1%20Mocha%20seater%20Listing-01_optimized.webp",
            "type": "gallery",
            "order": 7,
            "created_at": "2025-07-23T17:50:09.946982+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:50:09.946982+00:00",
            "variant_id": "add11185-506e-42e5-9248-60a0c617eb1c"
        },
        {
            "id": "f7472f1f-6ef3-422b-9cae-7b0e179f61a9",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/add11185-506e-42e5-9248-60a0c617eb1c/gallery/1753293002536-Florence%20Sofa%203+2+1%20Mocha%20seater%20Listing-07_optimized.webp",
            "type": "gallery",
            "order": 3,
            "created_at": "2025-07-23T17:50:04.337846+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:50:04.337846+00:00",
            "variant_id": "add11185-506e-42e5-9248-60a0c617eb1c"
        },
        {
            "id": "5b3627a0-10f0-4e85-a2a0-17f9357a7cf9",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/add11185-506e-42e5-9248-60a0c617eb1c/gallery/1753293004664-Florence%20Sofa%203+2+1%20Mocha%20seater%20Listing-02_optimized.webp",
            "type": "gallery",
            "order": 4,
            "created_at": "2025-07-23T17:50:06.290529+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:50:06.290529+00:00",
            "variant_id": "add11185-506e-42e5-9248-60a0c617eb1c"
        },
        {
            "id": "8fc9dc96-392d-4cbf-b31b-fb5fc8e90dda",
            "url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/product-images/products/7259cc0b-7493-4e0f-8f9d-04fa3bdf7661/variants/add11185-506e-42e5-9248-60a0c617eb1c/gallery/1753293007922-Florence%20Sofa%203+2+1%20Mocha%20seater%20Listing-04_optimized.webp",
            "type": "gallery",
            "order": 6,
            "created_at": "2025-07-23T17:50:08.900094+00:00",
            "product_id": "7259cc0b-7493-4e0f-8f9d-04fa3bdf7661",
            "updated_at": "2025-07-23T17:50:08.900094+00:00",
            "variant_id": "add11185-506e-42e5-9248-60a0c617eb1c"
        }
    ],
    "category": {
        "id": "945e50b8-3606-473c-961e-b9de946b70f5",
        "name": "Corner Sofas",
        "slug": "corner-sofas",
        "order": 2,
        "featured": true,
        "image_url": "https://kxycnvwrxfxpqgsusftj.supabase.co/storage/v1/object/public/category-images/categories/1753196827259-Corner%20Sofa%20big_optimized.webp",
        "parent_id": null,
        "created_at": "2025-05-20T18:51:43.890684+00:00",
        "updated_at": "2025-05-20T18:51:43.890684+00:00",
        "description": "L-shaped sofas designed to maximize seating in your living space"
    }
}
```

## Handling Out-of-Stock Variants

### The UX Challenge of Stock Availability

Handling out-of-stock variants requires balancing several UX considerations:

1. **Transparency**: Users need to clearly see which variants are available and which are not
2. **Discoverability**: Out-of-stock variants should still be visible so users know they exist
3. **Expectation Management**: Users should understand why they can't select certain options

### Three Stock States for Variants

Variant options can exist in three states that should be visually distinct:

1. **Available and In Stock**: The option is selectable and can be purchased
2. **Available but Out of Stock**: The option exists for this product but is currently unavailable for purchase
3. **Unavailable Combination**: The option doesn't exist in combination with other selected attributes

For example, if Grey + 2 Seater exists but is out of stock, it should be shown as "Out of Stock" but still visible. If Grey + 4 Seater doesn't exist at all as a product configuration, that option should be hidden or disabled.

### How Stock Affects the User Flow

1. **Selection Phase**: Out-of-stock variants are visible but marked as unavailable
2. **Add to Cart**: The Add to Cart button should be disabled for out-of-stock variants
3. **Stock Notifications**: Consider offering a "Notify when available" feature for out-of-stock items

Clearly indicate when variants are out of stock:

```javascript
const renderVariantOptions = (type, options, selectedValue, availableOptions, inStockOptions) => {
  const container = document.getElementById(`${type}-options`);
  container.innerHTML = '';
  
  options.forEach(option => {
    const optionElement = document.createElement('button');
    optionElement.textContent = option;
    optionElement.value = option;
    
    // Check if this option is available based on other selections
    const isAvailable = availableOptions.includes(option);
    
    // Check if this option is in stock
    const isInStock = inStockOptions.includes(option);
    
    // Set appropriate classes
    optionElement.className = 'variant-option';
    if (option === selectedValue) optionElement.classList.add('selected');
    if (!isAvailable) optionElement.classList.add('unavailable');
    if (!isInStock) optionElement.classList.add('out-of-stock');
    
    // Disable if unavailable
    optionElement.disabled = !isAvailable;
    
    // Add label for out of stock
    if (isAvailable && !isInStock) {
      const outOfStockBadge = document.createElement('span');
      outOfStockBadge.className = 'out-of-stock-badge';
      outOfStockBadge.textContent = 'Out of Stock';
      optionElement.appendChild(outOfStockBadge);
    }
    
    // Add click event handler
    optionElement.addEventListener('click', () => {
      if (isAvailable) {
        updateSelection(type, option);
      }
    });
    
    container.appendChild(optionElement);
  });
};
```

## Example Implementation

Here's how to tie everything together in a React component (pseudo-code):

```jsx
import React, { useState, useEffect } from 'react';

const ProductDetail = ({ productId }) => {
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState({ allVariants: [] });
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availableOptions, setAvailableOptions] = useState({
    colors: [],
    sizes: [],
    materials: [],
  });
  
  // Fetch product data on component mount
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const data = await fetchProductDetails(productId);
        setProduct(data);
        
        // Organize variant data
        const variantData = organizeVariantData(data);
        setVariants(variantData);
        
        // Set initial available options
        setAvailableOptions({
          colors: variantData.colors,
          sizes: variantData.sizes,
          materials: variantData.materials
        });
        
        // Set initial selections (default to first available for each)
        if (variantData.colors.length) setSelectedColor(variantData.colors[0]);
        if (variantData.sizes.length) setSelectedSize(variantData.sizes[0]);
        if (variantData.materials.length) setSelectedMaterial(variantData.materials[0]);
      } catch (error) {
        console.error('Error loading product:', error);
      }
    };
    
    loadProduct();
  }, [productId]);
  
  // Update available options and selected variant when selections change
  useEffect(() => {
    if (!product || !variants.allVariants.length) return;
    
    // Update available options based on current selections
    const { availableColors, availableSizes, availableMaterials, filteredVariants } = 
      updateAvailableOptions(selectedColor, selectedSize, selectedMaterial, variants.allVariants);
    
    setAvailableOptions({ 
      colors: availableColors, 
      sizes: availableSizes, 
      materials: availableMaterials 
    });
    
    // Find the best matching variant
    const variant = findSelectedVariant(
      selectedColor, 
      selectedSize, 
      selectedMaterial, 
      variants.allVariants
    );
    
    setSelectedVariant(variant);
  }, [product, variants, selectedColor, selectedSize, selectedMaterial]);
  
  // Update displayed information when selected variant changes
  useEffect(() => {
    if (selectedVariant && product) {
      // Update price, dimensions, stock status, etc.
      updateProductDisplay(selectedVariant);
      
      // Update images
      updateProductImages(product, selectedVariant, product.images);
    }
  }, [selectedVariant, product]);
  
  // Handler for when user changes a selection
  const handleSelectionChange = (type, value) => {
    switch (type) {
      case 'color':
        setSelectedColor(value);
        break;
      case 'size':
        setSelectedSize(value);
        break;
      case 'material':
        setSelectedMaterial(value);
        break;
    }
  };
  
  if (!product) return <div>Loading...</div>;
  
  return (
    <div className="product-detail">
      <div className="product-images">
        <img id="main-product-image" src="" alt={product.name} />
        <div id="image-gallery" className="image-gallery"></div>
      </div>
      
      <div className="product-info">
        <h1>{product.name}</h1>
        <div id="product-price" className="price"></div>
        <div id="stock-status" className="stock-status"></div>
        
        <div className="variant-selectors">
          {/* Color selector */}
          <div className="variant-selector">
            <h3>Color</h3>
            <div id="color-options" className="options-container">
              {variants.colors.map(color => (
                <button 
                  key={color}
                  className={`variant-option ${selectedColor === color ? 'selected' : ''} ${
                    !availableOptions.colors.includes(color) ? 'unavailable' : ''
                  }`}
                  disabled={!availableOptions.colors.includes(color)}
                  onClick={() => handleSelectionChange('color', color)}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
          
          {/* Size selector */}
          <div className="variant-selector">
            <h3>Size</h3>
            <div id="size-options" className="options-container">
              {variants.sizes.map(size => (
                <button 
                  key={size}
                  className={`variant-option ${selectedSize === size ? 'selected' : ''} ${
                    !availableOptions.sizes.includes(size) ? 'unavailable' : ''
                  }`}
                  disabled={!availableOptions.sizes.includes(size)}
                  onClick={() => handleSelectionChange('size', size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          {/* Material selector */}
          <div className="variant-selector">
            <h3>Material</h3>
            <div id="material-options" className="options-container">
              {variants.materials.map(material => (
                <button 
                  key={material}
                  className={`variant-option ${selectedMaterial === material ? 'selected' : ''} ${
                    !availableOptions.materials.includes(material) ? 'unavailable' : ''
                  }`}
                  disabled={!availableOptions.materials.includes(material)}
                  onClick={() => handleSelectionChange('material', material)}
                >
                  {material}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="dimensions">
          <h3>Dimensions</h3>
          <table>
            <tbody>
              <tr>
                <td>Width:</td>
                <td id="width"></td>
              </tr>
              <tr>
                <td>Depth:</td>
                <td id="depth"></td>
              </tr>
              <tr>
                <td>Height:</td>
                <td id="height"></td>
              </tr>
              {/* Additional dimension rows as needed */}
            </tbody>
          </table>
        </div>
        
        <div id="payment-options" className="payment-options"></div>
        
        <button id="add-to-cart" className="add-to-cart-button">
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductDetail;
```

## Best Practices

1. **Progressive Selection**: As the user selects one attribute (e.g., color), dynamically update the available options for other attributes.

2. **Visual Indicators**: Clearly show which options are:
   - Selected (highlighted)
   - Available (clickable)
   - Unavailable (disabled/greyed out)
   - Out of stock (marked with badge)

3. **Default Selection**: Always have a default selection for each attribute to ensure a valid variant is always displayed.

4. **Error Handling**: Handle cases where no variants match the selected combination.

5. **Performance**: Organize the data for efficient filtering when product data loads rather than filtering on every selection change.

6. **Responsive Images**: Ensure variant images are responsive and properly sized for different devices.

7. **SEO**: Use proper markup for product variants to help search engines understand your product structure.

## Troubleshooting Common Issues

- **Missing Variant Information**: If a variant is missing certain attributes, fall back to the base product information.

- **Non-existent Combinations**: If user somehow selects a combination that doesn't exist, either reset to a valid combination or show an error message.

- **Image Loading Errors**: Implement error handling for images that fail to load.

- **Out-of-Stock Handling**: Clearly communicate when variants are out of stock, but still allow users to view them.

## Adding to Cart and Checkout

### The Complete Variant Selection to Checkout Flow

The journey from variant selection to successful checkout involves several critical steps that must work together seamlessly:

1. **Variant Selection**: User selects the desired combination of attributes (color, size, material)
2. **Information Display**: System shows the exact price, dimensions, and availability for that variant
3. **Add to Cart**: User adds the specific variant to their cart
4. **Cart Management**: Cart stores the variant ID and its attributes for display
5. **Checkout**: The specific variant ID is passed to the order processing system

### Why Variant IDs Matter Throughout the Process

The variant ID is the critical identifier that must be preserved throughout the shopping experience:

1. **Stock Management**: Each variant has its own inventory count - the system must track which specific variant is being purchased
2. **Order Fulfillment**: Warehouse staff need to know exactly which variant to pick (e.g., "Grey 2 Seater in Premium Fabric")
3. **Customer Expectations**: The customer expects to receive exactly the variant they selected

### Potential Issues When Variant IDs Are Not Handled Properly

1. **Wrong Item Shipped**: If only the product ID is passed without the variant ID, the wrong color or size might be shipped
2. **Inventory Discrepancies**: Stock could be decremented for the wrong variant
3. **Customer Confusion**: Cart might display generic product info without specifying which variant was selected

### Getting the Selected Variant ID

When a user clicks "Add to Cart" or proceeds to checkout, you need to get the currently selected variant's ID. This is essential for adding the correct item to the cart and maintaining accurate inventory.

```javascript
// Handle Add to Cart action
const handleAddToCart = (selectedVariant, quantity = 1) => {
  if (!selectedVariant || selectedVariant.stock <= 0) {
    // Show error or disable button
    return;
  }
  
  // Get the variant ID for cart
  const variantId = selectedVariant.id;
  
  // Add to cart with the variant ID and quantity
  addToCart({
    variantId: variantId,
    productId: selectedVariant.product_id,
    quantity: quantity,
    price: selectedVariant.price,
    name: productName, // From parent product
    attributes: {
      color: selectedVariant.color,
      size: selectedVariant.size,
      material: selectedVariant.material
    }
  });
};

// Example Add to Cart implementation
const addToCart = async (cartItem) => {
  try {
    // First check if product is already in cart to update quantity
    const existingCartItem = cart.find(item => item.variantId === cartItem.variantId);
    
    if (existingCartItem) {
      // Update quantity instead of adding new item
      const response = await fetch('/cart/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cartItemId: existingCartItem.id,
          quantity: existingCartItem.quantity + cartItem.quantity
        })
      });
    } else {
      // Add new item to cart
      const response = await fetch('/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          variantId: cartItem.variantId,
          quantity: cartItem.quantity
        })
      });
    }
    
    // Show confirmation and update cart UI
    showCartNotification(`Added ${cartItem.quantity} ${cartItem.name} to cart`);
    updateCartCounter();
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
};
```

### Displaying Selected Variant Info in Cart

When showing the cart contents, include the selected variant attributes for clarity:

```jsx
// Cart item display example
const CartItem = ({ item }) => {
  return (
    <div className="cart-item">
      <img src={item.imageUrl} alt={item.name} className="cart-item-image" />
      <div className="cart-item-details">
        <h4>{item.name}</h4>
        <div className="cart-item-attributes">
          {item.attributes.color && <span className="attribute">Color: {item.attributes.color}</span>}
          {item.attributes.size && <span className="attribute">Size: {item.attributes.size}</span>}
          {item.attributes.material && <span className="attribute">Material: {item.attributes.material}</span>}
        </div>
        <div className="cart-item-price">
          £{item.price.toFixed(2)} × {item.quantity}
        </div>
      </div>
      <div className="cart-item-subtotal">
        £{(item.price * item.quantity).toFixed(2)}
      </div>
      <button className="remove-item" onClick={() => removeFromCart(item.id)}>Remove</button>
    </div>
  );
};
```

### Sending Variant ID to Checkout

When proceeding to checkout, ensure the variant IDs are correctly passed:

```javascript
const proceedToCheckout = async () => {
  try {
    // Get current cart items with their variant IDs
    const cartItems = await fetchCartItems();
    
    // Create checkout session with all variant IDs and quantities
    const response = await fetch('/checkout/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: cartItems.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity
        }))
      })
    });
    
    const { checkoutUrl } = await response.json();
    
    // Redirect to checkout page
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('Error proceeding to checkout:', error);
  }
};
```

## Conclusion

Implementing proper variant handling is crucial for a good e-commerce user experience. The key is to maintain synchronization between the selected variant and all displayed product information. This guide provides a foundation for creating a robust, user-friendly product detail page that properly handles variants and their dependencies.