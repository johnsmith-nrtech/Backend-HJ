# Tyl Payment Gateway Integration Plan

## Overview
This plan outlines the integration of Tyl payment gateway with our NestJS e-commerce backend, enabling secure payment processing through hosted payment pages.

## 1. Environment Configuration

### Environment Variables
```env
# Tyl Payment Gateway Credentials
TYL_STORE_NAME=7220542049
TYL_USERNAME=7220542049
TYL_PASSWORD=uEQy5$Ex<2NP
TYL_SHARED_SECRET=Mz8v'kA5<Aug
TYL_BASE_URL=https://test.ipg-online.com/vt/login/natwest_tyl
TYL_PAYMENT_URL=https://test.ipg-online.com/connect/gateway/processing

# Application URLs
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:8000
```

## 2. API Endpoint Design

### POST `/orders/create-payment`

#### Request Body Schema
```typescript
{
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
    country: string; // ISO 2-letter code
    country_name: string;
  };
  
  billing_address?: AddressDto; // Optional, uses shipping if not provided
  use_different_billing_address: boolean;
  
  // Cart Information
  cart_items: Array<{
    variant_id: string;
    quantity: number;
  }>;
  
  // Optional Fields
  order_notes?: string;
  // coupon_code?: string; // Not implemented yet
}
```

#### Response Schema
```typescript
{
  success: boolean;
  order_id: string;
  total_amount: number; // Subtotal only (no discounts, shipping, tax for now)
  currency: string;
  payment_form: {
    action_url: string;
    method: 'POST';
    fields: {
      storename: string;
      mode: string;
      txntype: string;
      timezone: string;
      txndatetime: string;
      hash_algorithm: string;
      hash: string;
      responseSuccessURL: string;
      responseFailURL: string;
      // ... other Tyl required fields
    };
  };
  error?: string;
}
```

## 3. Implementation Flow

> **Note**: Phase 1 implementation uses simplified calculations (no discounts, shipping, or taxes). These will be added in future phases.

### Step 1: Order Creation Process
1. **Validate Request Data**
   - Validate customer information
   - Validate address format against JSONB schema
   - Validate cart items exist and have stock

2. **Calculate Order Total**
   - Fetch variant prices from database
   - Calculate subtotal (price × quantity for each item)
   - Set discount amount to 0 (for now)
   - Set shipping costs to 0 (for now)
   - Set tax amount to 0 (for now)
   - Total amount = subtotal only

3. **Create Order Record**
   - Insert into `orders` table with status 'pending'
   - Insert into `order_items` table for each cart item
   - Create initial `payments` record with status 'pending'

### Step 2: Tyl Payment Form Generation
1. **Generate Payment Parameters**
   ```typescript
   const paymentParams = {
     storename: process.env.TYL_STORE_NAME,
     mode: 'payonly', // or 'payplus' for extended features
     txntype: 'sale',
     timezone: 'Europe/London',
     txndatetime: generateTimestamp(),
     chargetotal: orderTotal.toFixed(2),
     currency: '826', // GBP ISO code
     responseSuccessURL: `${process.env.FRONTEND_BASE_URL}/payment/success`,
     responseFailURL: `${process.env.FRONTEND_BASE_URL}/payment/failure`,
     transactionNotificationURL: `${process.env.BACKEND_BASE_URL}/orders/payment/webhook`,
     // Customer details
     bname: customer.first_name,
     bname2: customer.last_name,
     email: customer.email,
     // Address details
     baddr1: shipping_address.street_address,
     bcity: shipping_address.city,
     bzip: shipping_address.postal_code,
     bcountry: shipping_address.country,
   };
   ```

2. **Generate Security Hash**
   ```typescript
   const hashString = `${storename}|${txndatetime}|${chargetotal}|${currency}|${shared_secret}`;
   const hash = crypto.createHash('sha256').update(hashString).digest('hex');
   ```

### Step 3: Payment Processing Response
1. **Return Payment Form Data**
   - Provide all necessary fields for frontend to auto-submit form
   - Include order reference for tracking

## 4. Webhook Implementation

### POST `/orders/payment/webhook`

#### Webhook Security
1. **Verify Request Authenticity**
   - Validate incoming hash against expected hash
   - Check timestamp to prevent replay attacks
   - Verify request origin

2. **Hash Verification Process**
   ```typescript
   const expectedHash = crypto
     .createHash('sha256')
     .update(`${approval_code}|${chargetotal}|${currency}|${txndatetime}|${storename}|${shared_secret}`)
     .digest('hex');
   ```

#### Webhook Processing
1. **Extract Payment Data**
   - Approval code
   - Transaction status
   - Amount and currency
   - Transaction datetime
   - Reference numbers

2. **Update Database Records**
   ```sql
   -- Update payment record
   UPDATE payments SET
     status = $1,
     approval_code = $2,
     reference_number = $3,
     transaction_datetime = $4,
     response_hash = $5,
     processed_at = NOW()
   WHERE payment_id = $6;
   
   -- Update order status
   UPDATE orders SET
     status = $1,
     updated_at = NOW()
   WHERE id = $2;
   ```

3. **Status Mapping**
   - `APPROVED` → `paid`
   - `DECLINED` → `cancelled`
   - `FAILED` → `cancelled`

## 5. Frontend Integration

### Payment Form Auto-Submit
```html
<form id="tyl-payment-form" method="POST" action="{payment_form.action_url}">
  <!-- Hidden fields populated from API response -->
  <input type="hidden" name="storename" value="{fields.storename}" />
  <input type="hidden" name="mode" value="{fields.mode}" />
  <!-- ... all other fields ... -->
</form>

<script>
  document.getElementById('tyl-payment-form').submit();
</script>
```

## 6. Error Handling

### API Error Responses
- Validation errors (400)
- Stock insufficient (409)
- Internal server errors (500)
- Invalid variant IDs (404)

### Payment Failure Handling
- Capture declined transactions
- Log failure reasons
- Provide user-friendly error messages
- Implement retry mechanisms

## 7. Security Considerations

### Data Protection
- Encrypt sensitive payment data
- Use HTTPS for all communications
- Implement rate limiting on payment endpoints
- Validate and sanitize all inputs

### PCI Compliance
- Never store card details
- Use Tyl's hosted payment pages
- Implement proper logging without sensitive data
- Regular security audits

## 8. Testing Strategy

### Test Environment
- Use Tyl test credentials
- Test with various card scenarios
- Verify webhook handling
- Test error conditions

### Test Cases
1. Successful payment flow
2. Declined payment handling
3. Webhook failure scenarios
4. Invalid order data
5. Concurrent payment attempts

## 9. Monitoring and Logging

### Payment Tracking
- Log all payment attempts
- Track conversion rates
- Monitor failed transactions
- Set up alerts for unusual patterns

### Database Indexes
```sql
-- Optimize payment queries
CREATE INDEX IF NOT EXISTS payments_order_status_idx ON payments(order_id, status);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at);
```

## 10. Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Webhook URLs registered with Tyl

### Post-Deployment
- [ ] Test payment flow end-to-end
- [ ] Verify webhook reception
- [ ] Check order status updates
- [ ] Monitor error logs

## 11. Future Enhancements

### Phase 2 Features
- Discount/coupon code system
- Shipping cost calculation
- Tax calculation
- Partial refunds support
- Recurring payments
- Multi-currency support
- Payment analytics dashboard
- Advanced fraud detection

### Integration Improvements
- Real-time payment status updates via WebSockets
- Payment retry mechanisms
- Abandoned cart recovery
- Payment method preferences
