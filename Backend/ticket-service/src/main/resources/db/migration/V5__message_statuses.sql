ALTER TABLE messages ADD COLUMN whatsapp_msg_id VARCHAR(255) NULL;
ALTER TABLE messages ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'SENT';
CREATE INDEX idx_messages_whatsapp_msg_id ON messages(whatsapp_msg_id);
