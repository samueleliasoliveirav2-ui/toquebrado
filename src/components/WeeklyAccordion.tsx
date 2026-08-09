import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  AlertCircle, 
  Check, 
  Clock, 
  DollarSign, 
  ShoppingCart, 
  Car, 
  Tv, 
  Heart, 
  HelpCircle, 
  CreditCard
} from 'lucide-react';
import type { Transaction, BankAccount } from '../types';

interface WeeklyAccordionProps {
  transactions: Transaction[];
  onEditTransaction: (transaction: Transaction) => void;
  onToggleStatus: (id: string) => void;
  accounts?: BankAccount[];
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
  onToggleStatus,
  accounts: _accounts = []
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

  const getTransactionActiveDate = (tx: Transaction): string => {
    return (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
  };

  const getCategoryDetails = (categoria: string, tipo: string) => {
    const cat = categoria.toLowerCase();
    if (tipo === 'ENTRADA') {
      return {
        icon: DollarSign,
        bg: 'bg-emerald-950/70 text-emerald-400',
        iconColor: 'text-emerald-400'
      };
    }
    
    if (cat.includes('supermercado') || cat.includes('aliment') || cat.includes('comida') || cat.includes('ifood') || cat.includes('restaurante')) {
      return { icon: ShoppingCart, bg: 'bg-rose-950/70 text-rose-400', iconColor: 'text-rose-400' };
    }
    if (cat.includes('transporte') || cat.includes('gasolina') || cat.includes('combustivel') || cat.includes('uber') || cat.includes('carro')) {
      return { icon: Car, bg: 'bg-amber-950/70 text-amber-400', iconColor: 'text-amber-400' };
    }
    if (cat.includes('assinatura') || cat.includes('lazer') || cat.includes('netflix') || cat.includes('spotify') || cat.includes('streaming') || cat.includes('tv')) {
      return { icon: Tv, bg: 'bg-indigo-950/70 text-indigo-400', iconColor: 'text-indigo-400' };
    }
    if (cat.includes('saude') || cat.includes('dentista') || cat.includes('remedio') || cat.includes('farmacia') || cat.includes('drogaria')) {
      return { icon: Heart, bg: 'bg-red-950/70 text-red-400', iconColor: 'text-red-400' };
    }
    if (cat.includes('cartao') || cat.includes('fatura') || cat.includes('emprestimo')) {
      return { icon: CreditCard, bg: 'bg-purple-950/70 text-purple-400', iconColor: 'text-purple-400' };
    }
    return { icon: HelpCircle, bg: 'bg-slate-800 text-slate-400', iconColor: 'text-slate-400' };
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

  const getStatusBadge = (tx: Transaction) => {
    switch (tx.status) {
      case 'RECEBIDO':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 flex items-center gap-1 shadow-2xs">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            RECEBIDO
          </span>
        );
      case 'PAGO':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/40 flex items-center gap-1 shadow-2xs">
            <span className="w-1 h-1 rounded-full bg-amber-500" />
            PAGO
          </span>
        );
      case 'POSTERGAR':
        const postDate = tx.dataPostergar 
          ? tx.dataPostergar.split('-').reverse().slice(0, 2).join('/')
          : '';
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/40 flex flex-col items-center shadow-2xs">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-sky-400" />
              POSTERGADO
            </span>
            {postDate && <span className="text-[7px] text-sky-300 font-bold">p/ {postDate}</span>}
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-500" />
            PENDENTE
          </span>
        );
    }
  };

  if (weekGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-900/60 border border-slate-800 rounded-3xl">
        <AlertCircle className="text-slate-500 mb-3" size={32} />
        <p className="text-slate-350 text-sm font-semibold">Nenhum lançamento encontrado neste mês.</p>
        <p className="text-slate-500 text-xs mt-1">Toque no botão + acima para cadastrar uma receita ou despesa.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in text-left">
      {weekGroups.map((group) => {
        const isExpanded = expandedWeeks[group.key] !== false;
        const rangeStr = getWeekRange(group.key).formatted;
        const isPositive = group.saldoSemana >= 0;

        return (
          <div 
            key={group.key} 
            className="bg-slate-900 rounded-[28px] overflow-hidden border border-slate-800 transition-all duration-300 shadow-sm"
          >
            {/* Header Accordion */}
            <div 
              onClick={() => toggleExpand(group.key)}
              className="px-4 py-3.5 hover:bg-slate-800/40 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-slate-800/50"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white">{group.label}</span>
                  {group.label === 'Primeira Semana' && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-purple-950 border border-purple-800/40 text-purple-300 rounded-full font-bold">Atual</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                  <Calendar size={10} className="text-slate-500" />
                  {rangeStr}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 block font-bold">Saldo</span>
                  <span className={`text-xs font-extrabold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(group.saldoSemana)}
                  </span>
                </div>
                <div className="p-1 rounded-lg text-slate-400">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
            </div>

            {/* List Drawer */}
            <div className={`transition-all duration-350 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <div className="p-3 space-y-2 bg-slate-950/20 divide-y divide-slate-900/40">
                {group.transactions.map((tx) => {
                  const isEntrada = tx.tipo === 'ENTRADA';
                  const activeDate = getTransactionActiveDate(tx);
                  const isPostponed = tx.status === 'POSTERGAR' && tx.dataPostergar;
                  const isPaid = tx.status === 'PAGO' || tx.status === 'RECEBIDO';
                  
                  const catDetails = getCategoryDetails(tx.categoria, tx.tipo);
                  const CatIcon = catDetails.icon;

                  return (
                    <div 
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="flex items-center justify-between p-3.5 rounded-[20px] bg-slate-900 border border-slate-800/80 hover:bg-slate-850/80 active:scale-98 transition-all cursor-pointer group"
                    >
                      {/* Left: Icon and info */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${catDetails.bg} flex items-center justify-center text-sm shadow-sm`}>
                          <CatIcon size={18} className="stroke-[2.5]" />
                        </div>

                        {/* Mid: Description, Category and Date */}
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-extrabold text-white group-hover:text-purple-300 transition-colors line-clamp-1 max-w-[150px]">
                            {tx.descricao}
                          </span>
                          
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {activeDate.split('-')[2]} Ago • {tx.categoria}
                            </span>
                            {isPostponed && (
                              <span className="text-[8px] text-slate-500 font-bold line-through">
                                ({tx.data.split('-')[2]} Ago)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Value and Badge status */}
                      <div className="flex items-center gap-2.5">
                        <div className="text-right flex flex-col items-end">
                          <span className={`text-sm font-black font-mono tracking-tight ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isEntrada ? '+' : '-'} {formatCurrency(tx.valor)}
                          </span>
                          {!!tx.juros && tx.juros > 0 && (
                            <span className="block text-[8px] text-rose-400 font-bold">
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
                          className="hover:scale-105 active:scale-95 transition-transform relative group/badge flex items-center justify-center cursor-pointer"
                        >
                          {getStatusBadge(tx)}
                          <div className="absolute inset-0 bg-slate-900 opacity-0 group-hover/badge:opacity-100 flex items-center justify-center rounded-full transition-opacity border border-slate-700">
                            {isPaid ? (
                              <Clock size={11} className="text-slate-400" />
                            ) : (
                              <Check size={11} className="text-emerald-400 font-bold" />
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
