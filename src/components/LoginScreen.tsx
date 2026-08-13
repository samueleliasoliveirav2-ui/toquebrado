import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Check, ArrowRight, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { KnotfinLogo } from './KnotfinLogo';

interface LoginScreenProps {
  onLoginSuccess: (userName: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // Form fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');

  // Status & Feedbacks
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const showFeedback = (type: 'error' | 'success', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha) {
      return showFeedback('error', 'Por favor, preencha todos os campos.');
    }

    setLoading(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha
      });

      if (error) {
        showFeedback('error', error.message || 'Erro ao realizar login.');
      } else if (data.user) {
        showFeedback('success', 'Acesso autorizado! Carregando...');
        
        // Extract display name from user metadata
        const userDisplayName = data.user.user_metadata?.nome || data.user.email || 'Usuário';
        
        setTimeout(() => {
          onLoginSuccess(userDisplayName);
        }, 800);
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

    if (senha.length < 6) {
      return showFeedback('error', 'A senha deve conter pelo menos 6 caracteres.');
    }

    if (senha !== confirmaSenha) {
      return showFeedback('error', 'As senhas não conferem.');
    }

    setLoading(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: {
          data: {
            nome: nome.trim()
          }
        }
      });

      if (error) {
        showFeedback('error', error.message || 'Erro ao realizar cadastro.');
      } else if (data.user) {
        // Check if user is pending email confirmation or auto-confirmed
        const isEmailConfirmationRequired = data.session === null;
        
        if (isEmailConfirmationRequired) {
          showFeedback('success', 'Conta criada! Confirme seu e-mail para acessar.');
        } else {
          showFeedback('success', 'Conta criada com sucesso! Faça login.');
        }

        setNome('');
        setSenha('');
        setConfirmaSenha('');
        
        setTimeout(() => {
          setMode('LOGIN');
        }, 2000);
      }
    } catch (err: any) {
      showFeedback('error', 'Ocorreu um erro inesperado no cadastro.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reset states on mode switch
  useEffect(() => {
    setFeedback(null);
  }, [mode]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-slate-50 via-white to-slate-100 animate-fade-in">
      {/* Top Section: Title branding */}
      <div className="flex flex-col items-center justify-center pt-10 pb-4 text-center">
        <KnotfinLogo size="2xl" theme="dark" />
        <p className="text-slate-500 text-[11px] font-semibold tracking-wide mt-4 max-w-[260px] leading-relaxed">
          Decisões inteligentes para quem constrói o próprio futuro.
        </p>
      </div>

      {/* Middle Section: Forms */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        
        {/* Switch Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200">
          <button
            type="button"
            disabled={loading}
            onClick={() => setMode('LOGIN')}
            className={`py-2 px-3 text-xs font-extrabold rounded-xl transition-all ${
              mode === 'LOGIN'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            } disabled:opacity-50`}
          >
            Acessar Sistema
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setMode('REGISTER')}
            className={`py-2 px-3 text-xs font-extrabold rounded-xl transition-all ${
              mode === 'REGISTER'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            } disabled:opacity-50`}
          >
            Criar uma Conta
          </button>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div className={`p-3.5 rounded-xl text-xs font-semibold mb-4 border flex items-center gap-2 animate-fade-in ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-150'
              : 'bg-emerald-50 text-emerald-700 border-emerald-150'
          }`}>
            <Info size={14} className="shrink-0" />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Forms Container */}
        <form onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister} className="space-y-4">
          
          {/* Nome completo (Register Only) */}
          {mode === 'REGISTER' && (
            <div className="space-y-1.5">
              <label className="block text-slate-500 text-xs font-bold uppercase">Nome Completo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold shadow-2xs disabled:opacity-60"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-slate-500 text-xs font-bold uppercase">E-mail</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail size={16} />
              </span>
              <input
                type="email"
                placeholder="Ex: joao@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold shadow-2xs disabled:opacity-60"
                required
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <label className="block text-slate-500 text-xs font-bold uppercase">Senha</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                placeholder="Insira sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold shadow-2xs disabled:opacity-60"
                required
              />
            </div>
          </div>

          {/* Confirma Senha (Register Only) */}
          {mode === 'REGISTER' && (
            <div className="space-y-1.5">
              <label className="block text-slate-500 text-xs font-bold uppercase">Confirmar Senha</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  placeholder="Repita sua senha"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold shadow-2xs disabled:opacity-60"
                  required
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-br from-[#050a14] via-[#0b1220] to-[#0f172a] hover:from-[#0a1426] hover:via-[#0f1d33] hover:to-[#142542] text-white font-extrabold text-sm transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75 border border-white/5"
          >
            {loading ? (
              <span>Processando...</span>
            ) : mode === 'LOGIN' ? (
              <>
                Entrar no Sistema
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                Finalizar Cadastro
                <Check size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Info helper */}
      {mode === 'LOGIN' && (
        <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-xl flex gap-2.5 items-start select-text">
          <div className="p-1 rounded-lg bg-blue-100 text-blue-600 shrink-0">
            <Info size={14} />
          </div>
          <div className="text-[10px] text-slate-600 leading-normal select-text">
            <p className="font-bold text-slate-700">Autenticação com Supabase:</p>
            <p>Seus dados agora são validados diretamente na nuvem no banco do Supabase.</p>
            <p className="mt-1 text-slate-500">Obs: Crie uma conta usando o formulário acima para testar o fluxo de registro completo!</p>
          </div>
        </div>
      )}
    </div>
  );
};
