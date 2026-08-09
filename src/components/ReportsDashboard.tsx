import React, { useState } from 'react';
import { Menu, Sliders, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';
import type { Transaction, WorkShiftEntry } from '../types';

interface ReportsDashboardProps {
  transactions: Transaction[];
  workShifts: WorkShiftEntry[];
  onOpenDrawer: () => void;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  transactions,
  workShifts,
  onOpenDrawer
}) => {
  const [periodFilter, setPeriodFilter] = useState<'ESTE_MES' | 'MES_ANTERIOR' | 'ULTIMOS_3_MESES' | 'PERSONALIZADO'>('ESTE_MES');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataSource, setDataSource] = useState<'PESSOAL' | 'TRABALHO' | 'CONSOLIDADO'>('CONSOLIDADO');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // 1. Calculate Period Dates
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let filterStartStr = '';
  let filterEndStr = '';

  if (periodFilter === 'ESTE_MES') {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    filterStartStr = firstDay.toISOString().split('T')[0];
    filterEndStr = lastDay.toISOString().split('T')[0];
  } else if (periodFilter === 'MES_ANTERIOR') {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    filterStartStr = firstDay.toISOString().split('T')[0];
    filterEndStr = lastDay.toISOString().split('T')[0];
  } else if (periodFilter === 'ULTIMOS_3_MESES') {
    const firstDay = new Date(year, month - 2, 1);
    filterStartStr = firstDay.toISOString().split('T')[0];
    filterEndStr = now.toISOString().split('T')[0];
  } else if (periodFilter === 'PERSONALIZADO') {
    filterStartStr = startDate;
    filterEndStr = endDate;
  }

  // 2. Filter & Unify Expenses
  const personalExpenses = (dataSource === 'PESSOAL' || dataSource === 'CONSOLIDADO')
    ? transactions
        .filter(tx => tx.tipo === 'SAIDA')
        .filter(tx => {
          const activeDate = (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
          if (filterStartStr && activeDate < filterStartStr) return false;
          if (filterEndStr && activeDate > filterEndStr) return false;
          return true;
        })
        .map(tx => ({
          id: tx.id,
          data: (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data,
          descricao: tx.descricao,
          categoria: tx.categoria,
          valor: tx.valor + (tx.juros || 0),
          origem: 'PESSOAL' as const
        }))
    : [];

  const workExpenses = (dataSource === 'TRABALHO' || dataSource === 'CONSOLIDADO')
    ? workShifts
        .filter(e => e.tipo === 'SAIDA')
        .filter(e => {
          if (filterStartStr && e.data < filterStartStr) return false;
          if (filterEndStr && e.data > filterEndStr) return false;
          return true;
        })
        .map(e => ({
          id: e.id,
          data: e.data,
          descricao: e.observacao || `Custo ${e.categoria}`,
          categoria: e.categoria || 'Outros',
          valor: e.valor,
          origem: 'TRABALHO' as const
        }))
    : [];

  const allExpenses = [...personalExpenses, ...workExpenses];

  // 3. Category grouping calculations
  const totalGasto = allExpenses.reduce((sum, e) => sum + e.valor, 0);

  const categoryTotals: Record<string, { total: number; items: typeof allExpenses }> = {};
  allExpenses.forEach(exp => {
    if (!categoryTotals[exp.categoria]) {
      categoryTotals[exp.categoria] = { total: 0, items: [] };
    }
    categoryTotals[exp.categoria].total += exp.valor;
    categoryTotals[exp.categoria].items.push(exp);
  });

  // Dynamics colors palette mapping
  const CATEGORY_COLORS: Record<string, string> = {
    'Aluguel': '#3b82f6',
    'Supermercado': '#10b981',
    'Assinaturas': '#8b5cf6',
    'Transporte': '#f59e0b',
    'Lazer': '#ec4899',
    'Saúde': '#ef4444',
    'Cartão': '#6366f1',
    'Empréstimo': '#64748b',
    'Combustível': '#f97316',
    'Alimentação/Lanche': '#ec4899',
    'Pedágio/Estacionamento': '#06b6d4',
    'Manutenção': '#14b8a6',
    'Outros': '#94a3b8'
  };

  const getColorForCategory = (name: string, index: number) => {
    if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
    const fallbacks = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#6366f1', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7'];
    return fallbacks[index % fallbacks.length];
  };

  const categoryList = Object.keys(categoryTotals).map((catName, index) => {
    const total = categoryTotals[catName].total;
    return {
      name: catName,
      total,
      items: categoryTotals[catName].items.sort((a, b) => b.data.localeCompare(a.data)),
      percentage: totalGasto > 0 ? (total / totalGasto) * 100 : 0,
      color: getColorForCategory(catName, index)
    };
  }).sort((a, b) => b.total - a.total);

  const maiorCategoria = categoryList[0] || { name: 'Nenhuma', total: 0 };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    const [_, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  // Donut chart parameters
  const radius = 50;
  const strokeWidth = 12;
  const circ = 2 * Math.PI * radius; // 314.16
  let accumulatedPercentage = 0;

  return (
    <div className="w-full flex-1 flex flex-col p-4 space-y-5 bg-slate-50 overflow-y-auto pb-28 animate-fade-in font-sans">
      
      {/* Header bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDrawer}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Relatórios
          </span>
        </div>
      </header>

      {/* Filters Card */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs space-y-3.5 text-left">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
          <Sliders size={12} className="text-[#0e69b2]" />
          Filtros do Relatório
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Period Selection */}
          <div>
            <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Período</label>
            <select
              value={periodFilter}
              onChange={(e: any) => setPeriodFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-semibold cursor-pointer shadow-3xs"
            >
              <option value="ESTE_MES">Este Mês</option>
              <option value="MES_ANTERIOR">Mês Anterior</option>
              <option value="ULTIMOS_3_MESES">Últimos 3 Meses</option>
              <option value="PERSONALIZADO">Personalizado</option>
            </select>
          </div>

          {/* Data Source Selection */}
          <div>
            <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Origem dos Dados</label>
            <select
              value={dataSource}
              onChange={(e: any) => setDataSource(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-semibold cursor-pointer shadow-3xs"
            >
              <option value="CONSOLIDADO">Consolidado (Tudo)</option>
              <option value="PESSOAL">Despesas Pessoais</option>
              <option value="TRABALHO">Custos de Trabalho</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {periodFilter === 'PERSONALIZADO' && (
          <div className="grid grid-cols-2 gap-3 pt-1 animate-fade-in">
            <div>
              <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Data Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-3xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Data Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-3xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left">
          <div>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block">Total Gasto</span>
          </div>
          <span className="text-sm font-black text-rose-600 truncate mt-1">
            {formatCurrency(totalGasto)}
          </span>
        </div>

        <div className="bg-white border border-slate-200/60 p-3.5 rounded-2xl shadow-3xs flex flex-col justify-between h-20 text-left">
          <div>
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 block truncate">Maior Gasto</span>
          </div>
          <div className="mt-1 truncate min-w-0">
            <span className="text-slate-800 font-black text-xs block truncate leading-none">
              {maiorCategoria.name}
            </span>
            <span className="text-slate-500 text-[10px] font-bold mt-1 block">
              {formatCurrency(maiorCategoria.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {allExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-slate-200 rounded-3xl shadow-3xs">
          <TrendingDown className="text-slate-500 mb-3 animate-pulse" size={32} />
          <p className="text-slate-700 text-xs font-bold">Nenhum custo registrado neste período.</p>
          <p className="text-slate-500 text-[10px] mt-1">Ajuste os filtros acima ou registre novas despesas.</p>
        </div>
      ) : (
        <>
          {/* Donut Chart Visual Section */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-3xs flex flex-col items-center justify-center relative">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-4 font-sans text-center">
              Composição Percentual
            </h4>
            
            {/* SVG Donut */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                {categoryList.map((cat) => {
                  const strokeOffset = circ - (cat.percentage / 100) * circ;
                  const rotation = (accumulatedPercentage / 100) * 360;
                  accumulatedPercentage += cat.percentage;
                  
                  return (
                    <circle
                      key={cat.name}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circ}
                      strokeDashoffset={strokeOffset}
                      transform={`rotate(${rotation} 60 60)`}
                      className="transition-all duration-500 ease-out"
                    />
                  );
                })}
              </svg>
              
              {/* Central text block */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] uppercase font-extrabold text-slate-500">Total Gasto</span>
                <span className="text-xs font-black text-rose-600 mt-0.5">
                  {formatCurrency(totalGasto)}
                </span>
              </div>
            </div>
          </div>

          {/* List and Breakdown of Categories */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-left pl-1">
              Despesas por Categoria
            </h4>
            
            <div className="bg-white border border-slate-200 rounded-3xl p-3 divide-y divide-slate-100 shadow-3xs">
              {categoryList.map((cat) => {
                const isExpanded = expandedCategory === cat.name;

                return (
                  <div key={cat.name} className="block py-1">
                    {/* Header Row */}
                    <div
                      onClick={() => setExpandedCategory(prev => prev === cat.name ? null : cat.name)}
                      className="py-2.5 px-1.5 flex items-center justify-between hover:bg-slate-50/60 active:bg-slate-100/50 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Bullet color */}
                        <div 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        
                        <div className="text-left">
                          <span className="text-xs font-extrabold text-slate-700 block">
                            {cat.name}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                            {cat.percentage.toFixed(1)}% do total
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">
                          {formatCurrency(cat.total)}
                        </span>
                        {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-1.5 pb-2">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out" 
                          style={{ 
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color 
                          }}
                        />
                      </div>
                    </div>

                    {/* Expandable item transactions list */}
                    {isExpanded && (
                      <div className="mx-1.5 my-1.5 bg-slate-50 border border-slate-200/50 rounded-xl p-3 space-y-2 animate-scale-up text-left">
                        <span className="text-[9px] uppercase font-extrabold text-slate-500 block tracking-wider pb-1 border-b border-slate-200/50">
                          Lançamentos em "{cat.name}"
                        </span>
                        
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {cat.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-[10px] bg-white border border-slate-150 p-2 rounded-lg">
                              <div className="text-left min-w-0">
                                <span className="font-extrabold text-slate-700 block truncate">
                                  {item.descricao}
                                </span>
                                <span className="text-[8px] text-slate-500 font-bold flex items-center gap-1 mt-0.5 uppercase">
                                  <span>{formatDate(item.data)}</span>
                                  <span>•</span>
                                  <span className={item.origem === 'PESSOAL' ? 'text-blue-500' : 'text-orange-500'}>
                                    {item.origem === 'PESSOAL' ? 'Carteira Pessoal' : 'Trabalho'}
                                  </span>
                                </span>
                              </div>
                              <span className="font-extrabold text-rose-600 shrink-0">
                                {formatCurrency(item.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

    </div>
  );
};
