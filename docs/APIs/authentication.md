# Authentication API Documentation

## Table of Contents

- [1.1. Sign Up](#11-sign-up)
- [1.2. Sign In](#12-sign-in)
- [1.3. Magic Link Sign In](#13-magic-link-sign-in)
- [1.4. Reset Password](#14-reset-password)
- [1.5. Sign Out](#15-sign-out)
- [1.6. Get Current User](#16-get-current-user)

## 1. Authentication

The Authentication API provides endpoints for user registration and authentication using Supabase Auth service.

### 1.1. Sign Up

Register a new user account.

- **URL**: `/auth/signup`
- **Method**: `POST`
- **Auth required**: No

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "password123",
  "data": {
    "name": "John Doe"
  }
}
```

#### Success Response

- **Code**: 201 CREATED
- **Content**:

```json
{
  "access_token": "{{access_token}}",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "aBcDeFgHiJkLmNoPqRsTuVwXyZ...",
  "user": {
    "id": "user-uuid-1234",
    "email": "user@example.com",
    "app_metadata": {},
    "user_metadata": {
      "name": "John Doe"
    },
    "app_role": "customer",
    "aud": "authenticated",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### Error Response

- **Code**: 400 BAD REQUEST
- **Content**:

```json
{
  "statusCode": 400,
  "message": "Email already registered"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "data": {
      "name": "John Doe"
    }
  }'
```

### 1.2. Sign In

Authenticate a user with email and password.

- **URL**: `/auth/signin`
- **Method**: `POST`
- **Auth required**: No

#### Request Body

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Success Response

- **Code**: 200 OK
- **Content**:

```json
{
  "access_token": "{{access_token}}",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "aBcDeFgHiJkLmNoPqRsTuVwXyZ...",
  "user": {
    "id": "user-uuid-1234",
    "email": "user@example.com",
    "app_metadata": {},
    "user_metadata": {
      "name": "John Doe"
    },
    "app_role": "customer",
    "aud": "authenticated",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### Error Response

- **Code**: 401 UNAUTHORIZED
- **Content**:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:4000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

### 1.3. Magic Link Sign In

Send a magic link to a user's email for passwordless authentication.

- **URL**: `/auth/magic-link`
- **Method**: `POST`
- **Auth required**: No

#### Request Body

```json
{
  "email": "user@example.com"
}
```

#### Success Response

- **Code**: 200 OK
- **Content**:

```json
{
  "message": "Magic link sent to your email. Please check your inbox."
}
```

#### Error Response

- **Code**: 400 BAD REQUEST
- **Content**:

```json
{
  "statusCode": 400,
  "message": "Invalid email format"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:4000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 1.4. Reset Password

Send password reset instructions to a user's email.

- **URL**: `/auth/reset-password`
- **Method**: `POST`
- **Auth required**: No

#### Request Body

```json
{
  "email": "user@example.com"
}
```

#### Success Response

- **Code**: 200 OK
- **Content**:

```json
{
  "message": "Password reset instructions sent to your email"
}
```

#### Error Response

- **Code**: 400 BAD REQUEST
- **Content**:

```json
{
  "statusCode": 400,
  "message": "Invalid email format"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:4000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 1.5. Sign Out

Sign out the current user and invalidate their session.

- **URL**: `/auth/signout`
- **Method**: `POST`
- **Auth required**: Yes (Bearer Token)

#### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

#### Success Response

- **Code**: 200 OK
- **Content**:

```json
{
  "message": "Successfully signed out"
}
```

#### Error Response

- **Code**: 401 UNAUTHORIZED
- **Content**:

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token"
}
```

#### cURL Example

```bash
curl -X POST http://localhost:4000/auth/signout \
  -H "Authorization: Bearer {{access_token}}"
```

### 1.6. Get Current User

Retrieve information about the currently authenticated user.

- **URL**: `/auth/user`
- **Method**: `GET`
- **Auth required**: Yes (Bearer Token)

#### Headers

| Name            | Value               | Description       |
|-----------------|---------------------|-------------------|
| Authorization   | Bearer {token}      | JWT access token  |

#### Success Response

- **Code**: 200 OK
- **Content**:

```json
{
  "id": "user-uuid-1234",
  "email": "user@example.com",
  "app_metadata": {},
  "user_metadata": {
    "name": "John Doe"
  },
  "app_role": "customer",
  "aud": "authenticated",
  "created_at": "2023-01-01T00:00:00Z"
}
```

#### Error Response

- **Code**: 401 UNAUTHORIZED
- **Content**:

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token"
}
```

#### cURL Example

```bash
curl -X GET http://localhost:4000/auth/user \
  -H "Authorization: Bearer {{access_token}}"
``` 