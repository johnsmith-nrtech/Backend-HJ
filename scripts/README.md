# MyAirBridge Products Upload Script

This script automatically uploads all products from the MyAirBridge folder structure to your SofaDeal e-commerce platform using the existing API endpoints.

## Features

✅ **Comprehensive Product Creation**
- Creates products with complete e-commerce data
- Generates realistic dummy data for missing fields
- Maps products to correct categories automatically

✅ **Image Management**
- Uploads all product images with proper categorization
- Sets first image as 'main', others as 'gallery'
- Maintains proper image ordering

✅ **Category Mapping**
- Turkish Sofas → Sofa Beds Category
- Poland Sofas → Sofa Sets Category  
- Luxury Sofas → Corner Sofas Category
- Frame Beds → Beds & Spring Boxes Category

✅ **API Integration**
- Uses existing `/products/admin/products` endpoints
- Uses existing `/products/admin/products/:id/images` endpoints
- Same process as manual product creation

## Product Catalog Overview

### Turkish Sofas (7 products)
- Verona Turkish Sofa Bed
- Sunset Turkish Sofa Bed
- Orion Turkish Sofa Bed
- Nisa Turkish Sofa Bed
- Milton Turkish Sofa Bed
- Lanto Turkish Sofa Bed
- Elisa Turkish Sofa Bed

### Poland Sofas (5 products)
- Luca (Luck) Modular Sofa
- Laguna (Karvina) Corner Sofa
- Denver Contemporary Sofa
- Berlin (London) Classic Sofa
- Artic (Art) Designer Sofa

### Luxury Sofas (4 collections)
- Aurora Luxury Sofa Collection
- Chestnut Luxury Sofa Set
- Esma U-Shape Luxury Sofa
- Florence Premium Sofa Collection

### Frame Beds (4 types)
- Upholstered Cube Frame Bed
- Pannel Frame Bed
- Horizon Frame Bed
- Chesterfield Frame Bed

## Prerequisites

1. **Node.js** (version 14 or higher)
2. **Running SofaDeal API server** (default: http://localhost:4000)
3. **MyAirBridge images folder** in `docs/myairbridge-AW2acMVeeJI/`

## Installation

1. Navigate to the scripts directory:
```bash
cd scripts
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Before running the script, update the configuration in `upload-myairbridge-products.js`:

```javascript
const CONFIG = {
  // Update this to match your server URL
  API_BASE_URL: 'http://localhost:4000',
  
  // Update if your images are stored elsewhere
  IMAGES_BASE_PATH: path.join(__dirname, '../docs/myairbridge-AW2acMVeeJI'),
  
  // Update if using different image storage
  IMAGE_BASE_URL: 'https://your-supabase-url.supabase.co/storage/v1/object/public/product-images/'
};
```

### Important Configuration Notes:

1. **API_BASE_URL**: Must match your running server
2. **IMAGES_BASE_PATH**: Must point to the correct MyAirBridge folder
3. **IMAGE_BASE_URL**: Update with your actual image storage URL
4. **Category IDs**: Pre-configured based on your `all_categories.json`

## Usage

### Run the Upload Script

```bash
# Using npm script
npm run upload

# Or directly with Node.js
node upload-myairbridge-products.js
```

### Expected Output

```
🚀 Starting MyAirBridge Products Upload
====================================
📂 Base path: /path/to/docs/myairbridge-AW2acMVeeJI
🌐 API URL: http://localhost:4000
🏷️  Brand: SofaDeal

🗂️  Processing category: TURKISH SOFAS
============================================================

📦 Processing product: Verona Turkish Sofa Bed
✅ Created product: Verona Turkish Sofa Bed
📸 Found 8 images for Verona Turkish Sofa Bed
  ✅ Uploaded image 1/8: Verona Turkish Sofa Bed Listing-01.webp
  ✅ Uploaded image 2/8: Verona Turkish Sofa Bed Listing-02.webp
  ...

🎉 Upload Complete!
==================
📊 Total products processed: 20
✅ Successful uploads: 20
❌ Failed uploads: 0
📈 Success rate: 100.0%
```

## Product Data Structure

Each product includes:

### Basic Information
- Name, description, category mapping
- Base price with compare price for discounts
- SKU generation (auto-generated)
- Brand: "SofaDeal"

### E-commerce Features
- **Delivery Info**: Random delivery timeframes (2-7 days)
- **Warranty**: 2-year manufacturer warranty
- **Care Instructions**: Standard furniture care
- **Assembly**: Required with instructions
- **Payment Options**: Klarna 3-installment plans

### Product Variants
- Default variant with standard color/size
- Stock levels: 5-20 units (randomized)
- Weight and dimensions where available
- Tags, materials, and branding

### Images
- First image set as "main" type
- Remaining images set as "gallery" type
- Proper ordering maintained
- All images from respective folders

## Error Handling

The script includes comprehensive error handling:

- **Missing folders**: Warns and continues
- **API failures**: Logs error details and continues
- **Missing images**: Creates product without images
- **Network issues**: Provides detailed error messages

## Troubleshooting

### Common Issues

1. **"Base images path does not exist"**
   - Check that `docs/myairbridge-AW2acMVeeJI/` folder exists
   - Update `IMAGES_BASE_PATH` in configuration

2. **"Failed to create product"**
   - Ensure API server is running
   - Check API_BASE_URL configuration
   - Verify category IDs exist in database

3. **"Failed to upload image"**
   - Check image file permissions
   - Verify IMAGE_BASE_URL configuration
   - Ensure Supabase storage is configured

### Debug Mode

Add console.log statements for debugging:

```javascript
// Add after line 200 in the script
console.log('Debug - Product payload:', JSON.stringify(payload, null, 2));
```

## File Structure

```
scripts/
├── upload-myairbridge-products.js  # Main upload script
├── package.json                    # Dependencies
└── README.md                      # This file

docs/myairbridge-AW2acMVeeJI/       # Required images folder
├── TURKISH SOFAS/
├── Poland Sofa Listing New size 800 x 1200/
├── Luxury Sofas sets/
└── Frame Beds/
```

## API Endpoints Used

The script uses the same endpoints as manual product creation:

1. **Create Product**: `POST /products/admin/products`
2. **Upload Image**: `POST /products/admin/products/:id/images`

## Customization

### Adding New Products

Update the `PRODUCT_CATALOG` object in the script:

```javascript
'TURKISH SOFAS': [
  {
    name: 'New Turkish Sofa',
    folder: 'New Turkish Sofa Folder',
    description: 'Description...',
    base_price: 999.99,
    // ... other properties
  }
]
```

### Modifying Default Values

Update the generator functions:

- `generateDeliveryInfo()` - Delivery options
- `generatePaymentOptions()` - Payment plans
- `generateSKU()` - SKU generation logic

### Category Mappings

Update `CATEGORY_MAPPINGS` to use different categories:

```javascript
CATEGORY_MAPPINGS: {
  'TURKISH SOFAS': 'your-category-id-here',
  // ... other mappings
}
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the script logs for specific error messages
3. Verify your API server and database are running
4. Ensure all file paths and URLs are correct

## License

MIT License - Feel free to modify and adapt for your needs. 