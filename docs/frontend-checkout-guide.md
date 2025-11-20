# Frontend Checkout Implementation Guide

This document provides guidance for frontend developers implementing checkout flows in the Sofa Deal E-Commerce platform.

## Overview

The platform supports two checkout flows:
1. **Authenticated Checkout**: For logged-in users (with saved account information)
2. **Guest Checkout**: For users without an account

Payment methods supported:
- **Card (Tyl payment gateway)** via `/orders/create-payment`
- **Cash on Delivery (COD)** via `/orders/create-cod-order`

**IMPORTANT NOTE**: For card payments, use the unified payment endpoint (`/orders/create-payment`) as described in the [Payment Integration Guide](./APIs/payment-integration.md). For Cash on Delivery, use the COD endpoint (`/orders/create-cod-order`). The main difference between flows is how user information is collected and whether a user account is associated with the order.

## Checkout Flow Comparison

| Feature | Authenticated Checkout | Guest Checkout |
|---------|------------------------|---------------|
| Authentication | Requires JWT token for user profile | No authentication required |
| User Experience | Can use saved profile information | Must enter all information |
| User Information | Can be retrieved from account | Must be provided in request |
| Order History | Visible in user account | Not associated with user account |
| Payment Processing | Via Tyl payment gateway or COD | Via Tyl payment gateway or COD |
| Address Storage | Can use saved addresses | Must provide full address details |

**NOTE**: For card payments, both checkout flows use the `/orders/create-payment` endpoint. For Cash on Delivery, use `/orders/create-cod-order`. The separate `/orders/checkout` endpoint mentioned below is a legacy endpoint and should be used only for specific authenticated user flows that don't require immediate payment processing.

## Implementation Details

### 1. Authenticated Checkout

#### Prerequisites
- User must be logged in to access saved information (addresses, etc.)
- JWT token should be available for user identification

#### Option A: Using Unified Payment Endpoint (Recommended)

```javascript
// Example using fetch API with the unified payment endpoint
async function processAuthenticatedCheckout(checkoutData, userData) {
  // Fetch user's saved information if needed
  const userInfo = userData || await fetchUserInfo(jwtToken);
  
  const response = await fetch('/api/orders/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}` // Optional but helps associate order with user
    },
    body: JSON.stringify({
      // Use user's information from their account
      contact_first_name: userInfo.firstName || checkoutData.firstName,
      contact_last_name: userInfo.lastName || checkoutData.lastName,
      contact_email: userInfo.email || checkoutData.email,
      contact_phone: userInfo.phone || checkoutData.phone,
      shipping_address: checkoutData.shippingAddress, 
      billing_address: checkoutData.billingAddress,
      use_different_billing_address: checkoutData.useDifferentBillingAddress || false,
      cart_items: checkoutData.items,
      order_notes: checkoutData.notes
    })
  });
  
  return await response.json();
}
```

#### Request Format (Unified Endpoint)

```json
{
  "contact_first_name": "John",
  "contact_last_name": "Doe",
  "contact_email": "john.doe@example.com",
  "contact_phone": "+44 20 7123 4567",
  "shipping_address": {
    "street_address": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "use_different_billing_address": false,
  "billing_address": {
    "street_address": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "cart_items": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1
    }
  ],
  "order_notes": "Please deliver after 6 PM"
}
```

#### Curl Example (Unified Endpoint)

```bash
curl -X POST "http://localhost:4000/orders/create-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "contact_email": "john.doe@example.com",
    "contact_phone": "+44 20 7123 4567",
    "shipping_address": {
      "street_address": "123 Main St",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "use_different_billing_address": false,
    "billing_address": {
      "street_address": "123 Main St",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "cart_items": [
      {
        "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        "quantity": 1
      }
    ],
    "order_notes": "Please deliver after 6 PM"
  }'
```

#### Option B: Legacy Checkout Endpoint (Not Recommended)

```javascript
// Example using fetch API with the legacy endpoint
async function processLegacyAuthenticatedCheckout(checkoutData) {
  const response = await fetch('/api/orders/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify({
      shipping_address: checkoutData.shippingAddress,
      billing_address: checkoutData.billingAddress,
      items: checkoutData.items,
      payment_method_id: checkoutData.paymentMethodId
    })
  });
  
  return await response.json();
}
```

#### Legacy Request Format

```json
{
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "items": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1
    }
  ],
  "payment_method_id": "tok_visa"
}
```
```

