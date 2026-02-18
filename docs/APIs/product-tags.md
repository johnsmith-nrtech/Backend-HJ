# Product Tags API Documentation

## Table of Contents

- [1. Overview](#1-overview)
- [2. Product Tags Endpoints](#2-product-tags-endpoints)
  - [2.1. Get All Product Tags](#21-get-all-product-tags)
  - [2.2. Get Product Tag by ID](#22-get-product-tag-by-id)
  - [2.3. Create Product Tag](#23-create-product-tag)
  - [2.4. Update Product Tag](#24-update-product-tag)
  - [2.5. Delete Product Tag](#25-delete-product-tag)
  - [2.6. Search Tags by Pattern](#26-search-tags-by-pattern)
  - [2.7. Get Tag Suggestions](#27-get-tag-suggestions)
  - [2.8. Bulk Create Tags](#28-bulk-create-tags)
- [3. Frontend Integration Guide](#3-frontend-integration-guide)
- [4. Error Handling](#4-error-handling)

## 1. Overview

The Product Tags API allows management of product tags in the Sofa Deal E-Commerce platform. Tags are used to categorize and organize products, making them easier to search and filter. Each tag has a unique name and can be used across multiple products for better discoverability.

### Base URL
```
http://localhost:4000/product-tags
```

### Key Features
- Create, read, update, and delete product tags
- Search tags by name pattern (autocomplete functionality)
- Get tag suggestions for product creation
- Bulk create multiple tags
- Prevent duplicate tag names

---

## 2. Product Tags Endpoints

### 2.1. Get All Product Tags

Retrieve a paginated list of all product tags with optional search functionality.

#### Request

```
GET /product-tags
```

##### Query Parameters

| Parameter | Type    | Required | Description                                           |
|-----------|---------|----------|-------------------------------------------------------|
| search    | string  | No       | Search term for tag names                            |
| page      | number  | No       | Page number (default: 1)                             |
| limit     | number  | No       | Items per page (default: 20)                         |
| sortBy    | string  | No       | Sort field (default: 'name')                         |
| sortOrder | string  | No       | Sort order: 'asc' or 'desc' (default: 'asc')       |

##### Curl Examples

**Get all tags:**
```bash
curl -X GET "http://localhost:4000/product-tags" \
  -H "Accept: application/json"
```

**Search tags:**
```bash
curl -X GET "http://localhost:4000/product-tags?search=summer&page=1&limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": "3545f67b-ae4a-48bb-9eca-0a4719949187",
      "name": "summer-collection",
      "created_at": "2023-06-01T10:00:00Z",
      "updated_at": "2023-06-01T10:00:00Z"
    },
    {
      "id": "78ef9e73-ea1f-4f4a-8270-23dae747cb13",
      "name": "bestseller",
      "created_at": "2023-06-01T09:30:00Z",
      "updated_at": "2023-06-01T09:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 15,
    "totalPages": 1
  }
}
```

---

### 2.2. Get Product Tag by ID

Retrieve details of a specific product tag by its ID.

#### Request

```
GET /product-tags/{id}
```

##### Path Parameters

| Parameter | Type | Required | Description     |
|-----------|------|----------|-----------------|
| id        | UUID | Yes      | Product tag ID  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/product-tags/3545f67b-ae4a-48bb-9eca-0a4719949187" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "id": "3545f67b-ae4a-48bb-9eca-0a4719949187",
  "name": "summer-collection",
  "created_at": "2023-06-01T10:00:00Z",
  "updated_at": "2023-06-01T10:00:00Z"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product tag with ID \"3545f67b-ae4a-48bb-9eca-0a4719949187\" not found",
  "error": "Not Found"
}
```

---

### 2.3. Create Product Tag

Create a new product tag.

#### Request

```
POST /product-tags
```

##### Request Body

| Field | Type   | Required | Description                                               |
|-------|--------|----------|-----------------------------------------------------------|
| name  | string | Yes      | Tag name (2-50 characters, alphanumeric, spaces, hyphens, underscores) |

##### Curl Example

```bash
curl -X POST "http://localhost:4000/product-tags" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "eco-friendly"
  }'
```

#### Response

##### 201: Created

```json
{
  "id": "9d3731e9-4027-4dbf-b200-ead11dfbbbc8",
  "name": "eco-friendly",
  "created_at": "2023-06-01T11:00:00Z",
  "updated_at": "2023-06-01T11:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": [
    "Tag name must be between 2 and 50 characters long",
    "Tag name can only contain letters, numbers, spaces, hyphens, and underscores"
  ],
  "error": "Bad Request"
}
```

##### 409: Conflict

```json
{
  "statusCode": 409,
  "message": "Tag with name \"eco-friendly\" already exists",
  "error": "Conflict"
}
```

---

### 2.4. Update Product Tag

Update an existing product tag.

#### Request

```
PATCH /product-tags/{id}
```

##### Path Parameters

| Parameter | Type | Required | Description     |
|-----------|------|----------|-----------------|
| id        | UUID | Yes      | Product tag ID  |

##### Request Body

| Field | Type   | Required | Description                                               |
|-------|--------|----------|-----------------------------------------------------------|
| name  | string | No       | New tag name (2-50 characters, alphanumeric, spaces, hyphens, underscores) |

##### Curl Example

```bash
curl -X PATCH "http://localhost:4000/product-tags/9d3731e9-4027-4dbf-b200-ead11dfbbbc8" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "sustainable"
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "9d3731e9-4027-4dbf-b200-ead11dfbbbc8",
  "name": "sustainable",
  "created_at": "2023-06-01T11:00:00Z",
  "updated_at": "2023-06-01T11:15:00Z"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product tag with ID \"9d3731e9-4027-4dbf-b200-ead11dfbbbc8\" not found",
  "error": "Not Found"
}
```

##### 409: Conflict

```json
{
  "statusCode": 409,
  "message": "Tag with name \"sustainable\" already exists",
  "error": "Conflict"
}
```

---

### 2.5. Delete Product Tag

Delete a product tag by ID.

#### Request

```
DELETE /product-tags/{id}
```

##### Path Parameters

| Parameter | Type | Required | Description     |
|-----------|------|----------|-----------------|
| id        | UUID | Yes      | Product tag ID  |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/product-tags/9d3731e9-4027-4dbf-b200-ead11dfbbbc8" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "id": "9d3731e9-4027-4dbf-b200-ead11dfbbbc8",
  "name": "sustainable",
  "created_at": "2023-06-01T11:00:00Z",
  "updated_at": "2023-06-01T11:15:00Z"
}
```

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Product tag with ID \"9d3731e9-4027-4dbf-b200-ead11dfbbbc8\" not found",
  "error": "Not Found"
}
```

---

### 2.6. Search Tags by Pattern

Search for tags matching a name pattern (useful for autocomplete functionality).

#### Request

```
GET /product-tags/search
```

##### Query Parameters

| Parameter | Type   | Required | Description                                  |
|-----------|--------|----------|----------------------------------------------|
| q         | string | Yes      | Search query                                 |
| limit     | number | No       | Maximum number of results (default: 10)     |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/product-tags/search?q=summ&limit=5" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "3545f67b-ae4a-48bb-9eca-0a4719949187",
    "name": "summer-collection",
    "created_at": "2023-06-01T10:00:00Z",
    "updated_at": "2023-06-01T10:00:00Z"
  }
]
```

---

### 2.7. Get Tag Suggestions

Get popular/recent tags for product creation suggestions.

#### Request

```
GET /product-tags/suggestions
```

##### Query Parameters

| Parameter | Type   | Required | Description                                     |
|-----------|--------|----------|-------------------------------------------------|
| limit     | number | No       | Maximum number of suggestions (default: 20)    |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/product-tags/suggestions?limit=10" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": "e6f7419e-fc0c-419e-9003-03a6aee0874f",
    "name": "new-arrival",
    "created_at": "2023-06-01T10:30:00Z",
    "updated_at": "2023-06-01T10:30:00Z"
  },
  {
    "id": "ce144cbf-4087-4eb6-8fc5-e4fb45b29b8f",
    "name": "trending",
    "created_at": "2023-06-01T10:25:00Z",
    "updated_at": "2023-06-01T10:25:00Z"
  },
  {
    "id": "78ef9e73-ea1f-4f4a-8270-23dae747cb13",
    "name": "bestseller",
    "created_at": "2023-06-01T09:30:00Z",
    "updated_at": "2023-06-01T09:30:00Z"
  }
]
```

---

### 2.8. Bulk Create Tags

Create multiple tags from an array of names. Returns existing tags if they already exist.

#### Request

```
POST /product-tags/bulk
```

##### Request Body

| Field    | Type     | Required | Description                |
|----------|----------|----------|----------------------------|
| tagNames | string[] | Yes      | Array of tag names to create |

##### Curl Example

```bash
curl -X POST "http://localhost:4000/product-tags/bulk" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "tagNames": ["seasonal", "outdoor", "waterproof", "durable"]
  }'
```

#### Response

##### 201: Created

```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
    "name": "seasonal",
    "created_at": "2023-06-01T12:00:00Z",
    "updated_at": "2023-06-01T12:00:00Z"
  },
  {
    "id": "b2c3d4e5-f6g7-8901-2345-678901bcdefg",
    "name": "outdoor",
    "created_at": "2023-06-01T12:00:00Z",
    "updated_at": "2023-06-01T12:00:00Z"
  },
  {
    "id": "c3d4e5f6-g7h8-9012-3456-789012cdefgh",
    "name": "waterproof",
    "created_at": "2023-06-01T12:00:00Z",
    "updated_at": "2023-06-01T12:00:00Z"
  },
  {
    "id": "d4e5f6g7-h8i9-0123-4567-890123defghi",
    "name": "durable",
    "created_at": "2023-06-01T12:00:00Z",
    "updated_at": "2023-06-01T12:00:00Z"
  }
]
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Failed to bulk create tags: Invalid tag names provided",
  "error": "Bad Request"
}
```

---

## 3. Frontend Integration Guide

### 3.1. Tag Autocomplete Implementation

When implementing tag autocomplete in product creation forms:

```javascript
// Debounced search function
const searchTags = async (query) => {
  if (query.length < 2) return [];
  
  const response = await fetch(`/product-tags/search?q=${encodeURIComponent(query)}&limit=10`);
  const tags = await response.json();
  return tags.map(tag => ({ value: tag.id, label: tag.name }));
};

// Usage in React component
const [tagSuggestions, setTagSuggestions] = useState([]);
const [searchQuery, setSearchQuery] = useState('');

const handleTagSearch = useMemo(
  () => debounce(async (query) => {
    const suggestions = await searchTags(query);
    setTagSuggestions(suggestions);
  }, 300),
  []
);

useEffect(() => {
  if (searchQuery) {
    handleTagSearch(searchQuery);
  }
}, [searchQuery, handleTagSearch]);
```

### 3.2. Tag Suggestions for Product Creation

Load popular tags when users start creating a product:

```javascript
const loadTagSuggestions = async () => {
  const response = await fetch('/product-tags/suggestions?limit=15');
  const suggestions = await response.json();
  return suggestions;
};

// Display as chips or quick-select options
const TagSuggestions = ({ onTagSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  
  useEffect(() => {
    loadTagSuggestions().then(setSuggestions);
  }, []);
  
  return (
    <div className="tag-suggestions">
      <h4>Popular Tags:</h4>
      {suggestions.map(tag => (
        <button 
          key={tag.id}
          onClick={() => onTagSelect(tag)}
          className="tag-chip"
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
};
```

### 3.3. Bulk Tag Creation

When users enter new tags that don't exist:

```javascript
const createTagsIfNeeded = async (tagNames) => {
  const response = await fetch('/product-tags/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagNames })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create tags');
  }
  
  return await response.json();
};

// Usage in product creation
const handleProductSubmit = async (productData) => {
  // Extract new tag names from the form
  const newTagNames = productData.tags.filter(tag => !tag.id).map(tag => tag.name);
  
  // Create new tags if any
  if (newTagNames.length > 0) {
    const createdTags = await createTagsIfNeeded(newTagNames);
    // Update productData with the created tag IDs
    // ... rest of product creation logic
  }
};
```

### 3.4. Tag Management Interface

For admin interfaces to manage tags:

```javascript
const TagsManagement = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTags = async (page = 1, search = '') => {
    setLoading(true);
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      ...(search && { search })
    });
    
    const response = await fetch(`/product-tags?${queryParams}`);
    const data = await response.json();
    setTags(data.items);
    setLoading(false);
    return data.meta;
  };

  const deleteTag = async (tagId) => {
    const response = await fetch(`/product-tags/${tagId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      setTags(tags.filter(tag => tag.id !== tagId));
    }
  };

  const updateTag = async (tagId, newName) => {
    const response = await fetch(`/product-tags/${tagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
    
    if (response.ok) {
      const updatedTag = await response.json();
      setTags(tags.map(tag => tag.id === tagId ? updatedTag : tag));
    }
  };

  // Component JSX implementation...
};
```

---

## 4. Error Handling

### 4.1. Common Error Responses

#### 400 Bad Request
- Invalid request body
- Validation errors (name too short/long, invalid characters)
- Invalid query parameters

#### 404 Not Found
- Tag ID does not exist

#### 409 Conflict
- Tag name already exists (during creation or update)

#### 500 Internal Server Error
- Database connection issues
- Unexpected server errors

### 4.2. Error Response Format

All error responses follow the standard NestJS format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

For validation errors with multiple issues:

```json
{
  "statusCode": 400,
  "message": [
    "Tag name must be between 2 and 50 characters long",
    "Tag name can only contain letters, numbers, spaces, hyphens, and underscores"
  ],
  "error": "Bad Request"
}
```

### 4.3. Best Practices

1. **Always validate input**: Check tag names for length and allowed characters
2. **Handle duplicates gracefully**: Use the bulk create endpoint when multiple tags might already exist
3. **Implement proper error boundaries**: Handle network errors and API failures
4. **Use debouncing**: For search/autocomplete functionality to avoid excessive API calls
5. **Cache suggestions**: Consider caching popular tags for better performance
6. **Normalize tag names**: The API automatically normalizes tag names to lowercase

---

## 5. Integration with Products

When working with products, tags can be used in several ways:

### 5.1. Assigning Tags to Products

Tags are typically stored as a comma-separated string in the product variants table. When creating or updating products:

```javascript
// Example: Creating a product with tags
const productData = {
  name: "Luxury Leather Sofa",
  description: "Premium comfort sofa",
  // other fields...
  variants: [{
    sku: "LLS-001",
    price: 1299.99,
    tags: "luxury,leather,comfortable,modern", // Comma-separated tag names
    // other variant fields...
  }]
};
```

### 5.2. Filtering Products by Tags

You can filter products by tags using the products API:

```bash
# Filter products containing specific tags
curl -X GET "http://localhost:4000/products?tags=luxury,modern" \
  -H "Accept: application/json"
```

### 5.3. Tag-based Product Recommendations

Use tags to find related products:

```javascript
const findRelatedProductsByTags = async (productTags) => {
  const tagNames = productTags.split(',').map(tag => tag.trim());
  // Use product search with tag filters
  const response = await fetch(`/products?tags=${tagNames.join(',')}&limit=6`);
  return await response.json();
};
```

---

This comprehensive API documentation provides all the necessary information for frontend developers to integrate the Product Tags API into their applications, including practical examples and best practices for common use cases like autocomplete, tag suggestions, and bulk operations. 