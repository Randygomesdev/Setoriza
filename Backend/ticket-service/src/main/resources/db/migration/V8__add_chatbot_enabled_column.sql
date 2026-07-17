-- Migration V8: Adicionar coluna chatbot_enabled para controle modular da IA
ALTER TABLE ai_configs ADD COLUMN chatbot_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Garantir que o registro inicial padrão tenha chatbot_enabled como false
UPDATE ai_configs SET chatbot_enabled = FALSE WHERE id = '00000000-0000-0000-0000-000000000002';
