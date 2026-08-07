import React from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsHeaderProps {
  saldoAcumulado: number;
  totalEntradas: number;
  totalSaidas: number;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  saldoAcumulado,
  totalEntradas,
  totalSaidas
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const isPositive = saldoAcumulado >= 0;

  return (
    <div className="w-full space-y-4">
      {/* Saldo Acumulado Card */}
      <div className="glass rounded-2xl p-5 relative overflow-hidden shadow-sm border border-slate-200/60 bg-white/90">
        {/* Soft color blob matching the logo blue */}
        <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-sm font-medium tracking-wide">Saldo Acumulado Atual</span>
          <div className={`p-2 rounded-xl ${isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
            <Wallet size={18} />
          </div>
        </div>
        
        <div className="mt-2">
          <h2 className={`text-3xl font-extrabold tracking-tight transition-all duration-300 ${
            isPositive ? 'text-emerald-600' : 'text-rose-650'
          }`}>
            {formatCurrency(saldoAcumulado)}
          </h2>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            * Considera lançamentos <span className="text-emerald-600 font-semibold">Recebidos</span> menos <span className="text-rose-600 font-semibold">Pagos</span>.
          </p>
        </div>
      </div>

      {/* Grid Entradas/Saídas */}
      <div className="grid grid-cols-2 gap-3">
        {/* Entradas */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xs border border-slate-200/60 bg-white/90 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Entradas</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-slate-800 block truncate">
              {formatCurrency(totalEntradas)}
            </span>
            <span className="text-[10px] text-slate-450 font-medium">Previsto no mês</span>
          </div>
        </div>

        {/* Saídas */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between shadow-xs border border-slate-200/60 bg-white/90 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Saídas</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown size={14} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-slate-800 block truncate">
              {formatCurrency(totalSaidas)}
            </span>
            <span className="text-[10px] text-slate-450 font-medium">Previsto com juros</span>
          </div>
        </div>
      </div>
    </div>
  );
};
