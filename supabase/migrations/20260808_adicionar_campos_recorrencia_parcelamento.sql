-- ============================================================
-- MIGRAÇÃO: Adicionar suporte a Lançamentos Recorrentes e Parcelados
-- Data: 08/08/2026
-- Tabela: transactions
-- ============================================================

-- 1. Adicionar colunas de frequência e recorrência
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='frequencia') THEN
    ALTER TABLE transactions ADD COLUMN frequencia VARCHAR(20) NOT NULL DEFAULT 'AVULSO';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='periodicidade') THEN
    ALTER TABLE transactions ADD COLUMN periodicidade VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='parcela_atual') THEN
    ALTER TABLE transactions ADD COLUMN parcela_atual INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='total_parcelas') THEN
    ALTER TABLE transactions ADD COLUMN total_parcelas INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='grupo_recorrencia_id') THEN
    ALTER TABLE transactions ADD COLUMN grupo_recorrencia_id UUID;
  END IF;
END $$;

-- 2. Adicionar constraints de check para valores válidos
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_frequencia_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_frequencia_check
  CHECK (frequencia IN ('AVULSO', 'RECORRENTE', 'PARCELADO'));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_periodicidade_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_periodicidade_check
  CHECK (periodicidade IS NULL OR periodicidade IN ('SEMANAL', 'MENSAL', 'ANUAL'));

-- 3. Criar índice para busca por grupo de recorrência (essencial para bulk updates/deletes)
CREATE INDEX IF NOT EXISTS idx_transactions_grupo_recorrencia_id
  ON transactions(grupo_recorrencia_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id_data
  ON transactions(user_id, data);

-- 4. Comentários para documentação
COMMENT ON COLUMN transactions.frequencia IS 'Tipo de frequencia: AVULSO, RECORRENTE ou PARCELADO';
COMMENT ON COLUMN transactions.periodicidade IS 'Periodicidade para RECORRENTE: SEMANAL, MENSAL ou ANUAL';
COMMENT ON COLUMN transactions.parcela_atual IS 'Numero da parcela atual (somente para PARCELADO)';
COMMENT ON COLUMN transactions.total_parcelas IS 'Numero total de parcelas (somente para PARCELADO)';
COMMENT ON COLUMN transactions.grupo_recorrencia_id IS 'UUID compartilhado por todos os lancamentos de um mesmo grupo recorrente ou parcelado';
