import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface StatsHeaderProps {
  saldoAcumulado: number;
  totalEntradas: number;
  totalSaidas: number;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  totalEntradas,
  totalSaidas
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <div className="grid grid-cols-2 gap-3 w-full animate-fade-in">
      {/* Entradas Card — Dark Slim */}
      <div className="bg-gradient-to-br from-[#050a14] via-[#0b1220] to-[#0e1f35] border border-white/10 p-4 rounded-[28px] shadow-xl shadow-slate-900/25 relative overflow-hidden">
        {/* Glow Verde Entradas */}
        <div className="absolute top-[-30px] right-[-30px] w-28 h-28 bg-emerald-500/25 rounded-full filter blur-3xl" />
        <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 bg-[#0e69b2]/15 rounded-full filter blur-3xl" />

        <div className="flex items-center justify-between relative">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Entradas</span>
          <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 text-emerald-400 flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/20">
            <ArrowDown size={15} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-3 text-left relative">
          <div className="text-[22px] font-black text-white font-mono tracking-tight leading-none">
            {formatCurrency(totalEntradas)}
          </div>
          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2 py-1 rounded-lg border border-emerald-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            +12% em relação a Jul
          </span>
        </div>
      </div>

      {/* Saídas Card — Dark Slim */}
      <div className="bg-gradient-to-br from-[#050a14] via-[#0b1220] to-[#0e1f35] border border-white/10 p-4 rounded-[28px] shadow-xl shadow-slate-900/25 relative overflow-hidden">
        {/* Glow Laranja/Rose Saídas */}
        <div className="absolute top-[-30px] right-[-30px] w-28 h-28 bg-[#f59e0b]/25 rounded-full filter blur-3xl" />
        <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 bg-rose-500/20 rounded-full filter blur-3xl" />

        <div className="flex items-center justify-between relative">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Saídas</span>
          <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 text-rose-400 flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/20">
            <ArrowUp size={15} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-3 text-left relative">
          <div className="text-[22px] font-black text-white font-mono tracking-tight leading-none">
            {formatCurrency(totalSaidas)}
          </div>
          <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-rose-300 bg-rose-500/15 px-2 py-1 rounded-lg border border-rose-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            84% do teto definido
          </span>
        </div>
      </div>
    </div>
  );
};
