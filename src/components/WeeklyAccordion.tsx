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
  CreditCard,
  Pencil,
  CreditCard as CardIcon,
  Wallet,
  Tag,
  FileText
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
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const toggleTxExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTxId(prev => (prev === id ? null : id));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const getTxExtraData = (tx: Transaction) => {
    const accountName = tx.contaId
      ? (_accounts.find(a => a.id === tx.contaId)?.nome || 'Conta / Carteira')
      : (tx.cartaoId ? 'Cartão de Crédito' : 'Não informada');
    const observacao = (tx as any).observacao || '';
    return { accountName, observacao };
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
        bg: 'bg-emerald-50 text-emerald-700',
        iconColor: 'text-emerald-600'
      };
    }
    
    if (cat.includes('supermercado') || cat.includes('aliment') || cat.includes('comida') || cat.includes('ifood') || cat.includes('restaurante')) {
      return { icon: ShoppingCart, bg: 'bg-rose-50 text-rose-700', iconColor: 'text-rose-600' };
    }
    if (cat.includes('transporte') || cat.includes('gasolina') || cat.includes('combustivel') || cat.includes('uber') || cat.includes('carro')) {
      return { icon: Car, bg: 'bg-amber-50 text-amber-700', iconColor: 'text-amber-600' };
    }
    if (cat.includes('assinatura') || cat.includes('lazer') || cat.includes('netflix') || cat.includes('spotify') || cat.includes('streaming') || cat.includes('tv')) {
      return { icon: Tv, bg: 'bg-blue-50 text-blue-700', iconColor: 'text-blue-600' };
    }
    if (cat.includes('saude') || cat.includes('dentista') || cat.includes('remedio') || cat.includes('farmacia') || cat.includes('drogaria')) {
      return { icon: Heart, bg: 'bg-red-50 text-red-700', iconColor: 'text-red-600' };
    }
    if (cat.includes('cartao') || cat.includes('fatura') || cat.includes('emprestimo')) {
      return { icon: CreditCard, bg: 'bg-blue-50 text-blue-700', iconColor: 'text-blue-600' };
    }
    return { icon: HelpCircle, bg: 'bg-slate-100 text-slate-600', iconColor: 'text-slate-600' };
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
      .filter(tx => tx.tipo === 'ENTRADA' && (
        tx.status === 'RECEBIDO'
        // WorkShift ENTRADA status mapeado como PENDENTE quando A_RECEBER.
        // SaldoSemana = saldo REAL (apenas recebido). WorkShift tem flag _isWorkShift.
        // Então para WorkShifts de entrada, RECEBIDO mapeia status RECEBIDO.
      ))
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
    const isWorkShift = (tx as any)._isWorkShift === true;
    const fsBadge = { fontSize: 'clamp(7px, 2.2vw, 9px)' };
    switch (tx.status) {
      case 'RECEBIDO':
        return (
          <span className="px-2 py-0.5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs whitespace-nowrap" style={fsBadge}>
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            RECEBIDO
          </span>
        );
      case 'PAGO':
        return (
          <span className="px-2 py-0.5 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shadow-2xs whitespace-nowrap" style={fsBadge}>
            <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
            {isWorkShift ? 'CUSTO PAGO' : 'PAGO'}
          </span>
        );
      case 'POSTERGAR':
        const postDate = tx.dataPostergar 
          ? tx.dataPostergar.split('-').reverse().slice(0, 2).join('/')
          : '';
        return (
          <span className="px-2 py-0.5 font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex flex-col items-center shadow-2xs whitespace-nowrap" style={fsBadge}>
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-sky-500 shrink-0" />
              POSTERGADO
            </span>
            {postDate && <span style={{ fontSize: 'clamp(6px,1.8vw,7px)' }} className="text-sky-600 font-bold">p/ {postDate}</span>}
          </span>
        );
      case 'PENDENTE':
      default:
        if (isWorkShift) {
          return (
            <span className="px-2 py-0.5 font-bold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center gap-1 shadow-2xs whitespace-nowrap" style={fsBadge}>
              <Clock size={8} className="stroke-[3] shrink-0" />
              A RECEBER
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 whitespace-nowrap" style={fsBadge}>
            <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
            PENDENTE
          </span>
        );
    }
  };

  if (weekGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 border border-slate-200 rounded-3xl">
        <AlertCircle className="text-slate-500 mb-3" size={32} />
        <p className="text-slate-700 text-sm font-semibold">Nenhum lançamento encontrado neste mês.</p>
        <p className="text-slate-500 text-xs mt-1">Toque no botão + acima para cadastrar uma receita ou despesa.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in text-left pb-28">
      {weekGroups.map((group) => {
        const isExpanded = expandedWeeks[group.key] !== false;
        const rangeStr = getWeekRange(group.key).formatted;
        const isPositive = group.saldoSemana >= 0;

        return (
          <div 
            key={group.key} 
            className="bg-white rounded-[28px] overflow-hidden border border-slate-200 transition-all duration-300 shadow-sm"
          >
            {/* Header Accordion */}
            <div 
              onClick={() => toggleExpand(group.key)}
              className="px-4 py-3.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none transition-colors border-b border-slate-100"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-800">{group.label}</span>
                  {group.label === 'Primeira Semana' && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 border border-blue-200 text-blue-700 rounded-full font-bold">Atual</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                  <Calendar size={10} className="text-slate-500" />
                  {rangeStr}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 block font-bold">Saldo</span>
                  <span className={`text-xs font-extrabold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(group.saldoSemana)}
                  </span>
                </div>
                <div className="p-1 rounded-lg text-slate-500">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
            </div>

            {/* List Drawer */}
            <div className={`transition-all duration-350 ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <div className="p-3 space-y-2 bg-slate-50 divide-y divide-slate-100">
                {group.transactions.map((tx) => {
                  const isEntrada = tx.tipo === 'ENTRADA';
                  const activeDate = getTransactionActiveDate(tx);
                  const isPostponed = tx.status === 'POSTERGAR' && tx.dataPostergar;
                  const isPaid = tx.status === 'PAGO' || tx.status === 'RECEBIDO';
                  // v1.7.7: WorkShifts aparecem na listagem, mas NAO abrem modal Transaction pessoal.
                  const isWorkShift = (tx as any)._isWorkShift === true;
                  // WorkShift SAIDA = custo rua sempre pago, nao faz toggle status.
                  // WorkShift SAIDA ou WorkShift RECEBIDO → não toggle (apenas WorkShift A_RECEBER/PENDENTE toggle).
                  const canToggleStatus = !isWorkShift || (
                    isEntrada && (tx.status === 'PENDENTE' || tx.status === 'RECEBIDO')
                  );
                  
                  const catDetails = getCategoryDetails(tx.categoria, tx.tipo);
                  const CatIcon = catDetails.icon;

                  const isExpandedTx = expandedTxId === tx.id;
                  const extraData = getTxExtraData(tx);

                  return (
                    <div 
                      key={tx.id}
                      className={`rounded-[20px] bg-white border border-slate-200 transition-all ${isExpandedTx ? 'ring-2 ring-blue-500/20 shadow-lg shadow-slate-900/10' : `hover:bg-slate-50 ${!isWorkShift ? 'active:scale-[0.995]' : ''}`}`}
                    >
                      {/* Top row / header do card transação */}
                      <div
                        onClick={() => {
                          // WorkShift: nao abre modal de Transaction pessoal.
                          if (isWorkShift) return;
                          onEditTransaction(tx);
                        }}
                        className={`flex flex-wrap items-start justify-between p-3 gap-x-3 gap-y-2 w-full ${isWorkShift ? '' : 'cursor-pointer'} group min-w-0`}
                      >
                        {/* Left: Icon and info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* 🔘 ÍCONE DA CATEGORIA → BOTÃO TOGGLE ACCORDION INLINE (clica expande/colapsa) */}
                          <button
                            type="button"
                            onClick={(e) => toggleTxExpand(tx.id, e)}
                            className={`relative w-10 h-10 shrink-0 rounded-2xl ${catDetails.bg} flex items-center justify-center text-sm shadow-sm transition-all cursor-pointer z-[1]
                                       ${isExpandedTx ? 'ring-2 ring-slate-900/15 ring-offset-1 scale-105' : 'hover:scale-105 active:scale-95 hover:ring-2 hover:ring-slate-900/10 ring-offset-2'}`}
                            aria-label={isExpandedTx ? 'Ocultar detalhes da transação' : 'Ver detalhes da transação'}
                            title={isExpandedTx ? 'Recolher detalhes' : 'Expandir detalhes'}
                          >
                            <CatIcon size={18} className="stroke-[2.5]" />
                            {/* Chevron indicador de expandido */}
                            <span className={`absolute -bottom-1.5 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center shadow-sm transition-all duration-300 ${isExpandedTx ? 'rotate-180 bg-blue-50 border-blue-200 text-blue-700' : ''}`}>
                              <ChevronDown size={9} className="stroke-[3]" />
                            </span>
                          </button>

                          {/* Mid: Description, Category and Date */}
                          <div className="flex flex-col text-left min-w-0 flex-1">
                            <span className="text-sm font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 min-w-0">
                              {tx.descricao}
                            </span>
                            
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap min-w-0">
                              <span className="text-[10px] text-slate-500 font-medium min-w-0 truncate">
                                {activeDate.split('-')[2]} Ago • {tx.categoria}
                                {tx.subcategory && (
                                  <span className="ml-1 inline-flex items-center gap-1 bg-indigo-100/70 text-indigo-800 px-1.5 py-0.5 rounded-full font-extrabold tracking-tight">
                                    › {tx.subcategory}
                                  </span>
                                )}
                              </span>
                              {isPostponed && (
                                <span className="text-[8px] text-slate-600 font-bold line-through">
                                  ({tx.data.split('-')[2]} Ago)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Value and Badge status */}
                        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 min-w-[100px] max-w-full">
                          <div className="text-right flex flex-col items-end min-w-0">
                            <span
                              className={`font-black font-mono tracking-tight ${isEntrada ? 'text-emerald-600' : 'text-rose-600'} whitespace-nowrap`}
                              style={{ fontSize: 'clamp(12px, 3.8vw, 14px)' }}
                            >
                              {isEntrada ? '+' : '-'} {formatCurrency(tx.valor)}
                            </span>
                            {!!tx.juros && tx.juros > 0 && (
                              <span
                                className="block text-rose-600 font-bold whitespace-nowrap"
                                style={{ fontSize: 'clamp(7px, 2vw, 8px)' }}
                              >
                                +{formatCurrency(tx.juros)} juros
                              </span>
                            )}
                          </div>

                          {/* Status Badge (with 1-click status change behavior) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!canToggleStatus) return;
                              onToggleStatus(tx.id);
                            }}
                            className={`transition-transform relative group/badge flex items-center justify-center shrink-0 ${canToggleStatus ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                          >
                            {getStatusBadge(tx)}
                            <div className="absolute inset-0 bg-white opacity-0 group-hover/badge:opacity-100 flex items-center justify-center rounded-full transition-opacity border border-slate-200">
                              {isPaid ? (
                                <Clock size={11} className="text-slate-500" />
                              ) : (
                                <Check size={11} className="text-emerald-600 font-bold" />
                              )}
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* ÁREA EXPANDÍVEL INLINE: detalhes rápidos (Accordion) */}
                      <div
                        className={`overflow-hidden transition-all duration-350 ease-out ${isExpandedTx ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <div className="px-3.5 pb-3.5">
                          <div className="pt-3 border-t border-slate-100 text-[11.5px] space-y-2.5">
                            {/* Descrição completa */}
                            <div className="flex items-start gap-2 pb-1.5 border-b border-dashed border-slate-100">
                              <FileText size={12} className="text-slate-400 shrink-0 mt-0.5" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <label className="text-[9.5px] font-black uppercase tracking-[0.15em] text-slate-400">Descrição</label>
                                <span className="text-[13px] font-extrabold text-slate-800 leading-snug mt-0.5 whitespace-pre-wrap break-words">
                                  {tx.descricao}
                                </span>
                              </div>
                            </div>

                            {/* Linha 1: Conta + Categoria */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Wallet size={12} className="text-slate-400 shrink-0" />
                                <span className="text-slate-500 font-bold shrink-0">Conta:</span>
                                <span className="text-slate-800 font-extrabold truncate">{extraData.accountName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Tag size={12} className="text-slate-400 shrink-0" />
                                <span className="text-slate-500 font-bold shrink-0">Categoria:</span>
                                <span className="text-slate-800 font-extrabold">{tx.categoria}</span>
                                {tx.subcategory && (
                                  <span className="ml-1 inline-flex items-center gap-0.5 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight border border-indigo-200/70">
                                    › {tx.subcategory}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Linha 2: Forma + Data */}
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <CardIcon size={12} className="text-slate-400 shrink-0" />
                                <span className="text-slate-500 font-bold shrink-0">Forma:</span>
                                <span className="text-slate-800 font-extrabold truncate">
                                  {tx.cartaoId ? 'Cartão de Crédito' : tx.contaId ? 'Conta / PIX / Dinheiro' : 'Não informado'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Calendar size={12} className="text-slate-400 shrink-0" />
                                <span className="text-slate-500 font-bold shrink-0">Data:</span>
                                <span className="text-slate-800 font-extrabold">
                                  {(() => {
                                    const d = (isPostponed && tx.dataPostergar) ? tx.dataPostergar : tx.data;
                                    const p = d.split('-');
                                    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
                                  })()}
                                </span>
                              </div>
                            </div>

                            {/* Observações (se existir) */}
                            {!!extraData.observacao && (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 italic">
                                <p className="text-[11px] text-slate-600 opacity-90 leading-relaxed whitespace-pre-wrap break-words">
                                  "{extraData.observacao}"
                                </p>
                              </div>
                            )}

                            {/* Botão Editar alinhado à direita */}
                            <div className="pt-1 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTxExpand(tx.id, e);
                                  setTimeout(() => onEditTransaction(tx), 120);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0e69b2] to-[#094d80] hover:from-[#0c5b99] hover:to-[#073e67] text-white text-[11px] font-black tracking-wide shadow-md shadow-blue-700/20 active:scale-95 transition-all cursor-pointer"
                              >
                                <Pencil size={12} className="stroke-[3]" /> Editar lançamento
                              </button>
                            </div>
                          </div>
                        </div>
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
