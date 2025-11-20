# Frontend Update Guide - Category Features

## 🆕 New Category Fields Added

### Database Changes
- **`image_url`**: `string | null` - URL for category image
- **`featured`**: `boolean` - Whether category is featured (default: false)

### Updated Category Response
All existing category endpoints now return these additional fields:

```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string",
  "parent_id": "uuid | null",
  "description": "string | null",
  "order": "number",
  "image_url": "string | null",     // ✅ NEW
  "featured": "boolean",            // ✅ NEW
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## 🎯 New Endpoints

### 1. Get Featured Categories
```http
GET /categories/featured?limit=10
```
**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Electronics",
    "image_url": "https://storage.url/image.jpg",
    "featured": true,
    // ... other category fields
  }
]
```

### 2. Upload Category Image
```http
POST /categories/admin/{id}/image
Content-Type: multipart/form-data

Body: 
- file: (image file) OR
- image_url: "https://external-url.com/image.jpg"
```

**Features:**
- ✅ File upload with automatic optimization (max 1200x800)
- ✅ Direct URL input for external images
- ✅ Automatic cleanup of old images
- ✅ Supports: JPG, PNG, WEBP formats
- ✅ Smart storage management

### 3. Remove Category Image
```http
DELETE /categories/admin/{id}/image
```

### 4. Toggle Featured Status
```http
PUT /categories/admin/{id}/featured
Content-Type: application/json

Body: { "featured": true }
```

## 🖼️ Image Upload System

### Upload Methods
The system supports **two upload methods**:

#### Method 1: File Upload
- Send file via FormData with `file` field
- Content-Type: `multipart/form-data`
- Requires authentication header

#### Method 2: URL Input  
- Send external URL via FormData with `image_url` field
- Content-Type: `multipart/form-data`
- Requires authentication header

### Image Upload Requirements
- **File Types**: JPG, PNG, WEBP
- **Max File Size**: 10MB
- **Validation**: Client-side validation recommended
- **Optimization**: Images automatically resized to max 1200x800
- **Storage**: Supabase `category-images` bucket

## 📝 Frontend Integration Tasks

### 1. Update Category Models/Types
Add `image_url: string | null` and `featured: boolean` to category interfaces/types

### 2. Featured Categories Display
- Create a "Featured Categories" section on homepage
- Use `GET /categories/featured?limit=6` to fetch featured categories
- Display category images using the `image_url` field

### 3. Category Cards with Images
- Update category listing components to show `image_url` if available
- Add fallback placeholder for categories without images
- Use featured badge/indicator for categories where `featured: true`

### 4. Admin Panel Updates (if applicable)
- Add image upload field to category create/edit forms
- Add featured toggle checkbox
- Add image management (upload/remove) functionality

## 🔄 Existing Endpoints Updated

All these endpoints now return the new `image_url` and `featured` fields:
- `GET /categories` - List all categories
- `GET /categories/{id}` - Get single category  
- `GET /categories/hierarchy` - Category hierarchy
- `POST /categories` - Create category (accepts new fields)
- `PUT /categories/{id}` - Update category (accepts new fields)

## ⚡ Quick Implementation Tips

- Use `GET /categories/featured?limit=6` for homepage featured categories
- Check `category.featured` boolean for displaying featured badges
- Use `category.image_url` for displaying category images
- Implement fallback placeholders for categories without images

## 📋 Testing Checklist

### Basic Functionality
- [ ] Verify existing category endpoints return new fields (`image_url`, `featured`)
- [ ] Test featured categories endpoint (`GET /categories/featured`)
- [ ] Test category display with and without images
- [ ] Test featured category indicators/badges

### Image Upload System
- [ ] Test file upload with valid image files (JPG, PNG, WEBP)
- [ ] Test URL input with external image URLs
- [ ] Test upload progress indicators
- [ ] Test file validation (size, type)
- [ ] Test URL validation
- [ ] Test image removal functionality
- [ ] Test error handling for failed uploads
- [ ] Verify old images are automatically cleaned up
- [ ] Test image optimization (images should be resized to max 1200x800)

### Admin Features
- [ ] Test featured toggle functionality
- [ ] Test image upload in admin forms
- [ ] Test both upload methods work in admin panel
- [ ] Test image preview functionality

### Error Handling
- [ ] Test behavior with broken image URLs
- [ ] Test fallback placeholders for missing images
- [ ] Test network error handling during uploads

---

## 🎯 Important Notes

### Image Optimization
- **Automatic Processing**: All uploaded images are automatically optimized
- **Max Dimensions**: 1200x800 pixels (maintains aspect ratio)  
- **Format Support**: JPG, PNG, WEBP input → optimized output
- **Storage**: Images stored in Supabase `category-images` bucket

### Smart Storage Management
- **Auto Cleanup**: Old images automatically deleted when updating
- **External URLs**: Only Supabase storage files are deleted, external URLs are preserved
- **Cost Efficient**: Prevents orphaned files and storage bloat

### Backward Compatibility
All changes are backward compatible. Existing frontend code will continue to work, but won't display the new image and featured functionality until updated. 