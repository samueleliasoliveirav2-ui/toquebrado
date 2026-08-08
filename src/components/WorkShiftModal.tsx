import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { WorkShiftEntry } from '../types';
import { ACTIVITIES, SHIFT_EXPENSE_CATEGORIES } from '../types';

interface WorkShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<WorkShiftEntry, 'id'> & { id?: string }) => void;
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
      setObservacao(editingEntry.observacao || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setData(today);
      setAtividade('Motorista de App');
      setTipo('ENTRADA');
      setCategoria('Combustível');
      setValor('');
      setObservacao('');
    }
  }, [editingEntry, isOpen]);

  // Set default category if tipo switches to SAIDA
  useEffect(() => {
    if (tipo === 'SAIDA' && !categoria) {
      setCategoria('Combustível');
    }
  }, [tipo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return alert('Selecione uma data');
    if (!atividade) return alert('Selecione uma atividade');
    if (!valor || Number(valor) <= 0) return alert('Insira um valor maior que zero');

    const payload: Omit<WorkShiftEntry, 'id'> & { id?: string } = {
      data,
      atividade,
      tipo,
      categoria: tipo === 'SAIDA' ? categoria : undefined,
      valor: Number(valor),
      observacao: observacao.trim() || undefined
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
          <h3 className="text-lg font-extrabold text-slate-800">
            {editingEntry ? 'Editar Lançamento Diário' : 'Lançar Ganho/Custo de Trabalho'}
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-650 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          
          {/* Toggle Entrada (Ganho) / Saída (Custo) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTipo('ENTRADA')}
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all duration-350 flex items-center justify-center gap-1.5 ${
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
              className={`py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all duration-350 flex items-center justify-center gap-1.5 ${
                tipo === 'SAIDA'
                  ? 'bg-rose-500/10 text-rose-700 shadow-xs border border-rose-250'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Custo de Rua
            </button>
          </div>

          {/* Valor Input (Big layout) */}
          <div className="relative flex flex-col items-center py-1">
            <label className="text-slate-400 text-[10px] uppercase font-bold mb-1">Valor do Registro</label>
            <div className="flex items-center text-slate-800 font-extrabold text-2xl">
              <span className={`mr-1.5 text-xl ${tipo === 'SAIDA' ? 'text-rose-550' : 'text-emerald-550'}`}>R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="bg-transparent border-none focus:outline-none w-40 text-center font-extrabold text-slate-800 placeholder-slate-350"
                required
                autoFocus={!editingEntry}
              />
            </div>
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
              <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-semibold shadow-3xs"
                required
              />
            </div>
          </div>

          {/* Categoria do Custo (Saída only) */}
          {tipo === 'SAIDA' && (
            <div className="animate-fade-in">
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
          )}

          {/* Observação */}
          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Observação / Detalhes</label>
            <input
              type="text"
              placeholder="Ex: Combustível Posto Shell, Lanche de sábado..."
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
