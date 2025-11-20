# 🚀 Quick Start Guide - MyAirBridge Products Upload

This guide will help you upload all MyAirBridge products to your SofaDeal platform in **under 8 minutes**.

## ⚡ Step 1: Install Dependencies (2 minutes)

```bash
cd scripts
npm install
```

## ⚡ Step 2: Configuration (1 minute)

Check `config.js` - it should already be correctly configured:

```javascript
module.exports = {
  API: {
    BASE_URL: 'http://localhost:4000', // ✅ Your API server
  },
  
  PATHS: {
    // ✅ Path to your MyAirBridge images folder
    IMAGES_BASE_PATH: path.join(__dirname, '../docs/myairbridge-AW2acMVeeJI'),
  }
};
```

**✅ No changes needed!** The script automatically uploads files to Supabase via your API.

## ⚡ Step 3: Test Your Setup (2 minutes)

```bash
npm run test-upload
```

**Expected output:**
```
🧪 Starting MyAirBridge Upload Test
🔐 Authenticating...
✅ Authentication successful
✅ API connection successful
✅ Category exists and is accessible  
✅ Found test image file: Verona Turkish Sofa Bed Listing-01.webp (2.30 MB)
✅ Test product created successfully
✅ Test image uploaded successfully
   📡 Stored at: https://your-supabase.co/storage/v1/object/public/product-images/xyz.webp
🎉 Test upload completed successfully!
```

## ⚡ Step 4: Run Full Upload (3 minutes)

```bash
npm run upload
```

**What happens:**
- 📦 Creates **20 products** across 4 categories
- 🖼️ Uploads **118+ images** with proper organization
- ⏱️ Takes approximately 2-3 minutes to complete
- 📊 Shows progress and final success summary

## ✅ Verify Results

1. **Check your API/database** - You should see 20 new products
2. **Check categories** - Products organized in correct categories:
   - Turkish Sofas → Sofa Beds
   - Poland Sofas → Sofa Sets  
   - Luxury Sofas → Corner Sofas
   - Frame Beds → Beds & Spring Boxes

## 🔧 Quick Troubleshooting

**❌ "API connection failed"**
- Make sure your server is running: `npm run start:dev`
- Check if `http://localhost:4000/health` responds

**❌ "Image folder not found"** 
- Verify `docs/myairbridge-AW2acMVeeJI/` folder exists
- Check folder permissions

**❌ "Category test failed"**
- Your categories from `all_categories.json` should exist in database
- The script uses the exact category IDs you provided

## 🎯 Expected Results After Upload

### Products Created:
- **Turkish Sofas (7):** Verona, Sunset, Orion, Nisa, Milton, Lanto, Elisa
- **Poland Sofas (5):** Luca, Laguna, Denver, Berlin, Artic  
- **Luxury Sofas (4):** Aurora, Chestnut, Esma, Florence
- **Frame Beds (4):** Upholstered Cube, Pannel, Horizon, Chesterfield

### Features Added:
- ✅ Complete e-commerce data (pricing, descriptions, specs)
- ✅ Professional product images (main + gallery)
- ✅ Delivery information and warranty details
- ✅ Payment options (Klarna installments)
- ✅ Stock levels and SKU generation
- ✅ Category organization

## 🚀 Next Steps

After successful upload:
1. **Review products** in your admin panel
2. **Test frontend display** of new products
3. **Customize** any product details as needed
4. **Add more variants** using your existing variant endpoints

## 📞 Need Help?

- **Script issues:** Check logs for specific error messages
- **API issues:** Verify your server logs
- **Image issues:** Check Supabase storage configuration

---

**🎉 That's it! Your MyAirBridge products should now be live on your platform.** 