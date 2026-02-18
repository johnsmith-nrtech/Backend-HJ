-- Migration: Add missing product and variant fields
-- Date: $(date)
-- Description: Adding delivery time, dimensions, pricing, and other e-commerce fields

-- Add new fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS 
  delivery_info JSONB DEFAULT '{"min_days": 3, "max_days": 5, "text": "3 to 5 Days Delivery"}';

ALTER TABLE products ADD COLUMN IF NOT EXISTS 
  warranty_info TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS 
  care_instructions TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS 
  assembly_required BOOLEAN DEFAULT false;

ALTER TABLE products ADD COLUMN IF NOT EXISTS 
  assembly_instructions TEXT;

-- Add new fields to product_variants table
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS 
  compare_price NUMERIC(10, 2); -- Original price for showing discounts

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS 
  weight_kg NUMERIC(8, 3); -- Weight in kilograms

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS 
  dimensions JSONB DEFAULT '{}'; -- Store all dimensional data

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS 
  payment_options JSONB DEFAULT '[]'; -- Store payment plan options like Klarna

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS 
  discount_percentage INTEGER DEFAULT 0; -- Calculated discount percentage

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_products_delivery_days ON products USING GIN (delivery_info);
CREATE INDEX IF NOT EXISTS idx_variants_compare_price ON product_variants(compare_price) WHERE compare_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variants_weight ON product_variants(weight_kg) WHERE weight_kg IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variants_dimensions ON product_variants USING GIN (dimensions);
CREATE INDEX IF NOT EXISTS idx_variants_payment_options ON product_variants USING GIN (payment_options);
CREATE INDEX IF NOT EXISTS idx_variants_discount ON product_variants(discount_percentage) WHERE discount_percentage > 0;

-- Create a function to calculate discount percentage
CREATE OR REPLACE FUNCTION calculate_discount_percentage(current_price NUMERIC, compare_price NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  IF compare_price IS NULL OR compare_price <= current_price THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND(((compare_price - current_price) / compare_price * 100)::NUMERIC, 0)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a trigger to automatically update discount_percentage
CREATE OR REPLACE FUNCTION update_variant_discount_percentage()
RETURNS TRIGGER AS $$
BEGIN
  NEW.discount_percentage := calculate_discount_percentage(NEW.price, NEW.compare_price);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discount_percentage_trigger
  BEFORE INSERT OR UPDATE OF price, compare_price ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_variant_discount_percentage();

-- Add comments for documentation
COMMENT ON COLUMN products.delivery_info IS 'JSON object containing delivery timeframe info: {"min_days": 3, "max_days": 5, "text": "3 to 5 Days Delivery"}';
COMMENT ON COLUMN products.warranty_info IS 'Warranty information text';
COMMENT ON COLUMN products.care_instructions IS 'Care and maintenance instructions';
COMMENT ON COLUMN products.assembly_required IS 'Whether the product requires assembly';
COMMENT ON COLUMN products.assembly_instructions IS 'Assembly instructions text or URL';

COMMENT ON COLUMN product_variants.compare_price IS 'Original/compare price for showing discounts (strikethrough price)';
COMMENT ON COLUMN product_variants.weight_kg IS 'Product weight in kilograms for shipping calculations';
COMMENT ON COLUMN product_variants.dimensions IS 'JSON object containing all dimensional data in both metric and imperial units';
COMMENT ON COLUMN product_variants.payment_options IS 'JSON array of available payment options like installment plans';
COMMENT ON COLUMN product_variants.discount_percentage IS 'Calculated discount percentage based on price vs compare_price';

-- Example dimension structure:
-- {
--   "width": {"cm": 215, "inches": 84.65},
--   "depth": {"cm": 96, "inches": 37.80},
--   "height": {"cm": 88, "inches": 34.65},
--   "seat_width": {"cm": 180, "inches": 70.87},
--   "seat_depth": {"cm": 56, "inches": 22.05},
--   "seat_height": {"cm": 52, "inches": 20.47},
--   "bed_width": {"cm": 180, "inches": 70.87},
--   "bed_length": {"cm": 110, "inches": 43.31}
-- }

-- Example payment_options structure:
-- [
--   {
--     "provider": "klarna",
--     "type": "installment",
--     "installments": 3,
--     "amount_per_installment": 266.66,
--     "total_amount": 799.99,
--     "description": "Make 3 Payments Of $266.66"
--   }
-- ]

-- Example delivery_info structure:
-- {
--   "min_days": 3,
--   "max_days": 4,
--   "text": "3 To 4 Days Delivery",
--   "shipping_method": "standard",
--   "free_shipping_threshold": 500
-- } 