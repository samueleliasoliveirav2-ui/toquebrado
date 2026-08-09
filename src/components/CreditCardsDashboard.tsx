import React from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  DollarSign,
  Edit2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type {
  CreditCard as CreditCardType,
  CreditCardInvoice,
  Transaction,
  BankAccount
} from '../types';

interface CreditCardsDashboardProps {
  cards: CreditCardType[];
  invoices: CreditCardInvoice[];
  _transactions: Transaction[];
  _accounts: BankAccount[];
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  months: { key: string; label: string }[];
  onAddCard: () => void;
  onEditCard: (card: CreditCardType) => void;
  onViewInvoice: (card: CreditCardType) => void;
  onPayInvoice: (
    card: CreditCardType,
    invoice: CreditCardInvoice
  ) => void;
}

export const CreditCardsDashboard: React.FC<CreditCardsDashboardProps> = ({
  cards,
  invoices,
  selectedMonth,
  onMonthChange,
  months,
  onAddCard,
  onEditCard,
  onViewInvoice,
  onPayInvoice
}) => {
  const currentIndex = months.findIndex((m) => m.key === selectedMonth);

  const handlePrevMonth = () => {
    if (currentIndex > 0) {
      onMonthChange(months[currentIndex - 1].key);
    }
  };

  const handleNextMonth = () => {
    if (currentIndex < months.length - 1) {
      onMonthChange(months[currentIndex + 1].key);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const totalLimiteConsolidado = cards.reduce(
    (sum, card) => sum + Number(card.limiteTotal),
    0
  );

  const totalLimiteDisponivel = cards.reduce((sum, card) => {
    const invoiceAberta = invoices.find(
      (inv) => inv.cartaoId === card.id && inv.status === 'ABERTA'
    );
    const usado = invoiceAberta ? Number(invoiceAberta.valorTotal) : 0;
    return sum + (Number(card.limiteTotal) - usado);
  }, 0);

  const totalFaturaAtual = invoices
    .filter(
      (inv) =>
        inv.mesAno === selectedMonth &&
        (inv.status === 'ABERTA' || inv.status === 'FECHADA')
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
    <div className="w-full flex-1 flex flex-col p-4 space-y-5 bg-slate-50 overflow-y-auto pb-28 animate-fade-in font-sans">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#0e69b2]/10 text-[#0e69b2]">
            <CreditCard size={20} />
          </div>
          <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Cartões de Crédito
          </span>
        </div>
      </header>

      <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
        <button
          onClick={handlePrevMonth}
          disabled={currentIndex === 0}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-black text-[#0e69b2] uppercase tracking-wider select-none font-sans">
          {months[currentIndex]?.label}
        </span>
        <button
          onClick={handleNextMonth}
          disabled={currentIndex === months.length - 1}
          className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-3xs flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-[#0e69b2] mb-1">
            <CreditCard size={12} />
          </div>
          <span className="text-[8px] uppercase font-bold text-slate-500 leading-tight">
            Limite Total
          </span>
          <span className="text-[11px] font-black text-slate-800 mt-1 leading-tight">
            {formatCurrency(totalLimiteConsolidado)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-3xs flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
            <CheckCircle2 size={12} />
          </div>
          <span className="text-[8px] uppercase font-bold text-slate-500 leading-tight">
            Disponível
          </span>
          <span className="text-[11px] font-black text-emerald-700 mt-1 leading-tight">
            {formatCurrency(totalLimiteDisponivel)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-3xs flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-amber-600 mb-1">
            <DollarSign size={12} />
          </div>
          <span className="text-[8px] uppercase font-bold text-slate-500 leading-tight">
            Fatura Mês
          </span>
          <span className="text-[11px] font-black text-amber-700 mt-1 leading-tight">
            {formatCurrency(totalFaturaAtual)}
          </span>
        </div>
      </div>

      <button
        onClick={onAddCard}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0e69b2] hover:bg-[#0b5a9a] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
      >
        <Plus size={14} />
        Adicionar Cartão
      </button>

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
              const statusBadge = invoice
                ? getStatusBadge(invoice.status)
                : null;
              const barColor =
                limiteUsadoPct > 85
                  ? 'bg-rose-500'
                  : limiteUsadoPct > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              return (
                <div
                  key={card.id}
                  className="space-y-0 overflow-hidden rounded-2xl shadow-md border border-slate-200 bg-white"
                >
                  <div
                    className="p-4 relative overflow-hidden text-white"
                    style={{
                      background: `linear-gradient(135deg, ${card.cor} 0%, ${card.cor}dd 60%, ${card.cor}aa 100%)`
                    }}
                  >
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                    <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/5 blur-lg" />

                    <div className="relative flex items-start justify-between mb-6">
                      <div className="text-left">
                        <div className="flex items-center gap-1.5 mb-1 opacity-90">
                          <CreditCard size={14} />
                        </div>
                        <h4 className="text-sm font-black leading-none tracking-tight drop-shadow-sm">
                          {card.nome}
                        </h4>
                      </div>
                      <div
                        className={`bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-black text-white shrink-0 ${bandeira.style}`}
                      >
                        {bandeira.text}
                      </div>
                    </div>

                    <div className="relative space-y-2">
                      <div className="flex items-end justify-between">
                        <div className="text-left">
                          <span className="text-[8px] uppercase font-bold opacity-75 block leading-none">
                            Limite Total
                          </span>
                          <span className="text-[11px] font-black leading-tight">
                            {formatCurrency(Number(card.limiteTotal))}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] uppercase font-bold opacity-75 block leading-none">
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

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
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
                        disabled={!invoice || invoice.status === 'PAGA'}
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
