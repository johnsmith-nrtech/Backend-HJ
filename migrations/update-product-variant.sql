-- Update product_variants table to change SKU unique constraint
-- Change from global unique SKU to unique SKU per product

-- First, drop the existing unique constraint on SKU
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_key;

-- Create a new composite unique constraint on product_id + sku
ALTER TABLE product_variants ADD CONSTRAINT product_variants_product_id_sku_key 
UNIQUE (product_id, sku);

-- Add a comment to document this change
COMMENT ON CONSTRAINT product_variants_product_id_sku_key ON product_variants IS 'Ensures SKU is unique within each product, but can be reused across different products';