import React, { useMemo, useState } from 'react';
import { Calendar, ChevronDown, Check, Lock } from 'lucide-react';

interface MonthOption {
  key: string;
  label: string;
}

interface PillMonthPickerProps {
  months: MonthOption[];
  selectedMonth: string;
  onChange: (key: string) => void;
  labelIcone?: React.ReactNode;
  classNamePill?: string;
}

export const PillMonthPicker: React.FC<PillMonthPickerProps> = ({
  months,
  selectedMonth,
  onChange,
  labelIcone,
  classNamePill = ''
}) => {
  const [aberto, setAberto] = useState(false);

  const mesesAgrupados = useMemo(() => {
    const g: Record<string, MonthOption[]> = {};
    months.forEach(m => {
      const ano = m.key.split('-')[0];
      if (!g[ano]) g[ano] = [];
      g[ano].push(m);
    });
    return g;
  }, [months]);

  const anos = useMemo(() => Object.keys(mesesAgrupados).sort((a, b) => Number(b) - Number(a)), [mesesAgrupados]);
  const [abaAno, setAbaAno] = useState<string>(() => selectedMonth.split('-')[0] || (anos[0] ?? String(new Date().getFullYear())));

  const mesSelecionado = months.find(m => m.key === selectedMonth);

  return (
    <>
      <button
        onClick={() => {
          setAbaAno(selectedMonth.split('-')[0] ?? (anos[0] ?? String(new Date().getFullYear())));
          setAberto(true);
        }}
        className={[
          'flex items-center justify-center gap-2 px-4 py-2 rounded-full',
          'bg-white border border-slate-200 shadow-xs hover:shadow-sm',
          'hover:bg-slate-50 transition-all cursor-pointer group',
          classNamePill
        ].join(' ')}
        title="Selecionar mês"
      >
        <span className="shrink-0 w-7 h-7 rounded-xl bg-[#0e69b2]/10 text-[#0e69b2] flex items-center justify-center border border-[#0e69b2]/10">
          {labelIcone ?? <Calendar size={15} className="stroke-[2.2]" />}
        </span>
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-[12px] font-black text-slate-800 truncate tracking-wide uppercase">
            {mesSelecionado?.label ?? 'Selecionar mês'}
          </span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 group-hover:text-[#0e69b2] transition-colors ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in cursor-pointer"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <div
            className="fixed z-50 inset-x-0 sm:inset-x-auto sm:max-w-md sm:w-[92%] sm:left-1/2 sm:-translate-x-1/2
                       bottom-0 sm:bottom-auto sm:top-[14%]
                       bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_-15px_rgba(15,23,42,0.25)] sm:shadow-2xl
                       border-t border-slate-200/60 sm:border border-slate-200/70
                       animate-[slideUp_0.28s_ease-out]
                       max-h-[80vh] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-col items-center shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-slate-200 mb-2.5" aria-hidden />
              <div className="w-full flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Selecionar Mês</h3>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    {mesSelecionado?.label ? `Atual: ${mesSelecionado.label}` : 'Escolha o período'}
                  </p>
                </div>
                <button
                  onClick={() => setAberto(false)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <ChevronDown size={18} className="stroke-[3]" />
                </button>
              </div>

              {anos.length > 1 && (
                <div className="w-full flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {anos.map(ano => {
                    const ativo = abaAno === ano;
                    return (
                      <button
                        key={ano}
                        onClick={() => setAbaAno(ano)}
                        className={[
                          'shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border',
                          ativo
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        ].join(' ')}
                      >
                        {ano}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
              {(mesesAgrupados[abaAno] ?? []).map(m => {
                const ativo = m.key === selectedMonth;
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      onChange(m.key);
                      setAberto(false);
                    }}
                    className={[
                      'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all',
                      ativo
                        ? 'bg-gradient-to-r from-[#0e69b2]/10 via-[#0e69b2]/5 to-transparent border border-[#0e69b2]/20 shadow-[0_6px_16px_-10px_rgba(14,105,178,0.35)]'
                        : 'bg-white border border-slate-200/60 hover:bg-slate-50 hover:border-slate-200 active:scale-[0.995] cursor-pointer'
                    ].join(' ')}
                  >
                    <span className={[
                      'shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors',
                      ativo
                        ? 'bg-[#0e69b2] text-white border-[#0e69b2] shadow-md shadow-blue-500/25'
                        : 'bg-[#0e69b2]/10 text-[#0e69b2] border-[#0e69b2]/10'
                    ].join(' ')}>
                      <Calendar size={16} className="stroke-[2.3]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={[
                        'text-[12.5px] font-black truncate tracking-wide block',
                        ativo ? 'text-[#0e69b2]' : 'text-slate-800'
                      ].join(' ')}>
                        {m.label}
                      </span>
                      <span className={`text-[10.5px] font-semibold ${ativo ? 'text-[#0e69b2]/70' : 'text-slate-500'}`}>
                        Referência: {m.key}
                      </span>
                    </div>
                    <span className={[
                      'shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all',
                      ativo ? 'bg-[#0e69b2] text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-transparent'
                    ].join(' ')} aria-hidden>
                      <Check size={13} className="stroke-[3]" />
                    </span>
                    {false && <Lock size={14} />}
                  </button>
                );
              })}
              {(mesesAgrupados[abaAno] ?? []).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-bold">Nenhum mês disponível neste ano.</div>
              )}
            </div>

            <div className="px-4 pt-2 pb-4 shrink-0" aria-hidden>
              <div className="h-1 w-32 mx-auto rounded-full bg-slate-100" />
            </div>
          </div>
        </>
      )}
    </>
  );
};
