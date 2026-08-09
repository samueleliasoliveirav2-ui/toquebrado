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
      {/* Entradas Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-[24px] shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entradas</span>
          <div className="w-7 h-7 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center text-xs font-bold">
            <ArrowDown size={14} className="stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-2 text-left">
          <div className="text-lg font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(totalEntradas)}
          </div>
          <span className="text-[10px] font-semibold text-emerald-400">
            +12% em relação a Jul
          </span>
        </div>
      </div>

      {/* Saídas Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-[24px] shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saídas</span>
          <div className="w-7 h-7 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center text-xs font-bold">
            <ArrowUp size={14} className="stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-2 text-left">
          <div className="text-lg font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(totalSaidas)}
          </div>
          <span className="text-[10px] font-semibold text-rose-500">
            84% do teto definido
          </span>
        </div>
      </div>
    </div>
  );
};
