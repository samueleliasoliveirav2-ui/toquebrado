import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingCart,
  ArrowDownUp,
  Wallet
} from 'lucide-react';
import type {
  CreditCard,
  CreditCardInvoice,
  Transaction,
  BankAccount
} from '../types';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: CreditCard | null;
  invoice: CreditCardInvoice | null;
  transactions: Transaction[];
  accounts: BankAccount[];
  selectedMonth: string;
  months: { key: string; label: string }[];
  onMonthChange: (m: string) => void;
  onPayInvoice: (invoiceId: string, accountId: string, valorPago: number) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  card,
  invoice,
  transactions,
  accounts,
  selectedMonth,
  months,
  onMonthChange,
  onPayInvoice
}) => {
  const [showPayForm, setShowPayForm] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentValue, setPaymentValue] = useState<number | ''>('');

  if (!isOpen || !card || !invoice) return null;

  const saldoFatura = invoice.valorTotal - (invoice.valorPago || 0);
  const currentMonthIndex = months.findIndex((m) => m.key === selectedMonth);
  const currentMonthLabel = months.find((m) => m.key === selectedMonth)?.label || '';

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ABERTA':
        return {
          label: 'Aberta',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: Clock,
          iconBg: 'bg-blue-500',
          bigBg: 'bg-blue-500/10',
          bigText: 'text-blue-700',
          bigBorder: 'border-blue-200'
        };
      case 'FECHADA':
        return {
          label: 'Fechada',
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          icon: AlertCircle,
          iconBg: 'bg-amber-500',
          bigBg: 'bg-amber-500/10',
          bigText: 'text-amber-700',
          bigBorder: 'border-amber-200'
        };
      case 'PAGA':
        return {
          label: 'Paga',
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: CheckCircle2,
          iconBg: 'bg-emerald-500',
          bigBg: 'bg-emerald-500/10',
          bigText: 'text-emerald-700',
          bigBorder: 'border-emerald-200'
        };
      case 'ATRASADA':
        return {
          label: 'Atrasada',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          icon: AlertCircle,
          iconBg: 'bg-rose-500',
          bigBg: 'bg-rose-500/10',
          bigText: 'text-rose-700',
          bigBorder: 'border-rose-200'
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
          icon: Clock,
          iconBg: 'bg-slate-500',
          bigBg: 'bg-slate-500/10',
          bigText: 'text-slate-700',
          bigBorder: 'border-slate-200'
        };
    }
  };

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      onMonthChange(months[currentMonthIndex - 1].key);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < months.length - 1) {
      onMonthChange(months[currentMonthIndex + 1].key);
    }
  };

  const handleOpenPayForm = () => {
    setShowPayForm(true);
    setPaymentValue(saldoFatura);
    setPaymentAccountId(card.contaPagamentoPadraoId || accounts[0]?.id || '');
  };

  const handleConfirmPayment = () => {
    if (!paymentAccountId) {
      alert('Selecione uma conta para pagamento');
      return;
    }
    if (!paymentValue || Number(paymentValue) <= 0) {
      alert('Informe um valor válido');
      return;
    }
    onPayInvoice(invoice.id, paymentAccountId, Number(paymentValue));
    setShowPayForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in font-sans">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white border-t border-slate-250 rounded-t-3xl shadow-2xl z-10 animate-slide-up max-h-[95vh] overflow-hidden flex flex-col">
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mt-3 mb-2 cursor-pointer" onClick={onClose} />

        <div className="overflow-y-auto px-6 pb-6 flex-1">
          <div className="flex items-center justify-between mb-5 pt-2">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md text-white font-black text-lg"
                style={{ backgroundColor: card.cor }}
              >
                {card.nome.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-slate-800 leading-tight">{card.nome}</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.bandeira}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-5 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Datas da Fatura</p>
                <p className="text-xs font-bold text-slate-700">
                  Fechamento: {formatDate(invoice.dataFechamento)} • Vencimento: {formatDate(invoice.dataVencimento)}
                </p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
              <div className="flex items-center gap-1.5">
                <StatusIcon size={12} />
                {statusConfig.label}
              </div>
            </span>
          </div>

          <div className="flex items-center justify-between mb-5 gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={currentMonthIndex <= 0}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                currentMonthIndex <= 0
                  ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex-1 py-2.5 px-4 bg-slate-900 rounded-xl text-center shadow-md">
              <p className="text-xs font-black uppercase tracking-wider text-white">{currentMonthLabel}</p>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={currentMonthIndex >= months.length - 1}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                currentMonthIndex >= months.length - 1
                  ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingCart size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Compras</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-bold text-slate-500 mr-1">R$</span>
                <span className="text-xl font-black text-slate-800 tracking-tight">
                  {formatCurrency(invoice.valorTotal).replace('R$', '').trim()}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-150 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Valor Pago</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-bold text-emerald-400 mr-1">R$</span>
                <span className={`text-xl font-black tracking-tight ${invoice.valorPago ? 'text-emerald-700' : 'text-slate-300'}`}>
                  {formatCurrency(invoice.valorPago || 0).replace('R$', '').trim()}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-150 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowDownUp size={12} className="text-rose-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Saldo da Fatura</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm font-bold text-rose-400 mr-1">R$</span>
                <span className={`text-xl font-black tracking-tight ${saldoFatura > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatCurrency(Math.max(saldoFatura, 0)).replace('R$', '').trim()}
                </span>
              </div>
            </div>

            <div className={`${statusConfig.bigBg} border ${statusConfig.bigBorder} rounded-2xl p-4 shadow-2xs flex flex-col items-center justify-center`}>
              <div className={`w-9 h-9 rounded-full ${statusConfig.iconBg} flex items-center justify-center mb-2 shadow-md`}>
                <StatusIcon size={18} className="text-white" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusConfig.bigText}`}>
                Status
              </span>
              <span className={`text-sm font-black ${statusConfig.bigText} mt-0.5`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-slate-500" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Compras da Fatura
              </h4>
              <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[9px] font-black text-slate-500">
                {transactions.length}
              </span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                <ShoppingCart size={24} className="text-slate-350" />
              </div>
              <p className="text-sm font-bold text-slate-500 mb-1">Nenhuma compra nesta fatura</p>
              <p className="text-[11px] text-slate-400 font-semibold">
                As compras do cartão aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50/50 transition-all shadow-2xs"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-50 border border-rose-150 flex items-center justify-center">
                    <span className="text-[10px] font-black text-rose-600 leading-tight text-center">
                      {new Date(tx.data + 'T12:00:00').getDate().toString().padStart(2, '0')}
                      <br />
                      {(['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'])[new Date(tx.data + 'T12:00:00').getMonth()]}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[9px] font-black uppercase tracking-wider text-slate-500">
                        {tx.categoria}
                      </span>
                      {tx.totalParcelas && tx.totalParcelas > 1 && (
                        <span className="px-1.5 py-0.5 bg-blue-50 rounded-md text-[9px] font-black uppercase tracking-wider text-blue-600">
                          {tx.parcelaAtual || 1}/{tx.totalParcelas}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {tx.descricao}
                      {tx.totalParcelas && tx.totalParcelas > 1 && (
                        <span className="text-slate-400 ml-1">
                          ({tx.parcelaAtual || 1}/{tx.totalParcelas})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className="text-[10px] font-bold text-slate-400 block">R$</span>
                    <span className="text-base font-black text-rose-600 leading-tight">
                      {formatCurrency(tx.valor).replace('R$', '').trim()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invoice.status !== 'PAGA' && !showPayForm && (
            <button
              type="button"
              onClick={handleOpenPayForm}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Wallet size={18} />
              Pagar Fatura
            </button>
          )}

          {showPayForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm animate-fade-in mb-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={16} className="text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Pagamento da Fatura
                </h4>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Conta para Pagamento
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-bold cursor-pointer shadow-2xs"
                >
                  {accounts.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.nome} ({acc.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Valor do Pagamento
                  <span className="text-slate-400 font-semibold ml-1 normal-case tracking-normal">
                    (parcial permitido)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentValue}
                    onChange={(e) =>
                      setPaymentValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-right text-slate-800 font-black text-xl placeholder-slate-300 focus:outline-none focus:border-blue-500 shadow-2xs"
                    placeholder="0,00"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map((pct) => {
                    const val = (saldoFatura * pct) / 100;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPaymentValue(Number(val.toFixed(2)))}
                        className="flex-1 py-1.5 px-1 text-[10px] font-black rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPayForm(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
