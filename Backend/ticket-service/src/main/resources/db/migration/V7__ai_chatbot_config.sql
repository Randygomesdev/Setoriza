-- Migration V7: Tabela de Configuração do Chatbot Inteligente com IA
CREATE TABLE ai_configs (
    id UUID PRIMARY KEY,
    ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_triage_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    gemini_api_key VARCHAR(255),
    system_prompt TEXT
);

-- Inserir registro inicial padrão (ID fixo)
INSERT INTO ai_configs (id, ai_enabled, auto_triage_enabled, gemini_api_key, system_prompt)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    FALSE,
    FALSE,
    NULL,
    'Você é o atendente virtual do Setoriza. Seu objetivo é ajudar o cliente de forma educada, curta e prestativa.'
);
