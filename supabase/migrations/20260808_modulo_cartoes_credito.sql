-- ============================================================
-- MIGRAÇÃO: Módulo de Cartões de Crédito e Faturas
-- Data: 08/08/2026
-- ============================================================

-- 1. TABELA cartoes_credito
CREATE TABLE IF NOT EXISTS cartoes_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  bandeira VARCHAR(20) NOT NULL DEFAULT 'OUTROS',
  limite_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  dia_fechamento INTEGER NOT NULL DEFAULT 1,
  dia_vencimento INTEGER NOT NULL DEFAULT 5,
  cor VARCHAR(20) NOT NULL DEFAULT '#0f172a',
  conta_pagamento_padrao_id UUID REFERENCES contas_bancarias(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cartoes_credito DROP CONSTRAINT IF EXISTS cartoes_credito_bandeira_check;
ALTER TABLE cartoes_credito ADD CONSTRAINT cartoes_credito_bandeira_check
  CHECK (bandeira IN ('VISA','MASTERCARD','ELO','AMEX','HIPERCARD','OUTROS'));

ALTER TABLE cartoes_credito DROP CONSTRAINT IF EXISTS cartoes_credito_dia_fechamento_check;
ALTER TABLE cartoes_credito ADD CONSTRAINT cartoes_credito_dia_fechamento_check
  CHECK (dia_fechamento BETWEEN 1 AND 28);

ALTER TABLE cartoes_credito DROP CONSTRAINT IF EXISTS cartoes_credito_dia_vencimento_check;
ALTER TABLE cartoes_credito ADD CONSTRAINT cartoes_credito_dia_vencimento_check
  CHECK (dia_vencimento BETWEEN 1 AND 28);

CREATE INDEX IF NOT EXISTS idx_cartoes_credito_user_id ON cartoes_credito(user_id);

-- 2. TABELA faturas_cartao
CREATE TABLE IF NOT EXISTS faturas_cartao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cartao_id UUID NOT NULL REFERENCES cartoes_credito(id) ON DELETE CASCADE,
  mes_ano VARCHAR(7) NOT NULL,
  data_fechamento DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  status VARCHAR(15) NOT NULL DEFAULT 'ABERTA',
  valor_pago NUMERIC(15,2),
  data_pagamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cartao_id, mes_ano)
);

ALTER TABLE faturas_cartao DROP CONSTRAINT IF EXISTS faturas_cartao_status_check;
ALTER TABLE faturas_cartao ADD CONSTRAINT faturas_cartao_status_check
  CHECK (status IN ('ABERTA','FECHADA','PAGA','ATRASADA'));

CREATE INDEX IF NOT EXISTS idx_faturas_cartao_user_id ON faturas_cartao(user_id);
CREATE INDEX IF NOT EXISTS idx_faturas_cartao_cartao_id ON faturas_cartao(cartao_id);
CREATE INDEX IF NOT EXISTS idx_faturas_cartao_mes_ano ON faturas_cartao(mes_ano);

-- 3. NOVAS COLUNAS EM transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='cartao_id') THEN
    ALTER TABLE transactions ADD COLUMN cartao_id UUID REFERENCES cartoes_credito(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='fatura_id') THEN
    ALTER TABLE transactions ADD COLUMN fatura_id UUID REFERENCES faturas_cartao(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='data_compra') THEN
    ALTER TABLE transactions ADD COLUMN data_compra DATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_cartao_id ON transactions(cartao_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fatura_id ON transactions(fatura_id);

-- 4. RLS (Row Level Security)
ALTER TABLE cartoes_credito ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cartoes_credito_user_policy ON cartoes_credito;
CREATE POLICY cartoes_credito_user_policy ON cartoes_credito
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE faturas_cartao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faturas_cartao_user_policy ON faturas_cartao;
CREATE POLICY faturas_cartao_user_policy ON faturas_cartao
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
