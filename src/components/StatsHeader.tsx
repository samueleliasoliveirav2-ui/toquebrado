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
    <div className="grid grid-cols-2 gap-3 w-full animate-fade-in items-stretch">
      {/* Entradas Card — Dark Slim */}
      <div className="bg-gradient-to-br from-[#050a14] via-[#0b1220] to-[#0e1f35] border border-white/10 p-4 rounded-[28px] shadow-xl shadow-slate-900/25 relative overflow-hidden min-w-0 w-full">
        {/* Glow Verde Entradas */}
        <div className="absolute top-[-30px] right-[-30px] w-28 h-28 bg-emerald-500/25 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 bg-[#0e69b2]/15 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative min-w-0 w-full">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55 truncate">Entradas</span>
          <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 text-emerald-400 flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/20 shrink-0">
            <ArrowDown size={15} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-3 text-left relative min-w-0 w-full">
          {/* ===== RESPONSIVO MOBILE (nunca mais corta dígitos!) =====
              → clamp(14px, 5.4vw, 22px) = ajusta automaticamente ao tamanho da tela:
                • Tela 360px (Galaxy S24/A54): 14px (cabe perfeitamente R$ 11.746,17)
                • Tela 390px (iPhone 14/15): 15.2px
                • Tela 412px (Pixel 8): 16.1px
                • Tablets/Desktop (> 407px): trava em 22px (tamanho original, bonito)
              → overflow-hidden + truncate = GARANTIA ABSOLUTA (mesmo que seja R$ 999.999,99
                ele aparece com reticências, nunca mais corta pela borda do card).
          */}
          <div
            className="font-black text-white font-mono tracking-tight leading-none
                       min-w-0 w-full overflow-hidden whitespace-nowrap text-ellipsis"
            style={{ fontSize: 'clamp(14px, 5.4vw, 22px)' }}
          >
            {formatCurrency(totalEntradas)}
          </div>
          <span
            className="inline-flex items-center gap-1 mt-2 font-bold text-emerald-300 bg-emerald-500/15 px-2 py-1 rounded-lg border border-emerald-500/10
                       max-w-full overflow-hidden whitespace-nowrap"
            style={{ fontSize: 'clamp(8.5px, 2.5vw, 10px)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="overflow-hidden whitespace-nowrap text-ellipsis">+12% em relação a Jul</span>
          </span>
        </div>
      </div>

      {/* Saídas Card — Dark Slim */}
      <div className="bg-gradient-to-br from-[#050a14] via-[#0b1220] to-[#0e1f35] border border-white/10 p-4 rounded-[28px] shadow-xl shadow-slate-900/25 relative overflow-hidden min-w-0 w-full">
        {/* Glow Laranja/Rose Saídas */}
        <div className="absolute top-[-30px] right-[-30px] w-28 h-28 bg-[#f59e0b]/25 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 bg-rose-500/20 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative min-w-0 w-full">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55 truncate">Saídas</span>
          <div className="w-9 h-9 rounded-2xl bg-white/10 border border-white/10 text-rose-400 flex items-center justify-center backdrop-blur-md shadow-lg shadow-black/20 shrink-0">
            <ArrowUp size={15} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-3 text-left relative min-w-0 w-full">
          {/* ===== RESPONSIVO MOBILE (igual Entradas acima) ===== */}
          <div
            className="font-black text-white font-mono tracking-tight leading-none
                       min-w-0 w-full overflow-hidden whitespace-nowrap text-ellipsis"
            style={{ fontSize: 'clamp(14px, 5.4vw, 22px)' }}
          >
            {formatCurrency(totalSaidas)}
          </div>
          <span
            className="inline-flex items-center gap-1 mt-2 font-bold text-rose-300 bg-rose-500/15 px-2 py-1 rounded-lg border border-rose-500/10
                       max-w-full overflow-hidden whitespace-nowrap"
            style={{ fontSize: 'clamp(8.5px, 2.5vw, 10px)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span className="overflow-hidden whitespace-nowrap text-ellipsis">84% do teto definido</span>
          </span>
        </div>
      </div>
    </div>
  );
};
