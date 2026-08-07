import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, AlertCircle, Check, Clock } from 'lucide-react';
import type { Transaction } from '../types';

interface WeeklyAccordionProps {
  transactions: Transaction[];
  onEditTransaction: (transaction: Transaction) => void;
  onToggleStatus: (id: string) => void;
}

interface WeekGroup {
  key: string; // Monday date YYYY-MM-DD
  monday: Date;
  sunday: Date;
  label: string;
  transactions: Transaction[];
  saldoSemana: number;
}

export const WeeklyAccordion: React.FC<WeeklyAccordionProps> = ({
  transactions,
  onEditTransaction,
  onToggleStatus
}) => {
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const getWeekMonday = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  const getWeekRange = (mondayStr: string) => {
    const monday = new Date(mondayStr + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDayMonth = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${day}/${months[d.getMonth()]}`;
    };

    return {
      monday,
      sunday,
      formatted: `${formatDayMonth(monday)} - ${formatDayMonth(sunday)}`
    };
  };

  // Helper to determine the date a transaction is currently planned for
  const getTransactionActiveDate = (tx: Transaction): string => {
    return (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
  };

  // Group transactions by their active Monday week key
  const weekGroupsMap: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    const activeDate = getTransactionActiveDate(tx);
    const mondayKey = getWeekMonday(activeDate);
    if (!weekGroupsMap[mondayKey]) {
      weekGroupsMap[mondayKey] = [];
    }
    weekGroupsMap[mondayKey].push(tx);
  });

  // Convert to sorted list
  const weekKeys = Object.keys(weekGroupsMap).sort();
  
  const weekLabels = [
    'Primeira Semana',
    'Segunda Semana',
    'Terceira Semana',
    'Quarta Semana',
    'Quinta Semana',
    'Sexta Semana'
  ];

  const weekGroups: WeekGroup[] = weekKeys.map((key, index) => {
    const txs = weekGroupsMap[key];
    const { monday, sunday } = getWeekRange(key);

    const sortedTxs = [...txs].sort((a, b) => {
      const dateA = getTransactionActiveDate(a);
      const dateB = getTransactionActiveDate(b);
      const dateDiff = new Date(dateB + 'T00:00:00').getTime() - new Date(dateA + 'T00:00:00').getTime();
      return dateDiff !== 0 ? dateDiff : a.descricao.localeCompare(b.descricao);
    });

    const totalRecebido = sortedTxs
      .filter(tx => tx.tipo === 'ENTRADA' && tx.status === 'RECEBIDO')
      .reduce((sum, tx) => sum + tx.valor, 0);

    const totalPago = sortedTxs
      .filter(tx => tx.tipo === 'SAIDA' && tx.status === 'PAGO')
      .reduce((sum, tx) => sum + tx.valor + (tx.juros || 0), 0);

    const saldoSemana = totalRecebido - totalPago;

    return {
      key,
      monday,
      sunday,
      label: weekLabels[index] || `Semana ${index + 1}`,
      transactions: sortedTxs,
      saldoSemana
    };
  });

  const toggleExpand = (key: string) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false
    }));
  };

  const getWeekdayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
  };

  const getDayNumber = (dateStr: string) => {
    return dateStr.split('-')[2];
  };

  const getStatusBadge = (tx: Transaction) => {
    switch (tx.status) {
      case 'RECEBIDO':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            RECEBIDO
          </span>
        );
      case 'PAGO':
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            PAGO
          </span>
        );
      case 'POSTERGAR':
        const postDate = tx.dataPostergar 
          ? tx.dataPostergar.split('-').reverse().slice(0, 2).join('/')
          : '';
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-sky-50 text-sky-700 border border-sky-100 flex flex-col items-center shadow-2xs">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-550" />
              POSTERGADO
            </span>
            {postDate && <span className="text-[8px] text-sky-600 font-bold mt-0.5">p/ {postDate}</span>}
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-500 border border-slate-200/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-450" />
            PENDENTE
          </span>
        );
    }
  };

  if (weekGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center glass rounded-3xl border border-slate-200/80 bg-white/60">
        <AlertCircle className="text-slate-400 mb-3" size={32} />
        <p className="text-slate-700 text-sm font-semibold">Nenhum lançamento encontrado neste mês.</p>
        <p className="text-slate-500 text-xs mt-1">Toque no botão + abaixo para cadastrar uma receita ou despesa.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in">
      {weekGroups.map((group) => {
        const isExpanded = expandedWeeks[group.key] !== false;
        const rangeStr = getWeekRange(group.key).formatted;
        const isPositive = group.saldoSemana >= 0;

        return (
          <div 
            key={group.key} 
            className="glass rounded-2xl overflow-hidden border border-slate-200/70 bg-white/95 transition-all duration-300 shadow-xs"
          >
            {/* Header Accordion */}
            <div 
              onClick={() => toggleExpand(group.key)}
              className="px-4 py-3.5 bg-slate-50/50 hover:bg-slate-100/60 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-slate-100"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">{group.label}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                  <Calendar size={10} className="text-slate-400" />
                  {rangeStr}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Saldo Semana</span>
                  <span className={`text-xs font-extrabold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(group.saldoSemana)}
                  </span>
                </div>
                <div className="p-1 rounded-lg bg-slate-150/70 text-slate-500">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {/* List Drawer */}
            <div className={`transition-all duration-300 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <div className="p-3 bg-white/50 divide-y divide-slate-100">
                {group.transactions.map((tx) => {
                  const isEntrada = tx.tipo === 'ENTRADA';
                  const activeDate = getTransactionActiveDate(tx);
                  const isPostponed = tx.status === 'POSTERGAR' && tx.dataPostergar;
                  const isPaid = tx.status === 'PAGO' || tx.status === 'RECEBIDO';

                  return (
                    <div 
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="py-3 px-1 flex items-center justify-between cursor-pointer hover:bg-slate-50/75 active:bg-slate-100/80 rounded-xl transition-colors group"
                    >
                      {/* Left: Date Indicator (Shows Postponed Date values) */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 text-center shadow-2xs">
                          <span className="text-[9px] text-slate-400 font-bold uppercase leading-none">{getWeekdayName(activeDate)}</span>
                          <span className="text-sm text-slate-800 font-extrabold leading-tight mt-0.5">{getDayNumber(activeDate)}</span>
                        </div>

                        {/* Mid: Description and Category */}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-blue-900 transition-colors line-clamp-1 max-w-[150px]">
                            {tx.descricao}
                          </span>
                          
                          {/* Original Date Label crossed out if postponed */}
                          {isPostponed && (
                            <span className="text-[8px] text-slate-450 font-bold line-through">
                              Antes: {tx.data.split('-').reverse().slice(0, 2).join('/')}
                            </span>
                          )}

                          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mt-0.5">
                            {tx.categoria}
                          </span>
                        </div>
                      </div>

                      {/* Right: Value, Juros and Badge status */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`text-sm font-extrabold ${isEntrada ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isEntrada ? '+' : '-'} {formatCurrency(tx.valor)}
                          </span>
                          {tx.juros && tx.juros > 0 && (
                            <span className="block text-[8px] text-rose-500 font-bold">
                              +{formatCurrency(tx.juros)} juros
                            </span>
                          )}
                        </div>

                        {/* Status Badge (with 1-click status change behavior) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(tx.id);
                          }}
                          title={isPaid ? "Marcar como pendente" : "Marcar como pago/recebido"}
                          className="hover:scale-105 active:scale-95 transition-transform relative group/badge flex items-center justify-center cursor-pointer"
                        >
                          {getStatusBadge(tx)}
                          {/* Smart hover overlay icon matching action context */}
                          <div className="absolute inset-0 bg-white/90 opacity-0 group-hover/badge:opacity-100 flex items-center justify-center rounded-lg transition-opacity border border-slate-200">
                            {isPaid ? (
                              <Clock size={12} className="text-slate-500 font-bold" />
                            ) : (
                              <Check size={12} className="text-emerald-600 font-bold" />
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
