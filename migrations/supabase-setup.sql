-- Sofa Deal E-Commerce Database Schema
-- This file contains all table definitions for the e-commerce platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Setup Storage for product images
-- Make sure the storage extension and schema exist
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE SCHEMA IF NOT EXISTS storage;

-- Create the product images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    updated_at = NOW();

-- Create the category images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    updated_at = NOW();

-- Set up security policies for the product-images bucket
-- Enable RLS on the storage.objects table but make it completely open
DO $$
BEGIN
  -- Enable RLS for the storage.objects table
  EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
  
  -- Drop any existing policies on the storage.objects table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public Read Access" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Admin Write Access" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Individual user Access" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all operations for all users" ON storage.objects';
  END IF;
  
  -- Create a policy that allows everyone to do everything (read/insert/update/delete)
  EXECUTE 'CREATE POLICY "Allow all operations for all users" 
           ON storage.objects
           FOR ALL
           USING (true)
           WITH CHECK (true)';
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'editor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ✅ Ensure pgcrypto extension is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ✅ Create 'floors' table if it doesn't exist
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  charges NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ Check if 'floors' table exists in 'public' schema
SELECT *
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'floors';

  -- ✅ Ensure pgcrypto extension is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User addresses table
CREATE TABLE IF NOT EXISTS user_addresses (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shipping', 'billing')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  recipient_name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx ON user_addresses(user_id);

-- This ensures that there's only one default address per user per type (shipping/billing)
CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_user_id_type_default_idx 
ON user_addresses(user_id, type) 
WHERE is_default = true;

-- Add a trigger to update the updated_at timestamp when an address is updated
CREATE OR REPLACE FUNCTION update_user_address_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_addresses_updated_at ON user_addresses;
CREATE TRIGGER user_addresses_updated_at
BEFORE UPDATE ON user_addresses
FOR EACH ROW EXECUTE FUNCTION update_user_address_updated_at();

-- Categories table (hierarchical)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for featured categories for faster queries
CREATE INDEX IF NOT EXISTS categories_featured_idx ON categories(featured) WHERE featured = true;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  base_price NUMERIC(10, 2) NOT NULL,
  delivery_info JSONB DEFAULT '{"min_days": 3, "max_days": 5, "text": "3 to 5 Days Delivery"}',
  warranty_info TEXT,
  care_instructions TEXT,
  assembly_required BOOLEAN DEFAULT false,
  assembly_instructions TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', name), 'A') || 
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
  ) STORED
);

-- Add GIN index for full-text search
CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (search_vector);

-- Add trigram index for name
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING GIN (name gin_trgm_ops);

-- Add trigram index for description
CREATE INDEX IF NOT EXISTS products_description_trgm_idx ON products USING GIN (description gin_trgm_ops);

-- Add indexes for new product fields
CREATE INDEX IF NOT EXISTS idx_products_delivery_days ON products USING GIN (delivery_info);

-- Product tags table
CREATE TABLE IF NOT EXISTS product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Product variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  price NUMERIC(10, 2),
  compare_price NUMERIC(10, 2),
  size TEXT,
  color TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  weight_kg NUMERIC(8, 3),
  dimensions JSONB DEFAULT '{}',
  payment_options JSONB DEFAULT '[]',
  discount_percentage INTEGER DEFAULT 0,
  tags TEXT,
  material TEXT,
  brand TEXT,
  featured BOOLEAN DEFAULT FALSE,
  
  -- New fields
  assemble_charges NUMERIC(10, 2) DEFAULT 0,
  delivery_time_days TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create indexes for the variant attributes
CREATE INDEX IF NOT EXISTS idx_product_variants_tags ON product_variants USING gin (to_tsvector('english', COALESCE(tags, '')));
CREATE INDEX IF NOT EXISTS idx_product_variants_material ON product_variants(material);
CREATE INDEX IF NOT EXISTS idx_product_variants_brand ON product_variants(brand);
CREATE INDEX IF NOT EXISTS idx_product_variants_featured ON product_variants(featured) WHERE featured = true;

-- Create indexes for new variant fields
-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_variants_compare_price 
    ON product_variants(compare_price) 
    WHERE compare_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variants_weight 
    ON product_variants(weight_kg) 
    WHERE weight_kg IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variants_dimensions 
    ON product_variants USING GIN (dimensions);

CREATE INDEX IF NOT EXISTS idx_variants_payment_options 
    ON product_variants USING GIN (payment_options);

CREATE INDEX IF NOT EXISTS idx_variants_discount 
    ON product_variants(discount_percentage) 
    WHERE discount_percentage > 0;

-- New indexes for assemble_charges and delivery_time_days
CREATE INDEX IF NOT EXISTS idx_variants_assemble_charges 
    ON product_variants(assemble_charges) 
    WHERE assemble_charges IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variants_delivery_time_days 
    ON product_variants(delivery_time_days) 
    WHERE delivery_time_days IS NOT NULL;


