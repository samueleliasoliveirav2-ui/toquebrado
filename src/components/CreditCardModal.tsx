import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard as CreditCardIcon, Palette, Calendar, Trash2 } from 'lucide-react';
import type { CreditCard, BandeiraCartao, BankAccount } from '../types';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Omit<CreditCard, 'id' | 'userId'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  editingCard?: CreditCard | null;
  accounts: BankAccount[];
}

const CORES_CARTAO = [
  '#0f172a',
  '#1e293b',
  '#8b5cf6',
  '#ec4899',
  '#dc2626',
  '#f97316',
  '#0ea5e9',
  '#10b981'
];

const BANDEIRAS: BandeiraCartao[] = ['VISA', 'MASTERCARD', 'ELO', 'AMEX', 'HIPERCARD', 'OUTROS'];

const BANDEIRA_LABELS: Record<BandeiraCartao, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  ELO: 'Elo',
  AMEX: 'American Express',
  HIPERCARD: 'Hipercard',
  OUTROS: 'Outros'
};

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingCard,
  accounts = []
}) => {
  const [nome, setNome] = useState('');
  const [bandeira, setBandeira] = useState<BandeiraCartao>('VISA');
  const [limiteTotal, setLimiteTotal] = useState<number | ''>('');
  const [diaFechamento, setDiaFechamento] = useState<number | ''>('');
  const [diaVencimento, setDiaVencimento] = useState<number | ''>('');
  const [cor, setCor] = useState(CORES_CARTAO[0]);
  const [contaPagamentoPadraoId, setContaPagamentoPadraoId] = useState<string>('');

  useEffect(() => {
    if (editingCard) {
      setNome(editingCard.nome);
      setBandeira(editingCard.bandeira);
      setLimiteTotal(editingCard.limiteTotal);
      setDiaFechamento(editingCard.diaFechamento);
      setDiaVencimento(editingCard.diaVencimento);
      setCor(editingCard.cor || CORES_CARTAO[0]);
      setContaPagamentoPadraoId(editingCard.contaPagamentoPadraoId || '');
    } else {
      setNome('');
      setBandeira('VISA');
      setLimiteTotal('');
      setDiaFechamento('');
      setDiaVencimento('');
      setCor(CORES_CARTAO[0]);
      setContaPagamentoPadraoId('');
    }
  }, [editingCard, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return alert('Insira o nome do cartão');
    if (!limiteTotal || Number(limiteTotal) <= 0) return alert('Insira um limite total maior que zero');
    if (!diaFechamento || Number(diaFechamento) < 1 || Number(diaFechamento) > 28) {
      return alert('O dia de fechamento deve estar entre 1 e 28');
    }
    if (!diaVencimento || Number(diaVencimento) < 1 || Number(diaVencimento) > 28) {
      return alert('O dia de vencimento deve estar entre 1 e 28');
    }
    if (!bandeira) return alert('Selecione uma bandeira');

    const payload: Omit<CreditCard, 'id' | 'userId'> & { id?: string } = {
      nome: nome.trim(),
      bandeira,
      limiteTotal: Number(limiteTotal),
      diaFechamento: Number(diaFechamento),
      diaVencimento: Number(diaVencimento),
      cor,
      contaPagamentoPadraoId: contaPagamentoPadraoId || undefined
    };

    if (editingCard) {
      payload.id = editingCard.id;
    }

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in font-sans">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white border-t border-slate-250 rounded-t-3xl shadow-2xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto">
        
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-6 cursor-pointer" onClick={onClose} />

        <div className="flex items-center justify-between mb-6">
          <div className="text-left">
            <h3 className="text-xl font-bold text-slate-800">
              {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="relative w-full aspect-[1.6/1] rounded-2xl p-5 mb-6 shadow-lg overflow-hidden"
          style={{ backgroundColor: cor }}
        >
          <div className="absolute top-0 left-0 right-0 bottom-0 opacity-20"
            style={{
              background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)'
            }}
          />
          
          <div className="relative z-10 flex flex-col justify-between h-full text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CreditCardIcon size={24} className="text-white/90" />
              </div>
              <div className="text-right">
                <span className="text-sm font-black tracking-wider uppercase text-white/95">
                  {BANDEIRA_LABELS[bandeira]}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                Nome do Cartão
              </p>
              <p className="text-lg font-extrabold tracking-wide truncate max-w-[85%]">
                {nome.trim() || 'Nome do Seu Cartão'}
              </p>
            </div>
            
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">
                  Limite Total
                </p>
                <p className="text-sm font-black">
                  R$ {limiteTotal !== '' ? Number(limiteTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                </p>
              </div>
              
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">
                    Fecha
                  </p>
                  <p className="text-sm font-black">
                    Dia {diaFechamento !== '' ? diaFechamento : '--'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-0.5">
                    Vence
                  </p>
                  <p className="text-sm font-black">
                    Dia {diaVencimento !== '' ? diaVencimento : '--'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5">Nome do Cartão</label>
            <input
              type="text"
              placeholder="Ex: Itaú Universo, Nubank Ultravioleta..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold shadow-2xs"
              required
              autoFocus={!editingCard}
            />
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5">Bandeira</label>
            <select
              value={bandeira}
              onChange={(e) => setBandeira(e.target.value as BandeiraCartao)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-semibold cursor-pointer shadow-2xs"
              required
            >
              {BANDEIRAS.map((b) => (
                <option key={b} value={b}>
                  {BANDEIRA_LABELS[b]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5">Limite Total</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={limiteTotal}
                onChange={(e) => setLimiteTotal(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold shadow-2xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar size={11} />
                Dia de Fechamento
              </label>
              <input
                type="number"
                min="1"
                max="28"
                placeholder="1-28"
                value={diaFechamento}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setDiaFechamento(val === '' ? '' : Math.max(1, Math.min(28, val || 1)));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5 flex items-center gap-1.5">
                <Calendar size={11} />
                Dia de Vencimento
              </label>
              <input
                type="number"
                min="1"
                max="28"
                placeholder="1-28"
                value={diaVencimento}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value);
                  setDiaVencimento(val === '' ? '' : Math.max(1, Math.min(28, val || 1)));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold shadow-2xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-2.5 flex items-center gap-1.5">
              <Palette size={11} />
              Cor do Cartão
            </label>
            <div className="grid grid-cols-8 gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
              {CORES_CARTAO.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`aspect-square rounded-full transition-all duration-200 cursor-pointer shadow-xs ${
                    cor === c
                      ? 'ring-4 ring-slate-700 ring-offset-2 ring-offset-white scale-110 shadow-md'
                      : 'ring-2 ring-white hover:scale-105 hover:shadow-sm'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {accounts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase">
                  Conta para Pagamento Padrão
                </label>
                <span className="text-[9px] text-slate-500 font-bold uppercase">Opcional</span>
              </div>
              <select
                value={contaPagamentoPadraoId}
                onChange={(e) => setContaPagamentoPadraoId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-semibold cursor-pointer shadow-2xs"
              >
                <option value="">Nenhuma conta selecionada</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nome} ({acc.tipoPessoa})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3 flex gap-2">
            {editingCard && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza de que deseja excluir este cartão?')) {
                    onDelete(editingCard.id);
                    onClose();
                  }
                }}
                className="flex-1 py-3.5 rounded-xl bg-rose-50 border border-rose-150 hover:bg-rose-100/50 text-rose-600 font-bold text-xs transition-all cursor-pointer animate-fade-in flex items-center justify-center gap-1.5"
              >
                <Trash2 size={15} />
                Excluir
              </button>
            )}

            <button
              type="submit"
              className={`py-3.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                editingCard ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'
              } ${editingCard && onDelete ? 'flex-[2]' : 'w-full'}`}
            >
              <Check size={16} />
              {editingCard ? 'Salvar Cartão' : 'Confirmar Cartão'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
