/**
 * Configuration file for MyAirBridge Products Upload Script
 * 
 * Update these settings to match your environment before running the upload script.
 */

const path = require('path');

module.exports = {
  // API Configuration
  API: {
    // Base URL of your SofaDeal API server
    // Update this to match your running server
    BASE_URL: 'http://localhost:4000',
    
    // Request timeout in milliseconds
    TIMEOUT: 30000,
    
    // Delay between API requests (milliseconds) to avoid overwhelming the server
    REQUEST_DELAY: 200,
    
    // Delay between product uploads (milliseconds)
    PRODUCT_DELAY: 1000
  },

  // Authentication Configuration
  AUTH: {
    // Set to true since your server requires authentication
    ENABLED: true,
    
    // Admin credentials for authentication
    EMAIL: 'admin@gmail.com',
    PASSWORD: 'Password123!',
    
    // Access token storage (will be populated automatically)
    ACCESS_TOKEN: null,
  },

  // File Paths Configuration
  PATHS: {
    // Base path to the MyAirBridge images folder
    // Update this if your images are stored elsewhere
    IMAGES_BASE_PATH: path.join(__dirname, '../docs/myairbridge-AW2acMVeeJI')
  },

  // Category Mappings
  // These IDs are from your all_categories.json file
  // DO NOT CHANGE unless you have different category IDs
  CATEGORIES: {
    'TURKISH SOFAS': '7405b6c7-677d-4299-9bd9-6cf99680d55e', // Sofa Beds
    'Poland Sofa Listing New size 800 x 1200': '7b523d62-056e-4d76-a600-acc92e34c1df', // Sofa Sets  
    'Luxury Sofas sets': '945e50b8-3606-473c-961e-b9de946b70f5', // Corner Sofas
    'Frame Beds': 'af1758c8-2765-4e09-bbb0-5309f6293b6b' // Beds & Spring Boxes
  },

  // Product Configuration
  PRODUCT_DEFAULTS: {
    // Default brand for all products
    BRAND: 'SofaDeal',
    
    // Default warranty information
    WARRANTY: '2 year manufacturer warranty included',
    
    // Default care instructions
    CARE_INSTRUCTIONS: 'Clean with damp cloth. Avoid direct sunlight. Professional cleaning recommended for tough stains.',
    
    // Default assembly information
    ASSEMBLY: {
      REQUIRED: true,
      INSTRUCTIONS: 'Assembly instructions included in package. Professional assembly available for additional fee.'
    },
    
    // Stock range for products (min-max)
    STOCK_RANGE: {
      MIN: 5,
      MAX: 20
    },
    
    // Featured product probability (0.0 to 1.0)
    // 0.3 means 30% chance of being featured
    FEATURED_PROBABILITY: 0.3,
    
    // Default variant settings
    VARIANT: {
      COLOR: 'Natural',
      SIZE: 'Standard'
    }
  },

  // Delivery Options Configuration
  DELIVERY_OPTIONS: [
    { min_days: 2, max_days: 3, text: "2 To 3 Days Delivery" },
    { min_days: 3, max_days: 4, text: "3 To 4 Days Delivery" },
    { min_days: 3, max_days: 5, text: "3 To 5 Days Delivery" },
    { min_days: 5, max_days: 7, text: "5 To 7 Days Delivery" }
  ],

  // Payment Options Configuration
  PAYMENT: {
    // Free shipping threshold
    FREE_SHIPPING_THRESHOLD: 500,
    
    // Default shipping method
    DEFAULT_SHIPPING_METHOD: 'standard',
    
    // Klarna installment configuration
    KLARNA: {
      INSTALLMENTS: 3,
      ENABLED: true
    }
  },

  // Image Configuration
  IMAGES: {
    // Supported image file extensions
    SUPPORTED_EXTENSIONS: ['.webp', '.jpg', '.jpeg', '.png'],
    
    // Image types
    TYPES: {
      MAIN: 'main',
      GALLERY: 'gallery',
      THREE_SIXTY: '360'
    }
  },

  // Logging Configuration
  LOGGING: {
    // Log level: 'error', 'warn', 'info', 'debug'
    LEVEL: 'info',
    
    // Whether to show progress indicators
    SHOW_PROGRESS: true,
    
    // Whether to log API request details
    LOG_API_REQUESTS: false
  },

  // Development/Testing Configuration
  DEVELOPMENT: {
    // Set to true to run in dry-run mode (no actual API calls)
    DRY_RUN: false,
    
    // Limit number of products to process (0 = no limit)
    LIMIT_PRODUCTS: 0,
    
    // Limit number of categories to process (0 = no limit)
    LIMIT_CATEGORIES: 0,
    
    // Skip image uploads (for faster testing)
    SKIP_IMAGES: false
  }
}; 