-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'main' CHECK (type IN ('main', 'gallery', '360')),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discounts table
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC(10, 2) NOT NULL,
  start_date DATE,
  end_date DATE,
  code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  min_order_amount NUMERIC(10, 2),
  max_discount_amount NUMERIC(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Category discounts junction table
CREATE TABLE IF NOT EXISTS category_discounts (
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, category_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product discounts junction table
CREATE TABLE IF NOT EXISTS product_discounts (
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, product_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Variant discounts junction table
CREATE TABLE IF NOT EXISTS variant_discounts (
  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  PRIMARY KEY (discount_id, variant_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT cart_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (cart_id, variant_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS  public.orders (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  status text not null default 'pending'::text,
  total_amount numeric(10, 2) not null,
  currency text not null default 'GBP'::text,
  
  -- Contact Information
  contact_first_name text not null,
  contact_last_name text not null,
  contact_phone text,
  contact_email text not null,
  
  -- Enhanced Address Storage
  shipping_address jsonb not null,
  billing_address jsonb not null,
  use_different_billing_address boolean not null default false,
  
  -- Payment and Order Metadata
  order_notes text,
  coupon_code text,
  discount_amount numeric(10, 2) default 0,
  shipping_cost numeric(10, 2) default 0,
  tax_amount numeric(10, 2) default 0,
  
  -- Timestamps
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  cancellation_reason text null,

  constraint orders_new_pkey primary key (id),
  constraint orders_new_user_id_fkey foreign KEY (user_id) references users (id) on delete set null,
  constraint orders_new_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'paid'::text,
          'shipped'::text,
          'delivered'::text,
          'cancelled'::text
        ]
      )
    )
  ),
  constraint valid_email_format check (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  constraint positive_amounts check (
    total_amount >= 0 AND
    discount_amount >= 0 AND
    shipping_cost >= 0 AND
    tax_amount >= 0
  )
) TABLESPACE pg_default;

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS orders_contact_email_idx ON orders(contact_email);
CREATE INDEX IF NOT EXISTS orders_contact_phone_idx ON orders(contact_phone);
CREATE INDEX IF NOT EXISTS orders_contact_name_idx ON orders(contact_first_name, contact_last_name);
CREATE INDEX IF NOT EXISTS orders_coupon_code_idx ON orders(coupon_code) WHERE coupon_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at);

-- Address JSONB structure documentation and validation
-- Expected shipping_address and billing_address JSONB format:
-- {
--   "street_address": "123 Main Street",
--   "address_line_2": "Apt 4B", (optional)
--   "city": "London",
--   "state": "Greater London", (optional)
--   "postal_code": "SW1A 1AA",
--   "country": "GB",
--   "country_name": "United Kingdom"
-- }

-- Function to validate address JSONB structure
CREATE OR REPLACE FUNCTION validate_address_jsonb(address_data JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check required fields exist and are not empty
  IF address_data IS NULL OR
     NOT (address_data ? 'street_address') OR
     NOT (address_data ? 'city') OR
     NOT (address_data ? 'postal_code') OR
     NOT (address_data ? 'country') OR
     TRIM(address_data->>'street_address') = '' OR
     TRIM(address_data->>'city') = '' OR
     TRIM(address_data->>'postal_code') = '' OR
     TRIM(address_data->>'country') = ''
  THEN
    RETURN FALSE;
  END IF;
  
  -- Validate country code format (2 letter ISO code)
  IF LENGTH(TRIM(address_data->>'country')) != 2 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add address validation constraints
ALTER TABLE orders 
ADD CONSTRAINT valid_shipping_address 
CHECK (validate_address_jsonb(shipping_address));

ALTER TABLE orders 
ADD CONSTRAINT valid_billing_address 
CHECK (validate_address_jsonb(billing_address));

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  discount_applied NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger to update orders.updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at_trigger ON orders;
CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_orders_updated_at();

-- Payments table (updated to support Tyl)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  
  -- Tyl specific fields
  approval_code TEXT,
  reference_number TEXT,
  transaction_datetime TIMESTAMP WITH TIME ZONE,
  response_hash TEXT,
  
  -- Additional payment metadata
  payment_method TEXT, -- 'V' for Visa, 'M' for Mastercard, etc.
  card_brand TEXT,
  last_four_digits TEXT,
  failure_reason TEXT,
  
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraints with explicit names (handles both new and existing tables)
DO $$
BEGIN
  -- Drop any existing provider constraints
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'payments_provider_check' 
             AND table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT payments_provider_check;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'payments_new_provider_check' 
             AND table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT payments_new_provider_check;
  END IF;
  
  -- Add the provider constraint with explicit name, including COD
  ALTER TABLE payments ADD CONSTRAINT payments_provider_check 
  CHECK (provider IN ('stripe', 'paypal', 'tyl', 'cod'));
  
  -- Drop any existing status constraints
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'payments_status_check' 
             AND table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT payments_status_check;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'payments_new_status_check' 
             AND table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT payments_new_status_check;
  END IF;
  
  -- Add the status constraint with explicit name
  ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'approved', 'declined'));
END
$$;

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON payments(provider);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payments_payment_id_idx ON payments(payment_id);
CREATE INDEX IF NOT EXISTS payments_approval_code_idx ON payments(approval_code) WHERE approval_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_processed_at_idx ON payments(processed_at);

-- Sample order data structure for reference:
-- INSERT INTO orders (
--   contact_first_name,
--   contact_last_name,
--   contact_phone,
--   contact_email,
--   shipping_address,
--   billing_address,
--   use_different_billing_address,
--   total_amount,
--   shipping_cost,
--   tax_amount
-- ) VALUES (
--   'John',
--   'Doe',
--   '+44 20 7946 0958',
--   'john.doe@example.com',
--   '{
--     "street_address": "123 Oxford Street",
--     "address_line_2": "Flat 4B",
--     "city": "London",
--     "state": "Greater London",
--     "postal_code": "W1C 1DE",
--     "country": "GB",
--     "country_name": "United Kingdom"
--   }'::jsonb,
--   '{
--     "street_address": "456 Billing Street",
--     "city": "London",
--     "postal_code": "SW1A 1AA",
--     "country": "GB",
--     "country_name": "United Kingdom"
--   }'::jsonb,
--   true,
--   199.99,
--   9.99,
--   33.33
-- );

