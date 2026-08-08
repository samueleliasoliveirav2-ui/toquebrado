import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { Transaction, TransactionType, TransactionStatus, BankAccount } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  editingTransaction?: Transaction | null;
  categoriesList: Record<TransactionType, string[]>;
  onAddNewCategory: (tipo: TransactionType, category: string) => void;
  accounts?: BankAccount[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTransaction,
  categoriesList,
  onAddNewCategory,
  accounts = []
}) => {
  const [tipo, setTipo] = useState<TransactionType>('SAIDA');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState<number | ''>('');
  const [data, setData] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('PENDENTE');
  const [dataPostergar, setDataPostergar] = useState('');
  const [juros, setJuros] = useState<number | ''>('');
  const [contaId, setContaId] = useState('');

  // Local state for dynamic category creation
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Pre-populate if editing
  useEffect(() => {
    if (editingTransaction) {
      setTipo(editingTransaction.tipo);
      setDescricao(editingTransaction.descricao);
      setCategoria(editingTransaction.categoria);
      setValor(editingTransaction.valor);
      setData(editingTransaction.data);
      setStatus(editingTransaction.status);
      setDataPostergar(editingTransaction.dataPostergar || '');
      setJuros(editingTransaction.juros || '');
      setContaId(editingTransaction.contaId || (accounts[0]?.id || ''));
      setIsAddingNew(false);
      setNewCategoryName('');
    } else {
      setTipo('SAIDA');
      setDescricao('');
      setCategoria('');
      setValor('');
      const today = new Date().toISOString().split('T')[0];
      setData(today);
      setStatus('PENDENTE');
      setDataPostergar('');
      setJuros('');
      setContaId(accounts[0]?.id || '');
      setIsAddingNew(false);
      setNewCategoryName('');
    }
  }, [editingTransaction, isOpen, accounts]);

  // Adjust categories list when tipo changes
  const availableCategories = categoriesList[tipo];
  useEffect(() => {
    if (!editingTransaction && availableCategories.length > 0 && !isAddingNew) {
      setCategoria(availableCategories[0]);
    }
  }, [tipo, editingTransaction, categoriesList, isAddingNew]);

  // Adjust status if invalid for the type
  useEffect(() => {
    if (tipo === 'ENTRADA' && status === 'PAGO') {
      setStatus('RECEBIDO');
    } else if (tipo === 'SAIDA' && status === 'RECEBIDO') {
      setStatus('PAGO');
    }
  }, [tipo]);

  if (!isOpen) return null;

  const handleCategoryChange = (val: string) => {
    if (val === 'ADD_NEW_CAT') {
      setIsAddingNew(true);
      setNewCategoryName('');
    } else {
      setIsAddingNew(false);
      setCategoria(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return alert('Insira uma descrição');
    if (!valor || Number(valor) <= 0) return alert('Insira um valor maior que zero');
    if (!data) return alert('Selecione uma data');
    if (status === 'POSTERGAR' && !dataPostergar) {
      return alert('Informe a data de postergação');
    }
    if (!contaId && accounts.length > 0) {
      return alert('Selecione uma conta ou carteira para esta movimentação');
    }

    let finalCategory = categoria;
    if (isAddingNew) {
      const trimmedNewCat = newCategoryName.trim();
      if (!trimmedNewCat) {
        return alert('Digite o nome da nova categoria');
      }
      onAddNewCategory(tipo, trimmedNewCat);
      finalCategory = trimmedNewCat;
    }

    if (!finalCategory) {
      return alert('Selecione ou cadastre uma categoria');
    }

    const payload: Omit<Transaction, 'id'> & { id?: string } = {
      tipo,
      descricao: descricao.trim(),
      categoria: finalCategory,
      valor: Number(valor),
      data,
      status,
      dataPostergar: status === 'POSTERGAR' ? dataPostergar : undefined,
      juros: tipo === 'SAIDA' && juros !== '' ? Number(juros) : undefined,
      contaId: contaId || undefined
    };

    if (editingTransaction) {
      payload.id = editingTransaction.id;
    }

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Bottom Sheet Container */}
      <div className="relative w-full max-w-md bg-white border-t border-slate-250 rounded-t-3xl shadow-2xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto">
        
        {/* Handle bar for native look */}
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-6 cursor-pointer" onClick={onClose} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800">
            {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-650 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* Toggle Entrada / Saída */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setTipo('SAIDA');
                setIsAddingNew(false);
              }}
              className={`py-3 px-4 rounded-xl font-extrabold text-sm transition-all duration-350 flex items-center justify-center gap-2 cursor-pointer ${
                tipo === 'SAIDA'
                  ? 'bg-rose-500/10 text-rose-700 shadow-xs border border-rose-250'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              Despesa
            </button>
            
            <button
              type="button"
              onClick={() => {
                setTipo('ENTRADA');
                setIsAddingNew(false);
              }}
              className={`py-3 px-4 rounded-xl font-extrabold text-sm transition-all duration-350 flex items-center justify-center gap-2 cursor-pointer ${
                tipo === 'ENTRADA'
                  ? 'bg-emerald-500/10 text-emerald-700 shadow-xs border border-emerald-250'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Receita
            </button>
          </div>

          {/* Amount input in big font */}
          <div className="flex flex-col items-center justify-center py-2 border-y border-slate-100">
            <label className="text-slate-400 text-xs uppercase font-bold mb-1">Valor do Lançamento</label>
            <div className="flex items-center text-slate-800 font-extrabold text-3xl">
              <span className={`mr-1.5 text-2xl ${tipo === 'SAIDA' ? 'text-rose-550' : 'text-emerald-550'}`}>R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="bg-transparent border-none focus:outline-none w-44 text-center font-extrabold text-slate-800 placeholder-slate-350"
                required
                autoFocus={!editingTransaction}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Descrição</label>
            <input
              type="text"
              placeholder="Ex: Uber, Supermercado, Pró-labore..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold shadow-2xs"
              required
            />
          </div>

          {/* Conta / Carteira Selector */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Conta / Carteira</label>
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-semibold cursor-pointer shadow-2xs"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nome} ({acc.tipoPessoa})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Categoria & Data Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Categoria</label>
              <select
                value={isAddingNew ? 'ADD_NEW_CAT' : categoria}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-semibold cursor-pointer shadow-2xs"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="ADD_NEW_CAT">+ Cadastrar Nova...</option>
              </select>

              {/* Dynamic Sub-Input to Register New Category */}
              {isAddingNew && (
                <div className="mt-2.5 space-y-1 animate-fade-in">
                  <label className="block text-slate-400 text-[9px] font-bold uppercase">Nome da Nova Categoria</label>
                  <input
                    type="text"
                    placeholder="Nova categoria..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-3xs"
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-semibold shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('PENDENTE')}
                className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                  status === 'PENDENTE'
                    ? 'bg-slate-200 text-slate-800 border-slate-350 shadow-2xs font-extrabold'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                }`}
              >
                Pendente
              </button>

              {tipo === 'ENTRADA' ? (
                <button
                  type="button"
                  onClick={() => setStatus('RECEBIDO')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    status === 'RECEBIDO'
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300 shadow-2xs font-extrabold'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                >
                  Recebido
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatus('PAGO')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    status === 'PAGO'
                      ? 'bg-amber-500/10 text-amber-700 border-amber-300 shadow-2xs font-extrabold'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                >
                  Pago
                </button>
              )}

              <button
                type="button"
                onClick={() => setStatus('POSTERGAR')}
                className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                  status === 'POSTERGAR'
                    ? 'bg-sky-500/10 text-sky-700 border-sky-300 shadow-2xs font-extrabold'
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                }`}
              >
                Postergar
              </button>
            </div>
          </div>

          {/* Conditional Input: Postergar Date */}
          {status === 'POSTERGAR' && (
            <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl space-y-1.5 animate-fade-in shadow-2xs">
              <label className="block text-sky-700 text-xs font-bold uppercase">Nova Data de Vencimento</label>
              <input
                type="date"
                value={dataPostergar}
                onChange={(e) => setDataPostergar(e.target.value)}
                className="w-full bg-white border border-sky-200 rounded-lg px-3 py-2 text-slate-800 text-sm font-semibold focus:outline-none focus:border-sky-500"
                required
              />
              <p className="text-[10px] text-sky-600 font-medium">O lançamento será planejado para a semana correspondente à nova data.</p>
            </div>
          )}

          {/* Conditional Input: Juros (Expenses Only) */}
          {tipo === 'SAIDA' && (
            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-slate-500 text-xs font-bold uppercase">Juros / Multa por Atraso</label>
                <span className="text-[10px] text-slate-400 font-bold">Opcional</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-450">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={juros}
                  onChange={(e) => setJuros(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Os juros acumulados serão adicionados ao total pago da despesa.</p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 flex gap-2">
            {editingTransaction && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza de que deseja deletar este lançamento?')) {
                    onDelete(editingTransaction.id);
                    onClose();
                  }
                }}
                className="flex-1 py-3.5 rounded-xl bg-rose-50 border border-rose-150 hover:bg-rose-100/50 text-rose-600 font-bold text-xs transition-all cursor-pointer"
              >
                Excluir
              </button>
            )}

            <button
              type="submit"
              className={`py-3.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                editingTransaction ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'
              } ${editingTransaction && onDelete ? 'flex-[2]' : 'w-full'}`}
            >
              <Check size={16} />
              {editingTransaction ? 'Salvar Lançamento' : 'Confirmar Lançamento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
