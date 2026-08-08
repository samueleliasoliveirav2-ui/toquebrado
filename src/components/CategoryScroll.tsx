import React from 'react';
import { ShoppingCart, Car, UtensilsCrossed, Store, MoreHorizontal } from 'lucide-react';

interface CategoryScrollProps {
  onCategorySelect?: (category: string) => void;
}

export const CategoryScroll: React.FC<CategoryScrollProps> = ({
  onCategorySelect
}) => {
  const categoryItems = [
    { id: 'Supermercado', label: 'Market', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50 border-blue-100/50' },
    { id: 'Transporte', label: 'Transporte', icon: Car, color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50' },
    { id: 'Lazer', label: 'Foods', icon: UtensilsCrossed, color: 'text-amber-600 bg-amber-50 border-amber-100/50' },
    { id: 'Aluguel', label: 'Mumiro', icon: Store, color: 'text-purple-600 bg-purple-50 border-purple-100/50' },
    { id: 'Outros', label: 'Outros', icon: MoreHorizontal, color: 'text-slate-500 bg-slate-50 border-slate-200/50' }
  ];

  const handleSelect = (id: string) => {
    if (onCategorySelect) {
      onCategorySelect(id);
    }
  };

  return (
    <div className="w-full space-y-2 select-none">
      
      {/* Category header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          Categorias
        </span>
        <button 
          onClick={() => handleSelect('TODOS')}
          className="text-[10px] font-bold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
        >
          Mais all
        </button>
      </div>

      {/* Horizontal scrolling row */}
      <div className="flex items-center gap-3.5 overflow-x-auto scrollbar-none py-1.5 px-0.5 scroll-smooth">
        {categoryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
            >
              {/* Icon Circle */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-3xs transition-colors group-hover:bg-white ${item.color}`}>
                <Icon size={20} className="stroke-[2.2]" />
              </div>
              {/* Label */}
              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
