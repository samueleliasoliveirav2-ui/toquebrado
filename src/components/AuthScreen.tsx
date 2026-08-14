import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Lock, User, Check, ArrowRight, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuthScreenProps {
  onLoginSuccess: (userName: string) => void;
}

const SLOGANS = [
  "Tô quebrado! Calma aí, que o app desenrola essa bronca.",
  "Tô quebrado! Calma aí, que daqui a pouco a gente tá no lucro.",
  "Tô quebrado! Calma aí, que o bolso vai parar de chorar.",
  "Tô quebrado! Calma aí, que o papo aqui é reto e a conta fecha.",
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Slogan rotativo suave (loop ~5s)
  const [sloganIdx, setSloganIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setSloganIdx(i => (i + 1) % SLOGANS.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const showFeedback = (type: 'error' | 'success', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Reset feedback ao trocar de modo
  useEffect(() => {
    setFeedback(null);
  }, [isLogin]);

  // Gradiente KOEE turquesa -> azul claro (igual favicon e marca)
  const accentGradient = 'from-[#5EEAD4] via-[#38BDF8] to-[#22D3EE]';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) return showFeedback('error', 'Por favor, preencha todos os campos.');

    setLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        showFeedback('error', error.message || 'Erro ao realizar login.');
      } else if (data.user) {
        showFeedback('success', 'Acesso autorizado! Carregando...');
        const userDisplayName = data.user.user_metadata?.nome || data.user.email || 'Usuário';
        setTimeout(() => onLoginSuccess(userDisplayName), 800);
      }
    } catch (err: any) {
      showFeedback('error', 'Ocorreu um erro inesperado na conexão.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !senha || !confirmaSenha) {
      return showFeedback('error', 'Por favor, preencha todos os campos.');
    }
    if (senha.length < 6) return showFeedback('error', 'A senha deve conter pelo menos 6 caracteres.');
    if (senha !== confirmaSenha) return showFeedback('error', 'As senhas não conferem.');

    setLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: { data: { nome: nome.trim() } },
      });

      if (error) {
        showFeedback('error', error.message || 'Erro ao realizar cadastro.');
      } else if (data.user) {
        const precisaConfirmarEmail = data.session === null;
        showFeedback(
          'success',
          precisaConfirmarEmail
            ? 'Conta criada! Confirme seu e-mail para acessar.'
            : 'Conta criada com sucesso! Faça login.'
        );
        setNome(''); setSenha(''); setConfirmaSenha('');
        setTimeout(() => setIsLogin(true), 2000);
      }
    } catch (err: any) {
      showFeedback('error', 'Ocorreu um erro inesperado no cadastro.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentSlogan = SLOGANS[sloganIdx];

  const inputBase = useMemo(() => (
    "w-full bg-slate-950/60 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 " +
    "text-[15px] text-white placeholder-slate-500 font-semibold " +
    "focus:outline-none focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/20 " +
    "focus:bg-slate-950/90 transition-all disabled:opacity-60 shadow-inner shadow-black/40"
  ), []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 sm:py-12 bg-slate-950 relative overflow-hidden select-none">
      {/* Fundo sutil: gradiente e blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#5EEAD4]/10 blur-[100px]" />
        <div className="absolute -bottom-40 -right-20 w-[480px] h-[480px] rounded-full bg-[#38BDF8]/10 blur-[110px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-[#22D3EE]/5 blur-[120px]" />
      </div>

      {/* CARD CENTRAL FLUTUANTE */}
      <div className="relative w-full max-w-md mx-auto z-10 animate-fade-in" style={{ animationDuration: '260ms' }}>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          {/* ============== TOPO: MARCA + SLOGAN ROTATIVO ============== */}
          <div className="flex flex-col items-center justify-center text-center mb-7 sm:mb-8">
            {/* MINI LOGO MONOGRAMA TQ (igual favicon v1.3.2) */}
            <div className="w-[76px] h-[76px] sm:w-20 sm:h-20 rounded-[22px] bg-gradient-to-br from-[#0B1020] to-[#0C1F3A] border border-slate-800/80 shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex items-center justify-center mb-4 overflow-hidden relative">
              <div className="absolute inset-0 opacity-70">
                <svg viewBox="0 0 512 512" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="tqg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#5EEAD4"/>
                      <stop offset="1" stopColor="#38BDF8"/>
                    </linearGradient>
                  </defs>
                  <rect x="108" y="120" width="296" height="72" rx="32" fill="url(#tqg)"/>
                  <rect x="220" y="120" width="72" height="272" rx="32" fill="url(#tqg)"/>
                  <circle cx="256" cy="340" r="120" fill="none" stroke="#FFFFFF" strokeWidth="60"/>
                  <rect x="336" y="402" width="80" height="60" rx="24" fill="#FFFFFF" transform="rotate(35 376 432)"/>
                  <circle cx="420" cy="92" r="26" fill="url(#tqg)"/>
                </svg>
              </div>
            </div>

            {/* MARCA "KOEE, TÔQUEBRADO!" */}
            <div className="flex flex-col items-center gap-1 mb-3">
              <span className={`text-[22px] sm:text-2xl font-black tracking-tight bg-gradient-to-r ${accentGradient} bg-clip-text text-transparent leading-none`}>
                KOEE,
              </span>
              <span className="text-[24px] sm:text-3xl font-black text-white tracking-tight leading-none">
                TÔQUEBRADO!
              </span>
            </div>

            {/* SLOGAN ROTATIVO (fade entre trocas) */}
            <div key={sloganIdx} className="max-w-[300px] text-[13px] sm:text-sm leading-snug text-slate-300/90 font-medium animate-fade-in" style={{ animationDuration: '380ms' }}>
              {currentSlogan}
            </div>
          </div>

          {/* ============== SWITCHER LOGIN / CADASTRO ============== */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-2xl mb-6 border border-slate-800">
            <button
              type="button"
              disabled={loading}
              onClick={() => setIsLogin(true)}
              className={`py-2.5 px-3 text-[13px] font-extrabold rounded-xl transition-all duration-200 ${
                isLogin
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-300'
              } disabled:opacity-50 cursor-pointer`}
            >
              Acessar Conta
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setIsLogin(false)}
              className={`py-2.5 px-3 text-[13px] font-extrabold rounded-xl transition-all duration-200 ${
                !isLogin
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-300'
              } disabled:opacity-50 cursor-pointer`}
            >
              Criar Conta
            </button>
          </div>

          {/* ============== FEEDBACK ============== */}
          {feedback && (
            <div className={`p-3.5 rounded-2xl text-[13px] font-semibold mb-4 border flex items-start gap-2.5 animate-fade-in ${
              feedback.type === 'error'
                ? 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
            }`} style={{ animationDuration: '220ms' }}>
              <Info size={16} className="shrink-0 mt-0.5" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* ============== FORM (FADE por key isLogin) ============== */}
          <div key={isLogin ? 'login' : 'register'} className="animate-fade-in" style={{ animationDuration: '280ms' }}>
            <div className="mb-5">
              <h2 className="text-xl sm:text-[22px] font-black text-white tracking-tight">
                {isLogin ? 'Acessar Conta' : 'Criar Nova Conta'}
              </h2>
              <p className="text-[13px] text-slate-400 mt-1 font-medium">
                {isLogin
                  ? 'Entre e organize sua vida financeira agora.'
                  : 'Comece hoje mesmo. Grátis, sem pegadinha.'}
              </p>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
              {/* Nome (Cadastro APENAS) */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Nome Completo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <User size={17} strokeWidth={2} />
                    </span>
                    <input
                      type="text"
                      placeholder="Como podemos te chamar?"
                      autoComplete="name"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      disabled={loading}
                      className={inputBase}
                      required
                    />
                  </div>
                </div>
              )}

              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail size={17} strokeWidth={2} />
                  </span>
                  <input
                    type="email"
                    placeholder="voce@email.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={inputBase}
                    required
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock size={17} strokeWidth={2} />
                  </span>
                  <input
                    type="password"
                    placeholder="No mínimo 6 caracteres"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    disabled={loading}
                    className={inputBase}
                    required
                  />
                </div>
              </div>

              {/* Confirma Senha (Cadastro APENAS) */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Confirmar Senha</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Lock size={17} strokeWidth={2} />
                    </span>
                    <input
                      type="password"
                      placeholder="Repita sua senha"
                      autoComplete="new-password"
                      value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      disabled={loading}
                      className={inputBase}
                      required
                    />
                  </div>
                </div>
              )}

              {/* BOTÃO AÇÃO PRIMÁRIO */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r ${accentGradient} hover:brightness-110 active:brightness-95 text-slate-950 font-black text-[15px] transition-all duration-200 shadow-[0_10px_30px_rgba(56,189,248,0.18)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 border border-white/10`}
              >
                {loading ? (
                  <span>Processando...</span>
                ) : isLogin ? (
                  <>
                    Entrar
                    <ArrowRight size={17} strokeWidth={2.5} />
                  </>
                ) : (
                  <>
                    Começar a Organizar
                    <Check size={17} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            {/* ============== RODAPÉ: CTA TROCA ============== */}
            <div className="mt-6 text-center text-[13px] text-slate-400 font-medium">
              {isLogin ? (
                <>
                  Não tem conta?{' '}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setIsLogin(false)}
                    className={`text-transparent bg-clip-text bg-gradient-to-r ${accentGradient} font-black hover:brightness-110 disabled:opacity-50 cursor-pointer underline decoration-sky-500/30 underline-offset-4`}
                  >
                    Criar conta grátis
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{' '}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setIsLogin(true)}
                    className={`text-transparent bg-clip-text bg-gradient-to-r ${accentGradient} font-black hover:brightness-110 disabled:opacity-50 cursor-pointer underline decoration-sky-500/30 underline-offset-4`}
                  >
                    Fazer login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer base */}
        <p className="mt-6 text-center text-[11px] text-slate-600 font-medium leading-relaxed px-2">
          🔐 Seus dados são protegidos pelo Supabase. Nunca compartilhamos nada.
        </p>
      </div>
    </div>
  );
};
