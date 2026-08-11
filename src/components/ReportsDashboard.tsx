import React, { useMemo, useState } from 'react';
import {
  Menu,
  Sliders,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Wallet,
  Briefcase,
  Car,
  Building2,
  PartyPopper,
  DollarSign,
  Percent,
  Filter,
  Lock,
  Sparkles
} from 'lucide-react';
import type { Transaction, WorkShiftEntry } from '../types';

type TipoRelatorio =
  | 'VISAO_GERAL'
  | 'STATUS_LANCAMENTOS'
  | 'DIARIAS_TRABALHO'
  | 'DRE_PESSOAL'
  | 'FATURAS_CARTAO'
  | 'GASTO_MEDIO_DIARIO';

type TipoLancamentoFilter = 'TODOS' | 'DESPESAS' | 'RECEITAS';
type AbaStatusLanc = 'TODOS' | 'PAGOS' | 'PENDENTES' | 'POSTERGADOS';

interface ReportsDashboardProps {
  transactions: Transaction[];
  workShifts: WorkShiftEntry[];
  onOpenDrawer: () => void;
}

const RELATORIOS_ABAS: Array<{
  id: TipoRelatorio; rotulo: string; icone: React.ReactNode; breve?: boolean }> = [
    { id: 'VISAO_GERAL', rotulo: 'Visão Geral', icone: <BarChart3 size={14} /> },
    { id: 'STATUS_LANCAMENTOS', rotulo: 'Status de Lançamentos', icone: <CheckCircle2 size={14} /> },
    { id: 'DIARIAS_TRABALHO', rotulo: 'Diárias & Trabalho', icone: <Briefcase size={14} /> },
    { id: 'DRE_PESSOAL', rotulo: 'DRE Pessoal', icone: <TrendingDown size={14} />, breve: true },
    { id: 'FATURAS_CARTAO', rotulo: 'Faturas Cartão', icone: <Wallet size={14} />, breve: true },
    { id: 'GASTO_MEDIO_DIARIO', rotulo: 'Gasto Médio Diário', icone: <Calendar size={14} />, breve: true }
  ];

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  transactions,
  workShifts,
  onOpenDrawer
}) => {
  const [activeReport, setActiveReport] = useState<TipoRelatorio>('VISAO_GERAL');

  // Shared filters
  const [periodFilter, setPeriodFilter] = useState<'ESTE_MES' | 'MES_ANTERIOR' | 'ULTIMOS_3_MESES' | 'PERSONALIZADO' | 'MES_ANO'>('ESTE_MES');
  const [selectedMesAno, setSelectedMesAno] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataSource, setDataSource] = useState<'PESSOAL' | 'TRABALHO' | 'CONSOLIDADO'>('CONSOLIDADO');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Filtros Status Lançamentos
  const [tipoLancFilter, setTipoLancFilter] = useState<TipoLancamentoFilter>('TODOS');
  const [abaStatusLanc, setAbaStatusLanc] = useState<AbaStatusLanc>('TODOS');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const { filterStartStr, filterEndStr, rotuloPeriodo } = useMemo(() => {
    let s = '';
    let e = '';
    let rotulo = '';
    if (periodFilter === 'ESTE_MES') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      s = firstDay.toISOString().split('T')[0];
      e = lastDay.toISOString().split('T')[0];
      rotulo = `Este Mês (${String(month + 1).padStart(2,'0')}/${year})`;
    } else if (periodFilter === 'MES_ANTERIOR') {
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      s = firstDay.toISOString().split('T')[0];
      e = lastDay.toISOString().split('T')[0];
      rotulo = 'Mês Anterior';
    } else if (periodFilter === 'ULTIMOS_3_MESES') {
      const firstDay = new Date(year, month - 2, 1);
      s = firstDay.toISOString().split('T')[0];
      e = now.toISOString().split('T')[0];
      rotulo = 'Últimos 3 Meses';
    } else if (periodFilter === 'MES_ANO') {
      const [y, m] = selectedMesAno.split('-').map(Number);
      const firstDay = new Date(y, (m || 1) - 1, 1);
      const lastDay = new Date(y, (m || 1), 0);
      s = firstDay.toISOString().split('T')[0];
      e = lastDay.toISOString().split('T')[0];
      rotulo = `Mês ${String(m).padStart(2,'0')}/${y}`;
    } else if (periodFilter === 'PERSONALIZADO') {
      s = startDate;
      e = endDate;
      rotulo = 'Período Personalizado';
    }
    return { filterStartStr: s, filterEndStr: e, rotuloPeriodo: rotulo };
  }, [periodFilter, selectedMesAno, startDate, endDate, year, month]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [_, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const hojeStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  // =============================================
  //  BLOCO 1 — VISÃO GERAL (original: despesas por categoria)
  // =============================================
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
  const totalGasto = allExpenses.reduce((sum, e) => sum + e.valor, 0);

  const categoryTotals: Record<string, { total: number; items: typeof allExpenses }> = {};
  allExpenses.forEach(exp => {
    if (!categoryTotals[exp.categoria]) {
      categoryTotals[exp.categoria] = { total: 0, items: [] };
    }
    categoryTotals[exp.categoria].total += exp.valor;
    categoryTotals[exp.categoria].items.push(exp);
  });

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

  // =============================================
  //  BLOCO 2 — STATUS DE LANÇAMENTOS
  // =============================================
  const transacoesPeriodo = useMemo(() => {
    return transactions.filter(tx => {
      if (tipoLancFilter === 'DESPESAS' && tx.tipo !== 'SAIDA') return false;
      if (tipoLancFilter === 'RECEITAS' && tx.tipo !== 'ENTRADA') return false;
      const activeDate = (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
      if (filterStartStr && activeDate < filterStartStr) return false;
      if (filterEndStr && activeDate > filterEndStr) return false;
      return true;
    });
  }, [transactions, tipoLancFilter, filterStartStr, filterEndStr]);

  const statusClassificados = useMemo(() => {
    const hoje = hojeStr();
    const pagoRecebido: Transaction[] = [];
    const pendentes: Transaction[] = [];
    const postergadosAtraso: Transaction[] = [];
    transacoesPeriodo.forEach(tx => {
      const statusTx = tx.status as string;
      const dataRef = (statusTx === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
      const emAtrasoOuPostergado = statusTx === 'POSTERGAR' || dataRef < hoje;

      if (tx.tipo === 'ENTRADA') {
        if (statusTx === 'RECEBIDO') pagoRecebido.push(tx);
        else if (emAtrasoOuPostergado) postergadosAtraso.push(tx);
        else pendentes.push(tx);
      } else {
        if (statusTx === 'PAGO') pagoRecebido.push(tx);
        else if (emAtrasoOuPostergado) postergadosAtraso.push(tx);
        else pendentes.push(tx);
      }
    });
    return { pagoRecebido, pendentes, postergados: postergadosAtraso };
  }, [transacoesPeriodo]);

  const kpisStatus = {
    pago: statusClassificados.pagoRecebido.reduce((s, t) => s + t.valor + (t.juros || 0), 0),
    pendente: statusClassificados.pendentes.reduce((s, t) => s + t.valor + (t.juros || 0), 0),
    postergado: statusClassificados.postergados.reduce((s, t) => s + t.valor + (t.juros || 0), 0),
  };

  const listaFiltradaStatus = useMemo(() => {
    if (abaStatusLanc === 'PAGOS') return statusClassificados.pagoRecebido;
    if (abaStatusLanc === 'PENDENTES') return statusClassificados.pendentes;
    if (abaStatusLanc === 'POSTERGADOS') return statusClassificados.postergados;
    return transacoesPeriodo;
  }, [abaStatusLanc, transacoesPeriodo, statusClassificados]);

  const getStatusInfo = (tx: Transaction): { rotulo: string; cor: string; bg: string; badgeBorder: string } => {
    const hoje = hojeStr();
    const statusTx = tx.status as string;
    const dataRef = (statusTx === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
    const emAtrasoOuPostergado = statusTx === 'POSTERGAR' || dataRef < hoje;
    if (tx.tipo === 'ENTRADA') {
      if (statusTx === 'RECEBIDO') return { rotulo: 'RECEBIDO', cor: 'text-emerald-700', bg: 'bg-emerald-50', badgeBorder: 'border-emerald-200' };
      if (emAtrasoOuPostergado) return { rotulo: 'POSTERGADO', cor: 'text-rose-700', bg: 'bg-rose-50', badgeBorder: 'border-rose-200' };
      return { rotulo: 'PENDENTE', cor: 'text-amber-700', bg: 'bg-amber-50', badgeBorder: 'border-amber-200' };
    } else {
      if (statusTx === 'PAGO') return { rotulo: 'PAGO', cor: 'text-emerald-700', bg: 'bg-emerald-50', badgeBorder: 'border-emerald-200' };
      if (emAtrasoOuPostergado) return { rotulo: 'POSTERGADO / ATRASO', cor: 'text-rose-700', bg: 'bg-rose-50', badgeBorder: 'border-rose-200' };
      return { rotulo: 'PENDENTE', cor: 'text-amber-700', bg: 'bg-amber-50', badgeBorder: 'border-amber-200' };
    }
  };

  // =============================================
  //  BLOCO 3 — DIÁRIAS & TRABALHO
  // =============================================
  const workShiftsPeriodo = useMemo(() => {
    return workShifts.filter(e => {
      if (filterStartStr && e.data < filterStartStr) return false;
      if (filterEndStr && e.data > filterEndStr) return false;
      return true;
    });
  }, [workShifts, filterStartStr, filterEndStr]);

  const workKPIs = useMemo(() => {
    const entradas = workShiftsPeriodo.filter(e => e.tipo === 'ENTRADA');
    const saidas = workShiftsPeriodo.filter(e => e.tipo === 'SAIDA');
    const bruto = entradas.reduce((s, e) => s + e.valor, 0);
    const custos = saidas.reduce((s, e) => s + e.valor, 0);
    const recebidos = entradas.filter(e => e.status !== 'A_RECEBER').reduce((s, e) => s + e.valor, 0);
    const aReceber = entradas.filter(e => e.status === 'A_RECEBER').reduce((s, e) => s + e.valor, 0);
    const lucroLiquido = recebidos - custos;
    const margem = bruto > 0 ? (lucroLiquido / bruto) * 100 : 0;
    return { bruto, custos, lucroLiquido, aReceber, margem };
  }, [workShiftsPeriodo]);

  const atividadesComparativo = useMemo(() => {
    const calcular = (ativ: string) => {
      const entradasAtv = workShiftsPeriodo.filter(e => e.tipo === 'ENTRADA' && e.atividade === ativ);
      const idsEntradas = new Set(entradasAtv.map(e => e.id));
      const saidasAtv = workShiftsPeriodo.filter(e =>
        e.tipo === 'SAIDA' &&
        (e.atividade === ativ || (e.vinculoId && idsEntradas.has(e.vinculoId)))
      );
      // fallback: se não tem vinculoId, alocar SAIDA atividade === ativ
      const bruto = entradasAtv.reduce((s, e) => s + e.valor, 0);
      const custos = saidasAtv.reduce((s, e) => s + e.valor, 0);
      return { atividade: ativ, bruto, custos, lucro: bruto - custos };
    };
    return [
      calcular('Evento'),
      calcular('Motorista de App'),
      calcular('Outro'),
    ].filter(a => a.bruto > 0 || a.custos > 0);
  }, [workShiftsPeriodo]);

  const detalhesEventos = useMemo(() => {
    const eventosEntrada = workShiftsPeriodo.filter(e => e.tipo === 'ENTRADA' && e.atividade === 'Evento');
    return eventosEntrada.map(evt => {
      const custosVinculados = workShiftsPeriodo.filter(e =>
        e.tipo === 'SAIDA' &&
        (evt.id && (e.vinculoId === evt.id || (e.atividade === 'Evento' && e.data === evt.data)))
      );
      const totalCustos = custosVinculados.reduce((s, e) => s + e.valor, 0);
      return {
        id: evt.id,
        nome: evt.observacao || 'Evento',
        qtdDias: evt.quantidadeDias || 1,
        ganhoBruto: evt.valor,
        valorDiaria: evt.valorDiaria,
        custos: totalCustos,
        lucroLiquido: evt.valor - totalCustos,
        status: evt.status || 'RECEBIDO',
        data: evt.data,
        dataRecebimento: evt.dataRecebimento
      };
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [workShiftsPeriodo]);

  // Donut chart params
  const radius = 50;
  const strokeWidth = 12;
  const circ = 2 * Math.PI * radius;

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

      {/* Abas de Relatórios (scroll horizontal) */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
        {RELATORIOS_ABAS.map(aba => {
          const ativo = activeReport === aba.id;
          return (
            <button
              key={aba.id}
              onClick={() => !aba.breve && setActiveReport(aba.id)}
              disabled={aba.breve}
              className={[
                'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200',
                ativo
                  ? 'bg-[#0e69b2] text-white border-[#0e69b2] shadow-md shadow-blue-500/20 scale-[1.02]'
                  : aba.breve
                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] cursor-pointer'
              ].join(' ')}
            >
              <span className={ativo ? 'text-white' : aba.breve ? 'text-slate-400' : 'text-[#0e69b2]'}>
                {aba.breve ? <Lock size={12} /> : aba.icone}
              </span>
              <span>{aba.rotulo}</span>
              {aba.breve && (
                <span className="ml-1 px-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-500 border border-slate-300">
                  BREVE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Placeholder para relatórios EM BREVE */}
      {(activeReport === 'DRE_PESSOAL' || activeReport === 'FATURAS_CARTAO' || activeReport === 'GASTO_MEDIO_DIARIO') && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-3xs p-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mx-auto">
            <Sparkles size={28} className="text-[#0e69b2]" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Relatório em Desenvolvimento
          </h3>
          <p className="text-xs font-bold text-slate-500 max-w-xs mx-auto leading-relaxed">
            {activeReport === 'DRE_PESSOAL' && 'Comparativo mensal de Entradas vs Saídas com evolução do saldo mês a mês (DRE Pessoal).'}
            {activeReport === 'FATURAS_CARTAO' && 'Projeção de comprometimento das faturas futuras por cartão de crédito.'}
            {activeReport === 'GASTO_MEDIO_DIARIO' && 'Análise do custo médio por dia trabalhado (Combustível / Alimentação / Pedágios).'}
          </p>
          <span className="inline-block text-[10px] font-black uppercase tracking-wider text-[#0e69b2] bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
            Próxima Atualização
          </span>
        </div>
      )}

      {/* ===================== FILTROS COMPARTILHADOS (exceto alguns relatórios usam eles) */}
      {(activeReport === 'VISAO_GERAL' || activeReport === 'STATUS_LANCAMENTOS' || activeReport === 'DIARIAS_TRABALHO') && (
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs space-y-3.5 text-left">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
            <Sliders size={12} className="text-[#0e69b2]" />
            Filtros do Relatório
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0e69b2] border border-blue-100">
              {rotuloPeriodo}
            </span>
          </div>

          <div className={activeReport === 'STATUS_LANCAMENTOS' ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Período</label>
              <select
                value={periodFilter}
                onChange={(e: any) => setPeriodFilter(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-semibold cursor-pointer shadow-3xs"
              >
                <option value="ESTE_MES">Este Mês</option>
                <option value="MES_ANO">Mês / Ano</option>
                <option value="MES_ANTERIOR">Mês Anterior</option>
                <option value="ULTIMOS_3_MESES">Últimos 3 Meses</option>
                <option value="PERSONALIZADO">Personalizado</option>
              </select>
            </div>

            {activeReport === 'STATUS_LANCAMENTOS' ? (
              <div>
                <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Tipo de Lançamento</label>
                <select
                  value={tipoLancFilter}
                  onChange={(e) => setTipoLancFilter(e.target.value as TipoLancamentoFilter)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-semibold cursor-pointer shadow-3xs"
                >
                  <option value="TODOS">Todos (Receitas + Despesas)</option>
                  <option value="DESPESAS">Apenas Despesas</option>
                  <option value="RECEITAS">Apenas Receitas</option>
                </select>
              </div>
            ) : activeReport === 'VISAO_GERAL' ? (
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
            ) : (
              <div>
              <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Análise de</label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-bold shadow-3xs flex items-center gap-1.5">
                <Briefcase size={12} className="text-[#0e69b2]" />
                Diárias & Trabalho
              </div>
            </div>
            )}
          </div>

          {periodFilter === 'MES_ANO' && (
            <div className="pt-1 animate-fade-in">
              <label className="block text-slate-500 text-[9px] font-bold uppercase mb-1">Mês Referência</label>
              <input
                type="month"
                value={selectedMesAno}
                onChange={(e) => setSelectedMesAno(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-3xs"
              />
            </div>
          )}

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
      )}

      {/* =============================================== */}
      {/*  RELATÓRIO 1: VISÃO GERAL (Despesas Categoria) */}
      {/* =============================================== */}
      {activeReport === 'VISAO_GERAL' && (
        <>
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

          {allExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-slate-200 rounded-3xl shadow-3xs">
              <TrendingDown className="text-slate-500 mb-3 animate-pulse" size={32} />
              <p className="text-slate-700 text-xs font-bold">Nenhum custo registrado neste período.</p>
              <p className="text-slate-500 text-[10px] mt-1">Ajuste os filtros acima ou registre novas despesas.</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-3xs flex flex-col items-center justify-center relative">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-4 font-sans text-center">
                  Composição Percentual
                </h4>

                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                  {(() => {
                    let accumulatedPercentage = 0;
                    return categoryList.map((cat) => {
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
                    });
                  })()}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[8px] uppercase font-extrabold text-slate-500">Total Gasto</span>
                    <span className="text-xs font-black text-rose-600 mt-0.5">
                      {formatCurrency(totalGasto)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 text-left pl-1">
                  Despesas por Categoria
                </h4>

                <div className="bg-white border border-slate-200 rounded-3xl p-3 divide-y divide-slate-100 shadow-3xs">
                  {categoryList.map((cat) => {
                    const isExpanded = expandedCategory === cat.name;
                    return (
                      <div key={cat.name} className="block py-1">
                        <div
                          onClick={() => setExpandedCategory(prev => prev === cat.name ? null : cat.name)}
                          className="py-2.5 px-1.5 flex items-center justify-between hover:bg-slate-50/60 active:bg-slate-100/50 rounded-xl transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
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
                        {isExpanded && (
                          <div className="mx-1.5 my-1.5 bg-slate-50 border border-slate-200/50 rounded-xl p-3 space-y-2 animate-fade-in text-left">
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
        </>
      )}

      {/* =============================================== */}
      {/*  RELATÓRIO 2: STATUS DE LANÇAMENTOS */}
      {/* =============================================== */}
      {activeReport === 'STATUS_LANCAMENTOS' && (
        <>
          {/* 3 KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-emerald-200/60 p-3 rounded-2xl shadow-3xs flex flex-col text-left">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-emerald-700" />
                </div>
                <span className="text-[8px] uppercase tracking-wider font-black text-emerald-700 leading-none">Pago / Recebido</span>
              </div>
              <span className="text-xs font-black text-emerald-700 truncate mt-1">
                {formatCurrency(kpisStatus.pago)}
              </span>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                {statusClassificados.pagoRecebido.length} lanç.
              </span>
            </div>

            <div className="bg-white border border-amber-200/60 p-3 rounded-2xl shadow-3xs flex flex-col text-left">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock size={12} className="text-amber-700" />
                </div>
                <span className="text-[8px] uppercase tracking-wider font-black text-amber-700 leading-none">Pendentes</span>
              </div>
              <span className="text-xs font-black text-amber-700 truncate mt-1">
                {formatCurrency(kpisStatus.pendente)}
              </span>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                {statusClassificados.pendentes.length} lanç.
              </span>
            </div>

            <div className="bg-white border border-rose-200/60 p-3 rounded-2xl shadow-3xs flex flex-col text-left">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center">
                  <AlertTriangle size={12} className="text-rose-700" />
                </div>
                <span className="text-[8px] uppercase tracking-wider font-black text-rose-700 leading-none">Posterg / Atraso</span>
              </div>
              <span className="text-xs font-black text-rose-700 truncate mt-1">
                {formatCurrency(kpisStatus.postergado)}
              </span>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                {statusClassificados.postergados.length} lanç.
              </span>
            </div>
          </div>

          {/* Abas de status rápidas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-3xs flex gap-1.5">
            {(['TODOS', 'PAGOS', 'PENDENTES', 'POSTERGADOS'] as AbaStatusLanc[]).map(aba => {
              const ativo = abaStatusLanc === aba;
              const rotulos = { TODOS: 'Todos', PAGOS: 'Pagos / Recebidos', PENDENTES: 'Pendentes', POSTERGADOS: 'Postergados / Atraso' };
              const contagens = {
                TODOS: transacoesPeriodo.length,
                PAGOS: statusClassificados.pagoRecebido.length,
                PENDENTES: statusClassificados.pendentes.length,
                POSTERGADOS: statusClassificados.postergados.length,
              };
              return (
                <button
                  key={aba}
                  onClick={() => setAbaStatusLanc(aba)}
                  className={[
                    'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200 text-[9px] font-black uppercase tracking-wider cursor-pointer',
                    ativo
                      ? 'bg-[#0e69b2] text-white shadow-md shadow-blue-500/15'
                      : 'text-slate-600 hover:bg-slate-50 active:scale-[0.98]'
                  ].join(' ')}
                >
                  <span>{rotulos[aba]}</span>
                  <span className={ativo ? 'text-white/80' : 'text-slate-500'}>
                    {contagens[aba]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lista Detalhada */}
          {listaFiltradaStatus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center bg-white border border-slate-200 rounded-3xl shadow-3xs">
              <Filter className="text-slate-400 mb-3" size={30} />
              <p className="text-slate-700 text-xs font-bold">Nenhum lançamento encontrado.</p>
              <p className="text-slate-500 text-[10px] mt-1">Ajuste os filtros de período ou tipo.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-3xs divide-y divide-slate-100">
              {listaFiltradaStatus
                .slice()
                .sort((a, b) => {
                  const da = (a.status === 'POSTERGAR' && a.dataPostergar) ? a.dataPostergar : a.data;
                  const db = (b.status === 'POSTERGAR' && b.dataPostergar) ? b.dataPostergar : b.data;
                  return db.localeCompare(da);
                })
                .map(tx => {
                  const info = getStatusInfo(tx);
                  const dataAtiva = (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
                  const valorTotal = tx.valor + (tx.juros || 0);
                  return (
                    <div key={tx.id} className="p-3 flex items-start gap-3">
                      <div className={[
                        'w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border',
                        tx.tipo === 'ENTRADA' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                      ].join(' ')}>
                        {tx.tipo === 'ENTRADA'
                          ? <TrendingDown size={16} className="text-emerald-700 rotate-180 -translate-y-0.5" />
                          : <TrendingDown size={16} className="text-rose-700" />
                        }
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-800 truncate">
                            {tx.descricao}
                          </span>
                          <span className={[
                            'text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border',
                            info.cor, info.bg, info.badgeBorder
                          ].join(' ')}>
                            {info.rotulo}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[9px] font-bold text-slate-500 uppercase">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                            {tx.categoria}
                          </span>
                          <span>Venc. original: {formatDate(tx.data)}</span>
                          {tx.status === 'POSTERGAR' && tx.dataPostergar && tx.dataPostergar !== tx.data && (
                            <span className="text-rose-600 flex items-center gap-0.5">
                              <AlertTriangle size={9} /> reagendado: {formatDate(tx.dataPostergar)}
                            </span>
                          )}
                          {tx.totalParcelas && (
                            <span className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {tx.parcelaAtual}/{tx.totalParcelas}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={[
                          'text-sm font-black block leading-none',
                          tx.tipo === 'ENTRADA' ? 'text-emerald-700' : 'text-rose-700'
                        ].join(' ')}>
                          {tx.tipo === 'ENTRADA' ? '+' : '-'}{formatCurrency(valorTotal)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 mt-0.5 block">
                          {formatDateFull(dataAtiva)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      {/* =============================================== */}
      {/*  RELATÓRIO 3: DIÁRIAS & TRABALHO */}
      {/* =============================================== */}
      {activeReport === 'DIARIAS_TRABALHO' && (
        <>
          {/* 5 KPIs principais */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-3.5 rounded-2xl shadow-md shadow-blue-500/20 flex flex-col text-left col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <DollarSign size={14} />
                  <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">Faturamento Bruto Total</span>
                </div>
                <Briefcase size={16} className="opacity-70" />
              </div>
              <span className="text-lg font-black mt-1">
                {formatCurrency(workKPIs.bruto)}
              </span>
            </div>

            <div className="bg-white border border-rose-200/60 p-3 rounded-2xl shadow-3xs flex flex-col text-left">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown size={12} className="text-rose-600" />
                <span className="text-[8px] uppercase tracking-wider font-black text-slate-600 leading-none">Custos Operacionais</span>
              </div>
              <span className="text-sm font-black text-rose-700 truncate">
                -{formatCurrency(workKPIs.custos)}
              </span>
            </div>

            <div className="bg-white border border-emerald-200/60 p-3 rounded-2xl shadow-3xs flex flex-col text-left">
              <div className="flex items-center gap-1 mb-1">
                <Sparkles size={12} className="text-emerald-700" />
                <span className="text-[8px] uppercase tracking-wider font-black text-slate-600 leading-none">Lucro Líquido Realizado</span>
              </div>
              <span className={[
                'text-sm font-black truncate',
                workKPIs.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-rose-700'
              ].join(' ')}>
                {workKPIs.lucroLiquido >= 0 ? '+' : ''}{formatCurrency(workKPIs.lucroLiquido)}
              </span>
            </div>

            <div className="bg-white border border-amber-200/60 p-3 rounded-2xl shadow-3xs flex flex-col text-left">
              <div className="flex items-center gap-1 mb-1">
                <Clock size={12} className="text-amber-700" />
                <span className="text-[8px] uppercase tracking-wider font-black text-slate-600 leading-none">Valores a Receber</span>
              </div>
              <span className="text-sm font-black text-amber-700 truncate">
                +{formatCurrency(workKPIs.aReceber)}
              </span>
            </div>

            <div className="bg-white border border-blue-200/60 p-3 rounded-2xl shadow-3xs flex flex-col text-left">
              <div className="flex items-center gap-1 mb-1">
                <Percent size={12} className="text-[#0e69b2]" />
                <span className="text-[8px] uppercase tracking-wider font-black text-slate-600 leading-none">Margem de Lucro</span>
              </div>
              <span className="text-sm font-black text-[#0e69b2] truncate">
                {workKPIs.margem.toFixed(1)}%
              </span>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, workKPIs.margem))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Comparativo por Atividade */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              <BarChart3 size={12} className="text-[#0e69b2]" />
              Comparativo por Atividade
            </div>

            {atividadesComparativo.length === 0 ? (
              <p className="text-center py-6 text-xs font-bold text-slate-500">
                Sem registros de trabalho no período.
              </p>
            ) : (
              <div className="space-y-2.5">
                {atividadesComparativo.map((a, idx) => {
                  const icoAndCor = a.atividade === 'Evento'
                    ? { icone: <PartyPopper size={14} />, cor: '#8b5cf6' }
                    : a.atividade === 'Motorista de App'
                    ? { icone: <Car size={14} />, cor: '#0e69b2' }
                    : { icone: <Building2 size={14} />, cor: '#64748b' };
                  const pctBruto = workKPIs.bruto > 0 ? (a.bruto / workKPIs.bruto) * 100 : 0;
                  return (
                    <div key={a.atividade + idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: icoAndCor.cor }}
                          >
                            {icoAndCor.icone}
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-extrabold text-slate-800 block">{a.atividade}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase block">
                              {pctBruto.toFixed(0)}% do faturamento
                            </span>
                          </div>
                        </div>
                        <span className={[
                          'text-xs font-black',
                          a.lucro >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        ].join(' ')}>
                          {a.lucro >= 0 ? '+' : ''}{formatCurrency(a.lucro)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                        <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                          <span className="font-black text-slate-500 uppercase block text-[8px]">Bruto</span>
                          <span className="font-black text-slate-800 block mt-0.5">{formatCurrency(a.bruto)}</span>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                          <span className="font-black text-rose-600 uppercase block text-[8px]">Custos</span>
                          <span className="font-black text-rose-700 block mt-0.5">-{formatCurrency(a.custos)}</span>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                          <span className="font-black text-emerald-700 uppercase block text-[8px]">Lucro</span>
                          <span className="font-black text-emerald-700 block mt-0.5">{formatCurrency(a.lucro)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pctBruto}%`, backgroundColor: icoAndCor.cor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalhamento por Evento */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              <PartyPopper size={12} className="text-purple-600" />
              Detalhamento de Eventos
            </div>

            {detalhesEventos.length === 0 ? (
              <p className="text-center py-6 text-xs font-bold text-slate-500">
                Nenhum evento agendado no período.
              </p>
            ) : (
              <div className="space-y-2">
                {detalhesEventos.map(evt => (
                  <div key={evt.id} className="bg-gradient-to-r from-purple-50/70 to-slate-50 border border-purple-200/70 rounded-xl p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                          <PartyPopper size={14} />
                        </div>
                        <div className="text-left min-w-0">
                          <span className="text-xs font-extrabold text-slate-800 block truncate">
                            {evt.nome}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-0.5">
                              <Calendar size={9} /> {evt.qtdDias} {evt.qtdDias === 1 ? 'dia' : 'dias'}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-[9px] font-bold text-slate-500">
                              {formatDateFull(evt.data)}
                            </span>
                            <span className={[
                              'text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border',
                              evt.status === 'RECEBIDO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            ].join(' ')}>
                              {evt.status === 'RECEBIDO' ? 'RECEBIDO' : 'A RECEBER'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={[
                        'text-sm font-black shrink-0',
                        evt.lucroLiquido >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      ].join(' ')}>
                        {evt.lucroLiquido >= 0 ? '+' : ''}{formatCurrency(evt.lucroLiquido)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="bg-white/80 rounded-lg border border-purple-200/70 p-2 text-center">
                        <span className="font-black text-slate-500 uppercase block text-[8px]">Bruto</span>
                        <span className="font-black text-slate-800 block mt-0.5">{formatCurrency(evt.ganhoBruto)}</span>
                      </div>
                      <div className="bg-white/80 rounded-lg border border-rose-200/60 p-2 text-center">
                        <span className="font-black text-rose-600 uppercase block text-[8px]">Custos</span>
                        <span className="font-black text-rose-700 block mt-0.5">-{formatCurrency(evt.custos)}</span>
                      </div>
                      <div className="bg-white/80 rounded-lg border border-slate-200 p-2 text-center">
                        <span className="font-black text-slate-500 uppercase block text-[8px]">Diária</span>
                        <span className="font-black text-[#0e69b2] block mt-0.5">
                          {evt.valorDiaria ? formatCurrency(evt.valorDiaria) : '-'}
                        </span>
                      </div>
                    </div>

                    {evt.status === 'A_RECEBER' && evt.dataRecebimento && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700 uppercase bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                        <Clock size={10} />
                        Recebimento previsto: {formatDateFull(evt.dataRecebimento)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};
