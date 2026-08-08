import React, { useState, useEffect } from 'react';
import { X, Check, Calendar } from 'lucide-react';
import type { WorkShiftEntry } from '../types';
import { ACTIVITIES, SHIFT_EXPENSE_CATEGORIES } from '../types';

interface WorkShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<WorkShiftEntry, 'id'> & { 
    id?: string;
    modoLancamento?: 'UNICO' | 'INDIVIDUAL';
  }) => void;
  onDelete?: (id: string) => void;
  editingEntry?: WorkShiftEntry | null;
}

export const WorkShiftModal: React.FC<WorkShiftModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingEntry
}) => {
  const [data, setData] = useState('');
  const [atividade, setAtividade] = useState('Motorista de App');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [categoria, setCategoria] = useState('Combustível');
  const [valor, setValor] = useState<number | ''>('');
  
  // New States for Event & app rules
  const [valorDiaria, setValorDiaria] = useState<number | ''>('');
  const [quantidadeDias, setQuantidadeDias] = useState<number>(1);
  const [modoLancamento, setModoLancamento] = useState<'UNICO' | 'INDIVIDUAL'>('UNICO');
  const [recebidoMesmoDia, setRecebidoMesmoDia] = useState<boolean>(true);
  const [dataRecebimento, setDataRecebimento] = useState<string>('');
  const [observacao, setObservacao] = useState('');

  // Sync state on open/edit
  useEffect(() => {
    if (editingEntry) {
      setData(editingEntry.data);
      setAtividade(editingEntry.atividade);
      setTipo(editingEntry.tipo);
      if (editingEntry.categoria) {
        setCategoria(editingEntry.categoria);
      }
      setValor(editingEntry.valor);
      setValorDiaria(editingEntry.valorDiaria || editingEntry.valor);
      setQuantidadeDias(editingEntry.quantidadeDias || 1);
      setRecebidoMesmoDia(editingEntry.status === 'RECEBIDO');
      setDataRecebimento(editingEntry.dataRecebimento || '');
      setObservacao(editingEntry.observacao || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setData(today);
      setAtividade('Motorista de App');
      setTipo('ENTRADA');
      setCategoria('Combustível');
      setValor('');
      setValorDiaria('');
      setQuantidadeDias(1);
      setModoLancamento('UNICO');
      setRecebidoMesmoDia(true); // Will sync based on activity below
      
      // Default forecast date to 15 days in the future
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + 15);
      setDataRecebimento(forecastDate.toISOString().split('T')[0]);
      
      setObservacao('');
    }
  }, [editingEntry, isOpen]);

  // Adjust defaults when activity changes
  useEffect(() => {
    if (!editingEntry && tipo === 'ENTRADA') {
      if (atividade === 'Evento') {
        setRecebidoMesmoDia(false);
      } else {
        setRecebidoMesmoDia(true);
      }
    }
  }, [atividade, tipo, editingEntry]);

  // Auto-calculate total value for display when editing is not active
  const calculatedTotal = tipo === 'ENTRADA' && atividade === 'Evento'
    ? (Number(valorDiaria || 0) * quantidadeDias)
    : Number(valor || 0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return alert('Selecione uma data');
    if (!atividade) return alert('Selecione uma atividade');
    
    let finalValor = 0;
    if (tipo === 'ENTRADA' && atividade === 'Evento') {
      if (!valorDiaria || Number(valorDiaria) <= 0) {
        return alert('Insira um valor de diária maior que zero');
      }
      if (quantidadeDias <= 0) {
        return alert('A quantidade de dias deve ser maior que zero');
      }
      finalValor = Number(valorDiaria) * quantidadeDias;
    } else {
      if (!valor || Number(valor) <= 0) {
        return alert('Insira um valor maior que zero');
      }
      finalValor = Number(valor);
    }

    if (!recebidoMesmoDia && !dataRecebimento) {
      return alert('Selecione uma data prevista para o recebimento');
    }

    const payload: Omit<WorkShiftEntry, 'id'> & { 
      id?: string;
      modoLancamento?: 'UNICO' | 'INDIVIDUAL';
    } = {
      data,
      atividade,
      tipo,
      categoria: tipo === 'SAIDA' ? categoria : undefined,
      valor: finalValor,
      valorDiaria: tipo === 'ENTRADA' && atividade === 'Evento' ? Number(valorDiaria) : undefined,
      quantidadeDias: tipo === 'ENTRADA' && atividade === 'Evento' ? quantidadeDias : undefined,
      status: tipo === 'ENTRADA' ? (recebidoMesmoDia ? 'RECEBIDO' : 'A_RECEBER') : 'RECEBIDO',
      dataRecebimento: (tipo === 'ENTRADA' && !recebidoMesmoDia) ? dataRecebimento : undefined,
      observacao: observacao.trim() || undefined,
      modoLancamento: !editingEntry && tipo === 'ENTRADA' && atividade === 'Evento' ? modoLancamento : undefined
    };

    if (editingEntry) {
      payload.id = editingEntry.id;
    }

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in">
      {/* Backdrop Click Dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white border-t border-slate-250 rounded-t-3xl shadow-2xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto">
        {/* Handle bar */}
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-6 cursor-pointer" onClick={onClose} />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-slate-800 font-sans uppercase tracking-wider">
            {editingEntry ? 'Editar Lançamento' : 'Lançar Ganho/Custo de Trabalho'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-650 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left">
          
          {/* Toggle Entrada (Ganho) / Saída (Custo) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTipo('ENTRADA')}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all duration-350 flex items-center justify-center gap-1.5 cursor-pointer ${
                tipo === 'ENTRADA'
                  ? 'bg-emerald-500/10 text-emerald-700 shadow-xs border border-emerald-250'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ganho / Diária
            </button>
            
            <button
              type="button"
              onClick={() => setTipo('SAIDA')}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all duration-350 flex items-center justify-center gap-1.5 cursor-pointer ${
                tipo === 'SAIDA'
                  ? 'bg-rose-500/10 text-rose-700 shadow-xs border border-rose-250'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Custo de Rua
            </button>
          </div>

          {/* Atividade & Data Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Atividade</label>
              <select
                value={atividade}
                onChange={(e) => setAtividade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer shadow-3xs"
              >
                {ACTIVITIES.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">
                {modoLancamento === 'INDIVIDUAL' && tipo === 'ENTRADA' && atividade === 'Evento' ? 'Data de Início' : 'Data'}
              </label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold shadow-3xs"
                required
              />
            </div>
          </div>

          {/* Conditional Input Layouts */}

          {/* 1. ENTRADA para EVENTO */}
          {tipo === 'ENTRADA' && atividade === 'Evento' ? (
            <div className="space-y-4 animate-fade-in bg-slate-50/50 p-4 border border-slate-200/50 rounded-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Valor da Diária</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={valorDiaria}
                      onChange={(e) => setValorDiaria(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-3xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Quantidade de Dias</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={quantidadeDias}
                    onChange={(e) => setQuantidadeDias(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-3xs"
                    required
                  />
                </div>
              </div>

              {/* Multi-day Creation Strategy (Only when creating new entry) */}
              {!editingEntry && quantidadeDias > 1 && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase">Como criar os lançamentos?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-650 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="modoLancamento"
                        checked={modoLancamento === 'UNICO'}
                        onChange={() => setModoLancamento('UNICO')}
                        className="text-[#0e69b2] focus:ring-0"
                      />
                      Lançamento Único
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-655 font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="modoLancamento"
                        checked={modoLancamento === 'INDIVIDUAL'}
                        onChange={() => setModoLancamento('INDIVIDUAL')}
                        className="text-[#0e69b2] focus:ring-0"
                      />
                      Dias Separados
                    </label>
                  </div>
                </div>
              )}

              {/* Total Calculation Display */}
              <div className="bg-white border border-slate-200/60 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Ganho Bruto Total:</span>
                <span className="font-extrabold text-emerald-600 text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedTotal)}
                </span>
              </div>
            </div>
          ) : tipo === 'ENTRADA' ? (
            /* 2. ENTRADA para UBER / OUTROS */
            <div className="animate-fade-in">
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Valor Total Ganho</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-xs text-slate-800 font-black focus:outline-none focus:border-blue-500 shadow-3xs"
                  required
                />
              </div>
            </div>
          ) : (
            /* 3. SAIDA (Custos) */
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Categoria de Custo</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer shadow-3xs"
                  >
                    {SHIFT_EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Valor do Custo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={valor}
                      onChange={(e) => setValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-850 font-black focus:outline-none focus:border-blue-500 shadow-3xs"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Status controls (Only for ENTRADA) */}
          {tipo === 'ENTRADA' && (
            <div className="bg-slate-50/50 p-3.5 border border-slate-200/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="text-xs font-extrabold text-slate-700">Recebido no mesmo dia?</p>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Define se o dinheiro já está na conta.</p>
                </div>
                
                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => setRecebidoMesmoDia(!recebidoMesmoDia)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                    recebidoMesmoDia ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                      recebidoMesmoDia ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Data de Previsão de Recebimento */}
              {!recebidoMesmoDia && (
                <div className="space-y-1 animate-fade-in border-t border-slate-200/50 pt-2.5">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1">
                    <Calendar size={11} />
                    Previsão de Recebimento (Vencimento)
                  </label>
                  <input
                    type="date"
                    value={dataRecebimento}
                    onChange={(e) => setDataRecebimento(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-3xs"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Observação */}
          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Observação / Detalhes</label>
            <input
              type="text"
              placeholder={tipo === 'SAIDA' ? 'Ex: Combustível Posto Shell' : 'Ex: Evento de Sábado, Turno da Noite'}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-blue-500 font-semibold shadow-3xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-2">
            {editingEntry && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza de que deseja deletar este lançamento de trabalho?')) {
                    onDelete(editingEntry.id);
                    onClose();
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-50 border border-rose-150 hover:bg-rose-100/50 text-rose-600 font-bold text-xs transition-all cursor-pointer"
              >
                Deletar
              </button>
            )}

            <button
              type="submit"
              className={`py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                editingEntry ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
              } ${editingEntry && onDelete ? 'flex-[2]' : 'w-full'}`}
            >
              <Check size={14} />
              {editingEntry ? 'Salvar Lançamento' : 'Confirmar Lançamento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
