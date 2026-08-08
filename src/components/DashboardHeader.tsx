import React from 'react';
import { CircleDollarSign, TrendingUp } from 'lucide-react';

interface DashboardHeaderProps {
  userName: string;
  saldoAcumulado: number;
  onAvatarClick?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  saldoAcumulado,
  onAvatarClick
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const isPositive = saldoAcumulado >= 0;

  return (
    <div className="w-full shrink-0 relative pb-12 select-none">
      
      {/* 1. Gradient Panel (Header Background) */}
      <div className="w-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 rounded-b-[36px] pt-7 pb-20 px-5 relative shadow-md">
        
        {/* Decorative subtle background grid/shapes */}
        <div className="absolute inset-0 bg-white/5 opacity-40 mix-blend-overlay rounded-b-[36px]" />
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between relative z-10">
          
          {/* Logo with Dollar sign in "o" */}
          <div className="flex items-center gap-1 text-white py-0.5">
            <span className="text-xl font-black tracking-tight leading-none">T</span>
            <CircleDollarSign size={16} className="text-white shrink-0 -mx-0.5" />
            <span className="text-xl font-black tracking-tight leading-none -ml-0.5">quebrado</span>
          </div>

          {/* Cute SVG Avatar Clickable */}
          <button 
            onClick={onAvatarClick}
            className="focus:outline-none hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title="Ver Perfil"
          >
            <svg className="w-9 h-9 rounded-full border-2 border-white shadow-md bg-amber-100" viewBox="0 0 100 100">
              <circle cx="50" cy="48" r="28" fill="#fcd34d" />
              <circle cx="42" cy="42" r="4" fill="#1e293b" />
              <circle cx="58" cy="42" r="4" fill="#1e293b" />
              <path d="M 40 60 Q 50 70 60 60" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <path d="M 32 28 Q 50 14 68 28" stroke="#78350f" strokeWidth="12" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>

        {/* Greeting Label */}
        <div className="mt-5 relative z-10 text-left">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Olá, {userName.split(' ')[0]}!
          </h2>
        </div>
      </div>

      {/* 2. Floating Summary Card (Resumo de Hoje) */}
      <div className="absolute bottom-0 left-5 right-5 z-20">
        <div className="glass rounded-2xl p-4.5 border border-slate-200/50 bg-white/95 shadow-lg relative overflow-hidden transition-all duration-300">
          
          {/* Subtle accent blob */}
          <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-br from-teal-400/5 to-sky-400/5 rounded-full blur-lg pointer-events-none" />

          {/* Title */}
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block text-left">
            Resumo de Hoje
          </span>

          {/* Balance Row */}
          <div className="flex items-center justify-between mt-1.5">
            <h3 className={`text-2xl font-black tracking-tight ${isPositive ? 'text-slate-800' : 'text-rose-600'}`}>
              {formatCurrency(saldoAcumulado)}
            </h3>
            
            <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              <TrendingUp size={16} />
            </div>
          </div>

          {/* Performance label */}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-0.5">
              Performance <span className="text-[9px] font-bold">➔</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
