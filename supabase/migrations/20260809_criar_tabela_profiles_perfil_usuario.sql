-- ============================================================
-- TABELA profiles (Perfil do Usuario & Preferencias)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo VARCHAR(160),
  email VARCHAR(255),
  telefone VARCHAR(30),
  avatar_url TEXT,
  moeda_padrao VARCHAR(10) NOT NULL DEFAULT 'BRL',
  tema_visual VARCHAR(15) NOT NULL DEFAULT 'LIGHT',
  ocultar_saldos_default BOOLEAN NOT NULL DEFAULT FALSE,
  tipo_plano VARCHAR(20) NOT NULL DEFAULT 'PESSOAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tema_visual_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_tema_visual_check
  CHECK (tema_visual IN ('LIGHT', 'DARK', 'SYSTEM'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tipo_plano_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_tipo_plano_check
  CHECK (tipo_plano IN ('PESSOAL', 'ULTRA', 'PRO'));

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_moeda_padrao_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_moeda_padrao_check
  CHECK (moeda_padrao IN ('BRL','USD','EUR','ARS','CLP','COP','MXN','GBP','PYG','UYU'));

-- ============================================================
-- RLS (Row Level Security) - profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- TRIGGER: Criar perfil automaticamente quando cadastrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
