-- 1. Adicionar limite de SLA de primeiro atendimento por setor na tabela sectors
ALTER TABLE sectors ADD COLUMN sla_limit_minutes INTEGER NOT NULL DEFAULT 15;

-- 2. Adicionar marcos temporais de SLA na tabela tickets
ALTER TABLE tickets ADD COLUMN queued_at TIMESTAMP NULL;
ALTER TABLE tickets ADD COLUMN claimed_at TIMESTAMP NULL;
ALTER TABLE tickets ADD COLUMN resolved_at TIMESTAMP NULL;

-- 3. Criar a tabela de historico de setores por ticket para contagem individual
CREATE TABLE ticket_sector_history (
    id                 UUID            PRIMARY KEY,
    ticket_id          UUID            NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sector_id          UUID            NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    assigned_agent_id  UUID            NULL,
    entered_at         TIMESTAMP       NOT NULL,
    claimed_at         TIMESTAMP       NULL,
    exited_at          TIMESTAMP       NULL,
    resolved_at        TIMESTAMP       NULL,
    sla_limit_minutes  INTEGER         NOT NULL,
    created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tsh_ticket_id ON ticket_sector_history(ticket_id);
CREATE INDEX idx_tsh_sector_id ON ticket_sector_history(sector_id);
