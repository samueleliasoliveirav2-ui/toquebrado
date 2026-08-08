import React from 'react';
import { ArrowUpRight, ArrowDownRight, Briefcase, Car, Calendar, DollarSign, Send, Edit3, CheckCircle, Clock } from 'lucide-react';
import type { WorkShiftEntry } from '../types';

interface WorkShiftDashboardProps {
  entries: WorkShiftEntry[];
  onEditEntry: (entry: WorkShiftEntry) => void;
  onSendToWallet: (date: string, activity: string, amount: number) => void;
  onMarkAsPaid: (id: string) => void;
}

export const WorkShiftDashboard: React.FC<WorkShiftDashboardProps> = ({
  entries,
  onEditEntry,
  onSendToWallet,
  onMarkAsPaid
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
  // Ganhos totais (RECEBIDOS + A_RECEBER)
  const totalGanhos = entries
    .filter(e => e.tipo === 'ENTRADA')
    .reduce((sum, e) => sum + e.valor, 0);

  // Ganhos confirmados (apenas RECEBIDOS)
  const ganhosConfirmados = entries
    .filter(e => e.tipo === 'ENTRADA' && e.status === 'RECEBIDO')
    .reduce((sum, e) => sum + e.valor, 0);

  // Ganhos a receber (apenas A_RECEBER)
  const totalAReceber = entries
    .filter(e => e.tipo === 'ENTRADA' && e.status === 'A_RECEBER')
    .reduce((sum, e) => sum + e.valor, 0);

  // Custos totais
  const custosRua = entries
    .filter(e => e.tipo === 'SAIDA')
    .reduce((sum, e) => sum + e.valor, 0);

  // Lucro Líquido Realizado (Ganhos recebidos - Custos)
  const lucroRealizado = ganhosConfirmados - custosRua;

  // Lucro Líquido Projetado (Ganhos totais - Custos)
  const lucroProjetado = totalGanhos - custosRua;

  // Count pending events
  const pendingCount = entries.filter(e => e.tipo === 'ENTRADA' && e.status === 'A_RECEBER').length;

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
      
      {/* 2x2 Grid of KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Ganho Bruto do Mês */}
        <div className="glass bg-white/95 border border-slate-200/60 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Ganho Bruto</span>
            <div className="w-5 h-5 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
              <ArrowUpRight size={12} className="stroke-[3]" />
            </div>
          </div>
          <span className="text-sm font-black text-slate-800 truncate mt-1">
            {formatCurrency(totalGanhos)}
          </span>
        </div>

        {/* A Receber (Eventos) */}
        <div className={`glass border p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left transition-colors ${
          totalAReceber > 0 
            ? 'bg-amber-50/20 border-amber-200/50' 
            : 'bg-white/95 border-slate-200/60'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">A Receber</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[7px] font-black px-1 py-0.5 rounded-md leading-none">
                  {pendingCount}
                </span>
              )}
            </div>
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
              totalAReceber > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <Clock size={11} className="stroke-[3]" />
            </div>
          </div>
          <span className={`text-sm font-black truncate mt-1 ${
            totalAReceber > 0 ? 'text-amber-650' : 'text-slate-800'
          }`}>
            {formatCurrency(totalAReceber)}
          </span>
        </div>

        {/* Lucro Líquido Realizado */}
        <div className={`glass border p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left transition-colors ${
          lucroRealizado >= 0 
            ? 'bg-emerald-50/20 border-emerald-150/70' 
            : 'bg-rose-55/10 border-rose-150/70'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-450">Lucro Líq. Realizado</span>
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
              lucroRealizado >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
            }`}>
              <CheckCircle size={11} className="stroke-[3]" />
            </div>
          </div>
          <span className={`text-sm font-black truncate mt-1 ${
            lucroRealizado >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatCurrency(lucroRealizado)}
          </span>
        </div>

        {/* Lucro Líquido Projetado */}
        <div className={`glass border p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left transition-colors ${
          lucroProjetado >= 0 
            ? 'bg-blue-50/20 border-blue-150/70' 
            : 'bg-rose-55/10 border-rose-150/70'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-455">Lucro Líq. Projetado</span>
            <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${
              lucroProjetado >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-rose-500/10 text-rose-600'
            }`}>
              <DollarSign size={11} className="stroke-[3]" />
            </div>
          </div>
          <span className={`text-sm font-black truncate mt-1 ${
            lucroProjetado >= 0 ? 'text-blue-600' : 'text-rose-600'
          }`}>
            {formatCurrency(lucroProjetado)}
          </span>
        </div>

      </div>

      {/* Main List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pl-1 pr-1">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Histórico de Turnos</h3>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">
            Custo total de rua: <span className="font-extrabold text-rose-550">{formatCurrency(custosRua)}</span>
          </span>
        </div>
        
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
              
              // Calculate day details (For diárias we sum only RECEIVED ones in "Líquido Realizado", but let's show overall net balance of the day as projected or actual)
              const ganhoDia = dayEntries
                .filter(e => e.tipo === 'ENTRADA')
                .reduce((sum, e) => sum + e.valor, 0);

              const custoDia = dayEntries
                .filter(e => e.tipo === 'SAIDA')
                .reduce((sum, e) => sum + e.valor, 0);

              const saldoDia = ganhoDia - custoDia;
              const isPositive = saldoDia >= 0;
              
              // Only allow repasse to wallet if the net balance is received and positive!
              const ganhoDiaConfirmado = dayEntries
                .filter(e => e.tipo === 'ENTRADA' && e.status === 'RECEBIDO')
                .reduce((sum, e) => sum + e.valor, 0);
              const saldoDiaRealizado = ganhoDiaConfirmado - custoDia;

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
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Líquido Projetado</span>
                      <span className={`text-xs font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(saldoDia)}
                      </span>
                    </div>
                  </div>

                  {/* Day Individual entries */}
                  <div className="p-3 divide-y divide-slate-100">
                    {dayEntries.map(entry => {
                      const isGanho = entry.tipo === 'ENTRADA';
                      const isPending = isGanho && entry.status === 'A_RECEBER';
                      
                      return (
                        <div 
                          key={entry.id}
                          onClick={() => onEditEntry(entry)}
                          className="py-2.5 flex items-center justify-between hover:bg-slate-55/40 active:bg-slate-100/50 rounded-lg px-1.5 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Icon Indicator */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                              isGanho 
                                ? isPending
                                  ? 'bg-amber-50/50 border-amber-100 text-amber-600'
                                  : 'bg-emerald-50/60 border-emerald-100 text-emerald-600' 
                                : 'bg-rose-55/10 border-rose-100/50 text-rose-550'
                            }`}>
                              {isGanho ? <Car size={14} /> : <ArrowDownRight size={14} />}
                            </div>

                            {/* Details text */}
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-extrabold text-slate-700 truncate">
                                  {isGanho ? `Ganho - ${entry.atividade}` : `Custo - ${entry.categoria}`}
                                </span>
                                
                                {/* Status Badge */}
                                {isGanho && (
                                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                                    isPending 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}>
                                    {isPending ? 'A RECEBER' : 'RECEBIDO'}
                                  </span>
                                )}
                              </div>

                              {/* Observation and due dates */}
                              {isPending && entry.dataRecebimento && (
                                <p className="text-[9px] text-amber-600 font-extrabold mt-0.5 flex items-center gap-0.5">
                                  <Clock size={9} />
                                  Previsão: {formatDate(entry.dataRecebimento)}
                                </p>
                              )}
                              {entry.observacao && (
                                <p className="text-[10px] text-slate-450 truncate font-semibold mt-0.5">
                                  {entry.observacao}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Value */}
                            <span className={`text-xs font-extrabold ${isGanho ? 'text-emerald-650' : 'text-rose-550'}`}>
                              {isGanho ? '+' : '-'} {formatCurrency(entry.valor)}
                            </span>

                            {/* Baixa Rápida de pagamento action button */}
                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => onMarkAsPaid(entry.id)}
                                className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-3xs cursor-pointer ml-1"
                                title="Marcar como Recebido"
                              >
                                <CheckCircle size={11} className="stroke-[2.5]" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onEditEntry(entry)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors ml-1 cursor-pointer"
                                title="Editar"
                              >
                                <Edit3 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick closing balance integration button (only allowed for positive liquid/received balances) */}
                  {saldoDiaRealizado > 0 && (
                    <div className="p-2.5 bg-slate-50/40 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Deseja lançar o lucro líquido já recebido de ${formatCurrency(saldoDiaRealizado)} do dia ${formatDate(dateKey)} como uma receita na sua Carteira Pessoal?`)) {
                            onSendToWallet(dateKey, primaryActivity, saldoDiaRealizado);
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
