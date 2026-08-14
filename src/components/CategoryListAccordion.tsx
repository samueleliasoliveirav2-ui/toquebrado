import React, { useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, ChevronDown, FolderKanban, PlusCircle } from 'lucide-react';
import type { Category, CategoryType } from '../types';

interface CategoryListAccordionProps {
  categories: Category[];
  onNewCategory: (type: CategoryType) => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onAddSubcategory: (cat: Category) => void;
}

type Tab = 'INCOME' | 'EXPENSE';

export const CategoryListAccordion: React.FC<CategoryListAccordionProps> = ({
  categories = [],
  onNewCategory,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory
}) => {
  const [tab, setTab] = useState<Tab>('EXPENSE');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const items = useMemo(
    () => categories.filter(c => c.type === tab).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [categories, tab]
  );

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDeleteCategory(id);
    } finally {
      setDeletingId(null);
    }
  };

  const accent =
    tab === 'INCOME'
      ? {
          tabInactive: 'bg-slate-50 text-slate-500 border-slate-200',
          tabActive: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 border-transparent',
          chipColor: 'bg-emerald-500/12 text-emerald-700 border-emerald-100',
          headerBg: 'from-emerald-50 to-white hover:from-emerald-100/60',
          accentText: 'text-emerald-600',
          plusButton: 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
          plusSoft: 'bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/20 border border-emerald-500/10'
        }
      : {
          tabInactive: 'bg-slate-50 text-slate-500 border-slate-200',
          tabActive: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/20 border-transparent',
          chipColor: 'bg-rose-500/12 text-rose-700 border-rose-100',
          headerBg: 'from-rose-50 to-white hover:from-rose-100/60',
          accentText: 'text-rose-600',
          plusButton: 'bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700',
          plusSoft: 'bg-rose-500/12 text-rose-700 hover:bg-rose-500/20 border border-rose-500/10'
        };

  const tabIncomeActive = tab === 'INCOME';
  const tabExpenseActive = tab === 'EXPENSE';

  return (
    <div className="w-full flex flex-col font-sans">
      {/* ============ HEADER DA SEÇÃO: TÍTULO + NOVA CATEGORIA ============ */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/10 flex items-center justify-center shrink-0">
            <FolderKanban size={17} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 leading-none mb-1">
              Personalização do Plano de Contas
            </p>
            <h4 className="text-sm font-black text-slate-800 leading-tight truncate">
              Gerenciar Categorias
            </h4>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNewCategory(tab)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${accent.plusButton}`}
        >
          <PlusCircle size={14} />
          <span className="hidden sm:inline">Nova</span>
          <span className="inline sm:hidden">+</span>
        </button>
      </div>

      {/* ============ TABS RECEITAS / DESPESAS ============ */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab('INCOME')}
          className={`py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 cursor-pointer ${
            tabIncomeActive ? accent.tabActive : accent.tabInactive
          }`}
        >
          🟢 Receitas
        </button>
        <button
          type="button"
          onClick={() => setTab('EXPENSE')}
          className={`py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 cursor-pointer ${
            tabExpenseActive ? accent.tabActive : accent.tabInactive
          }`}
        >
          🔴 Despesas
        </button>
      </div>

      {/* ============ CONTADOR / RESUMO ============ */}
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-500">
          Total: <span className={`font-black ${accent.accentText}`}>{items.length}</span> categoria{items.length === 1 ? '' : 's'}
          {tab === 'EXPENSE' ? ' de despesa' : ' de receita'}
        </p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          Clique no nome para expandir subcategorias
        </p>
      </div>

      {/* ============ LISTA VAZIA ============ */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center">
          <div className={`w-12 h-12 rounded-2xl mb-3 flex items-center justify-center ${accent.plusSoft}`}>
            <FolderKanban size={22} />
          </div>
          <p className="text-xs font-black text-slate-700 mb-1">
            Nenhuma {tab === 'EXPENSE' ? 'despesa' : 'receita'} cadastrada
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mb-3.5 leading-relaxed max-w-[260px]">
            Clique em "Nova" acima para criar categorias personalizadas
            (ex: Alimentação, Salário, Uber, etc.)
          </p>
          <button
            type="button"
            onClick={() => onNewCategory(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${accent.plusButton}`}
          >
            <Plus size={14} />
            Criar primeira {tab === 'EXPENSE' ? 'despesa' : 'receita'}
          </button>
        </div>
      )}

      {/* ============ LISTA DE CATEGORIAS (ACCORDION) ============ */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {items.map((cat) => {
            const isOpen = expanded[cat.id] === true;
            const hasSub = cat.subcategories && cat.subcategories.length > 0;
            const isDeleting = deletingId === cat.id;

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border border-slate-150 bg-gradient-to-br ${accent.headerBg} transition-all overflow-hidden shadow-sm`}
              >
                {/* ===== HEADER / CABEÇALHO DA CATEGORIA ===== */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {/* Botão toggle expandir subcategorias */}
                  <button
                    type="button"
                    onClick={() => toggle(cat.id)}
                    className={`flex-1 min-w-0 flex items-center gap-2.5 cursor-pointer text-left`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${accent.plusSoft} transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    >
                      <ChevronDown size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] font-black truncate ${accent.accentText}`}>
                        {cat.name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                        {hasSub
                          ? `${cat.subcategories.length} subcategoria${cat.subcategories.length === 1 ? '' : 's'}`
                          : 'Sem subcategorias'}
                      </p>
                    </div>
                  </button>

                  {/* AÇÕES RÁPIDAS */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAddSubcategory(cat)}
                      className={`p-2 rounded-xl text-[10px] font-black uppercase tracking-wide flex items-center gap-1 transition cursor-pointer ${accent.plusSoft}`}
                      title={`Adicionar subcategoria em "${cat.name}"`}
                    >
                      <Plus size={12} />
                      <span className="hidden sm:inline">Sub</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditCategory(cat)}
                      className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-500/12 hover:text-blue-600 transition cursor-pointer"
                      title={`Editar categoria "${cat.name}"`}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={isDeleting}
                      className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-500/12 hover:text-rose-600 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title={`Excluir categoria "${cat.name}"`}
                    >
                      {isDeleting ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-rose-500/40 border-t-rose-600 animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* ===== CORPO / SUBCATEGORIAS (Expandido) ===== */}
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100/80 bg-white/60 animate-fade-in">
                    {!hasSub ? (
                      <div className="py-4 px-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          Esta categoria ainda não tem subcategorias.<br />
                          Clique em <span className={`font-black ${accent.accentText}`}>"+ Sub"</span> acima para adicionar detalhamento.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {cat.subcategories.map((sub) => (
                          <div
                            key={sub}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black ${accent.chipColor}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current/70 shrink-0" />
                            <span className="max-w-[200px] truncate">{sub}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
