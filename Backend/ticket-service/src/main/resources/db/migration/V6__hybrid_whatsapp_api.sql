-- V6__hybrid_whatsapp_api.sql
-- Create global WhatsApp configuration table

CREATE TABLE whatsapp_configs (
    id UUID PRIMARY KEY,
    api_type VARCHAR(50) NOT NULL DEFAULT 'EVOLUTION',
    meta_phone_number_id VARCHAR(255),
    meta_access_token TEXT,
    meta_waba_id VARCHAR(255),
    meta_verify_token VARCHAR(255)
);

-- Insert initial default configuration row
INSERT INTO whatsapp_configs (id, api_type) 
VALUES ('00000000-0000-0000-0000-000000000000', 'EVOLUTION');
