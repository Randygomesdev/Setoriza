-- 1. Criar a tabela de setores dinâmicos
CREATE TABLE sectors (
    id              UUID            PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL UNIQUE,
    friendly_name   VARCHAR(255)    NOT NULL,
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar a tabela de empresas clientes (Razão Social e CNPJ)
CREATE TABLE clients (
    id              UUID            PRIMARY KEY,
    cnpj            VARCHAR(20)     NOT NULL UNIQUE,
    company_name    VARCHAR(255)    NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Criar a tabela de contatos de WhatsApp vinculados a empresas
CREATE TABLE client_contacts (
    id              UUID            PRIMARY KEY,
    client_id       UUID            NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    whatsapp_number VARCHAR(50)     NOT NULL UNIQUE,
    contact_name    VARCHAR(255)    NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Modificar a tabela de tickets
ALTER TABLE tickets DROP COLUMN IF EXISTS sector;
ALTER TABLE tickets ADD COLUMN sector_id UUID NULL REFERENCES sectors(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- 5. Inserir alguns setores padrão para iniciar o sistema
INSERT INTO sectors (id, name, friendly_name, active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'FISCAL', 'Fiscal', true),
  ('10000000-0000-0000-0000-000000000002', 'DEPARTAMENTO_PESSOAL', 'Departamento Pessoal', true),
  ('10000000-0000-0000-0000-000000000003', 'CONTABIL', 'Contábil', true),
  ('10000000-0000-0000-0000-000000000004', 'SOCIETARIO', 'Societário', true)
ON CONFLICT (name) DO NOTHING;
