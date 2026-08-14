import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, RefreshCw, CreditCard as CreditCardIcon, Wallet, Info } from 'lucide-react';
import type { Transaction, TransactionType, TransactionStatus, BankAccount, CreditCard, Category, CategoryType } from '../types';
import { MAP_TIPO_CATEGORIA } from '../categoriesDefaults';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    transaction: Omit<Transaction, 'id'> & { id?: string; tipoCalculoParcela?: 'TOTAL' | 'PARCELA' },
    scope?: 'ONLY_THIS' | 'THIS_AND_FUTURE'
  ) => void;
  onDelete?: (id: string, scope?: 'ONLY_THIS' | 'THIS_AND_FUTURE') => void;
  editingTransaction?: Transaction | null;
  categoriesList: Record<TransactionType, string[]>;  // legacy (mantemos para compatibilidade temporaria)
  categories: Category[];                              // NOVO: categorias com type + subcategories
  onAddNewCategory: (tipo: TransactionType, category: string) => void;
  onAddFullCategory?: (payload: { name: string; type: CategoryType; subcategories: string[] }) => string | null;
  accounts?: BankAccount[];
  creditCards?: CreditCard[];
  onInvoiceTransactionSaved?: (cartaoId: string, mesAnoAlocacao: string) => void;
  defaultType?: TransactionType;
  // ============ NOVOS DEFAULTS (v1.8.5: Aba Cartoes Lançamento Manual) ============
  // Usado quando usuario clica em "+ Lancar" do cartao ou FAB da aba Cartoes de Credito.
  defaultFormaPagamento?: 'CONTA' | 'CARTAO';
  defaultCartaoId?: string;
  defaultStatus?: TransactionStatus;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTransaction,
  categoriesList,
  categories = [],                          // DEFAULT SEGURO: impede TypeError undefined.filter
  onAddNewCategory,
  onAddFullCategory,
  accounts = [],
  creditCards = [],
  onInvoiceTransactionSaved,
  defaultType,
  defaultFormaPagamento, // NOVO v1.8.5
  defaultCartaoId,       // NOVO v1.8.5
  defaultStatus,         // NOVO v1.8.5
}) => {
  const [tipo, setTipo] = useState<TransactionType>('SAIDA');

  // Initialize tipo based on defaultType when modal opens
  useEffect(() => {
    if (isOpen && !editingTransaction) {
      setTipo(defaultType || 'SAIDA');
    }
  }, [isOpen, defaultType, editingTransaction]);
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string>('');
  const [valor, setValor] = useState<number | ''>('');
  const [data, setData] = useState('');
  const [status, setStatus] = useState<TransactionStatus>('PENDENTE');
  const [dataPostergar, setDataPostergar] = useState('');
  const [juros, setJuros] = useState<number | ''>('');
  const [contaId, setContaId] = useState('');

  // Forma de Pagamento / Cartão de Crédito
  const [formaPagamento, setFormaPagamento] = useState<'CONTA' | 'CARTAO'>('CONTA');
  const [cartaoId, setCartaoId] = useState<string>('');

  // Frequency/Billing States (Only for new entries)
  const [frequencia, setFrequencia] = useState<'AVULSO' | 'RECORRENTE' | 'PARCELADO'>('AVULSO');
  const [periodicidade, setPeriodicidade] = useState<'SEMANAL' | 'MENSAL' | 'ANUAL'>('MENSAL');
  const [totalParcelas, setTotalParcelas] = useState<number | ''>('');
  const [parcelaAtual, setParcelaAtual] = useState<number | undefined>(undefined);
  const [grupoRecorrenciaId, setGrupoRecorrenciaId] = useState<string | undefined>(undefined);
  const [dataCompra, setDataCompra] = useState<string | undefined>(undefined);
  const [tipoCalculoParcela, setTipoCalculoParcela] = useState<'TOTAL' | 'PARCELA'>('PARCELA');

  // Confirmation Overlays states
  const [showSaveScopeDialog, setShowSaveScopeDialog] = useState(false);
  const [showDeleteScopeDialog, setShowDeleteScopeDialog] = useState(false);

  // Local state for dynamic category creation
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ============================================================
  // FILTRO ESTRITO: Categorias SOMENTE do TIPO selecionado (ENTRADA / SAIDA)
  // + subcategorias disponiveis da categoria selecionada
  // ============================================================
  const availableCategoriesTyped: Category[] = useMemo(() => {
    const ctType = MAP_TIPO_CATEGORIA[tipo];
    return categories
      .filter(c => c.type === ctType)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [tipo, categories]);

  const availableCategoryNames = useMemo(
    () => Array.from(new Set([...availableCategoriesTyped.map(c => c.name), ...categoriesList[tipo]])),
    [availableCategoriesTyped, categoriesList, tipo]
  );

  const selectedCategoryObj: Category | undefined = useMemo(() => {
    if (!categoria) return undefined;
    return availableCategoriesTyped.find(c => c.name === categoria);
  }, [availableCategoriesTyped, categoria]);

  const subcategoriesList: string[] = useMemo(
    () => selectedCategoryObj?.subcategories ?? [],
    [selectedCategoryObj]
  );

  // Pre-populate if editing
  useEffect(() => {
    if (editingTransaction) {
      setTipo(editingTransaction.tipo);
      setDescricao(editingTransaction.descricao);
      setCategoria(editingTransaction.categoria);
      setCategoriaId(editingTransaction.categoriaId ?? null);
      setSubcategory(editingTransaction.subcategory ?? '');
      setValor(editingTransaction.valor);
      setData(editingTransaction.data);
      setStatus(editingTransaction.status);
      setDataPostergar(editingTransaction.dataPostergar || '');
      setJuros(editingTransaction.juros || '');
      setContaId(editingTransaction.contaId || (accounts[0]?.id || ''));
      setFrequencia(editingTransaction.frequencia || 'AVULSO');
      setPeriodicidade(editingTransaction.periodicidade || 'MENSAL');
      setTotalParcelas(editingTransaction.totalParcelas || '');
      setParcelaAtual(editingTransaction.parcelaAtual);
      setTipoCalculoParcela('PARCELA');
      setGrupoRecorrenciaId(editingTransaction.grupoRecorrenciaId);
      setDataCompra(editingTransaction.dataCompra);
      setIsAddingNew(false);
      setNewCategoryName('');
      setShowSaveScopeDialog(false);
      setShowDeleteScopeDialog(false);
      // Cartao de Credito
      if (editingTransaction.cartaoId) {
        setFormaPagamento('CARTAO');
        setCartaoId(editingTransaction.cartaoId);
      } else {
        setFormaPagamento('CONTA');
        setCartaoId('');
      }
    } else if (isOpen) {
      setTipo(defaultType || 'SAIDA');
      setDescricao('');
      setCategoria('');
      setCategoriaId(null);
      setSubcategory('');
      setValor('');
      const today = new Date().toISOString().split('T')[0];
      setData(today);
      // Status default: prioriza defaultStatus (ex: POSTERGAR para cartao de credito, pois nao paga na hora)
      setStatus(defaultStatus || 'PENDENTE');
      setDataPostergar('');
      setJuros('');
      setContaId(accounts[0]?.id || '');
      setFrequencia('AVULSO');
      setPeriodicidade('MENSAL');
      setTotalParcelas('');
      setParcelaAtual(undefined);
      setTipoCalculoParcela('PARCELA');
      setGrupoRecorrenciaId(undefined);
      setDataCompra(undefined);
      setIsAddingNew(false);
      setNewCategoryName('');
      setShowSaveScopeDialog(false);
      setShowDeleteScopeDialog(false);
      // ============ Cartao de Credito DEFAULTS (v1.8.5) ============
      // Se veio da aba Cartoes [+ Lancar] ou FAB cartoes:
      // formaPagamento = CARTAO, cartaoId = selecionado.
      // Caso nao tenha nada, cai em CONTA (padrao retrocompatibilidade).
      if (defaultFormaPagamento === 'CARTAO') {
        setFormaPagamento('CARTAO');
        // Valida que defaultCartaoId EXISTE mesmo no array (evitar valor bug)
        const cartaoExiste = defaultCartaoId && creditCards.some(c => c.id === defaultCartaoId);
        setCartaoId(cartaoExiste ? defaultCartaoId! : (creditCards[0]?.id || ''));
      } else {
        setFormaPagamento('CONTA');
        setCartaoId('');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTransaction, isOpen, accounts]);

  // Adjust categories list when tipo changes + sync categoriaId/subcategory
  useEffect(() => {
    if (!editingTransaction && availableCategoryNames.length > 0 && !isAddingNew) {
      const atualValida = categoria && availableCategoryNames.includes(categoria);
      if (!atualValida) {
        setCategoria(availableCategoryNames[0]);
      }
    }
    const matchingCat = availableCategoriesTyped.find(c => c.name === categoria);
    setCategoriaId(matchingCat ? matchingCat.id : null);
    // Reset subcategoria sempre que trocar tipo/categoria
    setSubcategory('');
  }, [tipo, availableCategoryNames, availableCategoriesTyped, editingTransaction, isAddingNew, categoria]);

  // Adjust status if invalid for the type
  useEffect(() => {
    if (tipo === 'ENTRADA' && status === 'PAGO') {
      setStatus('RECEBIDO');
    } else if (tipo === 'SAIDA' && status === 'RECEBIDO') {
      setStatus('PAGO');
    }
  }, [tipo]);

  if (!isOpen) return null;

  const calcularMesAlocacaoFatura = (dataRef: string, card: CreditCard): string => {
    const d = new Date(dataRef + 'T12:00:00');
    const dia = d.getDate();
    let mes = d.getMonth();
    let ano = d.getFullYear();
    if (dia >= card.diaFechamento) {
      mes++;
      if (mes > 11) {
        mes = 0;
        ano++;
      }
    }
    return `${ano}-${String(mes + 1).padStart(2, '0')}`;
  };

  const selectedCard = creditCards.find((c) => c.id === cartaoId);
  const mesAlvoPreview =
    tipo === 'SAIDA' && formaPagamento === 'CARTAO' && selectedCard && data
      ? calcularMesAlocacaoFatura(data, selectedCard)
      : null;

  const handleCategoryChange = (val: string) => {
    if (val === 'ADD_NEW_CAT') {
      setIsAddingNew(true);
      setNewCategoryName('');
    } else {
      setIsAddingNew(false);
      setCategoria(val);
      const matchingCat = availableCategoriesTyped.find(c => c.name === val);
      setCategoriaId(matchingCat ? matchingCat.id : null);
      setSubcategory('');
    }
  };

  const getPayload = (): Omit<Transaction, 'id'> & {
    id?: string;
    tipoCalculoParcela?: 'TOTAL' | 'PARCELA';
  } => {
    let finalCategory = categoria;
    let finalCategoriaId: string | null = categoriaId;
    let finalSubcategory: string | null = subcategory || null;

    if (isAddingNew) {
      finalCategory = newCategoryName.trim();
      finalCategoriaId = null;
      finalSubcategory = null;
    }

    const usaCartao = tipo === 'SAIDA' && formaPagamento === 'CARTAO' && !!selectedCard;

    return {
      id: editingTransaction?.id,
      tipo,
      descricao: descricao.trim(),
      categoria: finalCategory,
      categoriaId: finalCategoriaId,
      subcategory: finalSubcategory,
      valor: Number(valor),
      data,
      status,
      dataPostergar: status === 'POSTERGAR' ? dataPostergar : undefined,
      juros: tipo === 'SAIDA' && juros !== '' ? Number(juros) : undefined,
      contaId: usaCartao ? undefined : (contaId || undefined),
      frequencia,
      periodicidade: frequencia === 'RECORRENTE' ? periodicidade : undefined,
      totalParcelas: frequencia === 'PARCELADO' ? (Number(totalParcelas) || undefined) : undefined,
      parcelaAtual: parcelaAtual ?? (frequencia === 'PARCELADO' ? 1 : undefined),
      grupoRecorrenciaId,
      cartaoId: usaCartao ? selectedCard.id : (editingTransaction?.cartaoId || undefined),
      faturaId: editingTransaction?.faturaId || undefined,
      dataCompra: usaCartao ? data : (dataCompra ?? editingTransaction?.dataCompra ?? undefined),
      tipoCalculoParcela
    };
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return alert('Insira uma descrição');
    if (!valor || Number(valor) <= 0) return alert('Insira um valor maior que zero');
    if (!data) return alert('Selecione uma data');
    if (status === 'POSTERGAR' && !dataPostergar) {
      return alert('Informe a data de postergação');
    }
    const usaCartao = tipo === 'SAIDA' && formaPagamento === 'CARTAO';
    if (!usaCartao && !contaId && accounts.length > 0) {
      return alert('Selecione uma conta ou carteira para esta movimentação');
    }
    if (usaCartao && !cartaoId && creditCards.length > 0) {
      return alert('Selecione o cartão de crédito utilizado');
    }
    if (frequencia === 'PARCELADO' && (!totalParcelas || Number(totalParcelas) <= 1)) {
      return alert('O número total de parcelas deve ser maior que 1');
    }

    let finalCategory = categoria;
    let finalCategoriaId: string | null = categoriaId;

    if (isAddingNew) {
      const trimmedNewCat = newCategoryName.trim();
      if (!trimmedNewCat) {
        return alert('Digite o nome da nova categoria');
      }
      onAddNewCategory(tipo, trimmedNewCat);
      if (onAddFullCategory) {
        const newCatId = onAddFullCategory({
          name: trimmedNewCat,
          type: MAP_TIPO_CATEGORIA[tipo],
          subcategories: []
        });
        finalCategoriaId = newCatId;
      }
      finalCategory = trimmedNewCat;
    }

    if (!finalCategory) {
      return alert('Selecione ou cadastre uma categoria');
    }

    const cartaoUtilizado = usaCartao ? selectedCard : null;
    const mesAlocacao = cartaoUtilizado ? calcularMesAlocacaoFatura(data, cartaoUtilizado) : null;

    const realizarSave = () => {
      const payload = getPayload();
      const savePayload = {
        ...payload,
        ...(isAddingNew && finalCategoriaId ? { categoriaId: finalCategoriaId } : {}),
        ...(frequencia === 'PARCELADO' ? { tipoCalculoParcela } : {})
      };
      if (editingTransaction) {
        savePayload.id = editingTransaction.id;
      }
      onSave(savePayload);
      if (cartaoUtilizado && mesAlocacao && onInvoiceTransactionSaved) {
        if (frequencia === 'PARCELADO') {
          const tp = Number(totalParcelas) || 1;
          const dRef = new Date(data + 'T12:00:00');
          for (let i = 0; i < tp; i++) {
            const d = new Date(dRef);
            d.setMonth(d.getMonth() + i);
            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            onInvoiceTransactionSaved(cartaoUtilizado.id, m);
          }
        } else {
          onInvoiceTransactionSaved(cartaoUtilizado.id, mesAlocacao);
        }
      }
      onClose();
    };

    // Check if this is an edit of a recurring/installment item
    if (editingTransaction && editingTransaction.grupoRecorrenciaId) {
      setShowSaveScopeDialog(true);
    } else {
      realizarSave();
    }
  };

  const handleConfirmSave = (scope: 'ONLY_THIS' | 'THIS_AND_FUTURE') => {
    const payload = getPayload();
    if (editingTransaction) {
      payload.id = editingTransaction.id;
    }
    onSave(payload, scope);
    setShowSaveScopeDialog(false);
    onClose();
  };

  const handleConfirmDelete = (scope: 'ONLY_THIS' | 'THIS_AND_FUTURE') => {
    if (editingTransaction && onDelete) {
      onDelete(editingTransaction.id, scope);
      setShowDeleteScopeDialog(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in font-sans">
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Bottom Sheet Container */}
      <div className="relative w-full max-w-md bg-white border-t border-slate-200 rounded-t-[32px] shadow-2xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto">
        
        {/* Handle bar for native look */}
        <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-6 cursor-pointer" onClick={onClose} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-left">
            <h3 className="text-xl font-bold text-slate-800">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            {editingTransaction?.grupoRecorrenciaId && (
              <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider block mt-1">
                {editingTransaction.frequencia === 'PARCELADO' 
                  ? `Parcelado • Parcela ${editingTransaction.parcelaAtual}/${editingTransaction.totalParcelas}`
                  : `Recorrente • ${editingTransaction.periodicidade}`}
              </span>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          
          {/* Toggle Entrada / Saída */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              disabled={!!editingTransaction}
              onClick={() => {
                setTipo('SAIDA');
                setIsAddingNew(false);
              }}
              className={`py-3 px-4 rounded-xl font-extrabold text-sm transition-all duration-350 flex items-center justify-center gap-2 cursor-pointer ${
                tipo === 'SAIDA'
                  ? 'bg-rose-500/10 text-rose-600 border border-rose-200 font-black shadow-inner'
                  : 'text-slate-500 hover:text-slate-800'
              } ${editingTransaction ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Despesa
            </button>
            
            <button
              type="button"
              disabled={!!editingTransaction}
              onClick={() => {
                setTipo('ENTRADA');
                setIsAddingNew(false);
              }}
              className={`py-3 px-4 rounded-xl font-extrabold text-sm transition-all duration-350 flex items-center justify-center gap-2 cursor-pointer ${
                tipo === 'ENTRADA'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200 font-black shadow-inner'
                  : 'text-slate-500 hover:text-slate-800'
              } ${editingTransaction ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Receita
            </button>
          </div>

          {/* Amount input in big font */}
          <div className="flex flex-col items-center justify-center py-2 border-y border-slate-200">
            <label className="text-slate-500 text-xs uppercase font-bold mb-1">
              {frequencia === 'PARCELADO' && tipoCalculoParcela === 'TOTAL' ? 'Valor Total' : 'Valor'}
            </label>
            <div className="flex items-center text-slate-800 font-extrabold text-3xl font-mono">
              <span className={`mr-1.5 text-2xl ${tipo === 'SAIDA' ? 'text-rose-600' : 'text-emerald-600'}`}>R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="bg-transparent border-none focus:outline-none w-44 text-center font-extrabold text-slate-800 placeholder-slate-400"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-semibold shadow-inner"
              required
            />
          </div>

          {/* Frequência / Recorrência (Leitura em edição) */}
          {editingTransaction && editingTransaction.grupoRecorrenciaId && (
            <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-700">
                <RefreshCw size={13} />
                Lançamento em Série
              </div>
              {editingTransaction.frequencia === 'RECORRENTE' && (
                <p className="text-[11px] text-blue-800 font-bold">
                  Recorrência {editingTransaction.periodicidade === 'SEMANAL' ? 'Semanal' : editingTransaction.periodicidade === 'MENSAL' ? 'Mensal' : 'Anual'}
                  {editingTransaction.data && editingTransaction.periodicidade === 'MENSAL' && ` • Todo dia ${new Date(editingTransaction.data + 'T12:00:00').getDate().toString().padStart(2, '0')}`}
                  {editingTransaction.data && editingTransaction.periodicidade === 'SEMANAL' && ` • Toda ${['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][new Date(editingTransaction.data + 'T12:00:00').getDay()]}`}
                  {editingTransaction.data && editingTransaction.periodicidade === 'ANUAL' && ` • Todo dia ${new Date(editingTransaction.data + 'T12:00:00').getDate().toString().padStart(2, '0')}/${(new Date(editingTransaction.data + 'T12:00:00').getMonth() + 1).toString().padStart(2, '0')}`}
                </p>
              )}
              {editingTransaction.frequencia === 'PARCELADO' && (
                <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                  Parcelado em {editingTransaction.totalParcelas}x
                  <span className="ml-2 bg-blue-600 text-white px-2 py-0.5 rounded-full font-black text-[10px]">
                    {editingTransaction.parcelaAtual}ª de {editingTransaction.totalParcelas}
                  </span>
                </p>
              )}
              <p className="text-[9px] text-blue-600/90 font-semibold leading-tight">
                Ao alterar ou excluir, você decidirá se aplica somente a este ou a todos os próximos.
              </p>
            </div>
          )}

          {/* Frequência / Recorrência (Apenas para NOVOS lançamentos) */}
          {!editingTransaction && (
            <div className="space-y-3.5 bg-slate-50/50 p-3.5 border border-slate-200/50 rounded-2xl">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5">Frequência / Cobrança</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['AVULSO', 'RECORRENTE', 'PARCELADO'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFrequencia(opt)}
                      className={`py-2 px-1 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                        frequencia === opt
                          ? 'bg-slate-800 border-slate-900 text-white shadow-2xs font-extrabold'
                          : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                      }`}
                    >
                      {opt === 'AVULSO' ? 'Avulso / Único' : opt === 'RECORRENTE' ? 'Recorrente (Fixo)' : 'Parcelado'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condicional: Recorrente - Periodicidade + Dia de Repetição */}
              {frequencia === 'RECORRENTE' && (
                <div className="animate-fade-in space-y-3 border-t border-slate-200/50 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Periodicidade</label>
                      <select
                        value={periodicidade}
                        onChange={(e: any) => setPeriodicidade(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-3xs"
                      >
                        <option value="SEMANAL">Semanal</option>
                        <option value="MENSAL">Mensal</option>
                        <option value="ANUAL">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">
                        Dia de Repetição
                      </label>
                      {(() => {
                        const d = data ? new Date(data + 'T12:00:00') : null;
                        if (!d || isNaN(d.getTime())) return <p className="text-[10px] text-slate-500 font-semibold py-2">Selecione uma data</p>;
                        let text = '';
                        if (periodicidade === 'MENSAL') {
                          text = `Todo dia ${d.getDate().toString().padStart(2, '0')}`;
                        } else if (periodicidade === 'SEMANAL') {
                          text = `Toda ${['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][d.getDay()]}`;
                        } else {
                          text = `Todo dia ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                        }
                        return <p className="text-[11px] text-slate-800 font-black py-2 bg-white border border-slate-200 rounded-lg px-2.5 shadow-3xs">{text}</p>;
                      })()}
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 font-semibold leading-normal">
                    {periodicidade === 'MENSAL' && 'O sistema projetará 12 meses futuros como PENDENTE.'}
                    {periodicidade === 'SEMANAL' && 'O sistema projetará 24 semanas futuras como PENDENTE.'}
                    {periodicidade === 'ANUAL' && 'O sistema projetará 5 anos futuros como PENDENTE.'}
                  </p>
                </div>
              )}

              {/* Condicional: Parcelado */}
              {frequencia === 'PARCELADO' && (
                <div className="animate-fade-in space-y-3 border-t border-slate-200/50 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Total de Parcelas</label>
                      <input
                        type="number"
                        min="2"
                        placeholder="Ex: 12, 360, 420"
                        value={totalParcelas}
                        onChange={(e) => setTotalParcelas(e.target.value === '' ? '' : Math.max(2, parseInt(e.target.value) || 2))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-3xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Método de Cálculo</label>
                      <select
                        value={tipoCalculoParcela}
                        onChange={(e: any) => setTipoCalculoParcela(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-3xs"
                      >
                        <option value="PARCELA">Valor de cada Parcela</option>
                        <option value="TOTAL">Dividir o Valor Total</option>
                      </select>
                    </div>
                  </div>

                  {/* Resumo do Parcelamento com Nomenclatura */}
                  {totalParcelas !== '' && valor !== '' && (
                    <div className="bg-white border border-slate-200 p-2.5 rounded-xl space-y-1.5 text-[11px] shadow-3xs text-left">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500">Nomenclatura:</span>
                        <span className="font-extrabold text-slate-800 text-right truncate">
                          &ldquo;{descricao.trim() || 'Descrição'} (1/{totalParcelas})&rdquo;
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
                        <span className="font-bold text-slate-500">Valores:</span>
                        <span className="font-extrabold text-slate-800 text-right">
                          {tipoCalculoParcela === 'PARCELA'
                            ? `${totalParcelas}x de R$ ${Number(valor).toFixed(2)}  •  Total: R$ ${(Number(valor) * Number(totalParcelas)).toFixed(2)}`
                            : `${totalParcelas}x de R$ ${(Number(valor) / Number(totalParcelas)).toFixed(2)}  •  Total: R$ ${Number(valor).toFixed(2)}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Forma de Pagamento (apenas SAÍDA) */}
          {tipo === 'SAIDA' && (accounts.length > 0 || creditCards.length > 0) && (
            <div className="space-y-3 bg-slate-50/50 p-3.5 border border-slate-200/50 rounded-2xl">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('CONTA')}
                    disabled={accounts.length === 0}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      formaPagamento === 'CONTA'
                        ? 'bg-slate-800 border-slate-900 text-white shadow-2xs font-extrabold'
                        : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Wallet size={12} /> Conta / Dinheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('CARTAO')}
                    disabled={creditCards.length === 0}
                    className={`flex items-center justify-center gap-1.5 py-2 px-1 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      formaPagamento === 'CARTAO'
                        ? 'bg-slate-800 border-slate-900 text-white shadow-2xs font-extrabold'
                        : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <CreditCardIcon size={12} /> Cartão de Crédito
                  </button>
                </div>
              </div>

              {formaPagamento === 'CONTA' && accounts.length > 0 && (
                <div className="animate-fade-in">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Conta / Carteira</label>
                  <select
                    value={contaId}
                    onChange={(e) => setContaId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-3xs"
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

              {formaPagamento === 'CARTAO' && creditCards.length > 0 && (
                <div className="animate-fade-in space-y-2">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Cartão Utilizado</label>
                  <select
                    value={cartaoId}
                    onChange={(e) => setCartaoId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-3xs"
                    required
                  >
                    <option value="">Selecione um cartão</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} — {c.bandeira}
                      </option>
                    ))}
                  </select>

                  {mesAlvoPreview && selectedCard && (
                    <div className="flex items-start gap-2 bg-blue-50/70 border border-blue-100 rounded-lg p-2 text-[10px] leading-snug">
                      <Info size={12} className="text-blue-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-blue-800">
                          Lançamento alocado na fatura de {mesAlvoPreview}
                        </p>
                        <p className="font-semibold text-blue-700/90">
                          Fecha dia {selectedCard.diaFechamento.toString().padStart(2,'0')} • Vence dia {selectedCard.diaVencimento.toString().padStart(2,'0')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conta / Carteira Selector (fallback para ENTRADAS antigas) */}
          {tipo !== 'SAIDA' && accounts.length > 0 && (
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
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">
                Categoria {tipo === 'ENTRADA' ? '🟢' : '🔴'}
                <span className="ml-1 text-[9px] font-semibold text-slate-400 uppercase">
                  ({tipo === 'ENTRADA' ? 'Só Receitas' : 'Só Despesas'})
                </span>
              </label>
              <select
                value={isAddingNew ? 'ADD_NEW_CAT' : categoria}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-800 focus:outline-none focus:border-blue-500 text-sm font-semibold cursor-pointer shadow-2xs"
              >
                {availableCategoryNames.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="ADD_NEW_CAT">+ Cadastrar Nova...</option>
              </select>

              {/* Dynamic Sub-Input to Register New Category */}
              {isAddingNew && (
                <div className="mt-2.5 space-y-1 animate-fade-in">
                  <label className="block text-slate-500 text-[9px] font-bold uppercase">Nome da Nova Categoria</label>
                  <input
                    type="text"
                    placeholder="Nova categoria..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500 shadow-3xs"
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

          {/* Subcategoria — 2º Dropdown (só aparece se a categoria selecionada tiver subcategorias) */}
          {!isAddingNew && subcategoriesList.length > 0 && (
            <div className="animate-fade-in">
              <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">
                Subcategoria
                <span className="ml-1 text-[9px] font-semibold text-slate-400">
                  • {subcategoriesList.length} disponível(eis)
                </span>
              </label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-3 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-semibold cursor-pointer shadow-2xs"
              >
                <option value="">— Nenhuma / Detalhar depois —</option>
                {subcategoriesList.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase mb-1.5">Status</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('PENDENTE')}
                className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                  status === 'PENDENTE'
                    ? 'bg-slate-200 text-slate-800 border-slate-300 shadow-2xs font-extrabold'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
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
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
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
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
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
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-700'
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
                <span className="text-[10px] text-slate-500 font-bold">Opcional</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={juros}
                  onChange={(e) => setJuros(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Os juros acumulados serão adicionados ao total pago da despesa.</p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 flex gap-2">
            {editingTransaction && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (editingTransaction.grupoRecorrenciaId) {
                    setShowDeleteScopeDialog(true);
                  } else {
                    if (confirm('Tem certeza de que deseja deletar este lançamento?')) {
                      onDelete(editingTransaction.id);
                      onClose();
                    }
                  }
                }}
                className="flex-1 py-3.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 font-bold text-xs transition-all cursor-pointer animate-fade-in"
              >
                Excluir
              </button>
            )}

            <button
              type="submit"
              className={`py-3.5 rounded-xl text-white font-bold text-xs shadow-revolut-glow flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 ${editingTransaction && onDelete ? 'flex-[2]' : 'w-full'}`}
            >
              <Check size={16} />
              {editingTransaction ? 'Salvar Lançamento' : 'Confirmar Lançamento'}
            </button>
          </div>

        </form>
      </div>

      {/* CONFIRMATION POPUP 1: SAVE DIALOG (ONLY THIS vs THIS & NEXT) */}
      {showSaveScopeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl max-w-sm w-full text-left space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 text-blue-600">
              <RefreshCw size={24} className="animate-spin select-none" style={{ animationDuration: '3s' }} />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alterar Lançamento Fixo/Parcela</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Você está alterando um lançamento que pertence a uma recorrência ou parcelamento. Deseja aplicar as alterações apenas a este registro ou estendê-las para todos os lançamentos futuros deste grupo?
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmSave('ONLY_THIS')}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer text-center"
              >
                Alterar apenas este lançamento
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSave('THIS_AND_FUTURE')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-bold text-xs cursor-pointer text-center shadow-md"
              >
                Alterar este e todos os próximos
              </button>
              <button
                type="button"
                onClick={() => setShowSaveScopeDialog(false)}
                className="w-full py-2.5 text-center text-xs text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP 2: DELETE DIALOG (ONLY THIS vs THIS & NEXT) */}
      {showDeleteScopeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl max-w-sm w-full text-left space-y-4 animate-slide-up">
            <div className="flex items-center gap-3 text-rose-500">
              <X size={24} className="text-rose-500" />
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Excluir Lançamento Fixo/Parcela</h4>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Você deseja excluir apenas esta parcela/lançamento específico ou prefere remover esta ocorrência e todas as futuras deste grupo de recorrência?
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmDelete('ONLY_THIS')}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer text-center"
              >
                Excluir apenas este lançamento
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete('THIS_AND_FUTURE')}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer text-center shadow-md"
              >
                Excluir este e todos os próximos
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteScopeDialog(false)}
                className="w-full py-2.5 text-center text-xs text-slate-500 hover:text-slate-700 font-bold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
