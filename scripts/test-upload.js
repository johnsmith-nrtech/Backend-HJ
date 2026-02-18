#!/usr/bin/env node

/**
 * Test Upload Script for MyAirBridge Products
 * 
 * This script uploads a single test product to verify your setup
 * before running the full upload script.
 * 
 * Usage: node scripts/test-upload.js
 */

const config = require('./config');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Use authentication configuration from config.js
// No need for separate AUTH_CONFIG

// Authentication functions
async function authenticate() {
  if (!config.AUTH.ENABLED) {
    return null;
  }

  console.log('🔐 Authenticating...');
  
  try {
    const response = await axios.post(`${config.API.BASE_URL}/auth/signin`, {
      email: config.AUTH.EMAIL,
      password: config.AUTH.PASSWORD
    });

    config.AUTH.ACCESS_TOKEN = response.data.data.session.access_token;
    console.log('✅ Authentication successful');
    return config.AUTH.ACCESS_TOKEN;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

function getAuthHeaders() {
  if (!config.AUTH.ENABLED || !config.AUTH.ACCESS_TOKEN) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${config.AUTH.ACCESS_TOKEN}`
  };
}

// Test product data
const TEST_PRODUCT = {
  name: 'TEST - Verona Turkish Sofa Bed',
  description: 'TEST PRODUCT - Elegant Verona Turkish sofa bed featuring premium upholstery and smooth conversion mechanism. This is a test product that can be safely deleted.',
  category_id: config.CATEGORIES['TURKISH SOFAS'], // Sofa Beds
  base_price: 899.99,
  delivery_info: {
    min_days: 3,
    max_days: 4,
    text: "3 To 4 Days Delivery",
    shipping_method: "standard",
    free_shipping_threshold: 500
  },
  warranty_info: config.PRODUCT_DEFAULTS.WARRANTY,
  care_instructions: config.PRODUCT_DEFAULTS.CARE_INSTRUCTIONS,
  assembly_required: config.PRODUCT_DEFAULTS.ASSEMBLY.REQUIRED,
  assembly_instructions: config.PRODUCT_DEFAULTS.ASSEMBLY.INSTRUCTIONS,
  tags: 'TEST,turkish sofa bed,convertible,elegant,modern,verona',
  material: 'Premium Fabric',
  brand: config.PRODUCT_DEFAULTS.BRAND,
  featured: false,
  default_color: config.PRODUCT_DEFAULTS.VARIANT.COLOR,
  default_size: config.PRODUCT_DEFAULTS.VARIANT.SIZE,
  initial_stock: 5,
  default_sku: 'TEST-VERONA-001'
};

// Test image path
const TEST_IMAGE_PATH = path.join(config.PATHS.IMAGES_BASE_PATH, 'TURKISH SOFAS', 'Verona Turkish Sofa Bed', 'Verona Turkish Sofa Bed Listing-01.webp');

async function testAPIConnection() {
  console.log('🔍 Testing API connection...');
  
  try {
    const response = await axios.get(`${config.API.BASE_URL}/health`, {
      timeout: config.API.TIMEOUT
    });
    
    console.log('✅ API connection successful');
    return true;
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
    console.log('💡 Make sure your API server is running at:', config.API.BASE_URL);
    return false;
  }
}

async function testCategoryExists() {
  console.log('🏷️  Testing category existence...');
  
  try {
    // Try to get products from the category (this will fail if category doesn't exist)
    const response = await axios.get(`${config.API.BASE_URL}/products?categoryId=${TEST_PRODUCT.category_id}&limit=1`, {
      timeout: config.API.TIMEOUT
    });
    
    console.log('✅ Category exists and is accessible');
    return true;
  } catch (error) {
    console.error('❌ Category test failed:', error.response?.data || error.message);
    console.log('💡 Check that the category ID exists in your database:', TEST_PRODUCT.category_id);
    return false;
  }
}

async function testImagePath() {
  console.log('📁 Testing image file access...');
  
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.error('❌ Test image file not found:', TEST_IMAGE_PATH);
    console.log('💡 Check that the MyAirBridge folder exists at:', config.PATHS.IMAGES_BASE_PATH);
    return false;
  }
  
  // Get file size for verification
  const stats = fs.statSync(TEST_IMAGE_PATH);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`✅ Found test image file: Verona Turkish Sofa Bed Listing-01.webp (${fileSizeInMB} MB)`);
  return true;
}

async function createTestProduct() {
  console.log('📦 Creating test product...');
  
  try {
    const response = await axios.post(`${config.API.BASE_URL}/products/admin/products`, TEST_PRODUCT, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      timeout: config.API.TIMEOUT
    });
    
    console.log('✅ Test product created successfully');
    console.log(`   Product ID: ${response.data.id}`);
    console.log(`   Product Name: ${response.data.name}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create test product:', error.response?.data || error.message);
    throw error;
  }
}

async function uploadTestImage(productId) {
  console.log('🖼️  Uploading test image...');
  
  try {
    const FormData = require('form-data');
    
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      throw new Error(`Test image not found: ${TEST_IMAGE_PATH}`);
    }

    // Create form data for file upload
    const formData = new FormData();
    formData.append('imageFile', fs.createReadStream(TEST_IMAGE_PATH));
    formData.append('type', 'main');
    formData.append('order', '1');

    const response = await axios.post(`${config.API.BASE_URL}/products/admin/products/${productId}/images`, formData, {
      headers: {
        ...formData.getHeaders(),
        ...getAuthHeaders()
      },
      timeout: config.API.TIMEOUT,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('✅ Test image uploaded successfully');
    console.log(`   Image ID: ${response.data.id}`);
    console.log(`   Image URL: ${response.data.url}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to upload test image:', error.response?.data || error.message);
    throw error;
  }
}

async function cleanupTestProduct(productId) {
  console.log('🧹 Cleaning up test product...');
  
  try {
    await axios.delete(`${config.API.BASE_URL}/products/admin/products/${productId}`, {
      headers: getAuthHeaders(),
      timeout: config.API.TIMEOUT
    });
    
    console.log('✅ Test product deleted successfully');
  } catch (error) {
    console.error('⚠️  Failed to delete test product (you may need to delete it manually):', error.message);
    console.log(`   Product ID to delete: ${productId}`);
  }
}

async function main() {
  console.log('🧪 Starting MyAirBridge Upload Test');
  console.log('==================================');
  console.log(`📡 API URL: ${config.API.BASE_URL}`);
  console.log(`📂 Images Path: ${config.PATHS.IMAGES_BASE_PATH}`);
  console.log(`🌐 Image URL: ${config.PATHS.IMAGE_BASE_URL}`);
  console.log();
  
  let productId = null;
  
  try {
    // Step 0: Authenticate if required
    if (config.AUTH.ENABLED) {
      await authenticate();
    }
    
    // Step 1: Test API connection
    const apiConnected = await testAPIConnection();
    if (!apiConnected) {
      process.exit(1);
    }
    
    // Step 2: Test category existence
    const categoryExists = await testCategoryExists();
    if (!categoryExists) {
      process.exit(1);
    }
    
    // Step 3: Test image folder access
    const imagePathValid = await testImagePath();
    if (!imagePathValid) {
      process.exit(1);
    }
    
    console.log();
    console.log('🎯 All pre-checks passed! Proceeding with test upload...');
    console.log();
    
    // Step 4: Create test product
    const product = await createTestProduct();
    productId = product.id;
    
    // Step 5: Upload test image
    await uploadTestImage(productId);
    
    console.log();
    console.log('🎉 Test upload completed successfully!');
    console.log('=====================================');
    console.log('✅ Your setup is working correctly');
    console.log('✅ API connection is functional');
    console.log('✅ Categories are properly configured');
    console.log('✅ Image paths are accessible');
    console.log('✅ Product creation works');
    console.log('✅ Image upload works');
    console.log();
    console.log('🚀 You can now run the full upload script:');
    console.log('   npm run upload');
    console.log();
    
    // Cleanup
    if (productId) {
      await cleanupTestProduct(productId);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure your API server is running');
    console.log('2. Check your configuration in config.js');
    console.log('3. Verify the MyAirBridge folder exists');
    console.log('4. Ensure categories exist in your database');
    
    // Try to cleanup even on failure
    if (productId) {
      await cleanupTestProduct(productId);
    }
    
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
    console.log('💡 Please install dependencies: npm install');
    process.exit(1);
  }

  // Run the main function
  main().catch(error => {
    console.error('❌ Test script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testAPIConnection,
  testCategoryExists,
  testImagePath,
  createTestProduct,
  uploadTestImage,
  cleanupTestProduct
}; 