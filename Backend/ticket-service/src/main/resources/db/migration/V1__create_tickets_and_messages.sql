CREATE TABLE tickets (
    id                 UUID            PRIMARY KEY,
    client_id          UUID            NULL,
    assigned_agent_id  UUID            NULL,
    whatsapp_number    VARCHAR(50)     NOT NULL,
    client_name        VARCHAR(255)    NULL,
    sector             VARCHAR(50)     NULL,
    status             VARCHAR(50)     NOT NULL,
    created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id                 UUID            PRIMARY KEY,
    ticket_id          UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_type        VARCHAR(50)     NOT NULL,
    message_type       VARCHAR(50)     NOT NULL,
    content            TEXT            NOT NULL,
    sent_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tickets_whatsapp_status ON tickets(whatsapp_number, status);
CREATE INDEX idx_messages_ticket_id ON messages(ticket_id);
