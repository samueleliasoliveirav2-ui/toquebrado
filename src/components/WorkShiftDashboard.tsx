import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Briefcase, Car, Calendar, Send, Edit3, CheckCircle, Clock, ChevronDown, ChevronUp, Link, Tag, Sparkles } from 'lucide-react';
import type { WorkShiftEntry } from '../types';
import { PillMonthPicker } from './PillMonthPicker';

interface WorkShiftDashboardProps {
  entries: WorkShiftEntry[];
  onEditEntry: (entry: WorkShiftEntry) => void;
  onSendToWallet: (date: string, activity: string, amount: number) => void;
  onMarkAsPaid: (id: string) => void;
  months: Array<{ key: string; label: string }>;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
}

export const WorkShiftDashboard: React.FC<WorkShiftDashboardProps> = ({
  entries,
  onEditEntry,
  onSendToWallet,
  onMarkAsPaid,
  months,
  selectedMonth,
  onMonthChange
}) => {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

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
  const totalGanhos = entries
    .filter(e => e.tipo === 'ENTRADA')
    .reduce((sum, e) => sum + e.valor, 0);

  const ganhosConfirmados = entries
    .filter(e => e.tipo === 'ENTRADA' && e.status === 'RECEBIDO')
    .reduce((sum, e) => sum + e.valor, 0);

  const totalAReceber = entries
    .filter(e => e.tipo === 'ENTRADA' && e.status === 'A_RECEBER')
    .reduce((sum, e) => sum + e.valor, 0);

  const custosRua = entries
    .filter(e => e.tipo === 'SAIDA')
    .reduce((sum, e) => sum + e.valor, 0);

  const lucroRealizado = ganhosConfirmados - custosRua;
  const lucroProjetado = totalGanhos - custosRua;
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

  const toggleEventExpand = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEventId(prev => prev === eventId ? null : eventId);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-28 animate-fade-in font-sans">

      {/* Header com pill do seletor de mês centralizado */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-center">
        <PillMonthPicker
          months={months}
          selectedMonth={selectedMonth}
          onChange={onMonthChange}
          labelIcone={<Calendar size={15} className="stroke-[2.2]" />}
        />
      </div>

      {/* Cards KPI Dark Glass */}
      <div className="px-4 pt-2 pb-1 space-y-3">
        {/* Ganho Bruto e A Receber (linha 1 - 2 cols) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Ganho Bruto */}
          <div className="relative overflow-hidden rounded-2xl p-3.5 h-[96px] flex flex-col justify-between
                          bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950
                          border border-slate-800 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)]">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl" aria-hidden />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Ganho Bruto</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                <ArrowUpRight size={12} className="stroke-[2.5] text-emerald-400" />
              </div>
            </div>
            <div className="relative z-10 flex items-end justify-between">
              <span className="text-[15px] font-black text-white truncate tabular-nums tracking-tight">
                {formatCurrency(totalGanhos)}
              </span>
            </div>
          </div>

          {/* A Receber */}
          <div className="relative overflow-hidden rounded-2xl p-3.5 h-[96px] flex flex-col justify-between
                          bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950
                          border border-slate-800 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)]">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl" aria-hidden />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">A Receber</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[7px] font-black px-1.5 py-0.5 rounded-md leading-none shadow-xs">
                    {pendingCount}
                  </span>
                )}
              </div>
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-400/25 flex items-center justify-center">
                <Clock size={12} className="stroke-[2.5] text-amber-400" />
              </div>
            </div>
            <div className="relative z-10">
              <span className={`text-[15px] font-black truncate tabular-nums tracking-tight ${
                totalAReceber > 0 ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {formatCurrency(totalAReceber)}
              </span>
            </div>
          </div>
        </div>

        {/* Lucro Realizado e Projetado (linha 2 - 2 cols) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Lucro Líq. Realizado */}
          <div className={`relative overflow-hidden rounded-2xl p-3.5 h-[96px] flex flex-col justify-between
                          bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950
                          border border-slate-800 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)]`}>
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${
              lucroRealizado >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            } blur-2xl`} aria-hidden />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Lucro Líq. Realizado</span>
              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center ${
                lucroRealizado >= 0
                  ? 'bg-emerald-500/15 border-emerald-400/25'
                  : 'bg-rose-500/15 border-rose-400/25'
              }`}>
                <CheckCircle size={12} className={`stroke-[2.5] ${lucroRealizado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
            </div>
            <div className="relative z-10">
              <span className={`text-[15px] font-black truncate tabular-nums tracking-tight ${
                lucroRealizado >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {lucroRealizado >= 0 && totalGanhos + custosRua + lucroRealizado > 0 ? '+' : ''}{formatCurrency(lucroRealizado)}
              </span>
            </div>
          </div>

          {/* Lucro Líq. Projetado */}
          <div className="relative overflow-hidden rounded-2xl p-3.5 h-[96px] flex flex-col justify-between
                          bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950
                          border border-slate-800 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)]">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-500/10 blur-2xl" aria-hidden />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Lucro Líq. Projetado</span>
              <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-400/25 flex items-center justify-center">
                <Sparkles size={12} className="stroke-[2.5] text-indigo-400" />
              </div>
            </div>
            <div className="relative z-10">
              <span className={`text-[15px] font-black truncate tabular-nums tracking-tight ${
                lucroProjetado >= 0 ? 'text-indigo-400' : 'text-rose-400'
              }`}>
                {lucroProjetado >= 0 && totalGanhos > 0 ? '+' : ''}{formatCurrency(lucroProjetado)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between pl-1 pr-1">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Histórico de Turnos</h3>
          <span className="text-[10px] text-slate-500 font-semibold uppercase">
            Custo total de rua: <span className="font-extrabold text-rose-600">{formatCurrency(custosRua)}</span>
          </span>
        </div>
        
        {sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center glass rounded-3xl border border-slate-200/80 bg-white/60">
            <Briefcase className="text-slate-500 mb-3 animate-pulse" size={28} />
            <p className="text-slate-700 text-xs font-bold">Nenhum turno registrado neste mês.</p>
            <p className="text-slate-500 text-[10px] mt-1">Utilize o botão + no rodapé para adicionar uma diária ou despesa de rua.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(dateKey => {
              const dayEntries = groupedByDate[dateKey];
              
              // Calculate day details
              const ganhoDiaConfirmado = dayEntries
                .filter(e => e.tipo === 'ENTRADA' && e.status === 'RECEBIDO')
                .reduce((sum, e) => sum + e.valor, 0);
              const saldoDiaRealizado = ganhoDiaConfirmado - dayEntries
                .filter(e => e.tipo === 'SAIDA')
                .reduce((sum, e) => sum + e.valor, 0);

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
                        <Calendar size={11} className="text-slate-500" />
                        {formatDate(dateKey)} - {getWeekdayName(dateKey)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold block">Líquido Projetado</span>
                      <span className={`text-xs font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(saldoDia)}
                      </span>
                    </div>
                  </div>

                  {/* Day Individual entries */}
                  <div className="p-3 divide-y divide-slate-100">
                    {dayEntries.map(entry => {
                      const isGanho = entry.tipo === 'ENTRADA';
                      const isEvento = isGanho && entry.atividade === 'Evento';
                      const isPending = isGanho && entry.status === 'A_RECEBER';
                      const isExpanded = expandedEventId === entry.id;

                      // Query for costs linked to this specific event
                      const linkedCosts = isEvento 
                        ? entries.filter(e => e.tipo === 'SAIDA' && e.vinculoId === entry.id)
                        : [];
                      
                      const totalLinkedCostsVal = linkedCosts.reduce((sum, e) => sum + e.valor, 0);
                      const eventNetProfit = entry.valor - totalLinkedCostsVal;

                      return (
                        <div key={entry.id} className="block py-1">
                          
                          {/* Main Row layout */}
                          <div 
                            onClick={(e) => {
                              if (isEvento) {
                                toggleEventExpand(entry.id, e);
                              } else {
                                onEditEntry(entry);
                              }
                            }}
                            className="py-2 flex items-center justify-between hover:bg-slate-50/60 active:bg-slate-100/50 rounded-lg px-1.5 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Icon Indicator */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                isGanho 
                                  ? isPending
                                    ? 'bg-amber-50/50 border-amber-100 text-amber-600'
                                    : 'bg-emerald-50/60 border-emerald-100 text-emerald-600' 
                                  : 'bg-rose-50 border-rose-100/50 text-rose-600'
                              }`}>
                                {isGanho ? <Car size={14} /> : <ArrowDownRight size={14} />}
                              </div>

                              {/* Details text */}
                              <div className="text-left min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-extrabold text-slate-700 truncate">
                                    {isGanho 
                                      ? isEvento 
                                        ? `Evento - ${entry.observacao || 'Convenção/Job'}`
                                        : `Ganho - ${entry.atividade}` 
                                      : `Custo - ${entry.categoria}`}
                                  </span>
                                  
                                  {/* Status Badge */}
                                  {isGanho && (
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                                      isPending 
                                        ? 'bg-amber-105 text-amber-700' 
                                        : 'bg-emerald-105 text-emerald-700'
                                    }`}>
                                      {isPending ? 'A RECEBER' : 'RECEBIDO'}
                                    </span>
                                  )}
                                </div>

                                {/* Link Indicator for costs */}
                                {!isGanho && entry.vinculoId && (
                                  <p className="text-[8px] text-slate-500 font-extrabold mt-0.5 flex items-center gap-0.5 uppercase tracking-wide">
                                    <Link size={8} />
                                    Custo Vinculado
                                  </p>
                                )}

                                {/* Forecast dates */}
                                {isPending && entry.dataRecebimento && (
                                  <p className="text-[9px] text-amber-600 font-extrabold mt-0.5 flex items-center gap-0.5">
                                    <Clock size={9} />
                                    Previsão: {formatDate(entry.dataRecebimento)}
                                  </p>
                                )}
                                {entry.observacao && !isEvento && (
                                  <p className="text-[10px] text-slate-500 truncate font-semibold mt-0.5">
                                    {entry.observacao}
                                  </p>
                                )}
                                {isEvento && entry.quantidadeDias && entry.quantidadeDias > 1 && (
                                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                                    Pacote de {entry.quantidadeDias} dias {entry.valorDiaria ? `(R$ ${entry.valorDiaria}/dia)` : ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {/* Value */}
                              <span className={`text-xs font-extrabold ${isGanho ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {isGanho ? '+' : '-'} {formatCurrency(entry.valor)}
                              </span>

                              {/* Action: Expand toggle or Baixa Rápida or Edit */}
                              {isEvento ? (
                                <button
                                  type="button"
                                  onClick={(e) => toggleEventExpand(entry.id, e)}
                                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              ) : isPending ? (
                                <button
                                  type="button"
                                  onClick={() => onMarkAsPaid(entry.id)}
                                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-3xs cursor-pointer ml-1"
                                  title="Confirmar Recebimento"
                                >
                                  <CheckCircle size={11} className="stroke-[2.5]" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onEditEntry(entry)}
                                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors ml-1 cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 size={11} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expandable DRE Details Report for Events */}
                          {isEvento && isExpanded && (
                            <div className="mx-2 my-1 bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 space-y-3 animate-scale-up text-left">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Detalhamento DRE do Evento</span>
                                <button
                                  onClick={() => onEditEntry(entry)}
                                  className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 size={10} />
                                  Editar Evento
                                </button>
                              </div>

                              {/* Costs linked list */}
                              <div className="space-y-1.5">
                                <span className="text-[9px] uppercase font-extrabold text-slate-500 block tracking-wider">Custos Operacionais Vinculados</span>
                                {linkedCosts.length === 0 ? (
                                  <span className="text-[10px] text-slate-500 italic block">Nenhum custo vinculado a este evento.</span>
                                ) : (
                                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                    {linkedCosts.map(cost => (
                                      <div 
                                        key={cost.id} 
                                        onClick={() => onEditEntry(cost)}
                                        className="flex items-center justify-between text-[10px] text-slate-700 bg-white border border-slate-150 p-1.5 rounded-lg cursor-pointer hover:bg-slate-50"
                                      >
                                        <span className="font-semibold flex items-center gap-1">
                                          <Tag size={8} className="text-slate-500" />
                                          {cost.categoria} {cost.observacao ? `(${cost.observacao})` : ''}
                                        </span>
                                        <span className="font-extrabold text-rose-600">-{formatCurrency(cost.valor)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Financial DRE Summary */}
                              <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                  <span className="font-semibold text-slate-500">Ganho Bruto:</span>
                                  <span className="font-bold text-slate-800">{formatCurrency(entry.valor)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-semibold text-slate-500">Despesas Vinculadas:</span>
                                  <span className="font-bold text-rose-600">-{formatCurrency(totalLinkedCostsVal)}</span>
                                </div>
                                <div className="flex justify-between pt-1.5 border-t border-slate-100 font-extrabold">
                                  <span className="text-slate-800">Lucro Líquido:</span>
                                  <span className={eventNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                    {formatCurrency(eventNetProfit)}
                                  </span>
                                </div>
                              </div>

                              {/* Baixa rápida within card */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => onMarkAsPaid(entry.id)}
                                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle size={12} />
                                  Confirmar Recebimento do Cachet (Baixa)
                                </button>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                  {/* Quick closing balance integration button */}
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
