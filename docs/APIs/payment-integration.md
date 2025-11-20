# Tyl Payment Gateway Integration - Frontend Guide

## Overview

This document provides a complete guide for frontend developers on integrating with our Tyl payment gateway system. The integration follows a hosted payment page model where customers are redirected to NatWest's secure payment forms, ensuring PCI compliance and security.

## Table of Contents

1. [Payment Flow Workflow](#payment-flow-workflow)
   - [Visual Flow Diagram](#visual-flow-diagram)
   - [Step-by-Step Process](#step-by-step-process)

2. [API Endpoints](#api-endpoints)
   - [Create Payment](#1-create-payment)
   - [Payment Webhook](#2-payment-webhook-backend-only)

3. [Testing with cURL/Postman](#testing-with-curlpostman)
   - [Complete cURL Example](#complete-curl-example)
   - [Postman Setup](#postman-setup)
   - [Expected Success Response](#expected-success-response)
   - [Testing Different Scenarios](#testing-different-scenarios)
   - [Using the Response for Frontend Simulation](#using-the-response-for-frontend-simulation)
   - [Response Field Descriptions](#response-field-descriptions)

4. [Frontend Implementation](#frontend-implementation)
   - [Create Payment Function](#1-create-payment-function)
   - [Auto-Submit Payment Form](#2-auto-submit-payment-form)
   - [Complete Payment Flow Implementation](#3-complete-payment-flow-implementation)
   - [React/Vue Implementation Example](#4-reactvue-implementation-example)

5. [Success and Failure Handling](#success-and-failure-handling)
   - [URL Configuration](#url-configuration)
   - [Success Page Implementation](#success-page-implementation)
   - [Failure Page Implementation](#failure-page-implementation)

6. [Payment Response Parameters](#payment-response-parameters)
   - [Success Parameters](#success-parameters)
   - [Failure Parameters](#failure-parameters)

7. [Order Status Updates](#order-status-updates)

8. [Security Considerations](#security-considerations)
   - [HTTPS Requirement](#1-https-requirement)
   - [Data Validation](#2-data-validation)
   - [Error Handling Best Practices](#3-error-handling-best-practices)

9. [Testing](#testing)
   - [Test Data](#test-data)
   - [Test Scenarios](#test-scenarios)

10. [Common Issues and Solutions](#common-issues-and-solutions)

11. [Support and Troubleshooting](#support-and-troubleshooting)
    - [Debug Information](#debug-information)
    - [Logging](#logging)

12. [Next Steps](#next-steps)

## Payment Flow Workflow

### Visual Flow Diagram
```
1. Customer initiates checkout
2. Frontend calls /orders/create-payment
3. Backend creates order & generates Tyl payment form
4. Frontend auto-submits form → redirects to NatWest
5. Customer completes payment on NatWest hosted page
6. NatWest redirects back to success/failure URLs
7. NatWest sends webhook notification to backend
8. Backend updates order/payment status
```

### Step-by-Step Process

#### Step 1: Initiate Payment
When a customer clicks "Pay Now" or "Checkout", collect their information and cart details.

#### Step 2: Create Payment Request
Call the backend API to create an order and get payment form data.

#### Step 3: Auto-Submit Payment Form
Use the returned form data to automatically redirect the customer to NatWest's payment page.

#### Step 4: Payment Processing
Customer completes payment on NatWest's secure hosted page.

#### Step 5: Return to Your Site
Customer is redirected back to your success or failure page based on payment outcome.

## API Endpoints

### 1. Create Payment

**Endpoint:** `POST /orders/create-payment`

**Description:** Creates an order in the system and returns Tyl payment form data for auto-submission.

#### Request Body
```typescript
interface CreatePaymentRequest {
  // Customer Information
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone?: string;
  
  // Address Information
  shipping_address: {
    street_address: string;
    address_line_2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string; // ISO 2-letter code (e.g., "GB", "US")
    country_name: string; // Full name (e.g., "United Kingdom")
  };
  
  billing_address?: AddressDto; // Optional, uses shipping if not provided
  use_different_billing_address: boolean;
  
  // Cart Information
  cart_items: Array<{
    variant_id: string; // UUID of the product variant
    quantity: number;   // Must be > 0
  }>;
  
  // Optional Fields
  order_notes?: string;
}
```

#### Success Response (200)
```typescript
interface CreatePaymentResponse {
  success: true;
  order_id: string;
  total_amount: number;
  currency: string; // "GBP"
  payment_form: {
    action_url: string; // NatWest payment URL
    method: "POST";
    fields: {
      // Tyl Required Fields
      storename: string;
      txntype: string;
      timezone: string;
      txndatetime: string;
      hash_algorithm: string;
      hashExtended: string;
      chargetotal: string;
      currency: string;
      checkoutoption: string;
      responseSuccessURL: string;
      responseFailURL: string;
      transactionNotificationURL: string;
      
      // Customer Information
      bname: string;
      email: string;
      phone: string;
      
      // Billing Address
      baddr1: string;
      baddr2?: string;
      bcity: string;
      bstate?: string;
      bcountry: string;
      bzip: string;
      
      // Order Information
      oid: string;
    };
  };
}
```

#### Error Responses

**400 Bad Request**
```typescript
{
  success: false;
  error: "Validation failed";
  details: {
    field: string;
    message: string;
  }[];
}
```

**404 Not Found**
```typescript
{
  success: false;
  error: "One or more variant IDs not found";
  invalid_variants: string[];
}
```

**409 Conflict**
```typescript
{
  success: false;
  error: "Insufficient stock";
  stock_issues: {
    variant_id: string;
    requested: number;
    available: number;
  }[];
}
```

**500 Internal Server Error**
```typescript
{
  success: false;
  error: "Internal server error occurred";
}
```

### 2. Payment Webhook (Backend Only)

**Endpoint:** `POST /orders/payment/webhook`

**Description:** This endpoint receives notifications from NatWest when payments are processed. Frontend doesn't need to call this directly, but should be aware that order statuses are updated via this webhook.

## Testing with cURL/Postman

### Complete cURL Example

Here's a complete cURL command to test the payment creation endpoint:

```bash
curl -X POST http://localhost:8000/orders/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "contact_email": "john.doe@example.com",
    "contact_phone": "+44 20 7946 0958",
    "shipping_address": {
      "street_address": "123 Oxford Street",
      "address_line_2": "Flat 4B",
      "city": "London",
      "state": "Greater London",
      "postal_code": "W1C 1DE",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "use_different_billing_address": false,
    "cart_items": [
      {
        "variant_id": "123e4567-e89b-12d3-a456-426614174000",
        "quantity": 2
      },
      {
        "variant_id": "987f6543-e21c-98d7-b654-321098765432",
        "quantity": 1
      }
    ],
    "order_notes": "Please handle with care"
  }'
```

### Postman Setup

**1. Create New Request:**
- Method: `POST`
- URL: `http://localhost:8000/orders/create-payment`
- Headers: `Content-Type: application/json`

**2. Request Body (JSON):**
```json
{
  "contact_first_name": "John",
  "contact_last_name": "Doe",
  "contact_email": "john.doe@example.com",
  "contact_phone": "+44 20 7946 0958",
  "shipping_address": {
    "street_address": "123 Oxford Street",
    "address_line_2": "Flat 4B",
    "city": "London",
    "state": "Greater London",
    "postal_code": "W1C 1DE",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "billing_address": {
    "street_address": "456 Billing Street",
    "city": "London",
    "postal_code": "SW1A 1AA",
    "country": "GB",
    "country_name": "United Kingdom"
  },
  "use_different_billing_address": true,
  "cart_items": [
    {
      "variant_id": "123e4567-e89b-12d3-a456-426614174000",
      "quantity": 2
    },
    {
      "variant_id": "987f6543-e21c-98d7-b654-321098765432",
      "quantity": 1
    }
  ],
  "order_notes": "Please handle with care"
}
```

### Expected Success Response

When the request is successful, you'll receive a response like this:

```json
{
  "success": true,
  "order_id": "550e8400-e29b-41d4-a716-446655440000",
  "total_amount": 149.98,
  "currency": "GBP",
  "payment_form": {
    "action_url": "https://test.ipg-online.com/connect/gateway/processing",
    "method": "POST",
    "fields": {
      "storename": "7220542049",
      "txntype": "sale",
      "timezone": "Europe/London",
      "txndatetime": "2024:01:15-14:30:25",
      "hash_algorithm": "HMACSHA256",
      "hashExtended": "Abc123DefGhi456JklMno789PqrStu012VwxYz345==",
      "chargetotal": "149.98",
      "currency": "826",
      "checkoutoption": "combinedpage",
      "responseSuccessURL": "http://localhost:3000/payment/success",
      "responseFailURL": "http://localhost:3000/payment/failure",
      "transactionNotificationURL": "http://localhost:8000/orders/payment/webhook",
      "bname": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+44 20 7946 0958",
      "baddr1": "456 Billing Street",
      "baddr2": "",
      "bcity": "London",
      "bstate": "",
      "bcountry": "GB",
      "bzip": "SW1A 1AA",
      "oid": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### Testing Different Scenarios

**1. Test with Invalid Variant ID:**
```bash
curl -X POST http://localhost:8000/orders/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "contact_email": "john.doe@example.com",
    "shipping_address": {
      "street_address": "123 Oxford Street",
      "city": "London",
      "postal_code": "W1C 1DE",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "use_different_billing_address": false,
    "cart_items": [
      {
        "variant_id": "invalid-uuid-here",
        "quantity": 1
      }
    ]
  }'
```

**Expected 404 Response:**
```json
{
  "success": false,
  "error": "One or more variant IDs not found",
  "invalid_variants": ["invalid-uuid-here"]
}
```

**2. Test with Missing Required Fields:**
```bash
curl -X POST http://localhost:8000/orders/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "contact_first_name": "John",
    "cart_items": []
  }'
```

**Expected 400 Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "contact_last_name",
      "message": "Last name is required"
    },
    {
      "field": "contact_email", 
      "message": "Email is required"
    },
    {
      "field": "shipping_address",
      "message": "Shipping address is required"
    },
    {
      "field": "cart_items",
      "message": "Cart cannot be empty"
    }
  ]
}
```

**3. Test with Insufficient Stock:**
```bash
curl -X POST http://localhost:8000/orders/create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "contact_first_name": "John",
    "contact_last_name": "Doe",
    "contact_email": "john.doe@example.com",
    "shipping_address": {
      "street_address": "123 Oxford Street",
      "city": "London",
      "postal_code": "W1C 1DE",
      "country": "GB",
      "country_name": "United Kingdom"
    },
    "use_different_billing_address": false,
    "cart_items": [
      {
        "variant_id": "123e4567-e89b-12d3-a456-426614174000",
        "quantity": 999
      }
    ]
  }'
```

**Expected 409 Response:**
```json
{
  "success": false,
  "error": "Insufficient stock",
  "stock_issues": [
    {
      "variant_id": "123e4567-e89b-12d3-a456-426614174000",
      "requested": 999,
      "available": 5
    }
  ]
}
```

### Using the Response for Frontend Simulation

To simulate the complete frontend flow after receiving a successful response:

**1. Extract the payment form data from the response**
**2. Create an HTML form with the fields (for testing purposes):**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Payment Redirect Test</title>
</head>
<body>
    <form id="payment-form" method="POST" action="https://test.ipg-online.com/connect/gateway/processing">
        <input type="hidden" name="storename" value="7220542049">
        <input type="hidden" name="txntype" value="sale">
        <input type="hidden" name="timezone" value="Europe/London">
        <input type="hidden" name="txndatetime" value="2024:01:15-14:30:25">
        <input type="hidden" name="hash_algorithm" value="HMACSHA256">
        <input type="hidden" name="hashExtended" value="Abc123DefGhi456JklMno789PqrStu012VwxYz345==">
        <input type="hidden" name="chargetotal" value="149.98">
        <input type="hidden" name="currency" value="826">
        <input type="hidden" name="checkoutoption" value="combinedpage">
        <input type="hidden" name="responseSuccessURL" value="http://localhost:3000/payment/success">
        <input type="hidden" name="responseFailURL" value="http://localhost:3000/payment/failure">
        <input type="hidden" name="transactionNotificationURL" value="http://localhost:8000/orders/payment/webhook">
        <input type="hidden" name="bname" value="John Doe">
        <input type="hidden" name="email" value="john.doe@example.com">
        <input type="hidden" name="phone" value="+44 20 7946 0958">
        <input type="hidden" name="baddr1" value="456 Billing Street">
        <input type="hidden" name="bcity" value="London">
        <input type="hidden" name="bcountry" value="GB">
        <input type="hidden" name="bzip" value="SW1A 1AA">
        <input type="hidden" name="oid" value="550e8400-e29b-41d4-a716-446655440000">
        
        <button type="submit">Proceed to Payment</button>
    </form>
    
    <script>
        // Auto-submit for testing
        document.getElementById('payment-form').submit();
    </script>
</body>
</html>
```

### Response Field Descriptions

| Field | Description |
|-------|-------------|
| `success` | Boolean indicating if the request was successful |
| `order_id` | UUID of the created order for tracking |
| `total_amount` | Total amount calculated from cart items (subtotal only in Phase 1) |
| `currency` | Currency code (always "GBP") |
| `payment_form.action_url` | NatWest payment processing URL |
| `payment_form.fields.storename` | Tyl store identifier |
| `payment_form.fields.hashExtended` | Security hash for form verification |
| `payment_form.fields.chargetotal` | Amount to charge (formatted as string) |
| `payment_form.fields.currency` | ISO currency code (826 for GBP) |
| `payment_form.fields.oid` | Order ID for reference |

## Frontend Implementation

### 1. Create Payment Function

```typescript
interface PaymentService {
  async createPayment(paymentData: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      const response = await fetch('/orders/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment creation failed');
      }

      return data;
    } catch (error) {
      console.error('Payment creation error:', error);
      throw error;
    }
  }
}
```

### 2. Auto-Submit Payment Form

After receiving the payment form data, you need to auto-submit it to redirect the customer to NatWest's payment page:

```typescript
function redirectToPayment(paymentResponse: CreatePaymentResponse): void {
  const { payment_form } = paymentResponse;
  
  // Create a form element
  const form = document.createElement('form');
  form.method = payment_form.method;
  form.action = payment_form.action_url;
  form.style.display = 'none';

  // Add all the fields as hidden inputs
  Object.entries(payment_form.fields).forEach(([name, value]) => {
    if (value !== undefined && value !== null) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = String(value);
      form.appendChild(input);
    }
  });

  // Append form to body and submit
  document.body.appendChild(form);
  form.submit();
}
```

### 3. Complete Payment Flow Implementation

```typescript
async function handleCheckout(checkoutData: CreatePaymentRequest): Promise<void> {
  try {
    // Show loading state
    setLoading(true);
    setError(null);

    // Create payment with backend
    const paymentResponse = await createPayment(checkoutData);

    // Store order ID for later reference
    localStorage.setItem('current_order_id', paymentResponse.order_id);

    // Redirect to NatWest payment page
    redirectToPayment(paymentResponse);

  } catch (error) {
    setLoading(false);
    setError(error.message);
    
    // Handle specific error types
    if (error.status === 400) {
      // Show validation errors to user
      showValidationErrors(error.details);
    } else if (error.status === 409) {
      // Show stock issues
      showStockErrors(error.stock_issues);
    } else {
      // Show generic error
      showGenericError('Payment initiation failed. Please try again.');
    }
  }
}
```

### 4. React/Vue Implementation Example

**React Example:**
```tsx
import React, { useState } from 'react';

const CheckoutButton: React.FC<{ cartData: CreatePaymentRequest }> = ({ cartData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/orders/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Store order ID
      localStorage.setItem('current_order_id', data.order_id);

      // Auto-submit payment form
      redirectToPayment(data);

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handlePayment} 
        disabled={loading}
        className="checkout-button"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

## Success and Failure Handling

### URL Configuration

The system automatically configures these URLs:
- **Success URL:** `${FRONTEND_BASE_URL}/payment/success`
- **Failure URL:** `${FRONTEND_BASE_URL}/payment/failure`

### Success Page Implementation

Create a success page that handles the return from NatWest:

```typescript
// /payment/success page
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    // Extract order information from URL parameters or localStorage
    const orderId = localStorage.getItem('current_order_id');
    
    // Optional: Fetch order details from your API
    fetchOrderDetails(orderId);
    
    // Clear stored order ID
    localStorage.removeItem('current_order_id');
  }, []);

  return (
    <div className="payment-success">
      <h1>Payment Successful!</h1>
      <p>Thank you for your order. You will receive a confirmation email shortly.</p>
      
      {orderDetails && (
        <div className="order-summary">
          <h3>Order Summary</h3>
          <p>Order ID: {orderDetails.id}</p>
          <p>Total: £{orderDetails.total_amount}</p>
        </div>
      )}
      
      <button onClick={() => navigate('/orders')}>
        View My Orders
      </button>
    </div>
  );
};
```

### Failure Page Implementation

```typescript
// /payment/failure page
const PaymentFailure: React.FC = () => {
  const [searchParams] = useSearchParams();
  const failureReason = searchParams.get('fail_reason');

  return (
    <div className="payment-failure">
      <h1>Payment Failed</h1>
      <p>We're sorry, but your payment could not be processed.</p>
      
      {failureReason && (
        <div className="failure-reason">
          <p>Reason: {failureReason}</p>
        </div>
      )}
      
      <div className="actions">
        <button onClick={() => navigate('/cart')}>
          Return to Cart
        </button>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  );
};
```

## Payment Response Parameters

When customers return from NatWest, the following parameters may be included in the URL:

### Success Parameters
- `approval_code`: Transaction approval code (starts with 'Y' for success)
- `oid`: Order ID
- `refnumber`: Transaction reference number
- `status`: Transaction status ('APPROVED', 'DECLINED', 'FAILED')
- `txndate_processed`: Processing timestamp
- `response_hash`: Security hash for verification

### Failure Parameters
- `fail_reason`: Reason for payment failure
- `processor_response_code`: Detailed error code from payment processor

## Order Status Updates

Orders go through the following status flow:

1. **pending** - Order created, payment initiated
2. **paid** - Payment successfully processed
3. **cancelled** - Payment failed or was declined

You can check order status by calling your orders API endpoint or implementing real-time updates via WebSockets.

## Security Considerations

### 1. HTTPS Requirement
All payment-related pages MUST use HTTPS to ensure secure data transmission.

### 2. Data Validation
Always validate user input before sending to the payment API:

```typescript
function validatePaymentData(data: CreatePaymentRequest): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!data.contact_first_name?.trim()) errors.push('First name is required');
  if (!data.contact_last_name?.trim()) errors.push('Last name is required');
  if (!data.contact_email?.trim()) errors.push('Email is required');
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.contact_email && !emailRegex.test(data.contact_email)) {
    errors.push('Invalid email format');
  }

  // Address validation
  if (!data.shipping_address?.street_address?.trim()) {
    errors.push('Shipping address is required');
  }
  if (!data.shipping_address?.city?.trim()) {
    errors.push('City is required');
  }
  if (!data.shipping_address?.postal_code?.trim()) {
    errors.push('Postal code is required');
  }

  // Cart validation
  if (!data.cart_items?.length) {
    errors.push('Cart cannot be empty');
  }

  return errors;
}
```

### 3. Error Handling Best Practices

```typescript
function handlePaymentError(error: any): void {
  // Log error for debugging (without sensitive data)
  console.error('Payment error:', {
    status: error.status,
    message: error.message,
    timestamp: new Date().toISOString(),
  });

  // Show user-friendly messages
  switch (error.status) {
    case 400:
      showMessage('Please check your information and try again.');
      break;
    case 409:
      showMessage('Some items in your cart are no longer available.');
      break;
    case 500:
      showMessage('A technical error occurred. Please try again later.');
      break;
    default:
      showMessage('Payment could not be processed. Please try again.');
  }
}
```

## Testing

### Test Data
For testing in the development environment, use these test card details on the NatWest payment page:

- **Card Number:** 4000000000000002
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **Name:** Any name

### Test Scenarios
1. **Successful Payment:** Complete flow with test card
2. **Failed Payment:** Use invalid card details
3. **Cancelled Payment:** Close payment page without completing
4. **Network Issues:** Test with poor connectivity

## Common Issues and Solutions

### 1. Form Auto-Submit Not Working
```typescript
// Ensure form is appended to DOM before submitting
document.body.appendChild(form);
// Add small delay if needed
setTimeout(() => form.submit(), 100);
```

### 2. URL Parameters Not Received
Check that your success/failure URLs are correctly configured and accessible.

### 3. CORS Issues
Ensure your backend allows requests from your frontend domain.

### 4. Payment Page Not Loading
Verify that all required fields are included in the payment form and the hash is correctly generated.

## Support and Troubleshooting

### Debug Information
When reporting issues, include:
- Order ID
- Timestamp of the payment attempt
- Error messages received
- Browser and device information

### Logging
Implement comprehensive logging for payment flows:

```typescript
function logPaymentAttempt(data: CreatePaymentRequest, response: CreatePaymentResponse): void {
  console.log('Payment initiated:', {
    order_id: response.order_id,
    amount: response.total_amount,
    customer_email: data.contact_email,
    timestamp: new Date().toISOString(),
  });
}
```

## Next Steps

1. Implement the payment flow in your frontend application
2. Test thoroughly with test credentials
3. Set up proper error handling and user feedback
4. Configure success/failure pages
5. Test the complete flow end-to-end
6. Monitor payment completion rates and errors

For additional support or questions about the implementation, contact the development team. 