-- Wishlists table
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Either user_id OR session_id must be provided
  CONSTRAINT wishlist_owner CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR
    (user_id IS NULL AND session_id IS NOT NULL)
  ),
  
  -- Ensure unique variant combinations per user/session
  CONSTRAINT unique_wishlist_item_user UNIQUE NULLS NOT DISTINCT (user_id, variant_id),
  CONSTRAINT unique_wishlist_item_session UNIQUE NULLS NOT DISTINCT (session_id, variant_id)
);

-- Function to safely increment the usage count of a discount
CREATE OR REPLACE FUNCTION increment_discount_usage(discount_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE discounts 
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = discount_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate discount percentage
CREATE OR REPLACE FUNCTION calculate_discount_percentage(current_price NUMERIC, compare_price NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  IF compare_price IS NULL OR compare_price <= current_price THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND(((compare_price - current_price) / compare_price * 100)::NUMERIC, 0)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to automatically update discount_percentage
CREATE OR REPLACE FUNCTION update_variant_discount_percentage()
RETURNS TRIGGER AS $$
BEGIN
  NEW.discount_percentage := calculate_discount_percentage(NEW.price, NEW.compare_price);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update discount_percentage on product_variants
DROP TRIGGER IF EXISTS update_discount_percentage_trigger ON product_variants;
CREATE TRIGGER update_discount_percentage_trigger
  BEFORE INSERT OR UPDATE OF price, compare_price ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_variant_discount_percentage();

-- Add column comments for documentation
COMMENT ON COLUMN products.delivery_info IS 'JSON object containing delivery timeframe info: {"min_days": 3, "max_days": 5, "text": "3 to 5 Days Delivery"}';
COMMENT ON COLUMN products.warranty_info IS 'Warranty information text';
COMMENT ON COLUMN products.care_instructions IS 'Care and maintenance instructions';
COMMENT ON COLUMN products.assembly_required IS 'Whether the product requires assembly';
COMMENT ON COLUMN products.assembly_instructions IS 'Assembly instructions text or URL';

-- Existing column comments
COMMENT ON COLUMN product_variants.compare_price IS 'Original/compare price for showing discounts (strikethrough price)';
COMMENT ON COLUMN product_variants.weight_kg IS 'Product weight in kilograms for shipping calculations';
COMMENT ON COLUMN product_variants.dimensions IS 'JSON object containing all dimensional data in both metric and imperial units';
COMMENT ON COLUMN product_variants.payment_options IS 'JSON array of available payment options like installment plans';
COMMENT ON COLUMN product_variants.discount_percentage IS 'Calculated discount percentage based on price vs compare_price';

-- New column comments
COMMENT ON COLUMN product_variants.assemble_charges IS 'Assembly charges for the product in dollars';
COMMENT ON COLUMN product_variants.delivery_time_days IS 'Estimated delivery time for the product variant (string, e.g., "3–5 days")';

-- Trigger function for when a user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger on auth.users to fire the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Contact Messages table (allows visitors/customers to reach out; admins can manage)
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  message_text text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','archived','replied')),
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for contact messages
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS contact_messages_email_idx ON public.contact_messages(email);

-- Email format validation for contact_messages (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'contact_messages' AND constraint_name = 'contact_messages_valid_email_format'
  ) THEN
    ALTER TABLE public.contact_messages
    ADD CONSTRAINT contact_messages_valid_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Maintain updated_at on updates
CREATE OR REPLACE FUNCTION public.update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_messages_updated_at_trigger ON public.contact_messages;
CREATE TRIGGER contact_messages_updated_at_trigger
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_messages_updated_at();
