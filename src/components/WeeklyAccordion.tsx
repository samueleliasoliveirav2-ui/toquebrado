import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  Pencil,
  FileText,
  CreditCard as CardIcon,
  Wallet
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
  const [popoverTxId, setPopoverTxId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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

  const formatDateLong = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getStatusLabel = (tx: Transaction): { label: string; color: string; bg: string; border: string } => {
    switch (tx.status) {
      case 'RECEBIDO':
        return { label: 'Recebido', color: 'text-emerald-700', bg: 'bg-emerald-500/12', border: 'border-emerald-500/20' };
      case 'PAGO':
        return { label: 'Pago', color: 'text-emerald-700', bg: 'bg-emerald-500/12', border: 'border-emerald-500/20' };
      case 'POSTERGAR':
        return { label: 'Postergado', color: 'text-orange-700', bg: 'bg-orange-500/12', border: 'border-orange-500/20' };
      default:
        return { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-500/12', border: 'border-amber-500/20' };
    }
  };

  const openTxPopover = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const btnEl = (e.currentTarget as HTMLButtonElement);
    iconRefs.current[tx.id] = btnEl;

    const rect = btnEl.getBoundingClientRect();
    // Posicionamento responsivo: mobile centralizado, desktop perto do ícone
    const isMobile = window.innerWidth < 640;
    let left: number;
    let top: number;

    if (isMobile) {
      const vw = window.innerWidth;
      left = Math.max(16, Math.min(rect.left - 10, vw - 360)); // nunca passa da borda
      top = Math.max(16, rect.bottom + 10);
      // Se transbordar a viewport na parte de baixo, abre ACIMA
      if (top + 380 > window.innerHeight) {
        top = Math.max(16, rect.top - 400);
      }
    } else {
      left = Math.max(16, Math.min(rect.right + 12, window.innerWidth - 380));
      top = Math.max(16, Math.min(rect.top - 10, window.innerHeight - 410));
    }

    setPopoverPos({ top, left });
    setPopoverTxId(tx.id);
  };

  const closeTxPopover = () => {
    setPopoverTxId(null);
    setPopoverPos(null);
  };

  // Click-outside fecha o popover
  useEffect(() => {
    if (!popoverTxId) return;
    const onDocClick = (ev: MouseEvent) => {
      const btn = popoverTxId ? iconRefs.current[popoverTxId] : null;
      if (btn && btn.contains(ev.target as Node)) return; // clicou novamente no ícone: handler do botao vai alternar
      const popEl = document.getElementById('tx-details-popover');
      if (popEl && popEl.contains(ev.target as Node)) return;
      closeTxPopover();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [popoverTxId]);

  const getTxPopoverData = (tx: Transaction) => {
    const isEntrada = tx.tipo === 'ENTRADA';
    const accountName = tx.contaId
      ? (_accounts.find(a => a.id === tx.contaId)?.nome || 'Conta / Carteira')
      : (tx.cartaoId
        ? `Cartão de Crédito`
        : 'Não informado');
    const formaPagLabel = tx.cartaoId ? 'Cartão de Crédito' : (tx.contaId ? 'Conta / PIX / Dinheiro' : '—');
    const dataLabel = (() => {
      const st = getStatusLabel(tx);
      if (tx.status === 'PAGO' || tx.status === 'RECEBIDO') return `💰 ${st.label} em ${formatDateLong(tx.data)}`;
      if (tx.status === 'POSTERGAR' && tx.dataPostergar) return `⏳ Pago em ${formatDateLong(tx.dataPostergar)} (postergado)`;
      return `📅 Vence em ${formatDateLong(tx.data)}`;
    })();
    const observacoes = (tx as any).observacao || 'Sem observações cadastradas.';

    return {
      isEntrada,
      accountName,
      formaPagLabel,
      dataLabel,
      observacoes,
      statusInfo: getStatusLabel(tx),
      totalParcelas: tx.totalParcelas,
      parcelaAtual: tx.parcelaAtual,
      frequencia: tx.frequencia
    };
  };

  const popoverTx = popoverTxId ? transactions.find(t => t.id === popoverTxId) || null : null;

  const getStatusBadge = (tx: Transaction) => {
    switch (tx.status) {
      case 'RECEBIDO':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            RECEBIDO
          </span>
        );
      case 'PAGO':
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shadow-2xs">
            <span className="w-1 h-1 rounded-full bg-amber-500" />
            PAGO
          </span>
        );
      case 'POSTERGAR':
        const postDate = tx.dataPostergar 
          ? tx.dataPostergar.split('-').reverse().slice(0, 2).join('/')
          : '';
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex flex-col items-center shadow-2xs">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-sky-500" />
              POSTERGADO
            </span>
            {postDate && <span className="text-[7px] text-sky-600 font-bold">p/ {postDate}</span>}
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-500" />
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
    <div className="w-full space-y-4 animate-fade-in text-left">
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
                  
                  const catDetails = getCategoryDetails(tx.categoria, tx.tipo);
                  const CatIcon = catDetails.icon;

                  return (
                    <div 
                      key={tx.id}
                      onClick={() => onEditTransaction(tx)}
                      className="flex items-center justify-between p-3.5 rounded-[20px] bg-white border border-slate-200 hover:bg-slate-50 active:scale-98 transition-all cursor-pointer group"
                    >
                      {/* Left: Icon and info */}
                      <div className="flex items-center gap-3">
                        {/* 🔘 ÍCONE DA CATEGORIA → AGORA É BOTÃO INTERATIVO (POPOVER DETALHES) */}
                        <button
                          type="button"
                          onClick={(e) => openTxPopover(tx, e)}
                          className={`relative w-10 h-10 rounded-2xl ${catDetails.bg} flex items-center justify-center text-sm shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer ring-0 hover:ring-2 hover:ring-slate-900/10 ring-offset-2 z-[1]`}
                          aria-label="Ver detalhes da transação"
                          title="Ver detalhes da transação"
                        >
                          <CatIcon size={18} className="stroke-[2.5]" />
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-slate-800 border border-white animate-pulse" aria-hidden />
                        </button>

                        {/* Mid: Description, Category and Date */}
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1 max-w-[150px]">
                            {tx.descricao}
                          </span>
                          
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-medium">
                              {activeDate.split('-')[2]} Ago • {tx.categoria}
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
                      <div className="flex items-center gap-2.5">
                        <div className="text-right flex flex-col items-end">
                          <span className={`text-sm font-black font-mono tracking-tight ${isEntrada ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isEntrada ? '+' : '-'} {formatCurrency(tx.valor)}
                          </span>
                          {!!tx.juros && tx.juros > 0 && (
                            <span className="block text-[8px] text-rose-600 font-bold">
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
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      {/* ====== POPOVER DETALHES DA TRANSAÇÃO (React Portal) ====== */}
      {popoverTx && popoverPos && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[120] animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) closeTxPopover(); }}>
            <div
              id="tx-details-popover"
              className="fixed w-[340px] max-w-[92vw] rounded-3xl shadow-2xl shadow-slate-900/30 overflow-hidden animate-pop-in origin-top-left backdrop-blur-2xl bg-white/85 border border-white/70 ring-1 ring-slate-900/5"
              style={{ top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }}
            >
              {(() => {
                const data = getTxPopoverData(popoverTx);
                const statusInfo = getStatusLabel(popoverTx);
                const catDt = getCategoryDetails(popoverTx.categoria, popoverTx.tipo);
                const CIcon = catDt.icon;
                return (
                  <>
                    {/* =========== HEADER CATEGORIA =========== */}
                    <div className={`px-4 py-3.5 flex items-center justify-between relative overflow-hidden ${catDt.bg}`}>
                      {/* Glow acento */}
                      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/50 filter blur-2xl" />
                      <div className="flex items-center gap-3 relative">
                        <div className={`w-11 h-11 rounded-2xl bg-white/90 border border-white shadow-md flex items-center justify-center ${catDt.iconColor}`}>
                          <CIcon size={20} className="stroke-[2.5]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Categoria</span>
                          <span className={`text-[13px] font-extrabold ${data.isEntrada ? 'text-emerald-800' : 'text-slate-800'}`}>
                            {popoverTx.categoria}
                          </span>
                        </div>
                      </div>
                      {/* Status Pill + X fecha */}
                      <div className="flex items-center gap-1.5 relative">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-wide border ${statusInfo.color} ${statusInfo.bg} ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); closeTxPopover(); }}
                          className="w-7 h-7 rounded-xl bg-white/80 hover:bg-white border border-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm"
                          aria-label="Fechar detalhes"
                        >
                          <X size={14} className="stroke-[3]" />
                        </button>
                      </div>
                    </div>

                    {/* =========== CORPO INFORMAÇÕES =========== */}
                    <div className="px-4 py-4 space-y-3.5">
                      {/* Descrição Completa */}
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                          <FileText size={11} /> Descrição Completa
                        </label>
                        <p className="text-[14px] leading-snug font-bold text-slate-800 break-words w-full">
                          {popoverTx.descricao}
                        </p>
                        {(popoverTx.frequencia && (popoverTx.frequencia !== 'AVULSO')) && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[9.5px] font-black px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                            {popoverTx.frequencia === 'PARCELADO'
                              ? `📅 Parcelado · ${popoverTx.parcelaAtual || 1}ª de ${popoverTx.totalParcelas || popoverTx.parcelaAtual}x`
                              : `🔁 Recorrente · ${popoverTx.periodicidade ? popoverTx.periodicidade[0].toUpperCase() + popoverTx.periodicidade.slice(1).toLowerCase() : 'Mensal'}`}
                          </span>
                        )}
                      </div>

                      <div className="h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" />

                      {/* Conta / Forma de Pagamento */}
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                          {popoverTx.cartaoId ? <CardIcon size={11} /> : <Wallet size={11} />} Conta / Forma de Pagamento
                        </label>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm">
                            {popoverTx.cartaoId ? <CardIcon size={14} /> : <Wallet size={14} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12.5px] font-extrabold text-slate-800">{data.accountName}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{data.formaPagLabel}</span>
                          </div>
                        </div>
                      </div>

                      {/* Data Pagamento / Vencimento */}
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                          <Calendar size={11} /> {popoverTx.status === 'PAGO' || popoverTx.status === 'RECEBIDO' ? 'Data de Pagamento' : popoverTx.status === 'POSTERGAR' ? 'Data Pós-adiada' : 'Data de Vencimento'}
                        </label>
                        <div className={`flex items-start gap-2 px-3 py-2 rounded-2xl border ${statusInfo.border} ${statusInfo.bg}`}>
                          <span className={`text-[13px] font-black leading-tight ${statusInfo.color}`}>
                            {data.dataLabel}
                          </span>
                        </div>
                      </div>

                      {/* Observações / Anotações */}
                      <div className="space-y-1.5">
                        <label className="text-[9.5px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1">
                          <AlertCircle size={11} /> Observações
                        </label>
                        <div className={`px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50/70 ${data.observacoes === 'Sem observações cadastradas.' ? 'italic opacity-75' : ''}`}>
                          <span className="text-[11.5px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap break-words">
                            {data.observacoes}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* =========== RODAPÉ: AÇÃO EDITAR =========== */}
                    <div className="px-4 py-3 border-t border-slate-200/60 bg-gradient-to-b from-white/40 to-white/90">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTxPopover();
                          setTimeout(() => onEditTransaction(popoverTx), 120);
                        }}
                        className="w-full py-2.5 rounded-2xl font-extrabold text-[11.5px] tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer
                                   bg-gradient-to-r from-[#0e69b2] to-[#094d80] hover:from-[#0c5b99] hover:to-[#073e67] text-white
                                   shadow-lg shadow-blue-700/25 hover:shadow-blue-700/35 active:scale-[0.98] ring-1 ring-blue-900/10"
                      >
                        <Pencil size={14} className="stroke-[2.5]" /> Editar Lançamento
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
