# Users API Documentation

## Table of Contents

- [7.1. Get User Profile](#71-get-user-profile)
- [7.2. Update User Profile](#72-update-user-profile)
- [7.3. Get User Addresses](#73-get-user-addresses)
- [7.4. Add User Address](#74-add-user-address)
- [7.5. Update User Address](#75-update-user-address)
- [7.6. Delete User Address](#76-delete-user-address)
- [7.7. Set Default Address](#77-set-default-address)
- [7.8. Get Admin Users](#78-get-admin-users)
- [7.9. Update User Role](#79-update-user-role)

## 7. Users

The Users API allows management of user profiles, addresses, and roles.

### 7.1. Get User Profile

Retrieve the profile information of the authenticated user.

#### Request

```
GET /users/profile
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/users/profile" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "id": "user-uuid-1234",
  "email": "user@example.com",
  "name": "John Doe",
  "phone_number": "+15551234567",
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

### 7.2. Update User Profile

Update the profile information of the authenticated user.

#### Request

```
PUT /users/profile
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field        | Type   | Required | Description          |
|--------------|--------|----------|----------------------|
| name         | string | No       | User's full name     |
| phone_number | string | No       | User's phone number  |

##### Example Request Body

```json
{
  "name": "Johnathan Doe",
  "phone_number": "+15557654321"
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/users/profile" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Johnathan Doe",
    "phone_number": "+15557654321"
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "user-uuid-1234",
  "email": "user@example.com",
  "name": "Johnathan Doe",
  "phone_number": "+15557654321",
  "updated_at": "2023-05-10T15:00:00Z"
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

### 7.3. Get User Addresses

Retrieve all addresses associated with the authenticated user.

#### Request

```
GET /users/addresses
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/users/addresses" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
[
  {
    "id": 1,
    "user_id": "user-uuid-1234",
    "type": "shipping",
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "postal_code": "12345",
    "country": "USA",
    "is_default": true
  },
  {
    "id": 2,
    "user_id": "user-uuid-1234",
    "type": "billing",
    "street": "456 Oak Ave",
    "city": "Otherville",
    "state": "NY",
    "postal_code": "67890",
    "country": "USA",
    "is_default": false
  }
]
```

##### 401: Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token",
  "error": "Unauthorized"
}
```

### 7.4. Add User Address

Add a new address for the authenticated user.

#### Request

```
POST /users/addresses
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field       | Type    | Required | Description                                     |
|-------------|---------|----------|-------------------------------------------------|
| type        | string  | Yes      | Address type ("shipping" or "billing")          |
| street      | string  | Yes      | Street address                                  |
| city        | string  | Yes      | City                                            |
| state       | string  | No       | State/Province                                  |
| postal_code | string  | Yes      | Postal code                                     |
| country     | string  | Yes      | Country                                         |
| is_default  | boolean | No       | Whether this is the default address of its type |

##### Example Request Body

```json
{
  "type": "shipping",
  "street": "789 Pine Ln",
  "city": "Villagetown",
  "state": "TX",
  "postal_code": "54321",
  "country": "USA",
  "is_default": false
}
```

##### Curl Example

```bash
curl -X POST "http://localhost:4000/users/addresses" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "shipping",
    "street": "789 Pine Ln",
    "city": "Villagetown",
    "state": "TX",
    "postal_code": "54321",
    "country": "USA",
    "is_default": false
  }'
```

#### Response

##### 201: Created

```json
{
  "id": 3,
  "user_id": "user-uuid-1234",
  "type": "shipping",
  "street": "789 Pine Ln",
  "city": "Villagetown",
  "state": "TX",
  "postal_code": "54321",
  "country": "USA",
  "is_default": false
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": ["type must be one of the following values: shipping, billing"],
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

### 7.5. Update User Address

Update an existing address for the authenticated user.

#### Request

```
PUT /users/addresses/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | integer | Yes      | Address ID  |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

(Same fields as Add User Address, all optional)

##### Example Request Body

```json
{
  "street": "789 Pine Lane Updated",
  "is_default": true
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/users/addresses/3" \
  -H "Authorization: Bearer {{access_token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "street": "789 Pine Lane Updated",
    "is_default": true
  }'
```

#### Response

##### 200: OK

```json
{
  "id": 3,
  "user_id": "user-uuid-1234",
  "type": "shipping",
  "street": "789 Pine Lane Updated",
  "city": "Villagetown",
  "state": "TX",
  "postal_code": "54321",
  "country": "USA",
  "is_default": true
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

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Address not found",
  "error": "Not Found"
}
```

### 7.6. Delete User Address

Delete an existing address for the authenticated user.

#### Request

```
DELETE /users/addresses/{id}
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | integer | Yes      | Address ID  |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X DELETE "http://localhost:4000/users/addresses/3" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "id": 3,
  "user_id": "user-uuid-1234",
  "type": "shipping",
  "street": "789 Pine Lane Updated",
  "city": "Villagetown",
  "state": "TX",
  "postal_code": "54321",
  "country": "USA",
  "is_default": true
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

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Address not found",
  "error": "Not Found"
}
```

### 7.7. Set Default Address

Set a specific address as the default for its type (shipping or billing).

#### Request

```
PUT /users/addresses/{id}/default
```

##### Path Parameters

| Parameter | Type    | Required | Description |
|-----------|---------|----------|-------------|
| id        | integer | Yes      | Address ID  |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/users/addresses/3/default" \
  -H "Authorization: Bearer {{access_token}}"
```

#### Response

##### 200: OK

```json
{
  "id": 3,
  "user_id": "user-uuid-1234",
  "type": "shipping",
  "street": "789 Pine Lane Updated",
  "city": "Villagetown",
  "state": "TX",
  "postal_code": "54321",
  "country": "USA",
  "is_default": true
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

##### 404: Not Found

```json
{
  "statusCode": 404,
  "message": "Address not found",
  "error": "Not Found"
}
```

### 7.8. Get Admin Users

Retrieve a list of all users (for admin users).

#### Request

```
GET /admin/users
```

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

##### Query Parameters

| Parameter | Type    | Required | Description                   | Default |
|-----------|---------|----------|-------------------------------|---------|
| page      | integer | No       | Page number for pagination    | 1       |
| limit     | integer | No       | Number of users per page      | 10      |
| role      | string  | No       | Filter users by role          |         |

##### Curl Example

```bash
curl -X GET "http://localhost:4000/admin/users?page=1&limit=10&role=customer" \
  -H "Authorization: Bearer {your_admin_access_token}" \
  -H "Accept: application/json"
```

#### Response

##### 200: OK

```json
{
  "items": [
    {
      "id": "user-uuid-1234",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "customer",
      "created_at": "2023-01-01T00:00:00Z"
    },
    {
      "id": "admin-uuid-5678",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin",
      "created_at": "2023-01-01T00:00:00Z"
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

### 7.9. Update User Role

Update the role of a user (for admin users).

#### Request

```
PUT /admin/users/{id}/role
```

##### Path Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| id        | string | Yes      | User ID     |

##### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |
| Content-Type    | application/json    | JSON content type |

##### Request Body

| Field | Type   | Required | Description                                      |
|-------|--------|----------|--------------------------------------------------|
| role  | string | Yes      | New role for the user (e.g., "admin", "customer") |

##### Example Request Body

```json
{
  "role": "admin"
}
```

##### Curl Example

```bash
curl -X PUT "http://localhost:4000/admin/users/user-uuid-1234/role" \
  -H "Authorization: Bearer {your_admin_access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

#### Response

##### 200: OK

```json
{
  "id": "user-uuid-1234",
  "role": "admin",
  "updated_at": "2023-05-11T11:00:00Z"
}
```

##### 400: Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid role specified",
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
  "message": "User not found",
  "error": "Not Found"
}
``` 