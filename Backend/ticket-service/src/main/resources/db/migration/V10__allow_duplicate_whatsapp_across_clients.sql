-- Drop unique constraint on whatsapp_number from client_contacts table
ALTER TABLE client_contacts DROP CONSTRAINT IF EXISTS client_contacts_whatsapp_number_key;

-- Add composite unique constraint on (client_id, whatsapp_number)
ALTER TABLE client_contacts ADD CONSTRAINT client_contacts_client_id_whatsapp_number_key UNIQUE (client_id, whatsapp_number);
