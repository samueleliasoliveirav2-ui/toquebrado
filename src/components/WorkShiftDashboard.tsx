import React from 'react';
import { ArrowUpRight, ArrowDownRight, Briefcase, Car, Calendar, DollarSign, Send, Edit3 } from 'lucide-react';
import type { WorkShiftEntry } from '../types';

interface WorkShiftDashboardProps {
  entries: WorkShiftEntry[];
  onEditEntry: (entry: WorkShiftEntry) => void;
  onSendToWallet: (date: string, activity: string, amount: number) => void;
}

export const WorkShiftDashboard: React.FC<WorkShiftDashboardProps> = ({
  entries,
  onEditEntry,
  onSendToWallet
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const getWeekdayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[date.getDay()];
  };

  const formatDate = (dateStr: string) => {
    const [_, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  // 1. Calculations for KPIs
  const ganhoBruto = entries
    .filter(e => e.tipo === 'ENTRADA')
    .reduce((sum, e) => sum + e.valor, 0);

  const custosRua = entries
    .filter(e => e.tipo === 'SAIDA')
    .reduce((sum, e) => sum + e.valor, 0);

  const lucroLiquido = ganhoBruto - custosRua;

  // 2. Group entries by date
  const groupedByDate: Record<string, WorkShiftEntry[]> = {};
  entries.forEach(e => {
    if (!groupedByDate[e.data]) {
      groupedByDate[e.data] = [];
    }
    groupedByDate[e.data].push(e);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="w-full flex-1 flex flex-col p-4 space-y-5 bg-slate-50 overflow-y-auto pb-28 animate-fade-in font-sans">
      
      {/* KPIs Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Ganho Bruto */}
        <div className="glass bg-white/95 border border-slate-200/60 p-3 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Ganho Bruto</span>
            <div className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight size={12} className="stroke-[3]" />
            </div>
          </div>
          <span className="text-xs font-black text-slate-800 truncate mt-1">
            {formatCurrency(ganhoBruto)}
          </span>
        </div>

        {/* Custos da Rua */}
        <div className="glass bg-white/95 border border-slate-200/60 p-3 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Custos Rua</span>
            <div className="w-5 h-5 rounded-lg bg-rose-50 text-rose-550 flex items-center justify-center">
              <ArrowDownRight size={12} className="stroke-[3]" />
            </div>
          </div>
          <span className="text-xs font-black text-slate-800 truncate mt-1">
            {formatCurrency(custosRua)}
          </span>
        </div>

        {/* Lucro Líquido */}
        <div className={`glass border p-3 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left transition-colors ${
          lucroLiquido >= 0 
            ? 'bg-emerald-50/20 border-emerald-150/70' 
            : 'bg-rose-55/10 border-rose-150/70'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Lucro Líq.</span>
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
              lucroLiquido >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
            }`}>
              <DollarSign size={11} className="stroke-[3]" />
            </div>
          </div>
          <span className={`text-xs font-black truncate mt-1 ${
            lucroLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatCurrency(lucroLiquido)}
          </span>
        </div>
      </div>

      {/* Main List Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider pl-1">Histórico de Turnos</h3>
        
        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center glass rounded-3xl border border-slate-200/80 bg-white/60">
            <Briefcase className="text-slate-350 mb-3 animate-pulse" size={28} />
            <p className="text-slate-700 text-xs font-bold">Nenhum turno registrado neste mês.</p>
            <p className="text-slate-400 text-[10px] mt-1">Utilize o botão + no rodapé para adicionar uma diária ou despesa de rua.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(dateKey => {
              const dayEntries = groupedByDate[dateKey];
              
              // Calculate day details
              const ganhoDia = dayEntries
                .filter(e => e.tipo === 'ENTRADA')
                .reduce((sum, e) => sum + e.valor, 0);

              const custoDia = dayEntries
                .filter(e => e.tipo === 'SAIDA')
                .reduce((sum, e) => sum + e.valor, 0);

              const saldoDia = ganhoDia - custoDia;
              const isPositive = saldoDia >= 0;
              const primaryActivity = dayEntries.find(e => e.tipo === 'ENTRADA')?.atividade || 'Trabalho';

              return (
                <div key={dateKey} className="glass bg-white border border-slate-200/70 rounded-2xl shadow-3xs overflow-hidden">
                  
                  {/* Day Header Summary bar */}
                  <div className="bg-slate-50/65 px-4 py-3 flex items-center justify-between border-b border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Calendar size={11} className="text-slate-400" />
                        {formatDate(dateKey)} - {getWeekdayName(dateKey)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Saldo Diário</span>
                      <span className={`text-xs font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(saldoDia)}
                      </span>
                    </div>
                  </div>

                  {/* Day Individual entries */}
                  <div className="p-3 divide-y divide-slate-100">
                    {dayEntries.map(entry => {
                      const isGanho = entry.tipo === 'ENTRADA';
                      return (
                        <div 
                          key={entry.id}
                          onClick={() => onEditEntry(entry)}
                          className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 active:bg-slate-100/50 rounded-lg px-1.5 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Icon Indicator */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                              isGanho 
                                ? 'bg-emerald-50/60 border-emerald-100 text-emerald-600' 
                                : 'bg-rose-55/10 border-rose-100/50 text-rose-550'
                            }`}>
                              {isGanho ? <Car size={14} /> : <ArrowDownRight size={14} />}
                            </div>

                            {/* Details text */}
                            <div className="text-left min-w-0">
                              <p className="text-xs font-extrabold text-slate-700 truncate">
                                {isGanho ? `Ganho - ${entry.atividade}` : `Custo - ${entry.categoria}`}
                              </p>
                              {entry.observacao && (
                                <p className="text-[10px] text-slate-450 truncate font-semibold mt-0.5">
                                  {entry.observacao}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-extrabold ${isGanho ? 'text-emerald-650' : 'text-rose-550'}`}>
                              {isGanho ? '+' : '-'} {formatCurrency(entry.valor)}
                            </span>
                            <Edit3 size={10} className="text-slate-350 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick closing balance integration button */}
                  {saldoDia > 0 && (
                    <div className="p-2.5 bg-slate-50/40 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Deseja lançar o lucro de ${formatCurrency(saldoDia)} do dia ${formatDate(dateKey)} como uma receita na sua Carteira Pessoal?`)) {
                            onSendToWallet(dateKey, primaryActivity, saldoDia);
                          }
                        }}
                        className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[9px] font-bold tracking-wide transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send size={9} />
                        Enviar para o Caixa Pessoal
                      </button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
