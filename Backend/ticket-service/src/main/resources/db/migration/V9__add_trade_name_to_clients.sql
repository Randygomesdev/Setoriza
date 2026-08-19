-- Migration: Add trade_name (Nome Fantasia) to clients table
ALTER TABLE clients ADD COLUMN trade_name VARCHAR(255);

-- Copy existing company_name (Razão Social) into trade_name for existing records
UPDATE clients SET trade_name = company_name WHERE trade_name IS NULL;

-- Make trade_name column NOT NULL
ALTER TABLE clients ALTER COLUMN trade_name SET NOT NULL;
