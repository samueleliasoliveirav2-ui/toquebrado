import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mail, Lock, User, ArrowRight, Info, LogIn, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuthScreenProps {
  onLoginSuccess: (userName: string) => void;
}

type Step = 'EMAIL' | 'LOGIN' | 'REGISTER_NAME' | 'REGISTER_PASSWORD';

// ==================== UTIL: BARRA DE PROGRESSO ====================
function progressForStep(s: Step): number {
  switch (s) {
    case 'EMAIL':           return 33;
    case 'LOGIN':           return 100;
    case 'REGISTER_NAME':   return 33;
    case 'REGISTER_PASSWORD': return 66;
    default: return 0;
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  // ===== Estado principal do STEP (Máquina de estados) =====
  const [step, setStep] = useState<Step>('EMAIL');

  // ===== Campos compartilhados =====
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');

  // ===== Loading / Feedback =====
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // ===== Refs de AUTO-FOCUS (Mobile UX: teclado abre automaticamente) =====
  const emailInputRef   = useRef<HTMLInputElement>(null);
  const senhaLoginRef   = useRef<HTMLInputElement>(null);
  const nomeRef         = useRef<HTMLInputElement>(null);
  const senhaRegisterRef= useRef<HTMLInputElement>(null);

  // ===== Animação direção do slide =====
  const [slideKey, setSlideKey] = useState(0);

  const showFeedback = (type: 'error' | 'success', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ====== GRADIENTE PRIMÁRIO (KOEE turquesa → céu) ======
  const primaryGrad = 'from-[#2DD4BF] via-[#38BDF8] to-[#22D3EE]';

  // ============================================================
  // Efeito: AUTO-FOCUS no input correto a cada troca de step
  // ============================================================
  useEffect(() => {
    const t = setTimeout(() => {
      switch (step) {
        case 'EMAIL':           emailInputRef.current?.focus(); break;
        case 'LOGIN':           senhaLoginRef.current?.focus(); break;
        case 'REGISTER_NAME':   nomeRef.current?.focus(); break;
        case 'REGISTER_PASSWORD': senhaRegisterRef.current?.focus(); break;
      }
    }, 220); // espera animação de slide acabar
    return () => clearTimeout(t);
  }, [step]);

  // Reset feedback ao trocar passo
  useEffect(() => { setFeedback(null); }, [step]);

  // ============================================================
  // PASSO 1: verificar existência do e-mail (no profiles público)
  // ============================================================
  const checkEmailExists = async (emailTrim: string): Promise<boolean> => {
    try {
      // Consulta segura na tabela public.profiles (já existe coluna email)
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailTrim)
        .maybeSingle();

      if (error) {
        console.warn('[checkEmail] RLS/policy bloqueou, usando fallback heuristica:', error.message);
        // Se RLS bloqueou, retornamos falso (não existe) e o signUp/senha
        // detectará "user already exists" abaixo → troca de passo automaticamente.
        return false;
      }
      return !!data; // data != null → email cadastrado.
    } catch (e: any) {
      console.warn('[checkEmail] exceção, fallback não-existe:', e?.message || e);
      return false;
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleStepEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) return showFeedback('error', 'Por favor, digite seu e-mail.');

    setLoading(true);
    setFeedback(null);
    try {
      // Texto botão: "Verificando..."
      const exists = await checkEmailExists(emailTrim);
      if (exists) {
        // CAMINHO A → Login
        setStep('LOGIN');
      } else {
        // CAMINHO B → Cadastro Passo Nome
        setStep('REGISTER_NAME');
      }
      setSlideKey(k => k + 1);
    } catch (e: any) {
      showFeedback('error', 'Não consegui verificar seu e-mail agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha) return showFeedback('error', 'Digite sua senha para entrar.');

    setLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      if (error) {
        // Fallback: se o profiles disse NÃO existia mas deu "user already registered" ou credenciais invalidas
        // + mensagem amigavel
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('invalid') || msg.includes('credential') || msg.includes('senha')) {
          showFeedback('error', 'Senha não bate. Digite novamente ou troque o e-mail.');
        } else {
          showFeedback('error', error.message || 'Não foi possível entrar. Tente novamente.');
        }
        return;
      }
      if (data.user) {
        showFeedback('success', 'Show! Entrando na sua área...');
        const displayName = data.user.user_metadata?.nome || data.user.email || 'Usuário';
        setTimeout(() => onLoginSuccess(displayName), 750);
      }
    } catch (e: any) {
      showFeedback('error', 'Erro inesperado ao conectar. Tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNome = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrim = nome.trim();
    if (!nomeTrim || nomeTrim.split(' ').length < 1) {
      return showFeedback('error', 'Me diga seu nome pra gente se conhecer melhor 😊');
    }
    setNome(nomeTrim);
    setStep('REGISTER_PASSWORD');
    setSlideKey(k => k + 1);
  };

  const handleRegisterCriarConta = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeTrim = nome.trim();
    const emailTrim = email.trim().toLowerCase();

    if (!nomeTrim) return showFeedback('error', 'Faltou seu nome!');
    if (!senha || senha.length < 6) return showFeedback('error', 'A senha precisa ter pelo menos 6 caracteres.');

    setLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailTrim,
        password: senha,
        options: { data: { nome: nomeTrim } },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        // FALLBACK: se o profiles disse que não existia mas Supabase
        // diz que JÁ EXISTE → trocamos automaticamente pro CAMINHO A (LOGIN)
        if (msg.includes('already') || msg.includes('registered') || msg.includes('email already')) {
          showFeedback('success', 'Ah, descobri aqui! Você já tem conta. Vou te mandar pro login.');
          setTimeout(() => { setStep('LOGIN'); setSlideKey(k => k + 1); setSenha(''); }, 1400);
          return;
        }
        showFeedback('error', error.message || 'Não consegui criar a conta. Tente novamente.');
        return;
      }

      if (data?.user) {
        const precisaConfirmar = !data.session;
        if (precisaConfirmar) {
          showFeedback('success', 'Criei sua conta! Confirme o link no e-mail pra ativar.');
        } else {
          showFeedback('success', 'Tudo certo! Vamos lá dentro organizar suas finanças.');
          const displayName = data.user.user_metadata?.nome || nomeTrim || data.user.email || 'Usuário';
          setTimeout(() => onLoginSuccess(displayName), 900);
        }
      }
    } catch (e: any) {
      showFeedback('error', 'Erro inesperado ao criar sua conta. Tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Voltar para passo 1 (email) e limpar dados pessoais
  const voltarParaEmail = () => {
    setSenha('');
    setNome('');
    setStep('EMAIL');
    setSlideKey(k => k + 1);
  };

  // Form submission handler dispatch (por step)
  const handleSubmit = (e: React.FormEvent) => {
    switch (step) {
      case 'EMAIL':             return handleStepEmail(e);
      case 'LOGIN':             return handleLogin(e);
      case 'REGISTER_NAME':     return handleRegisterNome(e);
      case 'REGISTER_PASSWORD': return handleRegisterCriarConta(e);
    }
  };

  // ========= CLASSES BASE INPUT / BOTÃO (Mobile: alto, fácil toque polegar) =========
  const inputClsBase = useMemo(() => (
    "h-12 w-full text-base bg-slate-800/90 border border-slate-700 rounded-xl px-4 pl-11 " +
    "text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/60 " +
    "focus:border-[#38BDF8] focus:bg-slate-800 transition-all font-medium disabled:opacity-60"
  ), []);

  const btnClsBase = useMemo(() => (
    `h-12 w-full text-base font-bold rounded-xl bg-gradient-to-r ${primaryGrad} hover:brightness-110 ` +
    "active:brightness-95 text-slate-950 transition-all shadow-[0_10px_30px_rgba(56,189,248,0.2)] " +
    "flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 border border-white/10"
  ), [primaryGrad]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden select-none">
      {/* Fundo claro sutil (blobs bem suaves) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-24 w-[520px] h-[520px] rounded-full bg-[#5EEAD4]/20 blur-[130px] opacity-60" />
        <div className="absolute -bottom-48 -right-20 w-[560px] h-[560px] rounded-full bg-[#38BDF8]/15 blur-[140px] opacity-70" />
      </div>

      {/* ============ CARD CONVERSACIONAL (MOBILE PRIMEIRO) ============ */}
      <div className="relative w-full max-w-sm mx-auto px-4 py-10 z-10">
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 w-full overflow-hidden relative">
          {/* ===== BARRA DE PROGRESSO FINO (TOPO) ===== */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 overflow-hidden">
            <div
              key={progressForStep(step)}
              className={`h-full bg-gradient-to-r ${primaryGrad} transition-[width] duration-500 ease-out`}
              style={{ width: `${progressForStep(step)}%` }}
            />
          </div>

          {/* ===== MINI LOGO TQ MONOGRAMA + MARCA ===== */}
          <div className="flex flex-col items-center justify-center text-center mb-6 mt-1">
            <div className="w-[58px] h-[58px] rounded-[18px] bg-gradient-to-br from-[#0B1020] to-[#0C1F3A] border border-slate-800/80 shadow-[0_12px_30px_rgba(0,0,0,0.55)] flex items-center justify-center mb-3 overflow-hidden relative shrink-0">
              <svg viewBox="0 0 512 512" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="tqg2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#5EEAD4"/>
                    <stop offset="1" stopColor="#38BDF8"/>
                  </linearGradient>
                </defs>
                <rect x="108" y="120" width="296" height="72" rx="32" fill="url(#tqg2)"/>
                <rect x="220" y="120" width="72" height="272" rx="32" fill="url(#tqg2)"/>
                <circle cx="256" cy="340" r="120" fill="none" stroke="#FFFFFF" strokeWidth="60"/>
                <rect x="336" y="402" width="80" height="60" rx="24" fill="#FFFFFF" transform="rotate(35 376 432)"/>
                <circle cx="420" cy="92" r="26" fill="url(#tqg2)"/>
              </svg>
            </div>
            <div className="flex flex-col items-center gap-0.5 leading-tight">
              <span className={`text-lg font-black tracking-tight bg-gradient-to-r ${primaryGrad} bg-clip-text text-transparent`}>
                KOEE,
              </span>
              <span className="text-xl font-black text-white tracking-tight">TÔQUEBRADO!</span>
            </div>
          </div>

          {/* ===== FEEDBACK ===== */}
          {feedback && (
            <div className={`p-3 rounded-2xl text-[13px] font-semibold mb-4 border flex items-start gap-2.5 animate-fade-in ${
              feedback.type === 'error'
                ? 'bg-rose-500/10 text-rose-200 border-rose-500/25'
                : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25'
            }`}>
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* ===== CORPO CONVERSACIONAL (slide key → re-render animação) ===== */}
          <form key={`${step}-${slideKey}`} onSubmit={handleSubmit} className="animate-fade-in" style={{ animationDuration: '280ms' }}>
            {step === 'EMAIL' && (
              <StepEmail
                inputCls={inputClsBase}
                btnCls={btnClsBase}
                email={email} setEmail={setEmail}
                emailRef={emailInputRef}
                loading={loading}
              />
            )}
            {step === 'LOGIN' && (
              <StepLogin
                inputCls={inputClsBase}
                btnCls={btnClsBase}
                email={email}
                senha={senha} setSenha={setSenha}
                senhaRef={senhaLoginRef}
                loading={loading}
                voltar={voltarParaEmail}
              />
            )}
            {step === 'REGISTER_NAME' && (
              <StepRegisterNome
                inputCls={inputClsBase}
                btnCls={btnClsBase}
                nome={nome} setNome={setNome}
                nomeRef={nomeRef}
                loading={loading}
              />
            )}
            {step === 'REGISTER_PASSWORD' && (
              <StepRegisterSenha
                inputCls={inputClsBase}
                btnCls={btnClsBase}
                nome={nome} email={email}
                senha={senha} setSenha={setSenha}
                senhaRef={senhaRegisterRef}
                loading={loading}
              />
            )}
          </form>

          {/* Footer minúsculo */}
          <p className="mt-6 text-center text-[11px] text-slate-500 font-medium leading-relaxed">
            🔐 Seus dados ficam no Supabase. Nada é compartilhado com ninguém.
          </p>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// COMPONENTES INTERNOS (cada step um componente separado → puro, reutilizavel)
// =====================================================================

// ---------------- PASSO 1: EMAIL ----------------
interface StepPropsBase {
  inputCls: string;
  btnCls: string;
  loading: boolean;
}
function StepEmail({
  inputCls, btnCls, email, setEmail, emailRef, loading,
}: StepPropsBase & { email: string; setEmail: (s: string) => void; emailRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="space-y-5">
      {/* Mensagem conversacional */}
      <div className="space-y-1.5">
        <p className="text-[15px] leading-relaxed text-white font-medium">
          <span className={`bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] bg-clip-text text-transparent font-black`}>Kooee, tô quebrado!</span>{' '}
          Calma aí, que daqui a pouco a gente tá no lucro. 🚀
        </p>
        <p className="text-[14px] leading-relaxed text-slate-300 font-semibold">
          Vou te ajudar: digite seu <span className="text-white font-bold">e-mail</span>:
        </p>
      </div>

      {/* Input E-mail */}
      <div className="space-y-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Mail size={18} strokeWidth={2} />
          </span>
          <input
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={inputCls}
            required
          />
        </div>
      </div>

      {/* Botão Avançar */}
      <button type="submit" disabled={loading || !email.trim()} className={btnCls}>
        {loading ? (
          <span>Verificando...</span>
        ) : (
          <>
            Avançar
            <ArrowRight size={18} strokeWidth={2.5} />
          </>
        )}
      </button>
    </div>
  );
}

// ---------------- CAMINHO A: LOGIN (Senha) ----------------
function StepLogin({
  inputCls, btnCls, email, senha, setSenha, senhaRef, loading, voltar,
}: StepPropsBase & {
  email: string;
  senha: string; setSenha: (s: string) => void;
  senhaRef: React.RefObject<HTMLInputElement | null>;
  voltar: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-[15px] leading-relaxed text-white font-medium">
          <span className="bg-gradient-to-r from-[#34D399] to-[#2DD4BF] bg-clip-text text-transparent font-black">Show de bola</span>{' '}
          te ter de volta por aqui! 🙌
        </p>
        <p className="text-[14px] leading-relaxed text-slate-300 font-semibold">
          Digite sua <span className="text-white font-bold">senha</span> pra gente ver se a conta fecha:
        </p>
        {/* Caixinha leve mostrando o email (igual Typeform) */}
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80">
          <Mail size={13} className="text-[#38BDF8]" />
          <span className="text-[12px] text-slate-200 font-semibold truncate max-w-[240px]">{email}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Lock size={18} strokeWidth={2} />
          </span>
          <input
            ref={senhaRef}
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={loading}
            className={inputCls}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading || !senha} className={btnCls}>
        {loading ? (
          <span>Entrando...</span>
        ) : (
          <>
            <LogIn size={18} strokeWidth={2.5} />
            Entrar no App
          </>
        )}
      </button>

      {/* Link: Não é você? Trocar e-mail */}
      <div className="text-center -mt-1">
        <button
          type="button"
          onClick={voltar}
          disabled={loading}
          className="text-[12px] text-slate-400 hover:text-slate-200 hover:underline underline-offset-4 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Não é você? Trocar e-mail <span className="text-slate-500">({email})</span>
        </button>
      </div>
    </div>
  );
}

// ---------------- CAMINHO B1: CADASTRO - NOME ----------------
function StepRegisterNome({
  inputCls, btnCls, nome, setNome, nomeRef, loading,
}: StepPropsBase & { nome: string; setNome: (s: string) => void; nomeRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-[15px] leading-relaxed text-white font-medium">
          <span className="bg-gradient-to-r from-[#38BDF8] to-[#22D3EE] bg-clip-text text-transparent font-black">Opa!</span>{' '}
          Relaxa que vou te ajudar! 😉
        </p>
        <p className="text-[14px] leading-relaxed text-slate-300 font-semibold">
          Vamos criar uma conta e ver se a conta fecha... Como posso te <span className="text-white font-bold">chamar</span>?
        </p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <User size={18} strokeWidth={2} />
          </span>
          <input
            ref={nomeRef}
            type="text"
            autoComplete="name"
            placeholder="Ex: João da Silva"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={loading}
            className={inputCls}
            required
          />
        </div>
      </div>

      <button type="submit" disabled={loading || !nome.trim()} className={btnCls}>
        {loading ? (
          <span>...</span>
        ) : (
          <>
            Continuar
            <ArrowRight size={18} strokeWidth={2.5} />
          </>
        )}
      </button>
    </div>
  );
}

// ---------------- CAMINHO B2: CADASTRO - SENHA ----------------
function StepRegisterSenha({
  inputCls, btnCls, nome, email, senha, setSenha, senhaRef, loading,
}: StepPropsBase & {
  nome: string; email: string;
  senha: string; setSenha: (s: string) => void;
  senhaRef: React.RefObject<HTMLInputElement | null>;
}) {
  const nomeMostrar = nome.trim().split(' ')[0] || nome.trim() || 'amigo';
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-[15px] leading-relaxed text-white font-medium">
          <span className="bg-gradient-to-r from-[#2DD4BF] to-[#38BDF8] bg-clip-text text-transparent font-black">Prazer, {nomeMostrar}!</span>{' '}
          🤝
        </p>
        <p className="text-[14px] leading-relaxed text-slate-300 font-semibold">
          Pra fechar com chave de ouro, crie uma <span className="text-white font-bold">senha firmeza</span> pra proteger o seu bolso:
        </p>
        {/* Caixinha mostrando email + nome */}
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 w-fit">
            <Mail size={13} className="text-[#38BDF8]" />
            <span className="text-[12px] text-slate-200 font-semibold truncate max-w-[240px]">{email}</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 w-fit">
            <User size={13} className="text-[#5EEAD4]" />
            <span className="text-[12px] text-slate-200 font-semibold truncate max-w-[240px]">{nome.trim()}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Lock size={18} strokeWidth={2} />
          </span>
          <input
            ref={senhaRef}
            type="password"
            autoComplete="new-password"
            placeholder="Senha forte (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={loading}
            className={inputCls}
            minLength={6}
            required
          />
        </div>
        <p className="text-[11px] text-slate-500 font-medium pl-1">
          Dica: misture letras, números e símbolos. 🔒
        </p>
      </div>

      <button type="submit" disabled={loading || !senha || senha.length < 6} className={btnCls}>
        {loading ? (
          <span>Criando sua conta...</span>
        ) : (
          <>
            <Sparkles size={18} strokeWidth={2.5} />
            Criar Conta e Entrar
          </>
        )}
      </button>
    </div>
  );
}
