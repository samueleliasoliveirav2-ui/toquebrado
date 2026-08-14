-- ============================================================
-- FUNCAO SEGURA: verifica EXISTENCIA de e-mail no profiles/public.auth.users
--   - SEM vazamento de dados (retorna BOOLEAN apenas)
--   - SEM expor colunas internas (nome, telefone, avatar etc)
--   - executada com privilegios do OWNER (SECURITY DEFINER) para burlar RLS
--   - acessivel APENAS para roles: anon, authenticated (funciona SEM estar logado)
-- Motivo: POLITICA RLS `profiles_select_own` bloqueia leitura ANTES de autenticar
-- (precisa de auth.uid() = id), logo o checkEmailExists() sempre retornava NULL
-- e o fluxo caia TODAS as vezes no "Usuário Novo" mesmo com email cadastrado.
-- ============================================================

-- Drop por seguranca de existia algo com o mesmo nome
DROP FUNCTION IF EXISTS public.fn_profile_email_exists(p_email TEXT);

CREATE OR REPLACE FUNCTION public.fn_profile_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existe BOOLEAN := FALSE;
  v_email_limpo TEXT := LOWER(TRIM(p_email));
BEGIN
  IF v_email_limpo IS NULL OR v_email_limpo = '' THEN
    RETURN FALSE;
  END IF;

  -- Verifica em public.profiles (garantido por trigger handle_new_user() na criacao)
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(TRIM(email)) = v_email_limpo
    LIMIT 1
  )
  INTO v_existe;

  -- Fallback extra: verifica auth.users direto (caso trigger nao rodou ainda)
  IF v_existe IS FALSE THEN
    SELECT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE LOWER(TRIM(email)) = v_email_limpo
      LIMIT 1
    )
    INTO v_existe;
  END IF;

  RETURN COALESCE(v_existe, FALSE);
END;
$$;

-- Revoga acesso PUBLIC geral (seguranca) e libera so para anon + authenticated
REVOKE ALL ON FUNCTION public.fn_profile_email_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_profile_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_profile_email_exists(TEXT) TO authenticated;

-- ============================================================
-- COMENTARIO
-- ============================================================
COMMENT ON FUNCTION public.fn_profile_email_exists(TEXT) IS
'Tela Login AuthScreen (Passo 1): retorna verdadeiro se o e-mail ja esta cadastrado.
 Chmada a partir do front (anon user, NAO logado). Usa SECURITY DEFINER para ignorar RLS.
 Nao expoe nenhum dado alem de TRUE/FALSE (vazamento zero).';
