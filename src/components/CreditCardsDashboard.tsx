import React from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  DollarSign,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileUp,
  Wallet as WalletIcon,
  Sparkles,
  Menu,
  RefreshCw
} from 'lucide-react';
import type {
  CreditCard as CreditCardType,
  CreditCardInvoice,
  Transaction,
  BankAccount
} from '../types';
import { computeInvoiceDerivedStatus as _computeInvoiceStatus } from '../types';
import { BANK_PRESETS } from './CreditCardModal';
import { PillMonthPicker } from './PillMonthPicker';

const getCardPreset = (card: CreditCardType) => {
  if (card.banco && BANK_PRESETS[card.banco]) {
    return BANK_PRESETS[card.banco];
  }
  // Fallback: tenta detectar pelo nome para retrocompatibilidade
  const name = card.nome.toLowerCase();
  if (name.includes('itau') || name.includes('itaú')) return BANK_PRESETS['Itaú'];
  if (name.includes('nubank') || name.includes('roxo')) return BANK_PRESETS['Nubank'];
  if (name.includes('c6')) return BANK_PRESETS['C6 Bank'];
  if (name.includes('mercado pago') || name.includes('mercadopago')) return BANK_PRESETS['Mercado Pago'];
  if (name.includes('banco do brasil') || name.includes('bb ')) return BANK_PRESETS['Banco do Brasil'];
  if (name.includes('bradesco')) return BANK_PRESETS['Bradesco'];
  if (name.includes('santander')) return BANK_PRESETS['Santander'];
  if (name.includes('inter')) return BANK_PRESETS['Inter'];
  
  return { gradient: '', logo: '' };
};

interface CreditCardsDashboardProps {
  cards: CreditCardType[];
  invoices: CreditCardInvoice[];
  _transactions: Transaction[];
  _accounts: BankAccount[];
  selectedMonth: string;
  months: { key: string; label: string }[];
  onMonthChange: (m: string) => void;
  onOpenDrawer: () => void;
  isSyncing?: boolean;
  onAddCard: () => void;
  onEditCard: (card: CreditCardType) => void;
  onViewInvoice: (card: CreditCardType) => void;
  onPayInvoice: (
    card: CreditCardType,
    invoice: CreditCardInvoice
  ) => void;
  onImportPdfInvoice?: () => void;
  // ===== NOVO (v1.8.5): Lancamento MANUAL de despesa no cartao =======
  // Chamado quando usuario clica no FAB geral ou no botao [+ Lancar] do card.
  // Parametro card opcional: se vier do botao do card, passa o cartao para
  // o TransactionModal preencher automaticamente formaPagamento=CARTAO.
  onAddManualExpense?: (card?: CreditCardType) => void;
}

