#!/usr/bin/env node

/**
 * MyAirBridge Products Upload Script
 * 
 * This script automatically uploads all products from the MyAirBridge folder structure
 * to the SofaDeal e-commerce platform using the existing API endpoints.
 * 
 * Features:
 * - Creates products with comprehensive e-commerce data
 * - Uploads all product images with proper categorization
 * - Maps products to correct categories based on folder structure
 * - Generates realistic dummy data for missing fields
 * - Uses the same endpoints as manual product creation
 * 
 * Usage: node scripts/upload-myairbridge-products.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const CONFIG = {
  // API Base URL - Update this to match your server
  API_BASE_URL: 'http://localhost:4000',
  
  // Base path to the MyAirBridge images folder
  IMAGES_BASE_PATH: path.join(__dirname, '../docs/myairbridge-AW2acMVeeJI'),
  
  // Authentication (required - server requires auth)
  AUTH: {
    // Set to true since authentication is required
    ENABLED: true,
    // Admin credentials for authentication
    EMAIL: 'admin@gmail.com',
    PASSWORD: 'Password123!',
    // Access token (will be obtained automatically)
    ACCESS_TOKEN: null
  },
  
  // Category mappings from folder structure analysis
  CATEGORY_MAPPINGS: {
    'TURKISH SOFAS': '7405b6c7-677d-4299-9bd9-6cf99680d55e', // Sofa Beds
    'Poland Sofa Listing New size 800 x 1200': '7b523d62-056e-4d76-a600-acc92e34c1df', // Sofa Sets  
    'Luxury Sofas sets': '945e50b8-3606-473c-961e-b9de946b70f5', // Corner Sofas
    'Frame Beds': 'af1758c8-2765-4e09-bbb0-5309f6293b6b' // Beds & Spring Boxes
  },
  
  // Default brand for all products
  BRAND: 'SofaDeal'
};

// Product data structure based on folder analysis
const PRODUCT_CATALOG = {
  'TURKISH SOFAS': [
    {
      name: 'Verona Turkish Sofa Bed',
      folder: 'Verona Turkish Sofa Bed',
      description: 'Elegant Verona Turkish sofa bed featuring premium upholstery and smooth conversion mechanism. Perfect for modern homes requiring versatile furniture solutions.',
      base_price: 899.99,
      compare_price: 1099.99,
      tags: 'turkish sofa bed,convertible,elegant,modern,verona',
      material: 'Premium Fabric',
      weight_kg: 48.5,
      dimensions: {
        width: { cm: 220, inches: 86.61 },
        depth: { cm: 95, inches: 37.40 },
        height: { cm: 85, inches: 33.46 },
        seat_width: { cm: 185, inches: 72.83 },
        seat_depth: { cm: 55, inches: 21.65 },
        seat_height: { cm: 50, inches: 19.69 },
        bed_width: { cm: 185, inches: 72.83 },
        bed_length: { cm: 115, inches: 45.28 }
      }
    },
    {
      name: 'Sunset Turkish Sofa Bed',
      folder: 'Sunset Turkish Sofa Bed',
      description: 'Beautiful Sunset Turkish sofa bed with warm color options and exceptional comfort. Features easy conversion and durable construction.',
      base_price: 849.99,
      compare_price: 999.99,
      tags: 'turkish sofa bed,convertible,sunset,comfortable,warm',
      material: 'Premium Fabric',
      weight_kg: 46.2
    },
    {
      name: 'Orion Turkish Sofa Bed',
      folder: 'Orion Turkish Sofa Bed',
      description: 'Sophisticated Orion Turkish sofa bed designed for modern living spaces. Combines style with functionality in a sleek package.',
      base_price: 949.99,
      compare_price: 1149.99,
      tags: 'turkish sofa bed,convertible,orion,sophisticated,modern',
      material: 'Premium Fabric',
      weight_kg: 50.1
    },
    {
      name: 'Nisa Turkish Sofa Bed',
      folder: 'Nisa Turkish Sofa bed',
      description: 'Stylish Nisa Turkish sofa bed offering compact design without compromising on comfort. Ideal for smaller living spaces.',
      base_price: 799.99,
      compare_price: 949.99,
      tags: 'turkish sofa bed,convertible,nisa,compact,stylish',
      material: 'Premium Fabric',
      weight_kg: 44.8
    },
    {
      name: 'Milton Turkish Sofa Bed',
      folder: 'Milton Turkish Sofa Bed',
      description: 'Classic Milton Turkish sofa bed featuring traditional design elements with modern functionality. Built for lasting comfort.',
      base_price: 879.99,
      compare_price: 1029.99,
      tags: 'turkish sofa bed,convertible,milton,classic,traditional',
      material: 'Premium Fabric',
      weight_kg: 47.3
    },
    {
      name: 'Lanto Turkish Sofa Bed',
      folder: 'Lanto Turkish Sofa Bed',
      description: 'Premium Lanto Turkish sofa bed with superior comfort and elegant design. Features high-quality materials and expert craftsmanship.',
      base_price: 929.99,
      compare_price: 1079.99,
      tags: 'turkish sofa bed,convertible,lanto,premium,elegant',
      material: 'Premium Fabric',
      weight_kg: 49.6
    },
    {
      name: 'Elisa Turkish Sofa Bed',
      folder: 'Elisa sofa bed',
      description: 'Charming Elisa Turkish sofa bed combining comfort with contemporary aesthetics. Perfect for modern family homes.',
      base_price: 819.99,
      compare_price: 969.99,
      tags: 'turkish sofa bed,convertible,elisa,charming,contemporary',
      material: 'Premium Fabric',
      weight_kg: 45.7
    }
  ],
  
  'Poland Sofa Listing New size 800 x 1200': [
    {
      name: 'Luca (Luck) Modular Sofa',
      folder: 'Luca (Luck)',
      description: 'Versatile Luca modular sofa system allowing customizable configurations. Premium Polish craftsmanship with modern design aesthetics.',
      base_price: 1299.99,
      compare_price: 1549.99,
      tags: 'modular sofa,polish,customizable,luca,luck,modern',
      material: 'Premium Fabric',
      weight_kg: 52.3
    },
    {
      name: 'Laguna (Karvina) Corner Sofa',
      folder: 'LAGUNA (Karvina)',
      description: 'Spacious Laguna corner sofa perfect for large living areas. Features comfortable seating and elegant European design.',
      base_price: 1199.99,
      compare_price: 1399.99,
      tags: 'corner sofa,polish,laguna,karvina,spacious,european',
      material: 'Premium Fabric',
      weight_kg: 58.7
    },
    {
      name: 'Denver Contemporary Sofa',
      folder: 'Denver',
      description: 'Modern Denver sofa with clean lines and exceptional comfort. Built with high-quality materials for long-lasting durability.',
      base_price: 999.99,
      compare_price: 1199.99,
      tags: 'contemporary sofa,denver,modern,clean lines,durable',
      material: 'Premium Fabric',
      weight_kg: 48.9
    },
    {
      name: 'Berlin (London) Classic Sofa',
      folder: 'Berlin (London)',
      description: 'Timeless Berlin sofa design inspired by London aesthetics. Combines traditional comfort with contemporary style.',
      base_price: 1099.99,
      compare_price: 1299.99,
      tags: 'classic sofa,berlin,london,timeless,traditional,contemporary',
      material: 'Premium Fabric',
      weight_kg: 51.2
    },
    {
      name: 'Artic (Art) Designer Sofa',
      folder: 'Artic (Art)',
      description: 'Artistic Artic sofa featuring unique design elements and premium comfort. A statement piece for discerning homeowners.',
      base_price: 1399.99,
      compare_price: 1649.99,
      tags: 'designer sofa,artic,art,artistic,unique,statement piece',
      material: 'Premium Fabric',
      weight_kg: 54.1
    }
  ],
  
  'Luxury Sofas sets': [
    {
      name: 'Aurora Luxury Sofa Collection',
      folder: '1 Aurora Sofa',
      description: 'Exquisite Aurora luxury sofa collection featuring multiple seating configurations. Premium materials and exceptional craftsmanship.',
      base_price: 1799.99,
      compare_price: 2199.99,
      tags: 'luxury sofa,aurora,collection,premium,exquisite,multiple configurations',
      material: 'Luxury Fabric',
      weight_kg: 65.8
    },
    {
      name: 'Chestnut Luxury Sofa Set',
      folder: '2 Chestnut Sofa',
      description: 'Sophisticated Chestnut luxury sofa set available in multiple color variants. Designed for elegant living spaces.',
      base_price: 1699.99,
      compare_price: 2049.99,
      tags: 'luxury sofa,chestnut,set,sophisticated,elegant,color variants',
      material: 'Luxury Fabric',
      weight_kg: 62.4
    },
    {
      name: 'Esma U-Shape Luxury Sofa',
      folder: '3 Esma Sofa',
      description: 'Magnificent Esma U-shaped luxury sofa perfect for large family gatherings. Ultimate comfort and style combined.',
      base_price: 2299.99,
      compare_price: 2749.99,
      tags: 'luxury sofa,esma,u-shape,family,magnificent,ultimate comfort',
      material: 'Luxury Fabric',
      weight_kg: 78.9
    },
    {
      name: 'Florence Premium Sofa Collection',
      folder: '4 Florence Sofa',
      description: 'Elegant Florence premium sofa collection with various configurations and color options. Italian-inspired design excellence.',
      base_price: 1899.99,
      compare_price: 2299.99,
      tags: 'luxury sofa,florence,premium,collection,italian,design excellence',
      material: 'Luxury Fabric',
      weight_kg: 67.2
    }
  ],
  
  'Frame Beds': [
    {
      name: 'Upholstered Cube Frame Bed',
      folder: 'Upholstered Cube Frame Bed Listing images',
      description: 'Modern upholstered cube frame bed featuring geometric design and premium comfort. Perfect for contemporary bedrooms.',
      base_price: 599.99,
      compare_price: 749.99,
      tags: 'frame bed,upholstered,cube,geometric,modern,contemporary',
      material: 'Upholstered Fabric',
      weight_kg: 42.3
    },
    {
      name: 'Pannel Frame Bed',
      folder: 'Pannel Frame Bed Listing images',
      description: 'Classic pannel frame bed with traditional design elements. Sturdy construction with timeless aesthetic appeal.',
      base_price: 549.99,
      compare_price: 699.99,
      tags: 'frame bed,pannel,classic,traditional,sturdy,timeless',
      material: 'Wood Pannel',
      weight_kg: 38.7
    },
    {
      name: 'Horizon Frame Bed',
      folder: 'Horizon Frame Bed Listing images',
      description: 'Sleek Horizon frame bed with minimalist design philosophy. Clean lines and modern functionality.',
      base_price: 629.99,
      compare_price: 779.99,
      tags: 'frame bed,horizon,minimalist,clean lines,modern,functionality',
      material: 'Metal Frame',
      weight_kg: 35.9
    },
    {
      name: 'Chesterfield Frame Bed',
      folder: 'Chesterfield Frame Bed Listing images',
      description: 'Luxurious Chesterfield frame bed with button-tufted headboard. Classic British design with superior comfort.',
      base_price: 899.99,
      compare_price: 1099.99,
      tags: 'frame bed,chesterfield,button-tufted,luxury,british,classic',
      material: 'Premium Upholstery',
      weight_kg: 48.6
    }
  ]
};

// Utility functions
function generateSKU(productName, category) {
  const namePrefix = productName.replace(/[^A-Za-z0-9]/g, '').substring(0, 8).toUpperCase();
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${categoryPrefix}-${namePrefix}-${randomSuffix}`;
}

function generateDeliveryInfo() {
  const deliveryOptions = [
    { min_days: 2, max_days: 3, text: "2 To 3 Days Delivery" },
    { min_days: 3, max_days: 4, text: "3 To 4 Days Delivery" },
    { min_days: 3, max_days: 5, text: "3 To 5 Days Delivery" },
    { min_days: 5, max_days: 7, text: "5 To 7 Days Delivery" }
  ];
  
  const option = deliveryOptions[Math.floor(Math.random() * deliveryOptions.length)];
  return {
    ...option,
    shipping_method: "standard",
    free_shipping_threshold: 500
  };
}

function generatePaymentOptions(price) {
  return [
    {
      provider: "klarna",
      type: "installment",
      installments: 3,
      amount_per_installment: Math.round((price / 3) * 100) / 100,
      total_amount: price,
      description: `Make 3 Payments Of £${Math.round((price / 3) * 100) / 100}`
    }
  ];
}

function getImageFiles(categoryFolder, productFolder) {
  const fullPath = path.join(CONFIG.IMAGES_BASE_PATH, categoryFolder, productFolder);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  Folder not found: ${fullPath}`);
    return [];
  }
  
  try {
    const files = fs.readdirSync(fullPath);
    return files.filter(file => file.match(/\.(webp|jpg|jpeg|png)$/i));
  } catch (error) {
    console.error(`❌ Error reading folder ${fullPath}:`, error.message);
    return [];
  }
}

// Authentication functions
async function authenticate() {
  if (!CONFIG.AUTH.ENABLED) {
    return null; // Authentication disabled
  }

  console.log('🔐 Authenticating...');
  
  try {
    const response = await axios.post(`${CONFIG.API_BASE_URL}/auth/signin`, {
      email: CONFIG.AUTH.EMAIL,
      password: CONFIG.AUTH.PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    CONFIG.AUTH.ACCESS_TOKEN = response.data.data.session.access_token;
    console.log('✅ Authentication successful');
    return CONFIG.AUTH.ACCESS_TOKEN;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

function getAuthHeaders() {
  if (!CONFIG.AUTH.ENABLED || !CONFIG.AUTH.ACCESS_TOKEN) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${CONFIG.AUTH.ACCESS_TOKEN}`
  };
}

// API functions
async function createProduct(productData, categoryId) {
  try {
    const payload = {
      name: productData.name,
      description: productData.description,
      category_id: categoryId,
      base_price: productData.base_price,
      delivery_info: generateDeliveryInfo(),
      warranty_info: "2 year manufacturer warranty included",
      care_instructions: "Clean with damp cloth. Avoid direct sunlight. Professional cleaning recommended for tough stains.",
      assembly_required: true,
      assembly_instructions: "Assembly instructions included in package. Professional assembly available for additional fee.",
      tags: productData.tags,
      material: productData.material,
      brand: CONFIG.BRAND,
      featured: Math.random() > 0.7, // 30% chance of being featured
      default_color: "Natural",
      default_size: "Standard",
      initial_stock: Math.floor(Math.random() * 15) + 5, // 5-20 stock
      default_sku: generateSKU(productData.name, categoryId)
    };

    const response = await axios.post(`${CONFIG.API_BASE_URL}/products/admin/products`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      }
    });

    console.log(`✅ Created product: ${productData.name}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to create product ${productData.name}:`, error.response?.data || error.message);
    throw error;
  }
}

async function uploadProductImage(productId, imagePath, type = 'gallery', order = 0) {
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Create form data for file upload
    const formData = new FormData();
    formData.append('imageFile', fs.createReadStream(imagePath));
    formData.append('type', type);
    formData.append('order', order.toString());

    const response = await axios.post(`${CONFIG.API_BASE_URL}/products/admin/products/${productId}/images`, formData, {
      headers: {
        ...formData.getHeaders(),
        ...getAuthHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Failed to upload image for product ${productId}:`, error.response?.data || error.message);
    throw error;
  }
}

// Main processing functions
async function processProduct(categoryFolder, productData) {
  try {
    const categoryId = CONFIG.CATEGORY_MAPPINGS[categoryFolder];
    if (!categoryId) {
      console.error(`❌ No category mapping found for: ${categoryFolder}`);
      return null;
    }

    // Create the product
    const createdProduct = await createProduct(productData, categoryId);
    const productId = createdProduct.id;

    // Get image files
    const imageFiles = getImageFiles(categoryFolder, productData.folder);
    
    if (imageFiles.length === 0) {
      console.warn(`⚠️  No images found for product: ${productData.name}`);
      return createdProduct;
    }

    console.log(`📸 Found ${imageFiles.length} images for ${productData.name}`);

    // Upload images
    for (let i = 0; i < imageFiles.length; i++) {
      const imageFile = imageFiles[i];
      const imagePath = path.join(CONFIG.IMAGES_BASE_PATH, categoryFolder, productData.folder, imageFile);
      
      // First image is main, rest are gallery
      const imageType = i === 0 ? 'main' : 'gallery';
      
      try {
        const uploadResult = await uploadProductImage(productId, imagePath, imageType, i + 1);
        console.log(`  ✅ Uploaded image ${i + 1}/${imageFiles.length}: ${imageFile}`);
        console.log(`     📡 Stored at: ${uploadResult.url}`);
      } catch (error) {
        console.error(`  ❌ Failed to upload image ${imageFile}:`, error.message);
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return createdProduct;
  } catch (error) {
    console.error(`❌ Failed to process product ${productData.name}:`, error.message);
    return null;
  }
}

async function processCategory(categoryFolder) {
  console.log(`\n🗂️  Processing category: ${categoryFolder}`);
  console.log('=' .repeat(60));

  const products = PRODUCT_CATALOG[categoryFolder];
  if (!products) {
    console.error(`❌ No products defined for category: ${categoryFolder}`);
    return [];
  }

  const results = [];
  
  for (const productData of products) {
    console.log(`\n📦 Processing product: ${productData.name}`);
    
    const result = await processProduct(categoryFolder, productData);
    if (result) {
      results.push(result);
    }
    
    // Delay between products to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

// Main execution function
async function main() {
  console.log('🚀 Starting MyAirBridge Products Upload');
  console.log('====================================');
  console.log(`📂 Base path: ${CONFIG.IMAGES_BASE_PATH}`);
  console.log(`🌐 API URL: ${CONFIG.API_BASE_URL}`);
  console.log(`🏷️  Brand: ${CONFIG.BRAND}`);
  
  // Verify base path exists
  if (!fs.existsSync(CONFIG.IMAGES_BASE_PATH)) {
    console.error(`❌ Base images path does not exist: ${CONFIG.IMAGES_BASE_PATH}`);
    process.exit(1);
  }

  const allResults = [];
  let totalProducts = 0;
  let successfulProducts = 0;

  try {
    // Authenticate if required
    if (CONFIG.AUTH.ENABLED) {
      await authenticate();
    }
    
    // Process each category
    for (const categoryFolder of Object.keys(CONFIG.CATEGORY_MAPPINGS)) {
      const results = await processCategory(categoryFolder);
      allResults.push(...results);
      
      totalProducts += PRODUCT_CATALOG[categoryFolder]?.length || 0;
      successfulProducts += results.length;
      
      console.log(`\n✅ Completed category: ${categoryFolder}`);
      console.log(`   📊 Success: ${results.length}/${PRODUCT_CATALOG[categoryFolder]?.length || 0} products`);
    }

    // Final summary
    console.log('\n🎉 Upload Complete!');
    console.log('==================');
    console.log(`📊 Total products processed: ${totalProducts}`);
    console.log(`✅ Successful uploads: ${successfulProducts}`);
    console.log(`❌ Failed uploads: ${totalProducts - successfulProducts}`);
    console.log(`📈 Success rate: ${((successfulProducts / totalProducts) * 100).toFixed(1)}%`);

    if (allResults.length > 0) {
      console.log('\n📋 Uploaded Products:');
      allResults.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (ID: ${product.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error during upload:', error.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  // Add error handling for unhandled promises
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Check for required dependencies
  try {
    require('axios');
  } catch (error) {
    console.error('❌ Missing dependency: axios');
    console.log('💡 Please install dependencies: npm install axios');
    process.exit(1);
  }

  // Run the main function
  main().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  CONFIG,
  PRODUCT_CATALOG,
  createProduct,
  uploadProductImage,
  processProduct,
  processCategory
}; 