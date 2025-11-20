ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS assembly_required BOOLEAN NOT NULL DEFAULT false;

-- Add assembly_required field to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS assembly_required BOOLEAN NOT NULL DEFAULT false;

-- Add column comments for documentation
COMMENT ON COLUMN cart_items.assembly_required IS 'Whether the cart item requires assembly service';
COMMENT ON COLUMN order_items.assembly_required IS 'Whether the order item requires assembly service';

-- Add zone and floor JSONB fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS zone JSONB, -- {"zone_name": "Zone 1", "zip_code": "12345", "delivery_charges": 5.00}
ADD COLUMN IF NOT EXISTS floor JSONB; -- {"name": "Ground Floor", "charges": 0.00}

-- Add column comments for documentation
COMMENT ON COLUMN orders.zone IS 'Zone information as JSONB: {"zone_name": "Zone 1", "zip_code": "12345", "delivery_charges": 5.00}';
COMMENT ON COLUMN orders.floor IS 'Floor information as JSONB: {"name": "Ground Floor", "charges": 0.00}';