export const CreditCardsDashboard: React.FC<CreditCardsDashboardProps> = ({
  cards,
  invoices,
  selectedMonth,
  months,
  onMonthChange,
  onOpenDrawer,
  isSyncing,
  onAddCard,
  onEditCard,
  onViewInvoice,
  onPayInvoice,
  onImportPdfInvoice,
  onAddManualExpense // NOVO v1.8.5: callback lancamento manual
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const _hoje = new Date();
  const resolvedInvoiceStatus = (inv?: CreditCardInvoice) =>
    inv ? _computeInvoiceStatus(inv, _hoje) : 'ABERTA';

  const totalLimiteConsolidado = cards.reduce(
    (sum, card) => sum + Number(card.limiteTotal),
    0
  );

  const totalLimiteDisponivel = cards.reduce((sum, card) => {
    const invoiceAberta = invoices.find(
      (inv) => inv.cartaoId === card.id && inv.mesAno === selectedMonth &&
        (resolvedInvoiceStatus(inv) === 'ABERTA' || resolvedInvoiceStatus(inv) === 'FECHADA')
    );
    const usado = invoiceAberta ? Number(invoiceAberta.valorTotal) : 0;
    return sum + (Number(card.limiteTotal) - usado);
  }, 0);

  const totalFaturaAtual = invoices
    .filter(
      (inv) =>
        inv.mesAno === selectedMonth &&
        ['ABERTA', 'FECHADA', 'ATRASADA'].includes(resolvedInvoiceStatus(inv))
    )
    .reduce((sum, inv) => sum + Number(inv.valorTotal), 0);

  const getInvoiceForCard = (cardId: string) => {
    return invoices.find((inv) => inv.cartaoId === cardId && inv.mesAno === selectedMonth);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ABERTA':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          icon: <Clock size={10} />,
          label: 'ABERTA'
        };
      case 'FECHADA':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          icon: <AlertCircle size={10} />,
          label: 'FECHADA'
        };
      case 'PAGA':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          icon: <CheckCircle2 size={10} />,
          label: 'PAGA'
        };
      case 'ATRASADA':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          icon: <AlertCircle size={10} />,
          label: 'ATRASADA'
        };
      case 'POSTERGADA':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          icon: <Clock size={10} />,
          label: 'POSTERGADA'
        };
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          icon: <Clock size={10} />,
          label: status
        };
    }
  };

  const getBandeiraDisplay = (bandeira: string) => {
    switch (bandeira) {
      case 'VISA':
        return { text: 'VISA', style: 'italic tracking-wider' };
      case 'MASTERCARD':
        return { text: 'MC', style: 'font-black' };
      case 'ELO':
        return { text: 'ELO', style: 'font-black' };
      case 'AMEX':
        return { text: 'AMEX', style: 'font-black' };
      case 'HIPERCARD':
        return { text: 'HIPER', style: 'font-black text-[9px]' };
      case 'OUTROS':
        return { text: '•••', style: 'font-black' };
      default:
        return { text: bandeira, style: 'font-bold' };
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-28 animate-fade-in font-sans">

      <header className="sticky top-0 z-30 px-4 pt-4 pb-3 bg-gradient-to-b from-slate-50 via-slate-50/95 to-transparent backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onOpenDrawer}
            className="p-2 rounded-2xl bg-white border border-slate-200 shadow-xs hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shrink-0 w-[42px] h-[42px] flex items-center justify-center"
            title="Menu"
          >
            <Menu size={18} className="stroke-[2.5]" />
          </button>

          <div className="flex-1 max-w-[75%] mx-auto">
            <PillMonthPicker
              months={months}
              selectedMonth={selectedMonth}
              onChange={onMonthChange}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 min-w-[42px] justify-end">
            {isSyncing && (
              <RefreshCw size={13} className="animate-spin text-[#0e69b2]" />
            )}
            <button
              onClick={onAddCard}
              className="p-2 rounded-2xl bg-[#0e69b2]/10 hover:bg-[#0e69b2]/20 text-[#0e69b2] transition-all cursor-pointer shrink-0 w-[42px] h-[42px] flex items-center justify-center"
              title="Adicionar Cartão"
            >
              <Plus size={16} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col p-4 space-y-5">

      {/* KPIs Dark Glass */}
      <div className="space-y-3">
        {/* Linha 1 — Limite Consolidado (card destaque full width) */}
        <div className="relative overflow-hidden rounded-3xl p-5
                        bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950
                        border border-slate-800 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.7)]">
          <div className="absolute -right-14 -top-14 w-44 h-44 rounded-full bg-[#0e69b2]/20 blur-3xl" aria-hidden />
          <div className="absolute -left-14 bottom-0 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl" aria-hidden />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-slate-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-lg bg-[#0e69b2]/20 border border-[#0e69b2]/25 flex items-center justify-center">
                  <CreditCard size={12} className="stroke-[2.3] text-[#57a1d9]" />
                </span>
                Limite Total Consolidado
              </span>
              <span className="text-[26px] sm:text-[28px] font-black text-white tabular-nums tracking-tight truncate mt-1.5 leading-none">
                {formatCurrency(totalLimiteConsolidado)}
              </span>
              <span className="text-[10.5px] font-bold text-slate-400 mt-1">
                Soma dos limites de todos os cartões cadastrados
              </span>
            </div>
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0e69b2]/25 to-purple-500/20 border border-[#0e69b2]/30 flex items-center justify-center shadow-inner">
              <WalletIcon size={22} className="stroke-[2.2] text-sky-300" />
            </div>
          </div>

          {/* Barra de utilização visual */}
          {totalLimiteConsolidado > 0 && (
            <div className="relative z-10 mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-400 uppercase tracking-wider">Utilização</span>
                <span className="text-slate-200 tabular-nums">
                  {Math.round(Math.min(100, (totalFaturaAtual / totalLimiteConsolidado) * 100))}% usados
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0e69b2] via-sky-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.max(2, Math.min(100, (totalFaturaAtual / totalLimiteConsolidado) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Linha 2 — 2 colunas: Disponível e Fatura do Mês */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Disponível Total */}
          <div className="relative overflow-hidden rounded-2xl p-3.5 h-[112px] flex flex-col justify-between
                          bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950
                          border border-slate-800 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)]">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-emerald-500/12 blur-2xl" aria-hidden />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1">
                Disponível Total
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[7px] font-black leading-none">
                  OK
                </span>
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                <CheckCircle2 size={12} className="stroke-[2.5] text-emerald-400" />
              </div>
            </div>
            <div className="relative z-10 space-y-1">
              <span className="text-[16px] font-black truncate tabular-nums tracking-tight text-emerald-400">
                {formatCurrency(totalLimiteDisponivel)}
              </span>
              <p className="text-[9.5px] font-semibold text-slate-400 leading-snug">
                Limite liberado após faturas
              </p>
            </div>
          </div>

          {/* Fatura do Mês */}
          <div className="relative overflow-hidden rounded-2xl p-3.5 h-[112px] flex flex-col justify-between
                          bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950
                          border border-slate-800 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)]">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-amber-500/12 blur-2xl" aria-hidden />
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
                Fatura do Mês
                {(() => {
                  // status da fatura consolidada do mes
                  const ativas = invoices.filter(
                    inv => inv.mesAno === selectedMonth &&
                      ['ABERTA', 'FECHADA', 'ATRASADA'].includes(resolvedInvoiceStatus(inv))
                  );
                  const todosPagos = ativas.length > 0 && ativas.every(inv => resolvedInvoiceStatus(inv) === 'PAGA');
                  const temAtraso = ativas.some(inv => resolvedInvoiceStatus(inv) === 'ATRASADA');
                  let s: { label: string; cls: string } = { label: 'ABERTA', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/25' };
                  if (todosPagos) s = { label: 'PAGA', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/25' };
                  else if (temAtraso) s = { label: 'ATRASO', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/25' };
                  else if (ativas.some(inv => resolvedInvoiceStatus(inv) === 'FECHADA')) s = { label: 'FECHADA', cls: 'bg-sky-500/20 text-sky-400 border-sky-500/25' };
                  return (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[7px] font-black leading-none ${s.cls}`}>
                      {s.label}
                    </span>
                  );
                })()}
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-400/20 flex items-center justify-center">
                <Sparkles size={12} className="stroke-[2.5] text-amber-400" />
              </div>
            </div>
            <div className="relative z-10 space-y-1">
              <span className="text-[16px] font-black truncate tabular-nums tracking-tight text-amber-400">
                {formatCurrency(totalFaturaAtual)}
              </span>
              <p className="text-[9.5px] font-semibold text-slate-400 leading-snug">
                Soma das faturas do período
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botões de ação */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAddCard}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0e69b2] hover:bg-[#0b5a9a] text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus size={14} />
            Adicionar Cartão
          </button>
          <button
            onClick={onImportPdfInvoice}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer"
          >
            <FileUp size={14} />
            Importar Fatura (PDF)
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider text-left pl-1">
          Meus Cartões
        </h3>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-slate-200 rounded-3xl">
            <CreditCard className="text-slate-500 mb-3" size={32} />
            <p className="text-slate-700 text-xs font-bold">
              Nenhum cartão cadastrado.
            </p>
            <p className="text-slate-500 text-[10px] mt-1">
              Toque no botão acima para cadastrar seu primeiro cartão.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card) => {
              const invoice = getInvoiceForCard(card.id);
              const valorFatura = invoice ? Number(invoice.valorTotal) : 0;
              const limiteUsadoPct = Math.min(
                100,
                (valorFatura / Number(card.limiteTotal)) * 100
              );
              const bandeira = getBandeiraDisplay(card.bandeira);
              const invoiceResolvedStatus = invoice ? resolvedInvoiceStatus(invoice) : null;
              const statusBadge = invoiceResolvedStatus
                ? getStatusBadge(invoiceResolvedStatus)
                : null;
              const barColor =
                limiteUsadoPct > 85
                  ? 'bg-rose-500'
                  : limiteUsadoPct > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              const preset = getCardPreset(card);

              return (
                <div
                  key={card.id}
                  className="space-y-0 overflow-hidden rounded-2xl shadow-md border border-slate-200 bg-white"
                >
                  <div
                    className={`p-5 relative overflow-hidden text-white transition-all duration-300 ${preset.gradient ? `bg-gradient-to-br ${preset.gradient}` : ''}`}
                    style={{
                      background: preset.gradient ? undefined : `linear-gradient(135deg, ${card.cor} 0%, ${card.cor}dd 60%, ${card.cor}aa 100%)`
                    }}
                  >
                    <div className="absolute top-0 left-0 right-0 bottom-0 opacity-15 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)'
                      }}
                    />

                    <div className="relative flex items-start justify-between mb-8 z-10">
                      <div className="text-left">
                        {preset.logo ? (
                          <span className="text-xs font-black tracking-tight select-none font-sans bg-black/15 px-2.5 py-1 rounded-md border border-white/10">
                            {preset.logo}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 opacity-90">
                            <CreditCard size={14} />
                            <span className="text-xs font-bold leading-none tracking-tight">
                              {card.nome}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        className={`bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-black text-white shrink-0 ${bandeira.style}`}
                      >
                        {bandeira.text}
                      </div>
                    </div>

                    {preset.logo && (
                      <div className="relative z-10 mb-4 text-left">
                        <h4 className="text-sm font-black leading-none tracking-tight drop-shadow-sm">
                          {card.nome}
                        </h4>
                      </div>
                    )}

                    <div className="relative space-y-2 z-10">
                      <div className="flex items-end justify-between">
                        <div className="text-left">
                          <span className="text-[8px] uppercase font-bold opacity-75 block leading-none mb-1">
                            Limite Total
                          </span>
                          <span className="text-[11px] font-black leading-tight">
                            {formatCurrency(Number(card.limiteTotal))}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] uppercase font-bold opacity-75 block leading-none mb-1">
                            Disponível
                          </span>
                          <span className="text-[11px] font-black leading-tight">
                            {formatCurrency(
                              Number(card.limiteTotal) - valorFatura
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${limiteUsadoPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-3 bg-white text-left">
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 text-slate-600 font-bold">
                        <Calendar size={11} />
                        <span>Fecha: dia {card.diaFechamento}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 font-bold">
                        <DollarSign size={11} />
                        <span>Vence: dia {card.diaVencimento}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[8px] uppercase font-bold text-slate-500 block leading-none">
                          Fatura {selectedMonth}
                        </span>
                        <span className="text-sm font-black text-slate-800 leading-tight">
                          {formatCurrency(valorFatura)}
                        </span>
                      </div>
                      {statusBadge && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black ${statusBadge.bg} ${statusBadge.text}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        onClick={() => onViewInvoice(card)}
                        className="flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Eye size={11} />
                        Ver Fatura
                      </button>
                      <button
                        onClick={() => {
                          if (invoice) {
                            onPayInvoice(card, invoice);
                          }
                        }}
                        disabled={!invoice || resolvedInvoiceStatus(invoice) === 'PAGA'}
                        className="flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <DollarSign size={11} />
                        Pagar
                      </button>
                      <button
                        onClick={() => onEditCard(card)}
                        className="flex items-center justify-center gap-1 py-2 rounded-lg bg-[#0e69b2]/10 hover:bg-[#0e69b2]/20 text-[#0e69b2] text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Edit2 size={11} />
                        Editar
                      </button>
                      {/* ======== NOVO BOTAO 4: [+ Lancar] despesa no cartao (v1.8.5) ======== */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onAddManualExpense === 'function') {
                            onAddManualExpense(card);
                          }
                        }}
                        className="flex items-center justify-center gap-1 py-2 rounded-lg bg-amber-400/15 hover:bg-amber-400/30 text-amber-700 border border-amber-300/30 text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                        title="Lançar despesa manual neste cartão"
                      >
                        <Plus size={11} className="stroke-[2.8]" />
                        Lançar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>

      {/* ================================================================
           FAB (FLOATING ACTION BUTTON) LARANJA — LANCAR DESPESA MANUAL
           Padrão igual Dashboard (botão + no canto inferior direito)!
           v1.8.5: Usuário pediu LANÇAMENTO MANUAL na aba cartoes (nao tinha opcao!)
          ================================================================ */}
      {typeof onAddManualExpense === 'function' && (
        <button
          onClick={() => onAddManualExpense(undefined)}
          className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 active:scale-95 transition-all shadow-[0_12px_30px_-8px_rgba(251,146,60,0.65)] border border-orange-400/50 text-white flex items-center justify-center cursor-pointer group"
          title="Lançar despesa manual no cartão (sem precisar importar PDF)"
        >
          <Plus size={28} className="stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
        </button>
      )}

    </div>
  );
};
