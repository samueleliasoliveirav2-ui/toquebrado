import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag as TagIcon } from 'lucide-react';
import type { Category, CategoryType } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  defaultType?: CategoryType;  // Pré-seleciona ao criar NOVA categoria
  onSave: (payload: { name: string; type: CategoryType; subcategories: string[] }, existingId?: string) => Promise<boolean>;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  editingCategory,
  defaultType = 'EXPENSE',
  onSave
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingCategory) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setSubcategories([...editingCategory.subcategories]);
    } else {
      setName('');
      setType(defaultType || 'EXPENSE');
      setSubcategories([]);
    }
    setNewTagInput('');
    setSaving(false);
  }, [isOpen, editingCategory, defaultType]);

  if (!isOpen) return null;

  const addTag = () => {
    const value = newTagInput.trim();
    if (!value) return;
    if (subcategories.includes(value)) {
      setNewTagInput('');
      return;
    }
    setSubcategories(prev => [...prev, value]);
    setNewTagInput('');
  };

  const removeTag = (tag: string) => {
    setSubcategories(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const ok = await onSave(
        {
          name: name.trim(),
          type,
          subcategories: [...subcategories]
        },
        editingCategory?.id
      );
      if (ok !== false) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const typeBadge = (t: CategoryType, label: string, accent: string, ring: string) => {
    const active = type === t;
    return (
      <button
        type="button"
        onClick={() => setType(t)}
        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all border-2 cursor-pointer ${
          active
            ? `${accent} text-white border-transparent shadow-md scale-[1.02]`
            : `bg-slate-50 text-slate-500 ${ring} hover:bg-slate-100`
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center font-sans animate-fade-in">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:w-[480px] max-w-[95vw] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col animate-pop-in overflow-hidden">
        {/* ===== HEADER ===== */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
              editingCategory ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-600'
            }`}>
              <TagIcon size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">
                {editingCategory ? 'Editar' : 'Nova Categoria'}
              </p>
              <h3 className="text-sm font-black text-slate-800 leading-none">
                {editingCategory ? 'Atualizar Categoria' : 'Cadastrar Categoria'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto px-5 py-4.5 space-y-4">
          {/* ============ TIPO: INCOME / EXPENSE ============ */}
          <div className="space-y-2">
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-wider">
              Tipo da Categoria
            </label>
            <div className="grid grid-cols-2 gap-2">
              {typeBadge('INCOME', '🟢  Receita', 'bg-gradient-to-br from-emerald-500 to-teal-600', 'border-emerald-100')}
              {typeBadge('EXPENSE', '🔴  Despesa', 'bg-gradient-to-br from-rose-500 to-pink-600', 'border-rose-100')}
            </div>
          </div>

          {/* ============ NOME ============ */}
          <div className="space-y-2">
            <label className="block text-slate-500 text-[10px] font-black uppercase tracking-wider">
              Nome da Categoria
            </label>
            <input
              type="text"
              placeholder="Ex: Alimentação, Salário, Investimentos..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-bold shadow-2xs"
              required
              maxLength={40}
            />
          </div>

          {/* ============ SUBCATEGORIAS (CHIPS / TAGS) ============ */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-500 text-[10px] font-black uppercase tracking-wider">
                Subcategorias <span className="text-slate-300">(opcional)</span>
              </label>
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                {subcategories.length} adicionada{subcategories.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-stretch gap-2">
              <input
                type="text"
                placeholder="Digite o nome e pressione + (Ex: Restaurante, Uber)"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 text-xs font-semibold"
                maxLength={35}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition flex items-center justify-center cursor-pointer shadow-sm"
                title="Adicionar Subcategoria"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Lista de chips */}
            {subcategories.length === 0 ? (
              <div className="py-4 px-3 rounded-xl bg-slate-50/60 border border-dashed border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Nenhuma subcategoria cadastrada ainda.<br />
                  Clique em "+" para adicionar (ex: "Uber", "Restaurante").
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {subcategories.map((tag) => {
                  const bgClass =
                    type === 'INCOME'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/60'
                      : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100/60';
                  return (
                    <div
                      key={tag}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-black ${bgClass} transition-all`}
                    >
                      <span className="max-w-[170px] truncate">{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="p-0.5 rounded-full hover:bg-white/80 text-current/80 hover:text-current transition cursor-pointer"
                        title={`Excluir subcategoria "${tag}"`}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== FOOTER / SALVAR (sticky bottom dentro do scroll container) ===== */}
          <div className="mt-2 pt-4 border-t border-slate-100 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-black transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className={`flex-[1.4] py-3 rounded-xl text-white text-xs font-black transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer ${
                type === 'INCOME'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700'
              }`}
            >
              {saving ? 'Salvando...' : editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
