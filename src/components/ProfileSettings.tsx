import React from 'react';
import { Database, Trash2, RefreshCw, LogOut, ShieldCheck, Heart, ArrowRight } from 'lucide-react';

interface ProfileSettingsProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onSeedData: () => void;
  onDeleteMockData: () => void;
  mockTransactionsCount: number;
  isSyncing: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  userName,
  userEmail,
  onLogout,
  onSeedData,
  onDeleteMockData,
  mockTransactionsCount,
  isSyncing
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 pb-28 space-y-6 animate-fade-in bg-slate-50 overflow-y-auto">
      
      {/* Profile Card Header */}
      <div className="glass rounded-3xl p-5 border border-slate-200/60 bg-white/95 shadow-xs flex items-center gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-[#0e69b2]/10 to-[#f08622]/10 rounded-full blur-xl pointer-events-none" />
        
        {/* Avatar Circle */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0e69b2] to-[#1a85dd] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
          {getInitials(userName)}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold text-slate-800 truncate leading-tight">{userName}</h3>
          <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{userEmail}</p>
          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[#0e69b2] text-[8px] font-bold uppercase tracking-wider">
            <ShieldCheck size={10} />
            Membro Verificado
          </div>
        </div>
      </div>

      {/* Settings Sections Group */}
      <div className="space-y-4">
        
        {/* Database Status section */}
        <div className="glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-2xs space-y-3">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Conexão do Sistema</h4>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Database size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Supabase Cloud DB</p>
                <p className="text-[10px] text-slate-500 font-semibold">Tabelas integradas na nuvem</p>
              </div>
            </div>
            {/* Status indicator pill */}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Online
            </span>
          </div>
        </div>

        {/* Testing Data Seeding/Clean Actions section */}
        <div className="glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-2xs space-y-3.5">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ações de Demonstração</h4>
          
          <div className="space-y-2.5">
            {/* Load Test Data option */}
            <div className="flex items-center justify-between">
              <div className="text-left max-w-[70%]">
                <p className="text-xs font-bold text-slate-800">Carregar Lançamentos de Teste</p>
                <p className="text-[9px] text-slate-500 font-semibold leading-normal">
                  Insere 12 lançamentos fictícios de agosto de 2026 na sua conta para testes rápidos.
                </p>
              </div>
              <button
                onClick={onSeedData}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-[#0e69b2]/10 hover:bg-[#0e69b2]/20 text-[#0e69b2] text-[10px] font-extrabold transition-all border border-[#0e69b2]/20 disabled:opacity-55 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                Carregar
              </button>
            </div>

            <div className="h-[1px] bg-slate-100" />

            {/* Clear Test Data option */}
            <div className="flex items-center justify-between">
              <div className="text-left max-w-[70%]">
                <p className="text-xs font-bold text-slate-800">Remover Lançamentos de Teste</p>
                <p className="text-[9px] text-slate-500 font-semibold leading-normal">
                  Apaga todos os dados fictícios inseridos. Não afetará suas transações manuais.
                </p>
              </div>
              <button
                onClick={onDeleteMockData}
                disabled={isSyncing || mockTransactionsCount === 0}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100/75 text-rose-600 text-[10px] font-extrabold transition-all border border-rose-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={10} />
                Remover ({mockTransactionsCount})
              </button>
            </div>
          </div>
        </div>

        {/* Account Controls section */}
        <div className="glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-2xs space-y-3.5">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Conta</h4>
          
          <div className="space-y-1">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-between py-2 text-left text-slate-700 hover:text-rose-650 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors">
                  <LogOut size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold">Sair do Aplicativo</p>
                  <p className="text-[9px] text-slate-400 font-semibold">Desconecta a sessão ativa com segurança</p>
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-350 group-hover:text-rose-500 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Branding credits */}
      <div className="pt-4 text-center space-y-1">
        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">tô quebrado v1.0.0</p>
        <p className="text-[9px] text-slate-400 font-semibold flex items-center justify-center gap-1">
          Feito com <Heart size={10} className="text-rose-500 fill-rose-500" /> para controle pessoal
        </p>
      </div>

    </div>
  );
};
