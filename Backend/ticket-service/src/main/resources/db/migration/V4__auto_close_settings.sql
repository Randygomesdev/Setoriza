-- 1. Adicionar colunas de encerramento automático na tabela sectors
ALTER TABLE sectors ADD COLUMN auto_close_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sectors ADD COLUMN auto_close_timeout_minutes INTEGER NOT NULL DEFAULT 60;
ALTER TABLE sectors ADD COLUMN auto_close_warning_minutes INTEGER NOT NULL DEFAULT 45;
ALTER TABLE sectors ADD COLUMN auto_close_warning_message VARCHAR(500) NOT NULL DEFAULT 'Olá! Notamos que você não respondeu há algum tempo. Para manter nossa fila organizada, este atendimento será encerrado automaticamente em breve caso não haja retorno.';

-- 2. Adicionar flag de alerta de inatividade enviado na tabela tickets
ALTER TABLE tickets ADD COLUMN auto_close_warning_sent BOOLEAN NOT NULL DEFAULT FALSE;