#### Response Format

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "user_id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "status": "pending",
  "total_amount": 199.99,
  "currency": "GBP",
  "shipping_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "billing_address": {
    "recipient_name": "John Doe",
    "line1": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "phone": "07123456789"
  },
  "created_at": "2023-05-10T14:23:45Z",
  "updated_at": "2023-05-10T14:23:45Z",
  "items": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
      "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1,
      "unit_price": 199.99,
      "discount_applied": 0,
      "created_at": "2023-05-10T14:23:45Z"
    }
  ]
}
```

### 2. Guest Checkout

#### Prerequisites
- No authentication required
- User's complete contact and shipping information must be collected

#### API Call — Card Payment (Tyl)

```javascript
// Example using fetch API - uses the same endpoint as authenticated checkout
async function processGuestCheckout(checkoutData) {
  const response = await fetch('/api/orders/create-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact_first_name: checkoutData.firstName,
      contact_last_name: checkoutData.lastName,
      contact_email: checkoutData.email,
      contact_phone: checkoutData.phone,
      shipping_address: checkoutData.shippingAddress,
      billing_address: checkoutData.billingAddress,
      use_different_billing_address: checkoutData.useDifferentBillingAddress,
      cart_items: checkoutData.items,
      order_notes: checkoutData.notes
    })
  });
  
  return await response.json();
}
```

#### Request Format

```json
{
  "contact_first_name": "John",
  "contact_last_name": "Doe",
  "contact_email": "john.doe@example.com",
  "contact_phone": "+44 20 7123 4567",
  "shipping_address": {
    "street_address": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "use_different_billing_address": false,
  "billing_address": {
    "street_address": "123 Main St",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "cart_items": [
    {
      "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
      "quantity": 1
    }
  ],
  "order_notes": "Please deliver after 6 PM"
}
```

#### Curl Example

```bash
curl -X POST "http://localhost:4000/orders/create-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "contact_email": "john.doe@example.com",
    "contact_phone": "+44 20 7123 4567",
    "shipping_address": {
      "street_address": "123 Main St",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "use_different_billing_address": false,
    "billing_address": {
      "street_address": "123 Main St",
      "city": "London",
      "postal_code": "SW1A 1AA",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "cart_items": [
      {
        "variant_id": "f47ac10b-58cc-4372-a567-0e02b2c3d482",
        "quantity": 1
      }
    ],
    "order_notes": "Please deliver after 6 PM"
  }'
```

#### Response Format

```json
{
  "success": true,
  "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "total_amount": 199.99,
  "currency": "GBP",
  "payment_form": {
    "action_url": "https://payment-gateway.com/form",
    "method": "POST",
    "fields": {
      "orderId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "amount": "199.99",
      "currency": "GBP"
    }
  }
}
```

### 3. COD Checkout (No Online Payment)

Use this when the customer selects Cash on Delivery. No payment form will be returned; show an order confirmation after success.

#### Authenticated COD (optional Authorization header)

```javascript
// Returns: { success, order_id, total_amount, currency, message }
async function processAuthenticatedCodCheckout(checkoutData, jwtToken) {
  const response = await fetch('/api/orders/create-cod-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header optional; include if you want to associate order with the user
      ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {})
    },
    body: JSON.stringify({
      contact_first_name: checkoutData.firstName,
      contact_last_name: checkoutData.lastName,
      contact_email: checkoutData.email,
      contact_phone: checkoutData.phone,
      shipping_address: checkoutData.shippingAddress,
      billing_address: checkoutData.billingAddress,
      use_different_billing_address: checkoutData.useDifferentBillingAddress || false,
      cart_items: checkoutData.items,
      order_notes: checkoutData.notes
    })
  });
  return await response.json();
}
```

#### Guest COD

```javascript
// Returns: { success, order_id, total_amount, currency, message }
async function processGuestCodCheckout(checkoutData) {
  const response = await fetch('/api/orders/create-cod-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_first_name: checkoutData.firstName,
      contact_last_name: checkoutData.lastName,
      contact_email: checkoutData.email,
      contact_phone: checkoutData.phone,
      shipping_address: checkoutData.shippingAddress,
      billing_address: checkoutData.billingAddress,
      use_different_billing_address: checkoutData.useDifferentBillingAddress,
      cart_items: checkoutData.items,
      order_notes: checkoutData.notes
    })
  });
  return await response.json();
}
```

#### COD Request Format

Same as card payment (see Card Payment request format above).

#### COD Response Format

```json
{
  "success": true,
  "order_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "total_amount": 199.99,
  "currency": "GBP",
  "message": "COD order created successfully"
}
```

When `success` is true, navigate to your Order Confirmation page and display the `order_id` and summary. There is no `payment_form` in COD responses.

## Key Differences

### 1. User Experience

- **Authenticated Checkout**: The frontend can pre-fill customer information from their account. The JWT token can be sent (but is not required) to associate the order with the user's account.
- **Guest Checkout**: Frontend must collect all customer information during checkout as there is no saved profile data.

### 2. Order Association

- **Authenticated Checkout**: Orders are associated with the user's account if the JWT token is included, allowing them to view order history.
- **Guest Checkout**: Orders are not associated with any user account and cannot be viewed in an order history.

### 3. Response Structure

- Card (Tyl): response includes a `payment_form` to auto-submit to the gateway
- COD: response includes a `message` and `order_id`; no `payment_form`

## Implementation Steps

### For Both Checkout Flows

1. **Provide Login Options**: Offer "Login", "Register", or "Continue as Guest" options
2. **Collect Required Information**: 
   - For logged-in users: Allow selection of saved addresses or entry of new ones
   - For guests: Collect all contact and address information
3. **Submit to Endpoint**:
   - Card: call `/orders/create-payment` and auto-submit returned `payment_form`
   - COD: call `/orders/create-cod-order` and navigate to Order Confirmation
4. **Handle Payment Gateway Redirect (Card only)**: Use the returned `payment_form` to redirect to Tyl payment gateway
5. **Handle Payment Callback (Card only)**: Implement success/failure handling pages

### Additional Steps for Guest Checkout

1. **Optional Account Creation**: After successful payment, offer the option to create an account
2. **Order Tracking**: Provide a way for guests to track their order using email and order ID

### Additional Steps for Authenticated Checkout

1. **Address Saving**: Offer the option to save new addresses to the user's account
2. **Order History**: Update the order history section to display the new order

## Testing

- Test both payment methods (Card and COD) with various cart configurations
- Verify error handling for out-of-stock items
- Test address validation in both flows
- For Card: validate payment gateway integration (redirects, webhooks)
- For COD: verify that order confirmation appears without a payment redirect

## Common Issues

1. **Authentication Headers**: Ensure Authorization header is properly formatted for authenticated checkout (optional for COD)
2. **Address Format Mismatch**: Pay attention to the required address format
3. **Missing Fields**: All required fields must be present
4. **Expecting `payment_form` for COD**: COD responses do not include `payment_form`; navigate to confirmation instead
5. **Endpoint Mix-up**: Use `/orders/create-payment` for Card, `/orders/create-cod-order` for COD
