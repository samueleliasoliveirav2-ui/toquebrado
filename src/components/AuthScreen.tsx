import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, User, ArrowRight, Info, LogIn, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuthScreenProps {
  onLoginSuccess: (userName: string) => void;
}

type Step = 'EMAIL' | 'LOGIN' | 'REGISTER_NAME' | 'REGISTER_PASSWORD';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  // ===== Estado principal (Máquina de passos — LÓGICA INTACTA) =====
  const [step, setStep] = useState<Step>('EMAIL');

  // ===== Campos =====
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');

  // ===== Loading / Feedback =====
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // ===== AUTO-FOCUS (Mobile UX: teclado abre automaticamente) =====
  const emailInputRef   = useRef<HTMLInputElement>(null);
  const senhaLoginRef   = useRef<HTMLInputElement>(null);
  const nomeRef         = useRef<HTMLInputElement>(null);
  const senhaRegisterRef= useRef<HTMLInputElement>(null);

  // ===== Animação troca passo =====
  const [slideKey, setSlideKey] = useState(0);

  const showFeedback = (type: 'error' | 'success', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // ============================================================
  // Efeito: AUTO-FOCUS no input a cada troca de step
  // ============================================================
  useEffect(() => {
    const t = setTimeout(() => {
      switch (step) {
        case 'EMAIL':           emailInputRef.current?.focus(); break;
        case 'LOGIN':           senhaLoginRef.current?.focus(); break;
        case 'REGISTER_NAME':   nomeRef.current?.focus(); break;
        case 'REGISTER_PASSWORD': senhaRegisterRef.current?.focus(); break;
      }
    }, 240);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => { setFeedback(null); }, [step]);

  // ============================================================
  // PASSO 1: verificar existência do e-mail no profiles
  // ============================================================
  const checkEmailExists = async (emailTrim: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailTrim)
        .maybeSingle();
      if (error) {
        console.warn('[checkEmail] RLS/policy bloqueou, fallback heuristica:', error.message);
        return false;
      }
      return !!data;
    } catch (e: any) {
      console.warn('[checkEmail] exceção, fallback não-existe:', e?.message || e);
      return false;
    }
  };

  // ============================================================
  // HANDLERS (TODA A LÓGICA INTACTA)
  // ============================================================
  const handleStepEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = email.trim().toLowerCase();
    if (!emailTrim) return showFeedback('error', 'Por favor, digite seu e-mail.');

    setLoading(true);
    setFeedback(null);
    try {
      const exists = await checkEmailExists(emailTrim);
      if (exists) {
        setStep('LOGIN');
      } else {
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
        const msg = (error.message || '').toLowerCase();
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
    if (!nomeTrim) return showFeedback('error', 'Me diga seu nome pra gente se conhecer melhor 😊');
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

  const voltarParaEmail = () => {
    setSenha('');
    setNome('');
    setStep('EMAIL');
    setSlideKey(k => k + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    switch (step) {
      case 'EMAIL':             return handleStepEmail(e);
      case 'LOGIN':             return handleLogin(e);
      case 'REGISTER_NAME':     return handleRegisterNome(e);
      case 'REGISTER_PASSWORD': return handleRegisterCriarConta(e);
    }
  };

  // ========================== UI ==========================
  // Classes: input PILL rounded-full (referência)
  const inputPill = (
    "w-full max-w-sm bg-white border border-slate-200 shadow-sm rounded-full px-5 py-3 " +
    "text-slate-900 text-[16px] placeholder-slate-400 font-medium " +
    "focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/50 focus:border-[#38BDF8] " +
    "focus:shadow-md transition-all disabled:opacity-60"
  );
  const btnPill = (
    "h-[54px] w-full max-w-sm rounded-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 " +
    "text-white text-[15px] font-bold shadow-lg shadow-slate-900/10 transition-all " +
    "flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-white relative select-none">
      {/* ============== HEADER (canto SUPERIOR DIREITO) ============== */}
      <header className="w-full flex justify-end px-6 pt-6 sm:px-10 sm:pt-8">
        <div className="flex flex-col items-end leading-[0.95]">
          <span className="text-slate-900 font-black tracking-tight text-[17px] sm:text-[18px]">
            KOEE,
          </span>
          <span className="text-slate-900 font-black tracking-tight text-[20px] sm:text-[22px]">
            TÔQUEBRADO!
          </span>
        </div>
      </header>

      {/* ============== CENTRO VERTICAL: TEXTO + INPUT PILL ============== */}
      <main className="flex-1 w-full flex items-center justify-center px-6 sm:px-10">
        <div className="w-full max-w-md mx-auto">
          {/* Feedback (clean, sem card grosso) */}
          {feedback && (
            <div className={`mb-5 px-4 py-2.5 rounded-full text-[13px] font-semibold flex items-center gap-2.5 animate-fade-in w-fit ${
              feedback.type === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              <Info size={15} className="shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          <form key={`${step}-${slideKey}`} onSubmit={handleSubmit} className="animate-fade-in" style={{ animationDuration: '300ms' }}>
            {step === 'EMAIL' && (
              <StepEmailView
                email={email} setEmail={setEmail}
                emailRef={emailInputRef}
                inputPill={inputPill} btnPill={btnPill}
                loading={loading}
              />
            )}
            {step === 'LOGIN' && (
              <StepLoginView
                email={email}
                senha={senha} setSenha={setSenha}
                senhaRef={senhaLoginRef}
                inputPill={inputPill} btnPill={btnPill}
                loading={loading}
                voltar={voltarParaEmail}
              />
            )}
            {step === 'REGISTER_NAME' && (
              <StepRegisterNomeView
                nome={nome} setNome={setNome}
                nomeRef={nomeRef}
                inputPill={inputPill} btnPill={btnPill}
                loading={loading}
              />
            )}
            {step === 'REGISTER_PASSWORD' && (
              <StepRegisterSenhaView
                nome={nome} email={email}
                senha={senha} setSenha={setSenha}
                senhaRef={senhaRegisterRef}
                inputPill={inputPill} btnPill={btnPill}
                loading={loading}
              />
            )}
          </form>
        </div>
      </main>

      {/* ============== RODAPÉ (centralizado, PEQUENO, discreto) ============== */}
      <footer className="w-full text-center pb-8 pt-6 px-6">
        <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium leading-relaxed">
          🔒 Seus dados estão seguros e criptografados.
        </p>
      </footer>
    </div>
  );
};

// =====================================================================
// VIEWS SEPARADAS (cada step como componente — lógica 100% separada de UI)
// =====================================================================

// ---------------- PASSO 1: EMAIL ----------------
interface ViewBase {
  inputPill: string;
  btnPill: string;
  loading: boolean;
}
function StepEmailView({
  email, setEmail, emailRef, inputPill, btnPill, loading,
}: ViewBase & { email: string; setEmail: (s: string) => void; emailRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="space-y-6">
      {/* Texto conversacional */}
      <div className="space-y-1">
        <p className="text-[20px] sm:text-[22px] leading-[1.35] text-slate-900 font-semibold tracking-tight">
          <span className="font-black">Kooee, tô quebrado!</span>{' '}
          Calma aí, que daqui a pouco a gente tá no lucro. 🚀
        </p>
      </div>

      {/* Input + Botão */}
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
            <Mail size={18} strokeWidth={2} />
          </span>
          <input
            ref={emailRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="digite seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={`${inputPill} pl-11`}
            required
          />
        </div>
        <button type="submit" disabled={loading || !email.trim()} className={btnPill}>
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
    </div>
  );
}

// ---------------- CAMINHO A: LOGIN ----------------
function StepLoginView({
  email, senha, setSenha, senhaRef, inputPill, btnPill, loading, voltar,
}: ViewBase & {
  email: string;
  senha: string; setSenha: (s: string) => void;
  senhaRef: React.RefObject<HTMLInputElement | null>;
  voltar: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[20px] sm:text-[22px] leading-[1.35] text-slate-900 font-semibold tracking-tight">
          <span className="font-black">Show de bola</span> te ter de volta por aqui! 🙌
        </p>
        <p className="text-[16px] sm:text-[17px] leading-[1.4] text-slate-700 font-medium">
          Digite sua senha pra ver se a conta fecha:
        </p>
        {/* Chip leve do email (sem borda grossa) */}
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100">
          <Mail size={13} className="text-slate-500" />
          <span className="text-[12px] text-slate-700 font-semibold truncate max-w-[240px]">{email}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
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
            className={`${inputPill} pl-11`}
            required
          />
        </div>

        <button type="submit" disabled={loading || !senha} className={btnPill}>
          {loading ? (
            <span>Entrando...</span>
          ) : (
            <>
              <LogIn size={18} strokeWidth={2.5} />
              Entrar no App
            </>
          )}
        </button>

        <div className="text-center pt-0.5">
          <button
            type="button"
            onClick={voltar}
            disabled={loading}
            className="text-[13px] text-slate-500 hover:text-slate-800 hover:underline underline-offset-4 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Não é você? Trocar e-mail <span className="text-slate-400">({email})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- CAMINHO B1: NOME ----------------
function StepRegisterNomeView({
  nome, setNome, nomeRef, inputPill, btnPill, loading,
}: ViewBase & { nome: string; setNome: (s: string) => void; nomeRef: React.RefObject<HTMLInputElement | null> }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[20px] sm:text-[22px] leading-[1.35] text-slate-900 font-semibold tracking-tight">
          <span className="font-black">Opa!</span> Relaxa que vou te ajudar! 😉
        </p>
        <p className="text-[16px] sm:text-[17px] leading-[1.4] text-slate-700 font-medium">
          Vamos criar seu cadastro e ver se a conta fecha... Como posso te chamar?
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
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
            className={`${inputPill} pl-11`}
            required
          />
        </div>

        <button type="submit" disabled={loading || !nome.trim()} className={btnPill}>
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
    </div>
  );
}

// ---------------- CAMINHO B2: SENHA ----------------
function StepRegisterSenhaView({
  nome, email, senha, setSenha, senhaRef, inputPill, btnPill, loading,
}: ViewBase & {
  nome: string; email: string;
  senha: string; setSenha: (s: string) => void;
  senhaRef: React.RefObject<HTMLInputElement | null>;
}) {
  const primeiroNome = nome.trim().split(' ')[0] || nome.trim() || 'amigo';
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[20px] sm:text-[22px] leading-[1.35] text-slate-900 font-semibold tracking-tight">
          <span className="font-black">Prazer, {primeiroNome}!</span> 🤝
        </p>
        <p className="text-[16px] sm:text-[17px] leading-[1.4] text-slate-700 font-medium">
          Agora crie uma senha para proteger seu acesso:
        </p>
        {/* Chips leves (fundo cinza 100, sem borda pesada) */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100">
            <Mail size={12} className="text-slate-500" />
            <span className="text-[12px] text-slate-700 font-semibold truncate max-w-[220px]">{email}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100">
            <User size={12} className="text-slate-500" />
            <span className="text-[12px] text-slate-700 font-semibold truncate max-w-[220px]">{nome.trim()}</span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
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
            className={`${inputPill} pl-11`}
            minLength={6}
            required
          />
        </div>

        <button type="submit" disabled={loading || !senha || senha.length < 6} className={btnPill}>
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
    </div>
  );
}
