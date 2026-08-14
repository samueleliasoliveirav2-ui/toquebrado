import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, Search, RefreshCw, LogOut, Loader2, AlertTriangle, Info, Home, Settings, Menu, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Briefcase, BarChart2, Wallet, CreditCard as CreditCardIcon, Eye, EyeOff, Sparkles, FileUp, CheckSquare, Square, Upload, FileText as FileTextIcon, BarChart3, LayoutList, Tag, Check } from 'lucide-react';
import type { Transaction, TransactionStatus, TransactionType, WorkShiftEntry, BankAccount, AccountTransfer, CreditCard, CreditCardInvoice, ExtractedInvoiceData, ExtractedInvoiceItem, Category, CategoryType, UserProfile, TemaVisual } from './types';
import { CATEGORIES, INITIAL_TRANSACTIONS, computeInvoiceDerivedStatus } from './types';
import { DEFAULT_CATEGORIES } from './categoriesDefaults';
import { StatsHeader } from './components/StatsHeader';
import { WeeklyAccordion } from './components/WeeklyAccordion';
import { TransactionModal } from './components/TransactionModal';
import { AuthScreen } from './components/AuthScreen';
import { ProfileSettings } from './components/ProfileSettings';
import { WorkShiftDashboard } from './components/WorkShiftDashboard';
import { WorkShiftModal } from './components/WorkShiftModal';
import { ReportsDashboard } from './components/ReportsDashboard';
import { AccountsDashboard } from './components/AccountsDashboard';
import { CreditCardsDashboard } from './components/CreditCardsDashboard';
import { CreditCardModal, BANK_PRESETS } from './components/CreditCardModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { AvatarDropdown } from './components/AvatarDropdown';
import { CategoryModal } from './components/CategoryModal';
import { supabase } from './lib/supabaseClient';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const CURRENT_VERSION = '1.0.1';

// Helper: gera 2 letras iniciais (uppercase) para fallback avatar SEM foto
// Ex: "Samuel Elias Oliveira" => "SE" | "Maria" => "MA" | "" => "U" (user)
function getInitials(name: string | undefined | null): string {
  if (!name) return 'U';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  const first = words[0][0] ?? 'U';
  const second = words.length >= 2 ? (words[words.length - 1][0] ?? first) : first;
  return (first + second).toUpperCase();
}

// Paleta de cores determinística para fallback avatar (cor baseada no nome => sempre a mesma cor p/ msm user)
function getAvatarAccentColor(name: string | undefined | null): string {
  const palette = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-cyan-600',
    'from-fuchsia-500 to-pink-600',
    'from-lime-500 to-emerald-600'
  ];
  const seed = (name ?? 'U').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [workShifts, setWorkShifts] = useState<WorkShiftEntry[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [creditCardInvoices, setCreditCardInvoices] = useState<CreditCardInvoice[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Active view state
  const [activeTab, setActiveTab] = useState<'INICIO' | 'PERFIL' | 'DIARIAS' | 'RELATORIOS' | 'CONTAS' | 'CARTOES'>('INICIO');
  const [reportsInitialReport, setReportsInitialReport] = useState<'VISAO_GERAL' | 'STATUS_LANCAMENTOS' | 'DIARIAS_TRABALHO' | 'DRE_PESSOAL' | 'FATURAS_CARTAO' | 'GASTO_MEDIO_DIARIO'>('VISAO_GERAL');
  const [reportsRemountKey, setReportsRemountKey] = useState<number>(0);

  // Sidebar Drawer menu state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // App version alert state
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  // Modal states for Work Shifts
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShiftEntry, setEditingShiftEntry] = useState<WorkShiftEntry | null>(null);

  // Modal states for Credit Cards
  const [isCreditCardModalOpen, setIsCreditCardModalOpen] = useState(false);
  const [editingCreditCard, setEditingCreditCard] = useState<CreditCard | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [selectedInvoiceCard, setSelectedInvoiceCard] = useState<CreditCard | null>(null);

  const hoje = new Date();
  const mesAnoAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const [invoiceDetailMonth, setInvoiceDetailMonth] = useState(mesAnoAtual);

  // Custom Dynamic Categories state
  const [customCategories, setCustomCategories] = useState<Record<'ENTRADA' | 'SAIDA', string[]>>(() => {
    const saved = localStorage.getItem('toquebrado_custom_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing custom categories', e);
      }
    }
    return {
      ENTRADA: ['Pró-Labore', 'Salário', 'Investimentos', 'Freelance', 'Outros'],
      SAIDA: ['Aluguel', 'Supermercado', 'Assinaturas', 'Transporte', 'Lazer', 'Saúde', 'Cartão', 'Empréstimo', 'Outros']
    };
  });

  // Filtering and Searching states
  const [selectedMonth, setSelectedMonth] = useState(mesAnoAtual);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Revolut & Apple Wallet states
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const mainInicioScrollRef = useRef<number>(0);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedWalletCard, setSelectedWalletCard] = useState<CreditCard | null>(null);
  const [inicioViewMode, setInicioViewMode] = useState<'LIST' | 'CHART'>('LIST');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | TransactionStatus>('TODOS');
  const [statusMenuAberto, setStatusMenuAberto] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('SAIDA');
  const [settingsAvatarUrl, setSettingsAvatarUrl] = useState<string | null>(null);

  // ============================================================
  // CATEGORIES / SUBCATEGORIES (Novo modulo!)
  // ============================================================
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Helper: gera UUID local (caso nao consigamos pegar do Supabase insert de primeira)
  const genCategoryId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  };

  // --- Fetch Categories from Supabase ---
  const fetchCategories = async (uid: string): Promise<Category[]> => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', uid);
      if (error) {
        console.error('[fetchCategories] Supabase error:', error.message || error);
        return [];
      }
      if (!data || data.length === 0) return [];

      return data.map((row: any) => ({
        id: String(row.id),
        userId: row.user_id,
        name: String(row.name || ''),
        type: (row.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as CategoryType,
        subcategories: Array.isArray(row.subcategories) ? row.subcategories.map(String) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (e) {
      console.error('[fetchCategories] exception:', e);
      return [];
    }
  };

  // --- Seed DEFAULT_CATEGORIES se tabela estiver vazia ---
  const seedCategoriesIfEmpty = async (uid: string, currentCategories: Category[]): Promise<Category[]> => {
    if (currentCategories.length > 0) return currentCategories;

    try {
      const rows: any[] = DEFAULT_CATEGORIES.map((c) => ({
        user_id: uid,
        name: c.name,
        type: c.type,
        subcategories: c.subcategories
      }));
      const { data, error } = await supabase
        .from('categories')
        .insert(rows)
        .select('*');
      if (error) {
        console.warn('[seedCategoriesIfEmpty] Supabase error:', error.message || error);
        // Fallback: salva em memoria com ids gerados localmente
        return DEFAULT_CATEGORIES.map((c) => ({
          id: genCategoryId(),
          userId: uid,
          name: c.name,
          type: c.type,
          subcategories: [...c.subcategories]
        }));
      }
      if (!data) return [];
      return data.map((row: any) => ({
        id: String(row.id),
        userId: row.user_id,
        name: String(row.name || ''),
        type: (row.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as CategoryType,
        subcategories: Array.isArray(row.subcategories) ? row.subcategories.map(String) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (e) {
      console.error('[seedCategoriesIfEmpty] exception:', e);
      return DEFAULT_CATEGORIES.map((c) => ({
        id: genCategoryId(),
        userId: uid,
        name: c.name,
        type: c.type,
        subcategories: [...c.subcategories]
      }));
    }
  };

  // --- CRUD: Add Category ---
  const handleAddCategory = async (payload: Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Category | null> => {
    if (!userId) return null;
    try {
      const row = {
        user_id: userId,
        name: payload.name.trim(),
        type: payload.type,
        subcategories: (payload.subcategories || []).map(String)
      };
      const { data, error } = await supabase
        .from('categories')
        .insert([row])
        .select('*');
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const r = data[0];
      const newCat: Category = {
        id: String(r.id),
        userId: r.user_id,
        name: String(r.name || ''),
        type: (r.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as CategoryType,
        subcategories: Array.isArray(r.subcategories) ? r.subcategories.map(String) : [],
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
      setCategories(prev => [...prev, newCat]);
      return newCat;
    } catch (e: any) {
      console.error('[handleAddCategory] error:', e?.message || e);
      triggerToast('Não foi possível criar categoria: ' + (e?.message || 'desconhecido'));
      // Fallback optimistic local
      const newCatLocal: Category = {
        id: genCategoryId(),
        userId,
        name: payload.name.trim(),
        type: payload.type,
        subcategories: [...(payload.subcategories || [])]
      };
      setCategories(prev => [...prev, newCatLocal]);
      return newCatLocal;
    }
  };

  // --- CRUD: Update Category ---
  const handleUpdateCategory = async (
    categoryId: string,
    changes: Partial<Omit<Category, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    if (!userId || !categoryId) return false;
    try {
      const dbPayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (changes.name !== undefined) dbPayload.name = String(changes.name).trim();
      if (changes.type !== undefined) dbPayload.type = changes.type;
      if (changes.subcategories !== undefined) dbPayload.subcategories = changes.subcategories.map(String);

      const { error } = await supabase
        .from('categories')
        .update(dbPayload)
        .eq('id', categoryId)
        .eq('user_id', userId);
      if (error) throw error;

      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, ...changes, name: changes.name !== undefined ? changes.name.trim() : c.name } : c));
      return true;
    } catch (e: any) {
      console.error('[handleUpdateCategory] error:', e?.message || e);
      triggerToast('Não foi possível atualizar categoria: ' + (e?.message || 'desconhecido'));
      return false;
    }
  };

  // --- CRUD: Delete Category ---
  const handleDeleteCategory = async (categoryId: string): Promise<boolean> => {
    if (!userId || !categoryId) return false;
    try {
      // Validação: existe transaction com esta categoriaId ou categoria (nome)?
      const cat = categories.find(c => c.id === categoryId);
      if (cat) {
        const hasTransactions = transactions.some(tx =>
          tx.categoriaId === categoryId ||
          tx.categoria === cat.name
        );
        if (hasTransactions) {
          triggerToast('Não é possível excluir: existem lançamentos vinculados a esta categoria.');
          return false;
        }
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      triggerToast('Categoria excluída!');
      return true;
    } catch (e: any) {
      console.error('[handleDeleteCategory] error:', e?.message || e);
      triggerToast('Não foi possível excluir categoria: ' + (e?.message || 'desconhecido'));
      return false;
    }
  };

  // ======= CATEGORY MODAL wrappers (abri modal com contexto correto) =======
  const openNewCategoryModal = (type: CategoryType) => {
    setEditingCategory(null);
    // Default type = selecionado. Depois o user pode mudar no modal.
    setIsCategoryModalOpen(true);
    // Setamos um editing fake? Nao. Pre-setamos no state do modal via useEffect.
    // Mas para que o modal abra já com o type correto (Receita/Despesa), passamos via
    // um estado extra OU nós forçamos o editingCategory parcial. Simples: criamos "defaultTypeForNew"
    setCategoryModalDefaultType(type);
  };
  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryModalDefaultType(cat.type);
    setIsCategoryModalOpen(true);
  };
  const openAddSubcategoryModal = async (cat: Category) => {
    // Abre o modal de edição já posicionado no input de subcategoria
    openEditCategoryModal(cat);
  };
  // Estado temporario para pre-setar o tipo inicial do modal ao criar NOVA categoria
  const [categoryModalDefaultType, setCategoryModalDefaultType] = useState<CategoryType>('EXPENSE');

  // Handler do SAVE do CategoryModal
  const handleCategoryModalSave = async (
    payload: { name: string; type: CategoryType; subcategories: string[] },
    existingId?: string
  ): Promise<boolean> => {
    if (existingId) {
      return await handleUpdateCategory(existingId, payload);
    } else {
      const created = await handleAddCategory(payload);
      return !!created;
    }
  };

  // Helper para TransactionModal: cria categoria COMPLETA (com tipo + subcategories)
  // e retorna o ID (UUID Supabase OU local gen) — usado quando user cadastra categoria
  // nova INLINE dentro do modal de lançamentos.
  const handleAddFullCategory = (payload: { name: string; type: CategoryType; subcategories: string[] }): string => {
    let genId: string | null = null;
    handleAddCategory(payload).then(created => {
      if (created) {
        // Nada — state já atualizado no handleAddCategory
      }
    });
    // Retorno sincrono: se a operação for assincrona o id correto
    // só chega no próximo setState, então geramos temporário local
    // garantindo unicidade.
    genId = genCategoryId();
    // Mas se ja existir uma category com nome + type no state, usa o id dela
    const existing = categories.find(c => c.name === payload.name.trim() && c.type === payload.type);
    return existing?.id ?? genId;
  };

  // --- Helper: converte array de Category[] -> Record<tipo, string[]> compat (transactions modal antigo) ---
  const legacyCategoriesList = useMemo<Record<TransactionType, string[]>>(() => {
    const income = categories.filter(c => c.type === 'INCOME').map(c => c.name);
    const expense = categories.filter(c => c.type === 'EXPENSE').map(c => c.name);

    // Merge com o customCategories local p/ retrocompatibilidade
    const mergedEntradas = Array.from(new Set([...(customCategories?.ENTRADA ?? []), ...income]));
    const mergedSaidas = Array.from(new Set([...(customCategories?.SAIDA ?? []), ...expense]));

    return {
      ENTRADA: mergedEntradas,
      SAIDA: mergedSaidas
    };
  }, [categories, customCategories]);

  // --- Importacao Fatura PDF ---
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [pdfImportStep, setPdfImportStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');
  const [pdfImportFileName, setPdfImportFileName] = useState<string>('');
  const [pdfImportExtracted, setPdfImportExtracted] = useState<ExtractedInvoiceData | null>(null);
  const [pdfImportCartaoId, setPdfImportCartaoId] = useState<string>('');
  const [pdfImportIsParsing, setPdfImportIsParsing] = useState(false);
  const [pdfImportDebugText, setPdfImportDebugText] = useState<string>('');
  const [pdfImportMethodUsed, setPdfImportMethodUsed] = useState<string>('');

  const openModalForType = (tipo: 'ENTRADA' | 'SAIDA') => {
    setEditingTransaction(null);
    setModalDefaultType(tipo);
    setIsModalOpen(true);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const defaultSampleCards: CreditCard[] = [
    { id: 'itau-sample', userId: '', nome: 'Itaú Visa Platinum', bandeira: 'VISA', limiteTotal: 12000, diaFechamento: 3, diaVencimento: 10, cor: '#f97316', banco: 'Itaú' },
    { id: 'c6-sample', userId: '', nome: 'C6 Bank Silver', bandeira: 'MASTERCARD', limiteTotal: 8500, diaFechamento: 5, diaVencimento: 15, cor: '#475569', banco: 'C6 Bank' },
    { id: 'revolut-sample', userId: '', nome: 'Revolut Ultra', bandeira: 'VISA', limiteTotal: 25000, diaFechamento: 1, diaVencimento: 8, cor: '#0e69b2', banco: 'Outro / Personalizado' },
    { id: 'nubank-sample', userId: '', nome: 'Nubank Ultravioleta', bandeira: 'MASTERCARD', limiteTotal: 15000, diaFechamento: 2, diaVencimento: 7, cor: '#3b0764', banco: 'Nubank' }
  ];

  const cardsToDisplay = creditCards.length > 0 ? creditCards : defaultSampleCards;

  const getCardPreset = (card: CreditCard) => {
    if (card.banco && BANK_PRESETS[card.banco]) {
      return BANK_PRESETS[card.banco];
    }
    const name = card.nome.toLowerCase();
    if (name.includes('itau') || name.includes('itaú')) return BANK_PRESETS['Itaú'];
    if (name.includes('nubank') || name.includes('roxo')) return BANK_PRESETS['Nubank'];
    if (name.includes('c6')) return BANK_PRESETS['C6 Bank'];
    if (name.includes('mercado pago') || name.includes('mercadopago')) return BANK_PRESETS['Mercado Pago'];
    if (name.includes('banco do brasil') || name.includes('bb ')) return BANK_PRESETS['Banco do Brasil'];
    if (name.includes('bradesco')) return BANK_PRESETS['Bradesco'];
    if (name.includes('santander')) return BANK_PRESETS['Santander'];
    if (name.includes('inter')) return BANK_PRESETS['Inter'];
    return { gradient: '', logo: '' };
  };


  const getActiveCardLabel = () => {
    const card = creditCards.find(c => c.id === activeCardId) || creditCards[0] || defaultSampleCards[0];
    if (card) {
      return `${card.nome} • ${card.id.slice(-4)}`;
    }
    return 'Itaú Visa • 4456';
  };

  const getCardStatus = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    if (!card) {
      return {
        title: 'Cartão',
        desc: 'Sem dados disponíveis.',
        icon: 'shield' as const,
        iconClass: 'text-slate-500 bg-slate-500/10',
        btnText: 'Ver Detalhes',
        action: () => triggerToast('Sem cartão selecionado.')
      };
    }
    const hoje = new Date();
    const mesAnoAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const txsFaturaAtual = transactions.filter(
      (t) => t.cartaoId === card.id && t.data.startsWith(mesAnoAtual) && t.tipo === 'SAIDA'
    );
    const totalFaturaAtual = txsFaturaAtual.reduce((s, t) => s + Number(t.valor) + Number(t.juros || 0), 0);
    const limiteUtilizado = totalFaturaAtual;
    const limiteDisponivel = Math.max(0, card.limiteTotal - limiteUtilizado);
    const fmt = (v: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
    const diaVenc = String(card.diaVencimento).padStart(2, '0');
    const mesVenc = String(hoje.getMonth() + 1).padStart(2, '0');
    const fatura = creditCardInvoices.find(
      (i) => i.cartaoId === card.id && i.mesAno === mesAnoAtual
    );
    const faturaResolved = fatura ? computeInvoiceDerivedStatus(fatura, hoje) : 'ABERTA';
    const statusPago = faturaResolved === 'PAGA';
    const temFatura = totalFaturaAtual > 0.0049;

    let title = `Limite Disponível: ${fmt(limiteDisponivel)}`;
    let desc = '';
    if (temFatura) {
      if (statusPago) {
        desc = `Fatura de ${mesVenc}/${hoje.getFullYear()} paga. Total ${fmt(totalFaturaAtual)}.`;
      } else {
        desc = `Fatura atual em ${fmt(totalFaturaAtual)} com vencimento para ${diaVenc}/${mesVenc}.`;
      }
    } else {
      desc = `Sem compras lançadas no cartão. Limite total: ${fmt(card.limiteTotal)}.`;
    }

    return {
      title,
      desc,
      icon: 'shield' as const,
      iconClass: 'text-emerald-600 bg-emerald-500/10',
      btnText: temFatura && !statusPago ? 'Pagar Fatura Antecipada' : 'Ver Histórico de Faturas',
      action: () => {
        if (temFatura && !statusPago) {
          triggerToast(`Pagamento antecipado de ${fmt(totalFaturaAtual)} agendado!`);
        } else {
          triggerToast('Histórico de faturas em breve.');
        }
      }
    };
  };

  // Sync custom categories to localStorage
  useEffect(() => {
    localStorage.setItem('toquebrado_custom_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Check for app updates from version.json
  const checkVersion = async () => {
    try {
      const res = await fetch('/version.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data.version && data.version !== CURRENT_VERSION) {
          setNewVersionAvailable(true);
          return true;
        }
      }
    } catch (e) {
      console.error('Error checking version:', e);
    }
    return false;
  };

  // Check for app updates periodically and on tab focus
  useEffect(() => {
    // Check immediately on load
    checkVersion();

    // Check every 60 seconds
    const interval = setInterval(checkVersion, 60000);

    // Check when user returns to app tab / visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Helper async para carregar perfil + categorias juntos e evitar race conditions
  const loadUserData = async (uid: string) => {
    // Carrega os 2 em paralelo para mais performance
    const profilePromise = fetchUserProfile(uid);
    const categoriesPromise = fetchCategories(uid);
    const [, fetchedCats] = await Promise.all([profilePromise, categoriesPromise]);
    // Seed DEFAULT_CATEGORIES se o usuario nao tem nenhuma (primeiro login apos o deploy)
    const seededCats = await seedCategoriesIfEmpty(uid, fetchedCats ?? []);
    setCategories(seededCats);
  };

  // 1. Session check and listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const nome = session.user.user_metadata?.nome || session.user.email || 'Usuário';
        setCurrentUser(nome);
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
        loadUserData(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const nome = session.user.user_metadata?.nome || session.user.email || 'Usuário';
        setCurrentUser(nome);
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
        loadUserData(session.user.id);
      } else {
        setCurrentUser(null);
        setUserEmail('');
        setUserId(null);
        setUserProfile(null);
        setTransactions([]);
        setWorkShifts([]);
        setCategories([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) {
        console.error('fetchUserProfile error:', error.message || error);
        return;
      }
      if (data) {
        // CUIDADO com avatarUrl: preserva NULL (excluída) OU string (base64). Nao converta null para undefined!
        const avatarFromDb: string | null | undefined =
          data.avatar_url === null ? null :
          (typeof data.avatar_url === 'string' ? data.avatar_url : undefined);

        const profile: UserProfile = {
          id: data.id,
          nomeCompleto: data.nome_completo || undefined,
          email: data.email || undefined,
          telefone: data.telefone || undefined,
          avatarUrl: avatarFromDb,
          moedaPadrao: data.moeda_padrao || 'BRL',
          temaVisual: (data.tema_visual as TemaVisual) || 'LIGHT',
          ocultarSaldosDefault: !!data.ocultar_saldos_default,
          tipoPlano: data.tipo_plano || 'PESSOAL'
        };
        setUserProfile(profile);
        // Sync IMEDIATO do avatar da tela Ajustes (header global) = o que esta no banco
        setSettingsAvatarUrl(profile.avatarUrl ?? null);
        // Reflete instantaneamente no header/sidebar
        if (profile.nomeCompleto) setCurrentUser(profile.nomeCompleto);
        if (profile.email) setUserEmail(profile.email);
        if (profile.ocultarSaldosDefault) setIsBalanceVisible(false);
      } else {
        // Se nao tem perfil ainda, tenta criar um fallback (trigger geralmente cuida, mas garante)
        try {
          const nowEmail = userEmail || undefined;
          const nowNome = currentUser || undefined;
          await supabase
            .from('profiles')
            .insert({
              id: uid,
              nome_completo: nowNome || null,
              email: nowEmail || null,
              moeda_padrao: 'BRL',
              tema_visual: 'LIGHT',
              ocultar_saldos_default: false,
              tipo_plano: 'PESSOAL'
            });
          setUserProfile({
            id: uid,
            nomeCompleto: nowNome,
            email: nowEmail,
            moedaPadrao: 'BRL',
            temaVisual: 'LIGHT',
            ocultarSaldosDefault: false,
            tipoPlano: 'PESSOAL'
          });
        } catch {
          // fallback silencioso
        }
      }
    } catch (err) {
      console.error('fetchUserProfile exception:', err);
    }
  };

  // 2. Fetch transactions from Supabase
  const fetchTransactions = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('data', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else if (data) {
        const mapped: Transaction[] = data.map((item: any) => ({
          id: item.id,
          data: item.data,
          descricao: item.descricao,
          categoria: item.categoria,
          tipo: item.tipo,
          valor: Number(item.valor),
          status: item.status,
          dataPostergar: item.data_postergar || undefined,
          juros: item.juros !== null && item.juros !== undefined ? Number(item.juros) : undefined,
          contaId: item.conta_id || undefined,
          frequencia: item.frequencia || 'AVULSO',
          periodicidade: item.periodicidade || undefined,
          parcelaAtual: item.parcela_atual || undefined,
          totalParcelas: item.total_parcelas || undefined,
          grupoRecorrenciaId: item.grupo_recorrencia_id || undefined,
          cartaoId: item.cartao_id || undefined,
          faturaId: item.fatura_id || undefined,
          dataCompra: item.data_compra || undefined
        }));
        setTransactions(mapped);

        // Intelligently scan and append any unique categories from Supabase transactions to the selector lists!
        const uniqueEntradas = new Set(customCategories.ENTRADA);
        const uniqueSaidas = new Set(customCategories.SAIDA);
        let updated = false;

        mapped.forEach(tx => {
          if (tx.tipo === 'ENTRADA' && !uniqueEntradas.has(tx.categoria)) {
            uniqueEntradas.add(tx.categoria);
            updated = true;
          } else if (tx.tipo === 'SAIDA' && !uniqueSaidas.has(tx.categoria)) {
            uniqueSaidas.add(tx.categoria);
            updated = true;
          }
        });

        if (updated) {
          setCustomCategories({
            ENTRADA: Array.from(uniqueEntradas),
            SAIDA: Array.from(uniqueSaidas)
          });
        }
      }
    } catch (err) {
      console.error('Unexpected error loading database data', err);
    }
  };

  // 3. Fetch Work Shifts from Supabase
  const fetchWorkShifts = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('diarias_trabalho')
        .select('*')
        .order('data', { ascending: false });

      if (error) {
        console.error('Error fetching work shifts:', error);
      } else if (data) {
        const mapped: WorkShiftEntry[] = data.map((item: any) => ({
          id: item.id,
          data: item.data,
          atividade: item.atividade,
          tipo: item.tipo,
          categoria: item.categoria || undefined,
          valor: Number(item.valor),
          valorDiaria: item.valor_diaria !== null && item.valor_diaria !== undefined ? Number(item.valor_diaria) : undefined,
          quantidadeDias: item.quantidade_dias !== null && item.quantidade_dias !== undefined ? Number(item.quantidade_dias) : undefined,
          status: item.status || 'RECEBIDO',
          dataRecebimento: item.data_recebimento || undefined,
          observacao: item.observacao || undefined,
          vinculoId: item.vinculo_id || undefined,
          contaId: item.conta_id || undefined,
          tipoRecebimento: (item.tipo_recebimento as any) || undefined,
          qtdParcelas: item.qtd_parcelas !== null && item.qtd_parcelas !== undefined ? Number(item.qtd_parcelas) : undefined,
          periodicidadeParcelas: (item.periodicidade_parcelas as any) || undefined,
          parcelaAtual: item.parcela_atual !== null && item.parcela_atual !== undefined ? Number(item.parcela_atual) : undefined,
          totalParcelas: item.total_parcelas !== null && item.total_parcelas !== undefined ? Number(item.total_parcelas) : undefined,
          grupoId: (item.grupo_id || item.grupo) || undefined
        }));
        setWorkShifts(mapped);
      }
    } catch (err) {
      console.error('Unexpected error loading work shifts data', err);
    }
  };

  const seedDefaultAccounts = async () => {
    if (!userId) return;
    try {
      const defaults = [
        { user_id: userId, nome: 'Carteira Dinheiro', tipo: 'DINHEIRO', tipo_pessoa: 'PF', saldo_inicial: 50.00, cor: '#64748b' },
        { user_id: userId, nome: 'Nubank Principal', tipo: 'CORRENTE', tipo_pessoa: 'PF', saldo_inicial: 1000.00, cor: '#8b5cf6' },
        { user_id: userId, nome: 'Itaú PJ', tipo: 'CORRENTE', tipo_pessoa: 'PJ', saldo_inicial: 3500.00, cor: '#f97316' }
      ];
      const { error } = await supabase.from('contas_bancarias').insert(defaults);
      if (error) {
        console.error('Error seeding default accounts:', error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAccounts = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
      } else if (data) {
        const mapped: BankAccount[] = data.map((item: any) => ({
          id: item.id,
          nome: item.nome,
          banco: item.banco || undefined,
          tipo: item.tipo,
          tipoPessoa: item.tipo_pessoa,
          saldoInicial: Number(item.saldo_inicial),
          cor: item.cor || undefined
        }));

        if (mapped.length === 0) {
          await seedDefaultAccounts();
          // re-fetch once after seed
          const { data: dataSeed } = await supabase
            .from('contas_bancarias')
            .select('*')
            .order('nome', { ascending: true });
          if (dataSeed) {
            setAccounts(dataSeed.map((item: any) => ({
              id: item.id,
              nome: item.nome,
              banco: item.banco || undefined,
              tipo: item.tipo,
              tipoPessoa: item.tipo_pessoa,
              saldoInicial: Number(item.saldo_inicial),
              cor: item.cor || undefined
            })));
          }
        } else {
          setAccounts(mapped);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransfers = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transferencias')
        .select('*')
        .order('data', { ascending: false });

      if (error) {
        console.error('Error fetching transfers:', error);
      } else if (data) {
        const mapped: AccountTransfer[] = data.map((item: any) => ({
          id: item.id,
          contaOrigemId: item.conta_origem_id,
          contaDestinoId: item.conta_destino_id,
          valor: Number(item.valor),
          data: item.data,
          observacao: item.observacao || undefined
        }));
        setTransfers(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCreditCards = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('cartoes_credito')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Error fetching credit cards:', error);
      } else if (data) {
        const mapped: CreditCard[] = data.map((item: any) => {
          const rawCor = item.cor || '';
          const parts = rawCor.split('|');
          const hasPreset = parts.length > 1;
          const banco = hasPreset ? parts[0] : undefined;
          const cor = hasPreset ? parts[1] : (rawCor || '#0f172a');
          return {
            id: item.id,
            userId: item.user_id,
            nome: item.nome,
            bandeira: item.bandeira || 'OUTROS',
            limiteTotal: Number(item.limite_total) || 0,
            diaFechamento: Number(item.dia_fechamento) || 1,
            diaVencimento: Number(item.dia_vencimento) || 5,
            cor,
            banco,
            contaPagamentoPadraoId: item.conta_pagamento_padrao_id || undefined
          };
        });
        setCreditCards(mapped);
      }
    } catch (err) {
      console.error('Unexpected error loading credit cards', err);
    }
  };

  const fetchCreditCardInvoices = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('faturas_cartao')
        .select('*')
        .order('mes_ano', { ascending: true });

      if (error) {
        console.error('Error fetching credit card invoices:', error);
      } else if (data) {
        const mapped: CreditCardInvoice[] = data.map((item: any) => ({
          id: item.id,
          userId: item.user_id,
          cartaoId: item.cartao_id,
          mesAno: item.mes_ano,
          dataFechamento: item.data_fechamento,
          dataVencimento: item.data_vencimento,
          valorTotal: Number(item.valor_total) || 0,
          status: item.status || 'ABERTA',
          valorPago: item.valor_pago !== null && item.valor_pago !== undefined ? Number(item.valor_pago) : undefined,
          dataPagamento: item.data_pagamento || undefined
        }));
        setCreditCardInvoices(mapped);
      }
    } catch (err) {
      console.error('Unexpected error loading credit card invoices', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTransactions();
      fetchWorkShifts();
      fetchAccounts();
      fetchTransfers();
      fetchCreditCards();
      fetchCreditCardInvoices();
    }
  }, [userId]);

  // ===== Helpers de data (sem travas, dinâmicos) =====
  const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // A partir do ano/mês "YYYY-MM" avança ou recua N meses (infinito)
  const addMeses = (mesAno: string, delta: number): string => {
    const [a, m] = mesAno.split('-').map(Number);
    if (!a || !m) return mesAno;
    const total = a * 12 + (m - 1) + delta;
    const novoAno = Math.floor(total / 12);
    const novoMes = ((total % 12) + 12) % 12;
    return `${novoAno}-${String(novoMes + 1).padStart(2, '0')}`;
  };

  const formatarMesLabel = (mesAno: string): string => {
    const [a, m] = mesAno.split('-').map(Number);
    if (!a || !m) return mesAno;
    return `${NOMES_MESES[m - 1]} de ${a}`;
  };

  // Intervalo: 5 anos atrás → 10 anos no futuro (15 anos, 180 meses)
  const ANO_ATUAL = hoje.getFullYear();
  const ANO_INICIO = ANO_ATUAL - 5;
  const ANO_FIM = ANO_ATUAL + 10;

  const months = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    for (let ano = ANO_INICIO; ano <= ANO_FIM; ano++) {
      for (let mes = 1; mes <= 12; mes++) {
        const key = `${ano}-${String(mes).padStart(2, '0')}`;
        list.push({ key, label: `${NOMES_MESES[mes - 1]} de ${ano}` });
      }
    }
    return list;
  }, [ANO_INICIO, ANO_FIM]);

  // Navegação INFINITA (não depende do array months[] — cálculo matemático)
  const handlePrevMonth = () => {
    setSelectedMonth(prev => addMeses(prev, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMeses(prev, +1));
  };

  const selectedMonthLabel = months.find(m => m.key === selectedMonth)?.label ?? formatarMesLabel(selectedMonth);

  // ===== Projeção de lançamentos: Avulso (exato) | Parcelado | Recorrente =====
  // Devolve true se a transação cai (ou tem parcela prevista) no mês selecionado
  // Usa data de vencimento/postergar como PRIORIDADE sobre data do evento
  const caiNoMesSelecionado = (tx: Transaction, mesAnoSel: string): boolean => {
    const activeDate = (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
    const mesAnoTx = activeDate.slice(0, 7);

    const freq = (tx.frequencia || 'AVULSO').toUpperCase();

    // === AVULSO: somente se data exata bater ===
    if (freq === 'AVULSO') return mesAnoTx === mesAnoSel;

    // === PARCELADO: 1ª parcela = mesAnoTx; última = +(totalParcelas-1) meses ===
    if (freq === 'PARCELADO') {
      const total = Number(tx.totalParcelas) || Number(tx.parcelaAtual) || 1;
      if (total <= 1) return mesAnoTx === mesAnoSel;
      const mesInicio = activeDate.slice(0, 7);
      const mesFim = addMeses(mesInicio, total - 1);
      // Comparação alfabética funciona em YYYY-MM
      return mesAnoSel >= mesInicio && mesAnoSel <= mesFim;
    }

    // === RECORRENTE: todo mês a partir da data inicial (sem limite no futuro) ===
    if (freq === 'RECORRENTE' || freq === 'RECORRENCIA') {
      const mesInicio = activeDate.slice(0, 7);
      return mesAnoSel >= mesInicio;
    }

    // Fallback
    return mesAnoTx === mesAnoSel;
  };

  // ==== WorkShift (Diárias/Eventos): FILTRO ESTRITO POR MÊS DE VENCIMENTO ====
  // ⚠️ A diferença-chave: WorkShifts são 1 ENTRADA POR PARCELA (já individuais no banco!)
  // NÃO projetamos intervalo (isso é só para Transaction tipo PARCELADO, que é 1 lançamento-mãe).
  // Apenas verificamos se a DATA DE VENCIMENTO (dataRecebimento, fallback data evento)
  // cai ESTRITAMENTE dentro do mês/ano selecionado.
  // NENHUM lançamento de outro mês aparece. NÃO há duplicação.
  const caiWorkShiftNoMes = (e: WorkShiftEntry, mesAnoSel: string): boolean => {
    const dataVencimento = e.dataRecebimento || e.data;
    const mesAnoVenc = dataVencimento.slice(0, 7);
    return mesAnoVenc === mesAnoSel;
  };

  // Filtered month transactions (com projeção de parcelas e recorrentes)
  const monthTransactions = transactions.filter(tx => caiNoMesSelecionado(tx, selectedMonth));

  // Filtered month work shifts (usa dataRecebimento como vencimento + projeção parcelas)
  const monthWorkShifts = workShifts.filter(e => caiWorkShiftNoMes(e, selectedMonth));

  // ============================================================
  // v1.7.7 UNIFICA LANCAMENTOS NA LISTAGEM INICIAL
  // (converte WorkShifts para formato Transaction-like)
  // → Cards entradas/saídas somam WorkShifts (v1.7.5)
  // → LISTAGEM SEMANAL agora TAMBÉM MOSTRA WorkShifts (soma consistente!)
  // Mapeamento STATUS (WorkShift → TransactionStatus):
  //   WorkShift ENTRADA RECEBIDO  → Transaction RECEBIDO
  //   WorkShift ENTRADA A_RECEBER → Transaction PENDENTE
  //   WorkShift SAIDA (qualquer)  → Transaction PAGO (sempre pago na hora, custo rua)
  // ============================================================
  const monthWorkShiftsAsTransaction: Transaction[] = monthWorkShifts.map((ws) => {
    let txStatus: TransactionStatus = 'PENDENTE';
    if (ws.tipo === 'SAIDA') txStatus = 'PAGO';
    else if (ws.status === 'RECEBIDO') txStatus = 'RECEBIDO';
    else /* A_RECEBER ou indefinido */ txStatus = 'PENDENTE';

    const dataVencimento = (ws.dataRecebimento || ws.data).slice(0, 10);
    // WorkShiftEntry campos REAIS (types.ts): atividade, categoria, observacao, valorDiaria...
    const categoriaPadrao = ws.tipo === 'ENTRADA'
      ? (ws.atividade || 'Diária / Trabalho')
      : (ws.categoria || 'Custos de Rua');
    const descricaoCompleta = ws.tipo === 'ENTRADA'
      ? `🎟️ ${ws.atividade || 'Diária'}${ws.tipoRecebimento === 'PARCELADO' ? ` · Parcela ${ws.parcelaAtual || 1}/${ws.qtdParcelas || ws.totalParcelas || 'N'}` : ''}${ws.tipoRecebimento === 'RECORRENTE' ? ' · Recorrente' : ''}`
      : (ws.observacao || ws.categoria || 'Custo de rua (trabalho)');

    const { id: _wsId, ..._rest } = ws; void _rest;
    const baseId = `ws__${ws.id}`;

    const txLike: Transaction & { _isWorkShift?: boolean; _workShiftId?: string } = {
      id: baseId,
      data: dataVencimento,
      descricao: descricaoCompleta,
      categoria: categoriaPadrao,
      categoriaId: undefined,
      subcategory: ws.categoria || (ws.tipo === 'ENTRADA' ? ws.atividade : undefined),
      tipo: ws.tipo,
      valor: Number(ws.valor || 0),
      status: txStatus,
      juros: 0,
      contaId: ws.contaId || undefined,
      cartaoId: undefined,
      observacao: ws.observacao,
      recorrente: ws.tipoRecebimento === 'RECORRENTE',
      frequencia: (ws.tipoRecebimento === 'PARCELADO' ? 'PARCELADO' : (ws.tipoRecebimento === 'RECORRENTE' ? 'RECORRENTE' : 'AVULSO')),
      parcelaAtual: ws.parcelaAtual,
      totalParcelas: (ws.qtdParcelas || ws.totalParcelas),
      grupoRecorrenciaId: ws.grupoId,
      // Campos usados apenas em runtime (nao existem no tipo Transaction — cast via any:)
    } as any;
    (txLike as any)._isWorkShift = true;
    (txLike as any)._workShiftId = ws.id;
    return txLike;
  });
  // Array UNIFICADO (transactions pessoais + workShifts convertidos) —
  // é este que entra em filtros (busca/tipo/status) E na listagem semanal.
  const monthUnifiedTransactions: Transaction[] = [
    ...monthTransactions,
    ...monthWorkShiftsAsTransaction,
  ];

  // Cumulative Balance (All-time actual liquid: RECEIVED entries - PAID exits)
  // INCLUI workShifts (Diárias/Trabalhos):
  //  + WorkShift ENTRADA status === "RECEBIDO" (saldo real)
  //  - WorkShift SAIDA (custos de rua, saída sempre confirmada, nao tem status pendente)
  const saldoAcumulado = transactions.reduce((sum, tx) => {
    if (tx.tipo === 'ENTRADA' && tx.status === 'RECEBIDO') {
      return sum + tx.valor;
    } else if (tx.tipo === 'SAIDA' && tx.status === 'PAGO') {
      return sum - (tx.valor + (tx.juros || 0));
    }
    return sum;
  }, 0) + workShifts.reduce((sum, ws) => {
    if (ws.tipo === 'ENTRADA' && (ws.status === 'RECEBIDO' || !ws.status)) {
      // RECEBIDO ou sem status (antigos default RECEBIDO)
      return sum + ws.valor;
    }
    if (ws.tipo === 'SAIDA') {
      // WorkShift SAIDA = custo rua sempre pago (nao tem status)
      return sum - ws.valor;
    }
    return sum;
  }, 0);

  // Projected Income this month (All ENTRADAs in selected month)
  // INCLUI workShifts ENTRADA (qualquer status: RECEBIDO + A_RECEBER = projetado, igual transacoes pessoais)
  const totalEntradasMes = (
    monthTransactions.filter(tx => tx.tipo === 'ENTRADA').reduce((sum, tx) => sum + tx.valor, 0)
    + monthWorkShifts.filter(ws => ws.tipo === 'ENTRADA').reduce((sum, ws) => sum + ws.valor, 0)
  );

  // Projected Expenses this month (All SAIDAs in selected month + their juros)
  // INCLUI workShifts SAIDA (custos de rua, sempre do mes selecionado, sem juros)
  const totalSaidasMes = (
    monthTransactions.filter(tx => tx.tipo === 'SAIDA').reduce((sum, tx) => sum + tx.valor + (tx.juros || 0), 0)
    + monthWorkShifts.filter(ws => ws.tipo === 'SAIDA').reduce((sum, ws) => sum + ws.valor, 0)
  );

  // ============================================================
  // HERO FINANCEIRO "TÔ QUEBRADO?" (Etapa 1)
  // Cálculo conservador (só usa dados reais, sem inventar valores).
  // Estados: positivo / atenção / crítico / neutro.
  // Posição: abaixo de "Saldo Disponível" na Home.
  // ============================================================
  const financialHeroWidget = useMemo(() => {
    type HeroStatus = 'positivo' | 'atencao' | 'critico' | 'neutro';
    let status: HeroStatus = 'neutro';
    let boldText = 'Vamos entender como está seu mês';
    let descriptionText = 'Vamos entender como está seu mês.';

    const hasAnyData = (transactions.length > 0 || workShifts.length > 0) && (totalEntradasMes > 0 || totalSaidasMes > 0);

    if (hasAnyData) {
      if (saldoAcumulado < 0 || (totalSaidasMes > 0 && saldoAcumulado < totalSaidasMes * 0.4)) {
        status = 'critico';
        boldText = 'Ih... apertou.';
        descriptionText = 'Suas despesas previstas superam o saldo disponível.';
      } else if (totalSaidasMes > totalEntradasMes && totalEntradasMes > 0) {
        status = 'atencao';
        boldText = 'Calma aí...';
        descriptionText = 'As contas deste mês estão maiores que as receitas.';
      } else if (totalEntradasMes > 0 && saldoAcumulado >= totalSaidasMes) {
        status = 'positivo';
        boldText = 'Não. Tá tranquilo.';
        descriptionText = 'Você está dentro do seu ritmo financeiro este mês.';
      }
    }

    const accentByStatus: Record<HeroStatus, { text: string; pill: string }> = {
      positivo: { text: 'text-emerald-300', pill: 'bg-emerald-400/10 text-emerald-200' },
      atencao:  { text: 'text-cyan-200',    pill: 'bg-cyan-400/10 text-cyan-100'       },
      critico:  { text: 'text-rose-300',    pill: 'bg-rose-400/10 text-rose-100'       },
      neutro:   { text: 'text-slate-200',   pill: 'bg-white/10 text-slate-200'         }
    };
    const accent = accentByStatus[status];

    return (
      <div className="pt-3 mt-2 border-t border-white/10 max-w-[252px] mx-auto text-center space-y-0.5 select-none font-sans">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.18em] block">
          tô quebrado?
        </span>
        <div className="flex flex-col items-center justify-center">
          <span className={`text-sm font-black tracking-tight ${accent.text}`}>
            {boldText}
          </span>
          <p className={`text-[11px] text-white/80 font-medium max-w-[230px] leading-tight mt-1`}>
            &ldquo;{descriptionText}&rdquo;
          </p>
        </div>
      </div>
    );
  }, [transactions.length, totalEntradasMes, totalSaidasMes, saldoAcumulado]);

  // ============================================================
  // 🔍 ASSISTENTE FINANCEIRO DISCRETO (Etapa 2 — 💡 FAB Esquerdo)
  // SAIBA MAIS (simetria ESQUERDA=inteligência  ↔  DIREITA=ação +):
  // - NUNCA abre sozinho. Usuário decide (evita irritação).
  // - Indicador • aparece apenas se ATENÇÃO ou CRÍTICO.
  // - CRÍTICO: pulse ÚNICA (1x) no 1º carregamento (sem piscar).
  // - Dismissed por (mes+status) salvo em localStorage.
  // ============================================================

  // 2.1 Cálculos mês anterior (para comparação intermensal real)
  const prevMonthKey = useMemo((): string => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yy}-${mm}`;
  }, [selectedMonth]);

  const { prevTotalSaidas, prevTotalEntradas } = useMemo(() => {
    let saidas = 0;
    let entradas = 0;
    for (const tx of transactions) {
      if (!caiNoMesSelecionado(tx, prevMonthKey)) continue;
      if (tx.tipo === 'SAIDA') saidas += tx.valor + (tx.juros || 0);
      else if (tx.tipo === 'ENTRADA') entradas += tx.valor;
    }
    return { prevTotalSaidas: saidas, prevTotalEntradas: entradas };
  }, [transactions, prevMonthKey]);

  // 2.2 Estado reativo do popup (usuario decide quando abre)
  const [isInsightPopupOpen, setIsInsightPopupOpen] = useState(false);
  const [hasShownCriticalPulse, setHasShownCriticalPulse] = useState(false);

  // 2.3 dismissed map (nao reaparece o mesmo insight esse mês):
  // localStorage key "insights_dismissed_v1" = Record<string, true>
  // keys: `${selectedMonth}|${status}` -> true = usuário já dispensou
  const dismissKey = (status: string) => `${selectedMonth}|${status}`;
  const getDismissedMap = (): Record<string, true> => {
    try {
      const raw = localStorage.getItem('insights_dismissed_v1');
      return raw ? (JSON.parse(raw) as Record<string, true>) : {};
    } catch {
      return {};
    }
  };
  const [dismissedMap, setDismissedMap] = useState<Record<string, true>>(() => getDismissedMap());
  const persistDismissedMap = (next: Record<string, true>) => {
    try { localStorage.setItem('insights_dismissed_v1', JSON.stringify(next)); } catch {}
    setDismissedMap(next);
  };

  // 2.4 Cálculo do insight atual (APENAS dados reais)
  type InsightStatus = 'ok' | 'atencao' | 'critico' | 'nenhum';
  interface InsightPayload {
    status: InsightStatus;
    bold: string;          // "Não. Tá tranquilo." / "Calma aí..." / "Ih... apertou."
    description: string;   // texto com dados reais e %
    cta: string | null;    // "Ver gastos" / "Ver o que aconteceu" / null
    ctaAction: null | (() => void);
  }
  const financialInsight = useMemo<InsightPayload>(() => {
    const hasData = (totalEntradasMes > 0 || totalSaidasMes > 0);
    if (!hasData) {
      return {
        status: 'nenhum',
        bold: 'Vamos entender como está seu mês.',
        description: 'Adicione lançamentos que começo a te ajudar.',
        cta: null,
        ctaAction: null
      };
    }

    // CRÍTICO (prioridade mais alta): despesas > entradas ESTE MÊS
    if (totalSaidasMes > totalEntradasMes && totalEntradasMes > 0) {
      const delta = totalSaidasMes - totalEntradasMes;
      const pctOver = Math.min(999, Math.round(((totalSaidasMes - totalEntradasMes) / totalEntradasMes) * 100));
      return {
        status: 'critico',
        bold: 'Ih... apertou.',
        description:
          `Suas despesas já ultrapassaram suas entradas neste mês em R$ ${delta.toFixed(2).replace('.', ',')} (${pctOver}%).`,
        cta: 'Ver o que aconteceu →',
        ctaAction: null
      };
    }

    // ATENÇÃO (2 alternativas — pega a mais informativa):
    // A) já gastou >= 78% da renda PREVISTA mês corrente
    // B) intermensal: saídas do mês >= 10% aMIORES vs mês anterior
    const gastoPctRenda = totalEntradasMes > 0 ? Math.round((totalSaidasMes / totalEntradasMes) * 100) : 0;
    if (totalEntradasMes > 0 && gastoPctRenda >= 78) {
      return {
        status: 'atencao',
        bold: 'Calma aí...',
        description: `Você já gastou ${gastoPctRenda}% da sua renda prevista para o mês.`,
        cta: 'Ver gastos →',
        ctaAction: null
      };
    }

    const deltaPctSaidas = prevTotalSaidas > 0
      ? Math.round(((totalSaidasMes - prevTotalSaidas) / prevTotalSaidas) * 100)
      : 0;
    if (prevTotalSaidas > 50 && deltaPctSaidas >= 10) {
      return {
        status: 'atencao',
        bold: 'Calma aí...',
        description:
          `Seus gastos estão ${deltaPctSaidas}% maiores que no mês passado.`,
        cta: 'Ver gastos →',
        ctaAction: null
      };
    }

    // POSITIVO (opcional: só mostra mensagem suave, sem indicador •)
    // 1) queda >= 10% nas saídas vs mês passado
    if (prevTotalSaidas > 50 && deltaPctSaidas <= -10) {
      const menos = Math.abs(deltaPctSaidas);
      return {
        status: 'ok',
        bold: 'Não. Tá tranquilo.',
        description: `Você gastou ${menos}% menos este mês, mandou bem!`,
        cta: null,
        ctaAction: null
      };
    }
    // 2) saldo acumulado >= saídas previstas mês
    if (saldoAcumulado >= totalSaidasMes && totalSaidasMes > 0) {
      return {
        status: 'ok',
        bold: 'Não. Tá tranquilo.',
        description: 'Você está dentro do seu ritmo financeiro este mês.',
        cta: null,
        ctaAction: null
      };
    }

    return {
      status: 'ok',
      bold: 'Não. Tá tranquilo.',
      description: 'Até agora, tudo correndo nos trilhos.',
      cta: null,
      ctaAction: null
    };
  }, [transactions.length, totalEntradasMes, totalSaidasMes, prevTotalSaidas, prevTotalEntradas, saldoAcumulado]);

  // O insight foi dispensado este mês? (usuário clicou em ×)
  const insightIsDismissed = (() => {
    if (financialInsight.status === 'ok' || financialInsight.status === 'nenhum') return false;
    return !!dismissedMap[dismissKey(financialInsight.status)];
  })();

  // Mostrar indicador • se existir insight relevante e usuário NÃO dispensou
  const showInsightDot =
    (financialInsight.status === 'atencao' || financialInsight.status === 'critico') &&
    !insightIsDismissed;

  // Pulse ÚNICA no estado crítico (só 1x por carregamento)
  const shouldPlayCriticalPulse =
    financialInsight.status === 'critico' && !hasShownCriticalPulse && !insightIsDismissed;
  useEffect(() => {
    if (shouldPlayCriticalPulse) {
      const t = setTimeout(() => setHasShownCriticalPulse(true), 1800);
      return () => clearTimeout(t);
    }
  }, [shouldPlayCriticalPulse]);

  // Filtered list display
  // v1.7.7: FILTRA array UNIFICADO (monthUnifiedTransactions = transactions + workShifts)
  // → Nome cliente, categoria, observacao, descricao sao usados na busca.
  const displayTransactions = monthUnifiedTransactions.filter((tx) => {
    const matchesSearch = 
      tx.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.subcategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((tx as any).observacao || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'TODOS' || tx.tipo === filterType;
    const matchesStatus =
      statusFilter === 'TODOS' || tx.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Count mock transactions present in account
  const mockTransactions = transactions.filter(tx =>
    INITIAL_TRANSACTIONS.some(mock =>
      tx.descricao === mock.descricao &&
      tx.valor === mock.valor &&
      tx.tipo === mock.tipo
    )
  );
  const mockTransactionsCount = mockTransactions.length;

  const handleToggleStatus = async (id: string) => {
    // ==============================================
    // v1.7.7: WORK SHIFTS tambem aparecem no click badge status.
    // Detecta ID "ws__XXXX" e se for WorkShift:
    //   ENTRADA:  A_RECEBER (PENDENTE) ↔ RECEBIDO
    //   SAIDA:    status sempre PAGO (nao faz toggle, custo sempre pago)
    // ID que NÃO começa com "ws__" = fluxo Transaction pessoal ANTIGO.
    // ==============================================
    if (typeof id === 'string' && id.startsWith('ws__')) {
      const wsId = id.slice(4);
      const targetWs = workShifts.find(w => w.id === wsId);
      if (!targetWs) return;
      if (targetWs.tipo === 'SAIDA') return; // custo rua sempre pago, nao toggle.

      // WorkShift ENTRADA: A_RECEBER ↔ RECEBIDO (exatamente oposto)
      const novoStatusWS: 'RECEBIDO' | 'A_RECEBER' =
        (targetWs.status === 'RECEBIDO') ? 'A_RECEBER' : 'RECEBIDO';

      // 1) Optimistic state update
      setWorkShifts(prev =>
        prev.map(w => w.id === wsId ? { ...w, status: novoStatusWS } : w)
      );
      // 2) Persist Supabase
      try {
        const { error } = await supabase
          .from('diarias_trabalho')
          .update({ status: novoStatusWS })
          .eq('id', wsId);
        if (error) {
          console.error('toggle workshift status DB error:', error);
          fetchWorkShifts();
        }
      } catch {
        fetchWorkShifts();
      }
      return;
    }

    // Fluxo ANTIGO (transactions pessoais):
    const targetTx = transactions.find(t => t.id === id);
    if (!targetTx) return;

    let newStatus: TransactionStatus;
    let newDate = targetTx.data;

    if (targetTx.tipo === 'ENTRADA') {
      newStatus = targetTx.status === 'RECEBIDO' ? 'PENDENTE' : 'RECEBIDO';
    } else {
      newStatus = targetTx.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    }

    // Promote postponed date to main date if marked as paid/received
    if (targetTx.status === 'POSTERGAR' && targetTx.dataPostergar) {
      newDate = targetTx.dataPostergar;
    }

    // Optimistic state update
    setTransactions(prev =>
      prev.map(tx => tx.id === id ? { 
        ...tx, 
        status: newStatus, 
        data: newDate, 
        dataPostergar: undefined 
      } : tx)
    );

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: newStatus, 
          data: newDate, 
          data_postergar: null 
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating status in database:', error);
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
      fetchTransactions();
    }
  };

  // ---------- HELPERS: Date Math & UUID ----------
  const generateUuid = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const addDays = (dateStr: string, n: number): string => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };

  const addMonths = (dateStr: string, n: number): string => {
    const d = new Date(dateStr + 'T12:00:00');
    const targetDay = d.getDate();
    d.setMonth(d.getMonth() + n);
    if (d.getDate() !== targetDay) d.setDate(0);
    return d.toISOString().split('T')[0];
  };

  const addYears = (dateStr: string, n: number): string => {
    const d = new Date(dateStr + 'T12:00:00');
    const targetDay = d.getDate();
    const targetMonth = d.getMonth();
    d.setFullYear(d.getFullYear() + n);
    if (d.getMonth() !== targetMonth || d.getDate() !== targetDay) d.setDate(0);
    return d.toISOString().split('T')[0];
  };

  // ---------- MAIN: Save Transaction ----------
  const handleSaveTransaction = async (
    payload: Omit<Transaction, 'id'> & {
      id?: string;
      tipoCalculoParcela?: 'TOTAL' | 'PARCELA';
    },
    scope?: 'ONLY_THIS' | 'THIS_AND_FUTURE'
  ) => {
    if (!userId) return;

    const calcularMesAlocacao = (dataRef: string, cc: CreditCard): string => {
      const d = new Date(dataRef + 'T12:00:00');
      const dia = d.getDate();
      let mes = d.getMonth();
      let ano = d.getFullYear();
      if (dia >= cc.diaFechamento) {
        mes++;
        if (mes > 11) { mes = 0; ano++; }
      }
      return `${ano}-${String(mes + 1).padStart(2, '0')}`;
    };

    const obterFaturaId = async (cc: CreditCard, dataRef: string): Promise<string | null> => {
      const mesAlvo = calcularMesAlocacao(dataRef, cc);
      const inv = await getOrCreateInvoiceFor(cc, mesAlvo);
      return inv?.id || null;
    };

    try {
      // ==============================
      // CASO 1: EDIÇÃO (payload.id existe)
      // ==============================
      if (payload.id) {
        const oldTx = transactions.find(t => t.id === payload.id);
        const cartao = payload.cartaoId ? creditCards.find((c) => c.id === payload.cartaoId) : null;
        let faturaId: string | null = null;
        if (cartao) {
          faturaId = await obterFaturaId(cartao, payload.data);
        }

        const baseDbPayload = {
          user_id: userId,
          data: payload.data,
          descricao: payload.descricao,
          categoria: payload.categoria,
          tipo: payload.tipo,
          valor: payload.valor,
          status: payload.status,
          data_postergar: payload.dataPostergar || null,
          juros: payload.juros || 0,
          conta_id: payload.contaId || null,
          frequencia: payload.frequencia || 'AVULSO',
          periodicidade: payload.periodicidade || null,
          parcela_atual: payload.parcelaAtual || null,
          total_parcelas: payload.totalParcelas || null,
          grupo_recorrencia_id: payload.grupoRecorrenciaId || null,
          cartao_id: payload.cartaoId || null,
          fatura_id: faturaId,
          data_compra: payload.dataCompra || (payload.cartaoId ? payload.data : null)
        };

        // Sub-caso A: Edição com grupo_recorrenciaId e scope THIS_AND_FUTURE
        if (payload.grupoRecorrenciaId && scope === 'THIS_AND_FUTURE') {
          const currentDate = payload.data;

          const { error } = await supabase
            .from('transactions')
            .update({
              categoria: baseDbPayload.categoria,
              tipo: baseDbPayload.tipo,
              valor: baseDbPayload.valor,
              conta_id: baseDbPayload.conta_id,
              frequencia: baseDbPayload.frequencia,
              periodicidade: baseDbPayload.periodicidade
            })
            .eq('grupo_recorrencia_id', payload.grupoRecorrenciaId)
            .gte('data', currentDate);

          if (error) throw error;

          const { error: errorSingle } = await supabase
            .from('transactions')
            .update(baseDbPayload)
            .eq('id', payload.id);

          if (errorSingle) throw errorSingle;

        } else {
          // Sub-caso B: Apenas este lançamento (ou avulso)
          const { error } = await supabase
            .from('transactions')
            .update(baseDbPayload)
            .eq('id', payload.id);

          if (error) throw error;
        }

        await fetchTransactions();

        // Recalcular totais das faturas antiga e nova
        if (payload.cartaoId && cartao) {
          const newMes = calcularMesAlocacao(payload.data, cartao);
          await recalcInvoiceTotals(payload.cartaoId, newMes);
        }

        if (oldTx && oldTx.cartaoId) {
          const oldCard = creditCards.find(c => c.id === oldTx.cartaoId);
          if (oldCard) {
            const oldMes = calcularMesAlocacao(oldTx.data, oldCard);
            const newMes = payload.cartaoId && cartao ? calcularMesAlocacao(payload.data, cartao) : '';
            if (oldTx.cartaoId !== payload.cartaoId || oldMes !== newMes) {
              await recalcInvoiceTotals(oldTx.cartaoId, oldMes);
            }
          }
        }

        return;
      }

      // ==============================
      // CASO 2: CRIAÇÃO (novo lançamento)
      // ==============================
      const frequencia = payload.frequencia || 'AVULSO';
      const cartao = payload.cartaoId ? creditCards.find((c) => c.id === payload.cartaoId) : null;

      // ----- 2A: Lançamento Avulso / Único -----
      if (frequencia === 'AVULSO') {
        let faturaId: string | null = null;
        if (cartao) faturaId = await obterFaturaId(cartao, payload.data);

        const dbPayload = {
          user_id: userId,
          data: payload.data,
          descricao: payload.descricao,
          categoria: payload.categoria,
          tipo: payload.tipo,
          valor: payload.valor,
          status: payload.status,
          data_postergar: payload.dataPostergar || null,
          juros: payload.juros || 0,
          conta_id: payload.contaId || null,
          frequencia: 'AVULSO',
          periodicidade: null,
          parcela_atual: null,
          total_parcelas: null,
          grupo_recorrencia_id: null,
          cartao_id: payload.cartaoId || null,
          fatura_id: faturaId,
          data_compra: payload.dataCompra || (payload.cartaoId ? payload.data : null)
        };

        const { error } = await supabase.from('transactions').insert(dbPayload);
        if (error) throw error;
        if (cartao && faturaId) {
          const mesAlvo = calcularMesAlocacao(payload.data, cartao);
          recalcInvoiceTotals(cartao.id, mesAlvo);
        }

      // ----- 2B: Lançamento Recorrente (Fixo) -----
      } else if (frequencia === 'RECORRENTE') {
        const periodicidade = payload.periodicidade || 'MENSAL';
        const grupoId = generateUuid();

        const totalOcorrencias =
          periodicidade === 'SEMANAL' ? 24
          : periodicidade === 'MENSAL' ? 12
          : 5; // ANUAL

        const rows = [];
        const mesesParaRecalcular = new Set<string>();
        for (let i = 0; i < totalOcorrencias; i++) {
          let targetDate = payload.data;
          if (periodicidade === 'SEMANAL') targetDate = addDays(payload.data, i * 7);
          else if (periodicidade === 'MENSAL') targetDate = addMonths(payload.data, i);
          else targetDate = addYears(payload.data, i);

          const statusInicial = i === 0 ? payload.status : 'PENDENTE';
          if (cartao) {
            const mesAlvo = calcularMesAlocacao(targetDate, cartao);
            mesesParaRecalcular.add(mesAlvo);
          }

          rows.push({
            user_id: userId,
            data: targetDate,
            descricao: payload.descricao,
            categoria: payload.categoria,
            tipo: payload.tipo,
            valor: payload.valor,
            status: statusInicial,
            data_postergar: i === 0 ? (payload.dataPostergar || null) : null,
            juros: i === 0 ? (payload.juros || 0) : 0,
            conta_id: payload.contaId || null,
            frequencia: 'RECORRENTE',
            periodicidade,
            parcela_atual: null,
            total_parcelas: null,
            grupo_recorrencia_id: grupoId,
            cartao_id: payload.cartaoId || null,
            fatura_id: null,
            data_compra: payload.dataCompra || (payload.cartaoId ? payload.data : null)
          });
        }

        const { error } = await supabase.from('transactions').insert(rows);
        if (error) throw error;

        if (cartao && mesesParaRecalcular.size > 0) {
          for (const m of mesesParaRecalcular) {
            recalcInvoiceTotals(cartao.id, m);
          }
        }

      // ----- 2C: Lançamento Parcelado -----
      } else if (frequencia === 'PARCELADO') {
        const totalParcelas = Number(payload.totalParcelas) || 1;
        const grupoId = generateUuid();

        let valorParcela: number;
        if (payload.tipoCalculoParcela === 'TOTAL') {
          valorParcela = Number((Number(payload.valor) / totalParcelas).toFixed(2));
        } else {
          valorParcela = Number(payload.valor.toFixed(2));
        }

        const BATCH_SIZE = 100;
        const mesesParaRecalcular = new Set<string>();
        const rows = [];
        for (let i = 1; i <= totalParcelas; i++) {
          const targetDate = addMonths(payload.data, i - 1);
          const statusInicial = i === 1 ? payload.status : 'PENDENTE';
          const sufixo = `(${i}/${totalParcelas})`;
          const descricaoCompleta = `${payload.descricao} ${sufixo}`;

          if (cartao) {
            const mesAlvo = calcularMesAlocacao(targetDate, cartao);
            mesesParaRecalcular.add(mesAlvo);
          }

          rows.push({
            user_id: userId,
            data: targetDate,
            descricao: descricaoCompleta,
            categoria: payload.categoria,
            tipo: payload.tipo,
            valor: valorParcela,
            status: statusInicial,
            data_postergar: i === 1 ? (payload.dataPostergar || null) : null,
            juros: i === 1 ? (payload.juros || 0) : 0,
            conta_id: payload.contaId || null,
            frequencia: 'PARCELADO',
            periodicidade: null,
            parcela_atual: i,
            total_parcelas: totalParcelas,
            grupo_recorrencia_id: grupoId,
            cartao_id: payload.cartaoId || null,
            fatura_id: null,
            data_compra: payload.dataCompra || (payload.cartaoId ? payload.data : null)
          });
        }

        const insertBatch = async (batch: any[]) => {
          const { error } = await supabase.from('transactions').insert(batch);
          if (error) throw error;
        };

        if (rows.length <= BATCH_SIZE) {
          await insertBatch(rows);
        } else {
          for (let b = 0; b < rows.length; b += BATCH_SIZE) {
            const batch = rows.slice(b, b + BATCH_SIZE);
            await insertBatch(batch);
          }
        }

        if (cartao && mesesParaRecalcular.size > 0) {
          for (const m of mesesParaRecalcular) {
            recalcInvoiceTotals(cartao.id, m);
          }
        }
      }

      await fetchTransactions();
    } catch (err: any) {
      console.error('Error saving transaction to database:', err);
      alert('Ocorreu um erro ao salvar o lançamento no banco de dados: ' + (err.message || err.details || JSON.stringify(err)));
    }
  };

  // ---------- MAIN: Delete Transaction ----------
  const handleDeleteTransaction = async (
    id: string,
    scope?: 'ONLY_THIS' | 'THIS_AND_FUTURE'
  ) => {
    try {
      const targetTx = transactions.find(tx => tx.id === id);

      if (targetTx && targetTx.grupoRecorrenciaId && scope === 'THIS_AND_FUTURE') {
        const currentDate = targetTx.status === 'POSTERGAR' && targetTx.dataPostergar
          ? targetTx.dataPostergar
          : targetTx.data;

        setTransactions(prev =>
          prev.filter(tx =>
            !(tx.grupoRecorrenciaId === targetTx.grupoRecorrenciaId &&
              (tx.status === 'POSTERGAR' && tx.dataPostergar
                ? tx.dataPostergar >= currentDate
                : tx.data >= currentDate))
          )
        );

        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('grupo_recorrencia_id', targetTx.grupoRecorrenciaId)
          .gte('data', currentDate);

        if (error) throw error;

      } else {
        setTransactions(prev => prev.filter(tx => tx.id !== id));

        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
      await fetchTransactions();
      if (targetTx && targetTx.cartaoId) {
        const mesAno = targetTx.data.slice(0, 7);
        await recalcInvoiceTotals(targetTx.cartaoId, mesAno);
      }
    } catch (err: any) {
      console.error('Error deleting transaction from database:', err);
      alert('Erro ao excluir lançamento do banco: ' + (err.message || err.details || JSON.stringify(err)));
      fetchTransactions();
    }
  };

  // CRUD for Work Shifts
  const handleSaveWorkShift = async (payload: Omit<WorkShiftEntry, 'id'> & { 
    id?: string;
    modoLancamento?: 'UNICO' | 'INDIVIDUAL';
    lancarCarteiraPrincipal?: boolean;
    formaPagamento?: string;
    contaId?: string;
    tipoRecebimento?: 'UNICO' | 'PARCELADO' | 'RECORRENTE';
    qtdParcelas?: number;
    periodicidadeParcelas?: 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
  }) => {
    if (!userId) return;

    try {
      const addDays = (iso: string, days: number) => {
        const d = new Date(iso + 'T12:00:00');
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };
      const addMonthsSafe = (iso: string, months: number) => {
        const d = new Date(iso + 'T12:00:00');
        const target = d.getMonth() + months;
        const first = new Date(d.getFullYear(), target, 1, 12, 0, 0, 0);
        const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        first.setDate(Math.min(d.getDate(), last));
        return first.toISOString().split('T')[0];
      };
      const shiftDate = (iso: string, step: number, period?: 'SEMANAL' | 'QUINZENAL' | 'MENSAL') => {
        const p = period || 'MENSAL';
        if (p === 'MENSAL') return addMonthsSafe(iso, step);
        if (p === 'SEMANAL') return addDays(iso, step * 7);
        return addDays(iso, step * 15);
      };

      const tipoReceb = !payload.id && payload.tipo === 'ENTRADA' ? (payload.tipoRecebimento || 'UNICO') : 'UNICO';
      const nParcelas = tipoReceb !== 'UNICO' && payload.qtdParcelas && payload.qtdParcelas >= 2 ? payload.qtdParcelas : 1;

      // ---------------------------------------------------------------
      // RAMO 1) PARCELAMENTO OU CONTRATO RECORRENTE (gerar N linhas)
      // ---------------------------------------------------------------
      if (!payload.id && (tipoReceb === 'PARCELADO' || tipoReceb === 'RECORRENTE') && nParcelas >= 2) {
        const baseValorTotal = Number(payload.valor || 0);
        const valorPorParcela = Number((baseValorTotal / nParcelas).toFixed(2));
        const statusInicial = payload.status === 'RECEBIDO' ? 'RECEBIDO' : 'A_RECEBER';
        const obsBase = (payload.observacao || '').trim();
        const baseDataEvento = payload.data;
        const baseDataRec = (payload.status !== 'RECEBIDO' && payload.dataRecebimento) ? payload.dataRecebimento : baseDataEvento;
        const period = payload.periodicidadeParcelas || (tipoReceb === 'RECORRENTE' ? 'MENSAL' : 'MENSAL');
        const grupo = `grp-rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const rows = [];
        for (let i = 0; i < nParcelas; i++) {
          const idxParcela = i + 1;
          const dataEvento = tipoReceb === 'RECORRENTE' ? shiftDate(baseDataEvento, i, 'MENSAL') : baseDataEvento;
          const dataRec = shiftDate(baseDataRec, i, period);
          const label = tipoReceb === 'RECORRENTE' ? `Mensalidade` : `Parcela`;
          const suffixObs = `${label} ${idxParcela}/${nParcelas}`;
          const ultimoAjuste = idxParcela === nParcelas
            ? Math.round((baseValorTotal - (valorPorParcela * nParcelas)) * 100) / 100
            : 0;
          const valorFinal = valorPorParcela + ultimoAjuste;
          rows.push({
            user_id: userId,
            data: dataEvento,
            atividade: payload.atividade,
            tipo: payload.tipo,
            categoria: payload.categoria || null,
            valor: valorFinal,
            valor_diaria: payload.valorDiaria || null,
            quantidade_dias: payload.quantidadeDias || 1,
            status: statusInicial,
            data_recebimento: statusInicial === 'RECEBIDO' ? null : dataRec,
            observacao: obsBase ? `${obsBase} · ${suffixObs}` : suffixObs,
            vinculo_id: null,
            conta_id: payload.contaId || null,
            tipo_recebimento: tipoReceb,
            qtd_parcelas: nParcelas,
            periodicidade_parcelas: period,
            parcela_atual: idxParcela,
            total_parcelas: nParcelas,
            grupo_id: grupo
          });
        }

        const { error } = await supabase
          .from('diarias_trabalho')
          .insert(rows);
        if (error) throw error;

        await fetchWorkShifts();
        return;
      }

      // Bulk inserts for multiple individual days
      if (!payload.id && payload.modoLancamento === 'INDIVIDUAL' && payload.quantidadeDias && payload.quantidadeDias > 1) {
        const rows = [];
        for (let i = 0; i < payload.quantidadeDias; i++) {
          const startDateObj = new Date(payload.data + 'T12:00:00');
          startDateObj.setDate(startDateObj.getDate() + i);
          const targetDateStr = startDateObj.toISOString().split('T')[0];

          rows.push({
            user_id: userId,
            data: targetDateStr,
            atividade: payload.atividade,
            tipo: payload.tipo,
            categoria: null,
            valor: payload.valorDiaria || (payload.valor / payload.quantidadeDias),
            valor_diaria: payload.valorDiaria || null,
            quantidade_dias: 1,
            status: payload.status || 'RECEBIDO',
            data_recebimento: payload.dataRecebimento || null,
            observacao: payload.observacao 
              ? `${payload.observacao} (Dia ${i + 1}/${payload.quantidadeDias})`
              : `Diária ${i + 1}/${payload.quantidadeDias}`,
            vinculo_id: null,
            conta_id: payload.contaId || null
          });
        }

        const { error } = await supabase
          .from('diarias_trabalho')
          .insert(rows);

        if (error) throw error;
      } else {
        // Normal single row insert or update
        const dbPayload: Record<string, any> = {
          user_id: userId,
          data: payload.data,
          atividade: payload.atividade,
          tipo: payload.tipo,
          categoria: payload.categoria || null,
          valor: payload.valor,
          valor_diaria: payload.valorDiaria || null,
          quantidade_dias: payload.quantidadeDias || 1,
          status: payload.status || 'RECEBIDO',
          data_recebimento: payload.dataRecebimento || null,
          observacao: payload.observacao || null,
          vinculo_id: payload.vinculoId && payload.vinculoId !== 'motorista-app' && payload.vinculoId !== 'geral-outros' ? payload.vinculoId : null,
          conta_id: payload.contaId || null
        };
        if (!payload.id && payload.tipo === 'ENTRADA' && payload.tipoRecebimento) {
          const tipoRec = payload.tipoRecebimento;
          dbPayload.tipo_recebimento = tipoRec;
          if (tipoRec !== 'UNICO') {
            const total = payload.qtdParcelas && payload.qtdParcelas >= 2 ? payload.qtdParcelas : 1;
            dbPayload.qtd_parcelas = total;
            dbPayload.total_parcelas = total;
            dbPayload.periodicidade_parcelas = payload.periodicidadeParcelas || 'MENSAL';
            dbPayload.parcela_atual = 1;
            dbPayload.grupo_id = `grp-rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          }
        }
        if (payload.id && payload.tipoRecebimento) {
          dbPayload.tipo_recebimento = payload.tipoRecebimento;
          if (payload.qtdParcelas && payload.qtdParcelas >= 2) {
            dbPayload.qtd_parcelas = payload.qtdParcelas;
            dbPayload.total_parcelas = payload.qtdParcelas;
          }
          if (payload.periodicidadeParcelas) dbPayload.periodicidade_parcelas = payload.periodicidadeParcelas;
        }

        if (payload.id) {
          const { error } = await supabase
            .from('diarias_trabalho')
            .update(dbPayload)
            .eq('id', payload.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('diarias_trabalho')
            .insert(dbPayload);

          if (error) throw error;
        }
      }

      // Optional cross-ledger mirroring to the Personal Wallet (Only on creation)
      if (!payload.id && payload.tipo === 'SAIDA' && payload.lancarCarteiraPrincipal) {
        // Find human readable label for the vinculation
        let vinculoLabel = 'Geral';
        if (payload.vinculoId && payload.vinculoId !== 'motorista-app' && payload.vinculoId !== 'geral-outros') {
          const ev = workShifts.find(w => w.id === payload.vinculoId);
          if (ev) {
            vinculoLabel = ev.observacao || ev.atividade;
          }
        } else if (payload.vinculoId === 'motorista-app') {
          vinculoLabel = 'Motorista App';
        } else if (payload.vinculoId === 'geral-outros') {
          vinculoLabel = 'Geral Trabalho';
        }

        // Map operational cost category to personal category
        const mapCategory = (cat: string) => {
          if (cat === 'Alimentação/Lanche') return 'Lazer';
          if (cat === 'Combustível' || cat === 'Pedágio/Estacionamento' || cat === 'Manutenção') return 'Transporte';
          return 'Outros';
        };

        let personalContaId = accounts[0]?.id;
        if (payload.formaPagamento === 'Cartão de Crédito Pessoal') {
          const acc = accounts.find(a => a.nome.toLowerCase().includes('nubank') || a.nome.toLowerCase().includes('cartão') || a.tipoPessoa === 'PF');
          if (acc) personalContaId = acc.id;
        } else if (payload.formaPagamento === 'Dinheiro Pessoal') {
          const acc = accounts.find(a => a.nome.toLowerCase().includes('carteira') || a.nome.toLowerCase().includes('dinheiro') || a.tipo === 'DINHEIRO');
          if (acc) personalContaId = acc.id;
        } else if (payload.formaPagamento === 'Conta Banco') {
          const acc = accounts.find(a => a.nome.toLowerCase().includes('nubank') || a.nome.toLowerCase().includes('itaú') || a.tipo === 'CORRENTE');
          if (acc) personalContaId = acc.id;
        }

        const personalPayload = {
          tipo: 'SAIDA' as const,
          descricao: `[${payload.formaPagamento}] Custo Rua (${payload.categoria}) - Vinc: ${vinculoLabel}`,
          categoria: mapCategory(payload.categoria || 'Outros'),
          valor: payload.valor,
          data: payload.data,
          status: 'PAGO' as const,
          contaId: personalContaId
        };

        await handleSaveTransaction(personalPayload);
      }
      await fetchWorkShifts();
    } catch (err: any) {
      console.error('Error saving work shift to database:', err);
      alert('Erro ao salvar lançamento de diária: ' + (err.message || err.details || JSON.stringify(err)));
    }
  };

  const handleMarkShiftAsPaid = async (id: string) => {
    // Optimistic state update
    setWorkShifts(prev =>
      prev.map(e => e.id === id ? { ...e, status: 'RECEBIDO', dataRecebimento: undefined } : e)
    );

    try {
      const { error } = await supabase
        .from('diarias_trabalho')
        .update({ 
          status: 'RECEBIDO',
          data_recebimento: null
        })
        .eq('id', id);

      if (error) {
        console.error('Error marking work shift as paid:', error);
        await fetchWorkShifts();
      }
    } catch (err) {
      console.error(err);
      await fetchWorkShifts();
    }
  };

  const handleDeleteWorkShift = async (id: string) => {
    try {
      setWorkShifts(prev => prev.filter(e => e.id !== id));
      const { error } = await supabase
        .from('diarias_trabalho')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting work shift from database:', err);
      alert('Erro ao excluir lançamento de diária: ' + (err.message || err.details || JSON.stringify(err)));
      await fetchWorkShifts();
    }
  };

  const handleSendToWallet = async (date: string, activity: string, amount: number) => {
    if (!userId) return;

    const payload = {
      tipo: 'ENTRADA' as const,
      descricao: `Lucro Diário - ${activity}`,
      categoria: 'Freelance',
      valor: amount,
      data: date,
      status: 'RECEBIDO' as const
    };

    await handleSaveTransaction(payload);
    alert('Lucro líquido diário enviado com sucesso para sua Carteira Pessoal!');
  };

  const handleAddNewCategory = (tipo: 'ENTRADA' | 'SAIDA', category: string) => {
    setCustomCategories(prev => {
      const list = prev[tipo];
      if (list.includes(category)) return prev;
      return {
        ...prev,
        [tipo]: [...list, category]
      };
    });
  };

  const handleOpenEditModal = (tx: Transaction) => {
    // v1.7.7: WorkShifts aparecem na listagem, mas NAO sao editaveis por modal de Transaction pessoal.
    // (WorkShifts tem campos diferentes, usam WorkShiftModal proprio em aba DIARIAS)
    if ((tx as any)?._isWorkShift) {
      return;
    }
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  // FAB Button context action
  const handleFABClick = () => {
    if (activeTab === 'DIARIAS') {
      setEditingShiftEntry(null);
      setIsShiftModalOpen(true);
    } else {
      handleOpenAddModal();
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await checkVersion();
      await fetchTransactions();
      await fetchWorkShifts();
      await fetchAccounts();
      await fetchTransfers();
      await fetchCreditCards();
      await fetchCreditCardInvoices();
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
      }, 600);
    }
  };

  const handleSeedMockData = async () => {
    if (!userId) return;
    if (confirm('Deseja copiar todos os dados originais de teste do Tô Quebrado para a sua conta no Supabase?')) {
      try {
        setIsSyncing(true);
        const defaultContaId = accounts[0]?.id || null;
        const dbPayloads = INITIAL_TRANSACTIONS.map(tx => ({
          user_id: userId,
          data: tx.data,
          descricao: tx.descricao,
          categoria: tx.categoria,
          tipo: tx.tipo,
          valor: tx.valor,
          status: tx.status,
          data_postergar: tx.dataPostergar || null,
          juros: tx.juros || 0,
          conta_id: defaultContaId
        }));

        const { error } = await supabase
          .from('transactions')
          .insert(dbPayloads);

        if (error) throw error;
        
        await fetchTransactions();
        alert('Dados copiados com sucesso para o banco!');
      } catch (err) {
        console.error(err);
        alert('Erro ao realizar carga de teste.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDeleteMockData = async () => {
    if (!userId) return;
    const mockTxs = transactions.filter(tx =>
      INITIAL_TRANSACTIONS.some(mock =>
        tx.descricao === mock.descricao &&
        tx.valor === mock.valor &&
        tx.tipo === mock.tipo
      )
    );
    const count = mockTxs.length;
    if (count === 0) return;

    if (confirm(`Deseja remover todos os ${count} lançamentos fictícios de teste da sua conta? Isso não afetará seus lançamentos originais cadastrados.`)) {
      try {
        setIsSyncing(true);
        const idsToDelete = mockTxs.map(t => t.id);
        const { error } = await supabase
          .from('transactions')
          .delete()
          .in('id', idsToDelete);

        if (error) throw error;
        
        await fetchTransactions();
        alert('Dados fictícios removidos com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao remover dados fictícios.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ------- Profile / User Settings save handler -------
  const handleSaveProfile = async (patch: Partial<UserProfile> & {
    currentPassword?: string;
    newPassword?: string;
  }): Promise<boolean> => {
    if (!userId) return false;
    try {
      // 0) DEBUG LOG (para investigar se o avatar está chegando até aqui!)
      console.log('[handleSaveProfile] patch recebido:', JSON.stringify({
        nomeCompleto: patch.nomeCompleto,
        email: patch.email,
        telefone: patch.telefone,
        // avatarUrl: MENSAGEM ESPECIAL para identificar string / null / undefined corretamente
        avatarUrl_kind:
          patch.avatarUrl === null ? 'NULL (excluir foto)' :
          typeof patch.avatarUrl === 'string' ?
            'STRING_BASE64_' + (patch.avatarUrl.startsWith('data:image/') ? 'OK' : 'NAO_BASE64') + '_LEN_' + patch.avatarUrl.length :
            'UNDEFINED (nao altera avatar)',
        moedaPadrao: patch.moedaPadrao,
        temaVisual: patch.temaVisual,
        ocultarSaldosDefault: patch.ocultarSaldosDefault
      }, null, 2));

      // 1) Tenta atualizar na tabela profiles
      const dbPayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (patch.nomeCompleto !== undefined) dbPayload.nome_completo = patch.nomeCompleto;
      if (patch.email !== undefined) dbPayload.email = patch.email;
      if (patch.telefone !== undefined) dbPayload.telefone = patch.telefone;
      if (patch.avatarUrl !== undefined) dbPayload.avatar_url = patch.avatarUrl;  // ACEITA string OU null (excluir foto)
      if (patch.moedaPadrao !== undefined) dbPayload.moeda_padrao = patch.moedaPadrao;
      if (patch.temaVisual !== undefined) dbPayload.tema_visual = patch.temaVisual;
      if (patch.ocultarSaldosDefault !== undefined) dbPayload.ocultar_saldos_default = patch.ocultarSaldosDefault;

      if (Object.keys(dbPayload).length > 1) {
        console.log('[handleSaveProfile] dbPayload enviado p/ Supabase:', JSON.stringify({
          ...dbPayload,
          avatar_url: dbPayload.avatar_url === null ? 'NULL' :
             (typeof dbPayload.avatar_url === 'string' ? 'BASE64_LEN_' + dbPayload.avatar_url.length : dbPayload.avatar_url)
        }, null, 2));

        const { error: errProfile } = await supabase
          .from('profiles')
          .upsert({ id: userId, ...dbPayload });
        if (errProfile) {
          console.error('handleSaveProfile profiles error:', errProfile.message || errProfile, errProfile);
          triggerToast('Erro ao salvar perfil: ' + (errProfile.message || 'desconhecido'));
          return false;
        }
        console.log('[handleSaveProfile] Sucesso no upsert do profiles!');
      } else {
        console.log('[handleSaveProfile] Nenhum campo para salvar no banco (dbPayload só com updated_at). Skipando UPSERT.');
      }

      // 2) Atualiza o email/login no auth.user se solicitado (quando tiver permissao)
      let trocouSenha = false;
      if (patch.currentPassword && patch.newPassword) {
        try {
          const { error: pwdErr } = await supabase.auth.updateUser({ password: patch.newPassword });
          if (pwdErr) {
            console.error('updateUser password error:', pwdErr.message || pwdErr);
            triggerToast('Erro ao alterar senha: ' + (pwdErr.message || 'desconhecido'));
          } else {
            trocouSenha = true;
          }
        } catch (e) {
          console.error('updateUser password exception:', e);
        }
      }

      // 3) Reflete o estado na UI instantaneamente (atualiza state + storage)
      let avatarFinal: string | null = null;
      setUserProfile((prev: UserProfile | null) => {
        const next: UserProfile = prev || {
          id: userId,
          moedaPadrao: 'BRL',
          temaVisual: 'LIGHT',
          ocultarSaldosDefault: false,
          tipoPlano: 'PESSOAL'
        };
        const merged: UserProfile = {
          id: next.id,
          nomeCompleto: patch.nomeCompleto !== undefined ? patch.nomeCompleto : next.nomeCompleto,
          email: patch.email !== undefined ? patch.email : next.email,
          telefone: patch.telefone !== undefined ? patch.telefone : next.telefone,
          avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : (next.avatarUrl ?? null),
          moedaPadrao: patch.moedaPadrao ?? next.moedaPadrao,
          temaVisual: patch.temaVisual ?? next.temaVisual,
          ocultarSaldosDefault: patch.ocultarSaldosDefault ?? next.ocultarSaldosDefault,
          tipoPlano: next.tipoPlano
        };

        // Guardamos o resultado FINAL para sincronizar o header do App.tsx (AvatarDropdown)
        avatarFinal = (merged.avatarUrl ?? null);

        if (merged.nomeCompleto) setCurrentUser(merged.nomeCompleto);
        if (merged.email) setUserEmail(merged.email);
        setIsBalanceVisible(!merged.ocultarSaldosDefault);
        return merged;
      });

      // 4) SINCRONIZA O AVATAR DO HEADER GLOBAL (AvatarDropdown no topo da tela ajustes!)
      // — SEMPRE! Tanto para salvar FOTO, quanto para EXCLUIR (null), quanto para refresh...
      // Colocamos fora do setter para garantir que o React agende a atualização do state settingsAvatarUrl
      // (setUserProfile é async/batch então já pegamos avatarFinal calculado)
      if (avatarFinal === null) {
        console.log('[handleSaveProfile] Sync final settingsAvatarUrl = NULL (sem foto)');
      } else {
        console.log('[handleSaveProfile] Sync final settingsAvatarUrl = BASE64, tamanho:', (avatarFinal as string).length);
      }
      setSettingsAvatarUrl(avatarFinal);

      if (patch.nomeCompleto) {
        try {
          await supabase.auth.updateUser({ data: { nome: patch.nomeCompleto } });
        } catch {
          /* ignore */
        }
      }

      triggerToast(trocouSenha ? 'Perfil e senha atualizados com sucesso!' : 'Alterações salvas com sucesso!');
      return true;
    } catch (e) {
      console.error('handleSaveProfile exception:', e);
      triggerToast('Não foi possível salvar as alterações');
      return false;
    }
  };

  const handleLoginSuccess = (name: string) => {
    setCurrentUser(name);
  };

  const handleSaveAccount = async (payload: Omit<BankAccount, 'id'> & { id?: string }) => {
    if (!userId) return;
    const dbPayload = {
      user_id: userId,
      nome: payload.nome,
      banco: payload.banco || null,
      tipo: payload.tipo,
      tipo_pessoa: payload.tipoPessoa,
      saldo_inicial: payload.saldoInicial,
      cor: payload.cor || null
    };

    try {
      if (payload.id) {
        const { error } = await supabase
          .from('contas_bancarias')
          .update(dbPayload)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contas_bancarias')
          .insert(dbPayload);
        if (error) throw error;
      }
      await fetchAccounts();
    } catch (err) {
      console.error('Error saving account:', err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchAccounts();
      await fetchTransactions();
      await fetchWorkShifts();
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  };

  const handleSaveTransfer = async (payload: Omit<AccountTransfer, 'id'>) => {
    if (!userId) return;
    const dbPayload = {
      user_id: userId,
      conta_origem_id: payload.contaOrigemId,
      conta_destino_id: payload.contaDestinoId,
      valor: payload.valor,
      data: payload.data,
      observacao: payload.observacao || null
    };

    try {
      const { error } = await supabase
        .from('transferencias')
        .insert(dbPayload);
      if (error) throw error;
      await fetchTransfers();
    } catch (err) {
      console.error('Error saving transfer:', err);
    }
  };

  // ---------- Cartão de Crédito: CRUD ----------
  const handleSaveCreditCard = async (
    payload: Omit<CreditCard, 'id' | 'userId'> & { id?: string }
  ) => {
    if (!userId) return;
    const dbPayload = {
      user_id: userId,
      nome: payload.nome,
      bandeira: payload.bandeira,
      limite_total: payload.limiteTotal,
      dia_fechamento: payload.diaFechamento,
      dia_vencimento: payload.diaVencimento,
      cor: payload.banco ? `${payload.banco}|${payload.cor}` : payload.cor,
      conta_pagamento_padrao_id: payload.contaPagamentoPadraoId || null
    };

    try {
      if (payload.id) {
        const { error } = await supabase
          .from('cartoes_credito')
          .update(dbPayload)
          .eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cartoes_credito')
          .insert(dbPayload);
        if (error) throw error;
      }
      await fetchCreditCards();
    } catch (err: any) {
      console.error('Error saving credit card:', err);
      alert('Erro ao salvar cartão de crédito: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handleDeleteCreditCard = async (id: string) => {
    if (!confirm('Tem certeza de que deseja excluir este cartão? As faturas vinculadas também serão removidas.')) return;
    try {
      const { error } = await supabase
        .from('cartoes_credito')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchCreditCards();
      await fetchCreditCardInvoices();
    } catch (err: any) {
      console.error('Error deleting credit card:', err);
      alert('Erro ao excluir cartão: ' + (err.message || JSON.stringify(err)));
    }
  };

  // ---------- Fatura Cartão: Pagamento e criação ----------
  const getOrCreateInvoiceFor = async (
    card: CreditCard,
    mesAno: string
  ): Promise<CreditCardInvoice | null> => {
    if (!userId) return null;

    const existing = creditCardInvoices.find(
      (inv) => inv.cartaoId === card.id && inv.mesAno === mesAno
    );
    if (existing) return existing;

    const [anoStr, mesStr] = mesAno.split('-');
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10) - 1;

    const df = new Date(ano, mes, Math.min(card.diaFechamento, 28), 12, 0, 0);
    let dv = new Date(ano, mes, Math.min(card.diaVencimento, 28), 12, 0, 0);
    if (card.diaVencimento <= card.diaFechamento) {
      dv.setMonth(dv.getMonth() + 1);
    }

    const payloadInv = {
      user_id: userId,
      cartao_id: card.id,
      mes_ano: mesAno,
      data_fechamento: df.toISOString().split('T')[0],
      data_vencimento: dv.toISOString().split('T')[0],
      valor_total: 0,
      status: 'ABERTA'
    };

    const { data, error } = await supabase
      .from('faturas_cartao')
      .insert(payloadInv)
      .select()
      .limit(1)
      .single();
    if (error) {
      console.error('Error creating invoice:', error);
      return null;
    }

    const newInv: CreditCardInvoice = {
      id: data.id,
      userId: data.user_id,
      cartaoId: data.cartao_id,
      mesAno: data.mes_ano,
      dataFechamento: data.data_fechamento,
      dataVencimento: data.data_vencimento,
      valorTotal: Number(data.valor_total) || 0,
      status: data.status,
      valorPago: data.valor_pago ?? undefined,
      dataPagamento: data.data_pagamento ?? undefined
    };
    setCreditCardInvoices((prev) => [...prev, newInv]);
    return newInv;
  };

  const handlePayInvoice = async (
    invoiceId: string,
    accountId: string,
    valorPago: number
  ) => {
    if (!userId) return;
    const invoice = creditCardInvoices.find((i) => i.id === invoiceId);
    const card = creditCards.find((c) => c.id === invoice?.cartaoId);
    if (!invoice || !card) return;

    try {
      const pagoAnterior = invoice.valorPago || 0;
      const novoPago = pagoAnterior + valorPago;
      const saldoRestante = invoice.valorTotal - novoPago;
      const novoStatus = saldoRestante <= 0.01 ? 'PAGA' : invoice.status;
      const hoje = new Date().toISOString().split('T')[0];

      const { error: errUpd } = await supabase
        .from('faturas_cartao')
        .update({
          status: novoStatus,
          valor_pago: Number(novoPago.toFixed(2)),
          data_pagamento: novoStatus === 'PAGA' ? hoje : (invoice.dataPagamento || null)
        })
        .eq('id', invoiceId);
      if (errUpd) throw errUpd;

      const despesa: Omit<Transaction, 'id'> = {
        tipo: 'SAIDA',
        descricao: `Pagamento Fatura ${card.nome} - ${invoice.mesAno}`,
        categoria: 'Outros',
        valor: Number(valorPago.toFixed(2)),
        data: hoje,
        status: 'PAGO',
        contaId: accountId
      };
      await handleSaveTransaction(despesa);

      await fetchCreditCardInvoices();
      await fetchTransactions();
    } catch (err: any) {
      console.error('Error paying invoice:', err);
      alert('Erro ao pagar fatura: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handlePostponeInvoice = async (
    invoiceId: string,
    targetMesAno: string
  ) => {
    if (!userId) return;
    try {
      const invoice = creditCardInvoices.find((i) => i.id === invoiceId);
      const card = creditCards.find((c) => c.id === invoice?.cartaoId);
      if (!invoice || !card) return;

      // 1. Criar ou recuperar a fatura de destino
      const targetInvoice = await getOrCreateInvoiceFor(card, targetMesAno);
      if (!targetInvoice) {
        throw new Error('Não foi possível criar a fatura de destino.');
      }

      // 2. Atualizar o status da fatura atual para 'POSTERGADA'
      const { error: errorInv } = await supabase
        .from('faturas_cartao')
        .update({ status: 'POSTERGADA' })
        .eq('id', invoiceId);
      if (errorInv) throw errorInv;

      // 3. Encontrar transações pendentes/saídas desta fatura e transferir para a de destino
      const txsToMove = transactions.filter(
        (t) => t.faturaId === invoiceId && t.tipo === 'SAIDA' && t.status !== 'PAGO'
      );

      if (txsToMove.length > 0) {
        const txIds = txsToMove.map(t => t.id);
        const { error: errorTxs } = await supabase
          .from('transactions')
          .update({ fatura_id: targetInvoice.id })
          .in('id', txIds);
        if (errorTxs) throw errorTxs;
      }

      // 4. Sincronizar dados e recalcular totais de ambas as faturas
      await fetchTransactions();
      await fetchCreditCardInvoices();

      // Recalcular no banco
      await recalcInvoiceTotals(card.id, invoice.mesAno);
      await recalcInvoiceTotals(card.id, targetMesAno);

      triggerToast(`Fatura postergada com sucesso para ${targetMesAno}!`);
      
      // Update selected modal view month if currently open
      if (selectedInvoiceCard?.id === card.id) {
        setInvoiceDetailMonth(targetMesAno);
      }
    } catch (err: any) {
      console.error('Error postponing invoice:', err);
      alert('Erro ao postergar fatura: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handleViewInvoice = async (card: CreditCard) => {
    setSelectedInvoiceCard(card);
    setInvoiceDetailMonth(selectedMonth);
    setIsInvoiceDetailOpen(true);
    const today = new Date(selectedMonth + '-01T12:00:00');
    for (let offset = -1; offset <= 2; offset++) {
      const d = new Date(today);
      d.setMonth(d.getMonth() + offset);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      await getOrCreateInvoiceFor(card, mes);
    }
  };

  const handlePayInvoiceFromDashboard = (
    card: CreditCard,
    _invoice: CreditCardInvoice
  ) => {
    setSelectedInvoiceCard(card);
    setInvoiceDetailMonth(selectedMonth);
    setIsInvoiceDetailOpen(true);
  };

  const getInvoiceForCardMonth = (
    cardId: string,
    mesAno: string
  ): CreditCardInvoice | undefined => {
    return creditCardInvoices.find(
      (i) => i.cartaoId === cardId && i.mesAno === mesAno
    );
  };

  const getInvoiceTransactions = (
    cardId: string,
    mesAno: string
  ): Transaction[] => {
    const fatura = getInvoiceForCardMonth(cardId, mesAno);
    return transactions.filter((t) => {
      if (t.cartaoId !== cardId || t.tipo !== 'SAIDA') return false;
      if (fatura && t.faturaId) {
        return t.faturaId === fatura.id;
      }
      // Sem fatura atrelada: usa projeção (avulso / parcelado / recorrente)
      return caiNoMesSelecionado(t, mesAno);
    });
  };

  const recalcInvoiceTotals = async (cardId: string, mesAno: string) => {
    const inv = creditCardInvoices.find(
      (i) => i.cartaoId === cardId && i.mesAno === mesAno
    );
    if (!inv) return;
    const txs = getInvoiceTransactions(cardId, mesAno);
    const total = txs.reduce((s, t) => s + Number(t.valor), 0);
    if (Math.abs(inv.valorTotal - total) < 0.005) return;
    try {
      const { error } = await supabase
        .from('faturas_cartao')
        .update({ valor_total: Number(total.toFixed(2)) })
        .eq('id', inv.id);
      if (error) throw error;
      await fetchCreditCardInvoices();
    } catch (err) {
      console.error('Error recalc invoice totals:', err);
    }
  };

  // Filter active Event type shifts for linking despesas
  const activeEvents = workShifts.filter(e => e.tipo === 'ENTRADA' && e.atividade === 'Evento');

  // ============================================================
  // IMPORTACAO INTELIGENTE DE FATURA PDF
  // ============================================================
  const normalizePtMonthToNum = (m: string): number | null => {
    const map: Record<string, number> = {
      jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
      jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
      janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4,
      maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9,
      outubro: 10, novembro: 11, dezembro: 12,
      january: 1, february: 2, march: 3, april: 4, june: 6,
      july: 7, august: 8, september: 9, october: 10,
      november: 11, december: 12
    };
    const x = m.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const k of Object.keys(map)) if (x.startsWith(k)) return map[k];
    return null;
  };



  const parseCurrencySmart = (raw: string): number | null => {
    const s = raw.trim();
    if (!s) return null;
    const digits = s.replace(/[^\d,\-.]/g, '');
    if (!digits) return null;
    const lastComma = digits.lastIndexOf(',');
    const lastDot = digits.lastIndexOf('.');
    let clean = digits;
    if (lastComma >= 0 && lastDot >= 0) {
      if (lastComma > lastDot) {
        clean = digits.replace(/\./g, '').replace(',', '.');
      } else {
        clean = digits.replace(/,/g, '');
      }
    } else if (lastComma >= 0) {
      clean = digits.replace(/\./g, '').replace(',', '.');
    }
    const num = Number(clean);
    if (Number.isFinite(num)) return Math.abs(num);
    return null;
  };

  // Usa leitor local inteligente (Processador local gratuito)
  const parseInvoiceUniversal = async (texto: string, opts?: { preferLLM?: boolean; methodLabelRef?: { label?: string } }): Promise<ExtractedInvoiceData> => {
    const localResult = parseInvoiceTextHeuristic(texto);
    if (opts?.methodLabelRef) {
      opts.methodLabelRef.label = 'Processamento Inteligente Local (100% Gratuito)';
    }
    return localResult;
  };

  const suggCatFromDesc = (desc: string): string => {
    const d = (desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const allowed = new Set<string>(CATEGORIES.SAIDA);
    const rules: [RegExp, string][] = [
      [/(carrefour|pao de acucar|pao d[ae] acucar|extra hiperm|supermer|mercado|hortifruti|atacadao|sonda|assai|atacadista|makro|perini|cooper|dia%)/, 'Supermercado'],
      [/(ifood|i-food|uber\s*eats|rappi|restaurante|lanche|hamburguer|pizza|cafe|starbucks|padaria|picanha|rodizio|jantar|almoco|burger|sanduiche|sushi|japa|churrasco)/, 'Alimentação'],
      [/(posto|gasolina|combustivel|shell|ipiranga|branca\s*preta|petrobras|autoposto|auto posto|uber|99\s*pop|99pop|taxi|transporte|onibus|metro|estaciona|pedagio|estacionamento|graal|shellbox|simoldes)/, 'Transporte'],
      [/(netflix|spotify|prime video|hbomax|hbo max|disney\+?|hulu|youtube premium|youtube music|globo play|globoplay|deezer|assinatura|icloud|google one|dropbox|office 365|microsoft 365|app store|itunes|playstore|play store|alelo|flash|premium|plano\s*de\s*saude|odontoprev|sulamerica|saude|bradesco\s*saude|amil)/, 'Serviços/Assinaturas'],
      [/(farmacia|farmacia|drogaria|sao paulo drogaria|saude|hospital|medico|consulta|plano de saude|odontologico|exame|clinica|laboratorio|dental|odont)/, 'Saúde'],
      [/(cinema|show|teatro|viagem|airbnb|hotel|motel|jogo|barzinho|barzinho|bar|boate|festa|lazer|ingresso|comic|geek|evento|parque)/, 'Lazer'],
      [/(roupa|loja|magazine luiza|magalu|marisa|renner|cea|cec|decathlon|calcado|sapato|tenis|shopping|riachuelo|cea|centauro|nike|adidas|puma|camicado|triton|tricot|moda)/, 'Compras/Vestuário'],
      [/(cursos?|udemy|coursera|alura|descomplica|puc|usp|universidad|faculdade|escola|colégio|colegio|material\s*escolar|educacional|idiomas|cultura|ingles|livraria|livro|educa)/, 'Educação'],
      [/(aluguel|condominio|iptu|energia|luz|aes eletropaulo|enel|cemig|copel|light|eletrobrás|água|agua|sanasa|sabesp|caesb|internet|telefone|celular|vivo|claro|tim|oi|net|sky|net combo|supervia|predial|moradia|conserto|pedreiro|marido\s*de\s*aluguel)/, 'Casa/Moradia'],
      [/(aluguel)/, 'Aluguel'],
      [/(emprest|consignado|parcelado.*emprest|saque|bmg|panamericano|ole consigna|sim|credito pessoal|sim digital)/, 'Empréstimo'],
      [/(info.*app|infopay|infopag|pag\s*seguro|mercado pago|mp\s*[- ]|picpay|inter medium|conta digital|banco\s*inter)/, 'Outros']
    ];
    for (const [re, cat] of rules) {
      if (re.test(d) && allowed.has(cat)) return cat;
    }
    return 'Outros';
  };

  // Heuristic parser for ANY text
  const parseInvoiceTextHeuristic = (text: string): ExtractedInvoiceData => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const result: ExtractedInvoiceData = { itens: [] };

    // 1) Vencimento geral (Ano de referência)
    let vencimentoStr: string | null = null;
    const vencRe = /(?:vencimento|vence em|vcto|venc)[^\d]{0,20}(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/i;
    for (const line of lines) {
      const m = line.match(vencRe);
      if (m) {
        let d = Number(m[1]);
        let mo = Number(m[2]);
        let y = m[3] ? Number(m[3]) : new Date().getFullYear();
        if (y < 100) y += 2000;
        vencimentoStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        break;
      }
    }
    if (!vencimentoStr) {
      const m2 = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
      if (m2) {
        let d = Number(m2[1]);
        let mo = Number(m2[2]);
        let y = Number(m2[3]);
        if (y < 100) y += 2000;
        vencimentoStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    if (vencimentoStr) {
      result.vencimento = vencimentoStr;
    }

    // 2) Sugerir banco/cartão com base no cabeçalho
    const head = lines.slice(0, Math.min(15, lines.length)).join(' ');
    const bancoMatch = head.match(/(itaú|itau|nubank|nu\s*bank|c6\s*bank|c6bank|revolut|santander|safra|inter|bradesco|banco\s*do\s*brasil|bb|caixa|hipercard|sicoob|sicredi|mercado\s*pago)/i);
    if (bancoMatch) {
      result.cartaoSugeridoNome = bancoMatch[0];
    }

    const anoRef = vencimentoStr ? new Date(vencimentoStr).getFullYear() : new Date().getFullYear();

    // 3) Processar linhas
    for (const line of lines) {
      if (line.length < 8) continue;
      
      // Filtro estrito: ignorar informativos, saldos, termos regulatórios e cabeçalhos em qualquer parte da linha
      const ignoreRe = /\b(limite|vencimento|vence em|total a pagar|pagamento minimo|pagamento mínimo|saque total|resumo da fatura|fatura de|fatura anterior|encargos|tarifas e encargos|juros|multas por atraso|pagamentos e creditos|pagamentos e créditos|compras parceladas|fatura parcelada|demonstração|demonstracao|falar com a gente|ouvidoria|sac|0800|atendimento|contrato|regulamento|teto de juros|teto de juro|opcao de parcelamento|opções de parcelamento|pagamento da fatura|pagamento de fatura|pagamento efetuado|pagamento recebido|pagto|total|subtotal|saldo|fatura|faturas|atraso|atrasos|demonstrativo)\b/i;
      if (ignoreRe.test(line)) continue;

      // Padrão de data DD/MM ou DD/MM/YYYY ou DD MMM (ex: 15 Ago ou 15 de Agosto)
      const date1Match = line.match(/\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/);
      const date2Match = line.match(/\b(\d{1,2})\s+(?:de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\b/i);
      
      let dataStr = '';
      let dateRawText = '';
      if (date1Match) {
        dateRawText = date1Match[0];
        let d = Number(date1Match[1]);
        let mo = Number(date1Match[2]);
        let y = date1Match[3] ? Number(date1Match[3]) : anoRef;
        if (y < 100) y += 2000;
        dataStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      } else if (date2Match) {
        dateRawText = date2Match[0];
        let d = Number(date2Match[1]);
        let mo = normalizePtMonthToNum(date2Match[2]) || 1;
        let y = anoRef;
        dataStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      } else {
        continue;
      }

      // Remove a data encontrada da linha para evitar colisões
      const lineWithoutDate = line.replace(dateRawText, ' ');

      // Procura valores no formato R$ XX,XX ou apenas XX,XX ou com separador de milhar opcional
      const valMatch = lineWithoutDate.match(/(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*(?:,\d{2})|-?\d+(?:,\d{2})|-?\d+\.\d{2})\b/);
      if (!valMatch) continue;
      const valorNum = parseCurrencySmart(valMatch[1]);
      if (valorNum == null || valorNum <= 0 || valorNum > 999999.99) continue;

      const lineWithoutDateAndVal = lineWithoutDate.replace(valMatch[0], ' ');

      // Verifica se há parcelamento (ex: Parcela 2 de 4 ou 11/12 ou 2x)
      let parcelaAtual: number | undefined;
      let totalParcelas: number | undefined;
      const partMatch = lineWithoutDateAndVal.match(/\b(\d{1,3})\s*(?:\/|de|x)\s*(\d{1,3})\b/i) || lineWithoutDateAndVal.match(/parcela\s*(\d{1,3})\s*de\s*(\d{1,3})/i);
      if (partMatch) {
        parcelaAtual = Number(partMatch[1]);
        totalParcelas = Number(partMatch[2]);
        if (!(parcelaAtual >= 1 && totalParcelas >= parcelaAtual && totalParcelas <= 999)) {
          parcelaAtual = undefined;
          totalParcelas = undefined;
        }
      }

      let descClean = lineWithoutDateAndVal;
      if (partMatch) {
        descClean = descClean.replace(partMatch[0], ' ');
      }

      // Limpa caracteres especiais, pontuação restante e espaços extras
      descClean = descClean
        .replace(/[\-\+\*\:\.\,]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (descClean.length < 2) continue;

      result.itens.push({
        id: `pdf-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${result.itens.length}`,
        data: dataStr,
        descricao: descClean.toUpperCase(),
        categoria: suggCatFromDesc(descClean),
        valor: Number(valorNum.toFixed(2)),
        parcelaAtual,
        totalParcelas,
        selected: true
      });
    }

    if (result.valorTotalExtraido == null && result.itens.length > 0) {
      result.valorTotalExtraido = Number(result.itens.reduce((s, i) => s + i.valor, 0).toFixed(2));
    }
    result.itens.sort((a, b) => a.data.localeCompare(b.data));
    return result;
  };

  // Entrypoint do parser
  const parsePdfInvoice = async (file: File): Promise<ExtractedInvoiceData> => {
    // TENTATIVA 1: PDF.JS-DIST (le PDF binario CORRETO, descompacta streams, etc)
    let extractedText = '';
    let pdfJsUsedOk = false;
    try {
      // Import dinamico para nao aumentar o bundle inicial
      const pdfjs = await import('pdfjs-dist');
      try {
        if (typeof pdfjs.GlobalWorkerOptions !== 'undefined') {
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        }
      } catch (err) {
        console.warn('[pdf.js] erro ao configurar workerSrc local:', err);
      }
      const arrayBuffer = await file.arrayBuffer();
      const typedarray = new Uint8Array(arrayBuffer);

      // Promise race com timeout de 8 segundos para evitar travamento infinito no celular
      const docPromise = pdfjs.getDocument({
        data: typedarray,
        disableFontFace: true,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        useSystemFonts: true,
        enableXfa: true
      }).promise;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido ao ler o PDF. O leitor local travou devido a conexão lenta ou restrições do navegador.')), 8000)
      );
      const pdf = await Promise.race([docPromise, timeoutPromise]);

      const pagesTxt: string[] = [];
      const maxPages = Math.min(pdf.numPages, 40);
      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const pageLines: string[] = [];
        // Usamos transform[5] (y) para agrupar por linha
        const rows = new Map<number, string[]>();
        for (const tok of (content.items as any[] || [])) {
          if (!tok?.str) continue;
          const y = Math.round((tok.transform?.[5] as number) ?? 0);
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y)!.push(tok.str);
        }
        const sortedRows = Array.from(rows.entries()).sort((a, b) => b[0] - a[0]);
        for (const [, toks] of sortedRows) pageLines.push(toks.join(' '));
        pagesTxt.push(pageLines.join('\n'));
      }
      extractedText = pagesTxt.join('\n\n');
      pdfJsUsedOk = extractedText.length > 50;
    } catch (err) {
      console.warn('[pdf.js] falhou ao ler pdf, caindo em fallback:', err);
    }

    // TENTATIVA 2: fallback antigo (apenas se NÃO for PDF)
    const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!pdfJsUsedOk) {
      if (isPDF) {
        throw new Error('Não foi possível ler este PDF localmente. O arquivo pode estar protegido, ser baseado em imagens escaneadas sem texto selecionável (OCR) ou o leitor de PDF foi bloqueado pelo celular.');
      }
      const tryAsText = async (): Promise<string> => {
        return await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => { resolve(String(fr.result || '')); };
          fr.onerror = () => { resolve(''); };
          fr.readAsText(file, 'utf-8');
        });
      };
      extractedText = await tryAsText();
      const printable = extractedText.replace(/[^\x20-\x7EáàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ\s\n\r\t.,:;!?()\-+@#$%&*_=<>/\\'"[\]{}|~^`]/g, '').length;
      const ratio = extractedText.length ? printable / extractedText.length : 0;
      if (ratio < 0.6) {
        try {
          const ab = await new Promise<ArrayBuffer>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as ArrayBuffer);
            fr.onerror = () => reject(fr.error);
            fr.readAsArrayBuffer(file);
          });
          const bytes = new Uint8Array(ab);
          const decodedChunks: string[] = [];
          let currentBuf: number[] = [];
          const pushCurrent = () => {
            if (currentBuf.length >= 6) {
              try {
                const s = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(currentBuf));
                const clean = s.replace(/[^\x20-\x7EáàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ\s\n\r\t.,:;!?()\-+@#$%&*_=<>/\\'"[\]{}|~^`]/g, ' ').trim();
                if (clean.length >= 6) decodedChunks.push(clean);
              } catch { /* noop */ }
            }
            currentBuf = [];
          };
          for (const b of bytes) {
            const printableByte = (b >= 0x20 && b <= 0x7e) || (b >= 0x80 && b <= 0xff) || b === 0xa || b === 0xd || b === 0x9;
            if (printableByte) currentBuf.push(b);
            else pushCurrent();
          }
          pushCurrent();
          extractedText = decodedChunks.join('\n');
        } catch {
          extractedText = '';
        }
      }
    }
    setPdfImportDebugText(extractedText.slice(0, 8000)); // para DEBUG na UI
    const methodRef: { label?: string } = { label: 'Heurística local (Regex)' };
    const finalResult = await parseInvoiceUniversal(extractedText, { methodLabelRef: methodRef });
    setPdfImportMethodUsed(methodRef.label ?? '');
    return finalResult;
  };

  // Cola texto colado manualmente -> extrai direto
  const handlePdfPasteText = async (texto: string) => {
    setPdfImportDebugText(texto);
    setPdfImportIsParsing(true);
    try {
      const methodLabelRef: { label?: string } = { label: 'Heurística local (Regex)' };
      const parsed = await parseInvoiceUniversal(texto, { preferLLM: true, methodLabelRef });
      setPdfImportMethodUsed(methodLabelRef.label ?? '');
      setPdfImportExtracted(parsed);
      if (parsed.cartaoSugeridoNome && !pdfImportCartaoId) {
        const suggestion = (creditCards.length ? creditCards : defaultSampleCards).find(
          c => c.nome.toLowerCase().includes(parsed.cartaoSugeridoNome!.toLowerCase()) ||
               parsed.cartaoSugeridoNome!.toLowerCase().includes(c.nome.toLowerCase())
        );
        if (suggestion) setPdfImportCartaoId(suggestion.id);
      }
    } finally {
      setPdfImportIsParsing(false);
    }
  };


  const handlePdfFileSelect = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      triggerToast('Por favor, selecione um arquivo PDF.');
      return;
    }
    setPdfImportFileName(file.name);
    setPdfImportIsParsing(true);
    try {
      const parsed = await parsePdfInvoice(file);
      setPdfImportExtracted(parsed);
      // Sugerir cartao se encontrou nome no PDF
      if (parsed.cartaoSugeridoNome && !pdfImportCartaoId) {
        const suggestion = (creditCards.length ? creditCards : defaultSampleCards).find(
          c => c.nome.toLowerCase().includes(parsed.cartaoSugeridoNome!.toLowerCase()) || parsed.cartaoSugeridoNome!.toLowerCase().includes(c.nome.toLowerCase())
        );
        if (suggestion) setPdfImportCartaoId(suggestion.id);
      }
      // Avanca para REVIEW automatico
      setPdfImportStep('REVIEW');
    } catch (e: any) {
      console.error(e);
      triggerToast(e?.message || 'Não foi possível ler o PDF. Preencha manualmente.');
      setPdfImportExtracted({ itens: [] });
      setPdfImportStep('UPLOAD');
    } finally {
      setPdfImportIsParsing(false);
    }
  };

  const togglePdfItem = (id: string) => {
    if (!pdfImportExtracted) return;
    setPdfImportExtracted({
      ...pdfImportExtracted,
      itens: pdfImportExtracted.itens.map(it => it.id === id ? { ...it, selected: !it.selected } : it)
    });
  };

  const patchPdfItem = (id: string, patch: Partial<ExtractedInvoiceItem>) => {
    if (!pdfImportExtracted) return;
    setPdfImportExtracted({
      ...pdfImportExtracted,
      itens: pdfImportExtracted.itens.map(it => it.id === id ? { ...it, ...patch } : it)
    });
  };

  const addBlankPdfItem = () => {
    const hoje = new Date();
    const d = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const item: ExtractedInvoiceItem = {
      id: `pdf-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      data: d,
      descricao: '',
      categoria: 'Outros',
      valor: 0,
      selected: true
    };
    setPdfImportExtracted(prev => prev ? { ...prev, itens: [...prev.itens, item] } : { itens: [item] });
  };

  const toggleAllPdfItems = (checked: boolean) => {
    if (!pdfImportExtracted) return;
    setPdfImportExtracted({
      ...pdfImportExtracted,
      itens: pdfImportExtracted.itens.map(it => ({ ...it, selected: checked }))
    });
  };

  const handleConfirmPdfImport = async () => {
    if (!pdfImportExtracted || !pdfImportCartaoId) {
      triggerToast('Selecione um cartão de crédito.');
      return;
    }
    const selectedItems = pdfImportExtracted.itens.filter(it => it.selected);
    if (selectedItems.length === 0) {
      triggerToast('Selecione ao menos 1 lançamento para importar.');
      return;
    }
    const card = (creditCards.length ? creditCards : defaultSampleCards).find(c => c.id === pdfImportCartaoId);
    if (!card) {
      triggerToast('Cartão não encontrado.');
      return;
    }
    setPdfImportIsParsing(true);
    try {
      // Para cada item, determinar mesAno da fatura = mes da compra (ou mes referencia atual se faltar)
      // Mas em fatura a regra é: compra ANTES do diaFechamento -> fatura mes corrente
      // compra DEPOIS do diaFechamento -> fatura mes SEGUINTE
      const alocarParaMesAno = (dataCompraISO: string): string => {
        const [y, m, d] = dataCompraISO.split('-').map(Number);
        if (!y) {
          const h = new Date();
          return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
        }
        const dtComp = new Date(y, m - 1, d);
        const fechamentoEsteMes = new Date(y, m - 1, card.diaFechamento);
        if (dtComp <= fechamentoEsteMes) {
          return `${y}-${String(m).padStart(2, '0')}`;
        }
        const prox = new Date(y, m, 1);
        return `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}`;
      };
      // Cria / recupera fatura para cada mesAno distinto
      const mesAnoSet = new Set<string>();
      selectedItems.forEach(it => mesAnoSet.add(alocarParaMesAno(it.data)));
      
      const invoicesMap: Record<string, CreditCardInvoice> = {};
      for (const mesAno of Array.from(mesAnoSet)) {
        const inv = await getOrCreateInvoiceFor(card, mesAno);
        if (inv) {
          invoicesMap[mesAno] = inv;
        }
      }

      const allowedSet = new Set<string>(CATEGORIES.SAIDA);
      const normalizarCategoria = (c?: string): string => {
        const raw = (c || '').trim();
        if (!raw || raw.toLowerCase() === 'cartão' || raw.toLowerCase() === 'cartao') return 'Outros';
        // Mapeamentos conhecidos -> nomes da nova lista
        const map: Record<string, string> = {
          'Assinaturas': 'Serviços/Assinaturas',
          'Moradia': 'Casa/Moradia',
          'Moda': 'Compras/Vestuário',
          'Vestuário': 'Compras/Vestuário',
          'Roupa': 'Compras/Vestuário',
          'Tecnologia': 'Serviços/Assinaturas'
        };
        const m0 = map[raw] ?? raw;
        if (allowedSet.has(m0)) return m0;
        // Tenta casar ignorando case e acentos
        for (const op of allowedSet) {
          const norm = (s: string) =>
            s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          if (norm(op) === norm(raw)) return op;
        }
        return 'Outros';
      };

      const novasTransacoes: Transaction[] = selectedItems.map((it, idx) => {
        const mesAno = alocarParaMesAno(it.data);
        const fatura = invoicesMap[mesAno] || getInvoiceForCardMonth(card.id, mesAno);
        const valorCorrigido = Number(it.valor) > 0 ? Number(it.valor) : 0;
        const categoriaFinal = normalizarCategoria(it.categoria);
        return {
          id: `tx-import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          data: mesAno + `-01`, // aloca na fatura (dia 1 do mes de referencia)
          dataCompra: it.data, // salva data real da compra
          descricao: it.descricao.trim() || 'Compra Cartão',
          categoria: categoriaFinal,
          tipo: 'SAIDA',
          valor: valorCorrigido,
          status: 'PENDENTE',
          cartaoId: card.id,
          faturaId: fatura?.id,
          frequencia: it.totalParcelas && it.totalParcelas > 1 ? 'PARCELADO' : 'AVULSO',
          parcelaAtual: it.parcelaAtual,
          totalParcelas: it.totalParcelas
        };
      });

      // Persiste no estado local + Supabase (se conectado)
      setTransactions(prev => [...prev, ...novasTransacoes]);
      try {
        if (userId && supabase) {
          const payloads = novasTransacoes.map(tx => ({
            user_id: userId,
            data: tx.data,
            descricao: tx.descricao,
            categoria: tx.categoria,
            tipo: tx.tipo,
            valor: tx.valor,
            status: tx.status,
            data_postergar: tx.dataPostergar ?? null,
            juros: tx.juros ?? null,
            conta_id: tx.contaId ?? null,
            frequencia: tx.frequencia ?? 'AVULSO',
            periodicidade: tx.periodicidade ?? null,
            parcela_atual: tx.parcelaAtual ?? null,
            total_parcelas: tx.totalParcelas ?? null,
            grupo_recorrencia_id: tx.grupoRecorrenciaId ?? null,
            cartao_id: tx.cartaoId ?? null,
            fatura_id: tx.faturaId ?? null,
            data_compra: tx.dataCompra ?? null
          }));
          const { error: insertErr } = await supabase.from('transactions').insert(payloads);
          if (insertErr) throw insertErr;

          
          // Recalcula totais das faturas diretamente no banco usando valores locais somados
          for (const mesAno of Array.from(mesAnoSet)) {
            const inv = invoicesMap[mesAno] || getInvoiceForCardMonth(card.id, mesAno);
            if (inv) {
              const existingTxs = transactions.filter(t => {
                if (t.cartaoId !== card.id || t.tipo !== 'SAIDA') return false;
                if (t.faturaId) return t.faturaId === inv.id;
                return t.data.startsWith(mesAno);
              });
              const incomingTxs = novasTransacoes.filter(t => {
                if (t.cartaoId !== card.id || t.tipo !== 'SAIDA') return false;
                if (t.faturaId) return t.faturaId === inv.id;
                return t.data.startsWith(mesAno);
              });
              const allTxs = [...existingTxs, ...incomingTxs];
              const total = allTxs.reduce((s, t) => s + Number(t.valor), 0);
              
              const { error } = await supabase
                .from('faturas_cartao')
                .update({ valor_total: Number(total.toFixed(2)) })
                .eq('id', inv.id);
              if (error) throw error;
            }
          }
          await fetchTransactions();
          await fetchCreditCardInvoices();
        }
      } catch (e) {
        console.error('Erro persistindo importacao PDF no Supabase:', e);
      }

      triggerToast(`${novasTransacoes.length} lançamentos importados com sucesso no ${card.nome}!`);
      setIsPdfImportOpen(false);
      setPdfImportExtracted(null);
      setPdfImportFileName('');
      setPdfImportStep('UPLOAD');
    } finally {
      setPdfImportIsParsing(false);
    }
  };

  // Sugere melhor categoria: chaveia entre SAIDA do CATEGORIES + custom
  const categoriesListForPDF = Array.from(new Set([
    ...(CATEGORIES?.SAIDA ?? []),
    ...(customCategories?.SAIDA ?? [])
  ]));


  return (
    <div className="w-full min-h-screen flex justify-center bg-white select-none">
      {/* Centered responsive container */}
      <div className="relative w-full max-w-md h-[100dvh] bg-slate-50 flex flex-col shadow-2xl md:border-x md:border-slate-200 overflow-hidden">
        
        {/* Dynamic New Version Available Alert Banner */}
        {newVersionAvailable && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#0e69b2]/95 backdrop-blur-md border border-blue-600/30 rounded-2xl p-3.5 shadow-xl animate-slide-down flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5 text-left">
              <div className="p-1.5 rounded-lg bg-white/10 shrink-0 text-amber-300">
                <Info size={16} />
              </div>
              <div>
                <p className="text-[11px] font-extrabold leading-none">Novas melhorias disponíveis!</p>
                <p className="text-[9px] text-white/85 font-bold mt-1 font-sans">Atualize o aplicativo para carregar a nova versão.</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-white text-blue-900 text-[10px] font-extrabold hover:bg-slate-100 transition-colors shadow-sm cursor-pointer shrink-0 font-sans"
            >
              Atualizar
            </button>
          </div>
        )}

        {/* Left-side Drawer Navigation Menu */}
        {!loading && currentUser && isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex animate-fade-in">
            {/* Backdrop click dismiss */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer" 
              onClick={() => setIsDrawerOpen(false)} 
            />

            {/* Drawer container (slides from left) */}
            <div className="relative w-64 max-w-[80vw] h-full bg-brand-gradient-drawer text-white flex flex-col p-5 shadow-2xl border-r border-white/10 z-10 animate-slide-right overflow-hidden">
              {/* Header section with close and branding */}
              <div className="flex items-start justify-between gap-2 pb-4 border-b border-white/10 w-full">
                <div className="flex flex-col text-left min-w-0 w-full overflow-hidden">
                  {/* ======== LOGO NOVA (knotfin → KOEE, TÔQUEBRADO!) ========
                      Paleta IGUAL ao desenho antigo knotfin:
                        "KOEE,"      = BRANCO PURO (igual "knot")
                        "TÔQUEBRADO!" = LARANJA ÂMBAR (igual "fin")
                      Fonte: clamp() responsivo = NUNCA MAIS VAZA borda direita drawer.
                      - Mobile compacto (360px → drawer ~288px = max 80vw): minimo 16px → CABE INTEIRO.
                      - Tablets/Desktop: max 24px (igual text-2xl original 24px).
                      - truncate + min-w-0 = GARANTIA ANTI-VAZAMENTO ABSOLUTO
                        (mesmo que nome seja enorme, nao ultrapassa a borda direita).
                  */}
                  <h1
                    className="m-0 p-0 leading-none font-black font-sans whitespace-nowrap select-none
                               min-w-0 w-full overflow-hidden text-ellipsis"
                    style={{
                      fontSize: 'clamp(16px, 5vw, 24px)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    <span className="text-white">KOEE,</span>{' '}
                    <span className="text-amber-400">TÔQUEBRADO!</span>
                  </h1>
                  {/* Slogan Workspace → "No final a conta fecha!" */}
                  <span
                    className="text-white/60 font-bold font-sans mt-1 whitespace-nowrap min-w-0 w-full overflow-hidden text-ellipsis"
                    style={{ fontSize: 'clamp(9px, 2.7vw, 11px)' }}
                  >
                    No final a conta fecha!
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-white/75 hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
                >
                  <X size={16} />
                </button>
              </div>

              {/* User Identity info inside drawer (COM FOTO DE PERFIL DINAMICA!) */}
              <div className="py-5 border-b border-white/10 mb-4 text-left font-sans flex flex-col items-start gap-3">
                {/* Avatar grande no drawer (foto ou iniciais) */}
                {userProfile?.avatarUrl ? (
                  <img 
                    src={userProfile.avatarUrl} 
                    alt="Foto de Perfil" 
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/30 shadow-lg"
                  />
                ) : (
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarAccentColor(currentUser)} ring-2 ring-white/30 shadow-lg flex items-center justify-center text-xl font-black text-white tracking-tight`}>
                    {getInitials(currentUser)}
                  </div>
                )}
                <div className="min-w-0 w-full">
                  <p className="text-[9px] uppercase font-extrabold text-white/50 mb-0.5">Logado como</p>
                  <p className="text-xs font-bold text-white truncate">{currentUser}</p>
                  <p className="text-[10px] text-white/55 font-semibold truncate">{userEmail}</p>
                </div>
              </div>

              {/* Navigation list items */}
              <nav className="flex-1 space-y-1.5 text-left font-sans">
                {/* Início Link */}
                <button
                  onClick={() => {
                    setActiveTab('INICIO');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'INICIO'
                      ? 'bg-white/12 text-white border border-white/20 shadow-inner'
                      : 'text-white/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Home size={16} />
                  <span>Início</span>
                </button>

                {/* Controle de Diárias Link */}
                <button
                  onClick={() => {
                    setActiveTab('DIARIAS');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'DIARIAS'
                      ? 'bg-white/12 text-white border border-white/20 shadow-inner'
                      : 'text-white/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Briefcase size={16} />
                  <span>Controle de Diárias</span>
                </button>

                {/* Relatórios Link */}
                <button
                  onClick={() => {
                    setActiveTab('RELATORIOS');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'RELATORIOS'
                      ? 'bg-white/12 text-white border border-white/20 shadow-inner'
                      : 'text-white/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <BarChart2 size={16} />
                  <span>Relatórios</span>
                </button>

                {/* Carteiras & Contas Link */}
                <button
                  onClick={() => {
                    setActiveTab('CONTAS');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'CONTAS'
                      ? 'bg-white/12 text-white border border-white/20 shadow-inner'
                      : 'text-white/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Wallet size={16} />
                  <span>Carteiras & Contas</span>
                </button>

                {/* Cartões de Crédito Link */}
                <button
                  onClick={() => {
                    setActiveTab('CARTOES');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'CARTOES'
                      ? 'bg-white/12 text-white border border-white/20 shadow-inner'
                      : 'text-white/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <CreditCardIcon size={16} />
                  <span>Cartões de Crédito</span>
                </button>

                {/* Ajustes Link */}
                <button
                  onClick={() => {
                    // Sincroniza o estado do avatar com o userProfile (último salvo) ao abrir AJUSTES
                    setSettingsAvatarUrl(userProfile?.avatarUrl ?? null);
                    setActiveTab('PERFIL');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'PERFIL'
                      ? 'bg-white/12 text-white border border-white/20 shadow-inner'
                      : 'text-white/75 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Settings size={16} />
                  <span>Ajustes & Conta</span>
                </button>
              </nav>

              {/* Bottom Drawer actions */}
              <div className="border-t border-white/10 pt-4 space-y-2 font-sans">
                {/* Refresh/Sync button */}
                <button
                  onClick={() => {
                    handleSync();
                    setIsDrawerOpen(false);
                  }}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white/75 hover:bg-white/10 hover:text-white transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin text-[#f59e0b]" : ""} />
                  <span>Atualizar Dados</span>
                </button>

                {/* Logout button */}
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conditional rendering based on loading session */}
        {loading ? (
          <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center text-slate-500 h-full">
            <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
            <span className="text-sm font-semibold font-sans text-slate-405">Carregando carteira...</span>
          </div>
        ) : !currentUser ? (
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === 'INICIO' ? (
              <>
                {/* Top Header Navigation (Revolut Inspired Mesh Background) */}
                <header className="revolut-hero-bg text-white pt-6 pb-12 px-5 rounded-b-[36px] shadow-revolut-glow relative shrink-0">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    {/* Profile Avatar & Drawer Menu Trigger (DINAMICO! foto se existir senao iniciais) */}
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full glass-pill hover:bg-white/25 transition cursor-pointer"
                      title="Menu"
                    >
                      {userProfile?.avatarUrl ? (
                        <img 
                          src={userProfile.avatarUrl} 
                          alt="Foto de Perfil" 
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-white/60"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarAccentColor(currentUser)} ring-2 ring-white/60 flex items-center justify-center text-[10px] font-black text-white tracking-tight`}>
                          {getInitials(currentUser)}
                        </div>
                      )}
                      <Menu size={12} className="text-white/90" />
                    </button>

                    {/* Cards Selector Pill (Revolut/Apple Wallet Launcher) */}
                    <button
                      onClick={() => setIsWalletModalOpen(true)}
                      className="flex-1 max-w-[210px] sm:max-w-xs flex items-center justify-between px-3 py-1.5 bg-white/12 border border-white/18 rounded-full text-xs text-white hover:bg-white/20 transition backdrop-blur-md shadow-sm cursor-pointer font-sans"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Wallet size={12} className="text-amber-300" />
                        <span className="font-extrabold truncate">{getActiveCardLabel()}</span>
                      </div>
                      <ChevronDown size={10} className="opacity-70 ml-1 shrink-0" />
                    </button>

                    {/* Notification Alerts */}
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => triggerToast('Notificações em dia!')} 
                        className="w-9 h-9 rounded-full glass-pill flex items-center justify-center text-white/90 hover:bg-white/25 transition relative cursor-pointer"
                      >
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-400 rounded-full ring-1 ring-blue-900"></span>
                      </button>
                    </div>
                  </div>

                  {/* Month Selector Pill */}
                  <div className="flex justify-center mb-4">
                    <div className="inline-flex items-center space-x-3 px-4 py-1.5 rounded-full glass-pill text-xs font-semibold tracking-wide font-sans">
                      <button
                        onClick={handlePrevMonth}
                        className="text-white/70 hover:text-white transition cursor-pointer"
                        title="Mês Anterior"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span className="uppercase">{selectedMonthLabel}</span>
                      <button
                        onClick={handleNextMonth}
                        className="text-white/70 hover:text-white transition cursor-pointer"
                        title="Próximo Mês"
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Content: Balance + Quick Actions */}
                  <div className={`overflow-hidden transition-all duration-500 ease-out ${isHeaderCollapsed ? 'max-h-0 opacity-0 mt-0 pointer-events-none' : 'max-h-[560px] opacity-100 mt-3'}`}>

                     {/* Main Balance Display */}
                    <div className="text-center space-y-1 mt-2">
                      <div className="flex items-center justify-center space-x-1.5 text-xs text-blue-100 font-bold tracking-wide uppercase font-sans">
                        <span>Conta Principal • BRL</span>
                        <button 
                          onClick={() => setIsBalanceVisible(!isBalanceVisible)} 
                          className="text-blue-100/80 hover:text-white transition cursor-pointer"
                        >
                          {isBalanceVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                      </div>

                      <div className="flex items-center justify-center space-x-1">
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-white">
                          {isBalanceVisible ? `R$ ${saldoAcumulado.toFixed(2).replace('.', ',')}` : 'R$ •••••••'}
                        </h1>
                      </div>

                      <div className="pt-1 pb-0.5">
                        <span className="inline-block px-3 py-0.5 rounded-full bg-white/10 text-[10px] text-blue-100 font-bold font-sans">
                          Saldo Disponível
                        </span>
                      </div>

                      {/* Tô Quebrado? Financial Intelligence Widget (Etapa 1 Hero) */}
                      {financialHeroWidget}
                    </div>

                    {/* Quick Action Grid (4 round glass buttons) */}
                    <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto mt-7">
                      <button 
                        onClick={() => openModalForType('ENTRADA')} 
                        className="flex flex-col items-center space-y-1.5 group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full glass-btn flex items-center justify-center text-white text-base shadow-lg">
                          <Plus size={18} className="stroke-[2.5]" />
                        </div>
                        <span className="text-[11px] font-bold text-blue-50 font-sans">Entrada</span>
                      </button>

                      <button 
                        onClick={() => openModalForType('SAIDA')} 
                        className="flex flex-col items-center space-y-1.5 group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full glass-btn flex items-center justify-center text-white text-base shadow-lg">
                          <Minus size={18} className="stroke-[2.5]" />
                        </div>
                        <span className="text-[11px] font-bold text-blue-50 font-sans">Saída</span>
                      </button>

                      <button 
                        onClick={() => {
                          setActiveTab('RELATORIOS');
                        }}
                        className="flex flex-col items-center space-y-1.5 group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full glass-btn flex items-center justify-center text-white text-base shadow-lg">
                          <BarChart2 size={18} />
                        </div>
                        <span className="text-[11px] font-bold text-blue-50 font-sans">Relatórios</span>
                      </button>

                      <button 
                        onClick={() => setIsWalletModalOpen(true)} 
                        className="flex flex-col items-center space-y-1.5 group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full glass-btn flex items-center justify-center text-white text-base shadow-lg">
                          <CreditCardIcon size={18} />
                        </div>
                        <span className="text-[11px] font-bold text-blue-50 font-sans">Cartões</span>
                      </button>
                    </div>
                  </div>

                  {/* Grab Handle / Minimize Toggle (White Pill Bar) - BORDA INFERIOR do Header */}
                  <div className="mt-7 -mb-1 flex items-center justify-center z-30 relative">
                    <button
                      onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                      className="group flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none"
                      title={isHeaderCollapsed ? 'Mostrar detalhes do saldo' : 'Minimizar valores'}
                    >
                      <span className="block h-1.5 w-14 rounded-full bg-white/95 shadow-[0_2px_14px_rgba(15,23,42,0.15)] transition-all group-hover:w-16 group-hover:bg-white" />
                      {isHeaderCollapsed && (
                        <ChevronDown size={11} className="text-white/85 animate-fade-in" strokeWidth={3} />
                      )}
                      {!isHeaderCollapsed && (
                        <ChevronUp size={12} className="text-white animate-fade-in" strokeWidth={3} />
                      )}
                    </button>
                  </div>
                </header>

                {/* Scrollable Content Pane */}
                <main
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const y = el.scrollTop;
                    const lastY = mainInicioScrollRef.current;
                    const dy = y - lastY;
                    if (dy > 14) {
                      // Apenas auto-colapsa ao rolar PARA BAIXO (e só se ainda não estiver colapsado)
                      // NUNCA MAIS auto-expande — abrir só é possível com clique MANUAL na setinha
                      if (!isHeaderCollapsed) setIsHeaderCollapsed(true);
                    }
                    mainInicioScrollRef.current = y;
                  }}
                  className={`flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 scrollbar-thin pb-28 transition-all duration-500 ease-out`}
                >
                  
                  {/* Stats Header Summary Cards (Inputs vs Expenses) — AGORA SEMPRE VISÍVEL (fora da área colapsada) */}
                  <StatsHeader 
                    saldoAcumulado={saldoAcumulado}
                    totalEntradas={totalEntradasMes}
                    totalSaidas={totalSaidasMes}
                  />

                  {/* Warning/Cleanup Banner for Mock Data */}
                  {mockTransactionsCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-4 flex flex-col gap-3 shadow-xs animate-fade-in shrink-0 text-left font-sans">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-extrabold text-amber-700">Dados fictícios detectados</h4>
                          <p className="text-[10px] text-amber-600/80 font-bold leading-normal">
                            Identificamos {mockTransactionsCount} {mockTransactionsCount === 1 ? 'lançamento' : 'lançamentos'} de teste na sua conta. Deseja removê-los e manter apenas seus dados originais?
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleDeleteMockData}
                          disabled={isSyncing}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                        >
                          Limpar dados de teste
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Onboarding Empty State Seeding Card */}
                  {transactions.length === 0 && (
                    <div className="bg-white border border-slate-200 rounded-[24px] p-4 flex flex-col gap-3 shadow-xs animate-fade-in shrink-0 text-left font-sans">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-blue-600/10 text-blue-500 shrink-0">
                          <Info size={18} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-extrabold text-blue-300">Primeiros passos</h4>
                          <p className="text-[10px] text-slate-500 font-bold leading-normal">
                            Sua carteira está vazia! Deseja carregar alguns lançamentos fictícios para experimentar as funcionalidades do Tô Quebrado?
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleSeedMockData}
                          disabled={isSyncing}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-700 to-blue-700 text-white text-[10px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                        >
                          Carregar dados de teste
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filters Bar: Compact 2-Line Layout */}
                  <div className="space-y-2 font-sans">
                    {/* Line 1 — Search + View Toggle (icon) merged */}
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por descrição ou categoria..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-12 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e69b2] focus:bg-white transition-all font-semibold shadow-inner focus:shadow-sm focus:shadow-blue-500/10"
                      />
                      <button
                        onClick={() => setInicioViewMode(inicioViewMode === 'LIST' ? 'CHART' : 'LIST')}
                        title={inicioViewMode === 'LIST' ? 'Ver Gráficos' : 'Ver Lista'}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-[#0e69b2]/10 border border-slate-200 hover:border-[#0e69b2]/30 text-slate-600 hover:text-[#0e69b2] transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        {inicioViewMode === 'LIST' ? <BarChart3 size={15} strokeWidth={2.2} /> : <LayoutList size={15} strokeWidth={2.2} />}
                      </button>
                    </div>

                    {/* Line 2 — Segmented Control (Tipo) + Botão Único Status (Dropdown / BottomSheet) */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Segmented Control Type Filter (fixed size, no shrink) */}
                      <div className="flex-shrink-0 flex items-center gap-0.5 bg-white border border-slate-200 p-0.5 rounded-2xl text-xs font-bold shadow-inner">
                        <button
                          onClick={() => { setFilterType('TODOS'); setStatusFilter('TODOS'); }}
                          className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold text-center transition-all cursor-pointer whitespace-nowrap ${
                            filterType === 'TODOS'
                              ? 'bg-slate-200 text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-600'
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          onClick={() => { setFilterType('ENTRADA'); setStatusFilter('TODOS'); }}
                          className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold text-center transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                            filterType === 'ENTRADA'
                              ? 'bg-slate-200 text-emerald-600 shadow-sm'
                              : 'text-slate-500 hover:text-slate-600'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Receitas
                        </button>
                        <button
                          onClick={() => { setFilterType('SAIDA'); setStatusFilter('TODOS'); }}
                          className={`py-1.5 px-3 rounded-xl text-[10px] font-extrabold text-center transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                            filterType === 'SAIDA'
                              ? 'bg-slate-200 text-rose-500 shadow-sm'
                              : 'text-slate-500 hover:text-slate-600'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Despesas
                        </button>
                      </div>

                      {/* Botão Único de Status (Pill Compacto) */}
                      {(() => {
                        // Monta opções de status com base no filterType
                        type Opt = { key: 'TODOS' | TransactionStatus; label: string; dotColor: string; textColor: string; bgColor: string };
                        const opcoesPadrao: Opt[] = [
                          { key: 'TODOS', label: 'Todos os Status', dotColor: 'bg-slate-400', textColor: 'text-slate-700', bgColor: 'bg-slate-100' },
                          { key: 'PAGO', label: 'Pagos', dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
                          { key: 'RECEBIDO', label: 'Recebidos', dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
                          { key: 'PENDENTE', label: 'Pendentes', dotColor: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
                          { key: 'POSTERGAR', label: 'Postergados', dotColor: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
                        ];
                        let statusOpts: Opt[] = opcoesPadrao;
                        if (filterType === 'ENTRADA') {
                          statusOpts = [
                            opcoesPadrao[0],
                            opcoesPadrao[2], // RECEBIDO
                            opcoesPadrao[3], // PENDENTE
                          ];
                        } else if (filterType === 'SAIDA') {
                          statusOpts = [
                            opcoesPadrao[0],
                            opcoesPadrao[1], // PAGO
                            opcoesPadrao[3], // PENDENTE
                            opcoesPadrao[4], // POSTERGAR
                          ];
                        }
                        const statusAtual: Opt = statusOpts.find(o => o.key === statusFilter) ?? statusOpts[0];
                        const isTodos = statusFilter === 'TODOS';

                        return (
                          <>
                            <button
                              onClick={() => setStatusMenuAberto(true)}
                              className={[
                                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border shadow-sm cursor-pointer active:scale-95',
                                isTodos
                                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                  : `${statusAtual.bgColor} border-transparent ${statusAtual.textColor} hover:brightness-95`
                              ].join(' ')}
                            >
                              <Tag size={12} strokeWidth={2.5} className={isTodos ? 'opacity-70' : ''} />
                              <span className="font-black uppercase tracking-wide text-[10px]">Status:</span>
                              <span className="font-black capitalize">{statusAtual.label.replace(/^Todos os Status$/, 'Todos')}</span>
                              <ChevronDown size={12} strokeWidth={2.8} className="opacity-80" />
                            </button>

                            {/* BOTTOM SHEET DE STATUS via React Portal (fora do overflow) */}
                            {statusMenuAberto && typeof document !== 'undefined' && createPortal(
                              <>
                                {/* Backdrop */}
                                <div
                                  className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in cursor-pointer"
                                  onClick={() => setStatusMenuAberto(false)}
                                  aria-hidden
                                />
                                {/* Bottom Sheet / Modal responsiva */}
                                <div className="fixed z-[100] inset-x-0 sm:inset-x-auto sm:max-w-md sm:w-[92%] sm:left-1/2 sm:-translate-x-1/2 bottom-0 sm:bottom-auto sm:top-[14%] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-slate-900/30 border border-slate-200 animate-slide-up-sm sm:animate-pop-in overflow-hidden">
                                  {/* Handle */}
                                  <div className="pt-3 pb-1 flex justify-center">
                                    <div className="w-11 h-1.5 rounded-full bg-slate-200" />
                                  </div>
                                  {/* Header */}
                                  <div className="px-5 pt-2 pb-3 border-b border-slate-100 flex items-center justify-between">
                                    <div>
                                      <p className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-400">FILTRAR POR</p>
                                      <h3 className="text-[15px] font-black text-slate-800 tracking-tight mt-0.5">Status de Lançamento</h3>
                                    </div>
                                    <button
                                      onClick={() => setStatusMenuAberto(false)}
                                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
                                    >
                                      <X size={15} strokeWidth={2.4} />
                                    </button>
                                  </div>
                                  {/* Opções */}
                                  <div className="p-3 pb-5 space-y-1.5 max-h-[62vh] overflow-y-auto">
                                    {statusOpts.map((opt) => {
                                      const selecionado = statusFilter === opt.key;
                                      return (
                                        <button
                                          key={opt.key}
                                          onClick={() => { setStatusFilter(opt.key); setStatusMenuAberto(false); }}
                                          className={[
                                            'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-[13px] font-bold transition-all cursor-pointer text-left border',
                                            selecionado
                                              ? `${opt.bgColor} border-transparent ${opt.textColor} shadow-sm ring-2 ring-offset-1 ring-offset-white ring-slate-900/5`
                                              : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                                          ].join(' ')}
                                        >
                                          <span className={[
                                            'w-3.5 h-3.5 rounded-full ring-4 ring-offset-1 ring-offset-transparent flex-shrink-0',
                                            opt.dotColor,
                                            selecionado ? 'ring-slate-900/10' : 'ring-white/0'
                                          ].join(' ')} />
                                          <span className="flex-1 font-black capitalize tracking-wide">{opt.label}</span>
                                          {selecionado && (
                                            <span className={['w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', opt.bgColor, opt.textColor].join(' ')}>
                                              <Check size={13} strokeWidth={3.2} />
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>,
                              document.body
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* List View or Charts View */}
                  {inicioViewMode === 'LIST' ? (
                    <div>
                      <WeeklyAccordion
                        transactions={displayTransactions}
                        onEditTransaction={handleOpenEditModal}
                        onToggleStatus={handleToggleStatus}
                        accounts={accounts}
                      />
                    </div>
                  ) : (
                    /* VISUAL CHARTS SECTION (Gráficos/Análises) */
                    <div className="space-y-4 animate-fade-in font-sans">
                      <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 text-left">
                          Gastos por Categoria
                        </h4>
                        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                          <div className="relative flex items-center justify-center shrink-0">
                            {/* SVG Doughnut */}
                            <svg width="140" height="140" viewBox="0 0 100 100" className="w-36 h-36">
                              {/* Alimentação (52%) */}
                              <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f43f5e" strokeWidth="10" strokeDasharray="114 220" strokeDashoffset="55" strokeLinecap="round" />
                              {/* Outros (30%) */}
                              <circle cx="50" cy="50" r="35" fill="transparent" stroke="#64748b" strokeWidth="10" strokeDasharray="66 220" strokeDashoffset="169" strokeLinecap="round" />
                              {/* Lazer (12%) */}
                              <circle cx="50" cy="50" r="35" fill="transparent" stroke="#8b5cf6" strokeWidth="10" strokeDasharray="26 220" strokeDashoffset="235" strokeLinecap="round" />
                              {/* Transporte (6%) */}
                              <circle cx="50" cy="50" r="35" fill="transparent" stroke="#f59e0b" strokeWidth="10" strokeDasharray="14 220" strokeDashoffset="261" strokeLinecap="round" />
                              {/* Center cover */}
                              <circle cx="50" cy="50" r="28" fill="#0f172a" />
                              <text x="50" y="47" textAnchor="middle" fill="#94a3b8" fontSize="6" fontWeight="bold">GASTOS</text>
                              <text x="50" y="58" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black" fontFamily="monospace">R$ 3.540</text>
                            </svg>
                          </div>
                          
                          {/* Legend list */}
                          <div className="flex-1 space-y-2 text-left w-full">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block shrink-0" />
                                <span className="text-slate-500 font-bold">Alimentação</span>
                              </div>
                              <span className="font-mono text-slate-800 font-bold">52.3%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-550 block shrink-0" />
                                <span className="text-slate-500 font-bold">Outros</span>
                              </div>
                              <span className="font-mono text-slate-800 font-bold">30.0%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block shrink-0" />
                                <span className="text-slate-500 font-bold">Lazer / Assinaturas</span>
                              </div>
                              <span className="font-mono text-slate-800 font-bold">11.5%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block shrink-0" />
                                <span className="text-slate-500 font-bold">Transporte</span>
                              </div>
                              <span className="font-mono text-slate-800 font-bold">6.2%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 text-left">
                          Fluxo Mensal Semana a Semana
                        </h4>
                        
                        {/* Weekly flow chart */}
                        <div className="flex justify-between items-end h-32 px-4 pt-4">
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div className="w-full flex justify-center gap-1 items-end h-24">
                              <div className="w-3 bg-emerald-500 rounded-t-md h-full relative group">
                                <span className="absolute -top-7 bg-slate-200 text-[8px] text-slate-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">R$ 4.192</span>
                              </div>
                              <div className="w-3 bg-rose-500 rounded-t-md h-[84%] relative group">
                                <span className="absolute -top-7 bg-slate-200 text-[8px] text-slate-800 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">R$ 3.540</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">Sem 1</span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div className="w-full flex justify-center gap-1 items-end h-24">
                              <div className="w-3 bg-emerald-500/10 rounded-t-md h-[4%]"></div>
                              <div className="w-3 bg-rose-500/10 rounded-t-md h-[4%]"></div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">Sem 2</span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div className="w-full flex justify-center gap-1 items-end h-24">
                              <div className="w-3 bg-emerald-500/10 rounded-t-md h-[4%]"></div>
                              <div className="w-3 bg-rose-500/10 rounded-t-md h-[4%]"></div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">Sem 3</span>
                          </div>
                          <div className="flex flex-col items-center gap-1.5 flex-1">
                            <div className="w-full flex justify-center gap-1 items-end h-24">
                              <div className="w-3 bg-emerald-500/10 rounded-t-md h-[4%]"></div>
                              <div className="w-3 bg-rose-500/10 rounded-t-md h-[4%]"></div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold">Sem 4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </main>
              </>
            ) : activeTab === 'DIARIAS' ? (
              <WorkShiftDashboard
                key={reportsRemountKey}
                entries={monthWorkShifts}
                onEditEntry={(entry) => {
                  setEditingShiftEntry(entry);
                  setIsShiftModalOpen(true);
                }}
                onSendToWallet={handleSendToWallet}
                onMarkAsPaid={handleMarkShiftAsPaid}
                months={months}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                isSyncing={isSyncing}
                onGoToReports={() => {
                  setReportsInitialReport('DIARIAS_TRABALHO');
                  setReportsRemountKey(prev => prev + 1);
                  setActiveTab('RELATORIOS');
                }}
              />
            ) : activeTab === 'RELATORIOS' ? (
              <ReportsDashboard
                key={reportsRemountKey}
                transactions={transactions}
                workShifts={workShifts}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                onMarkShiftAsPaid={handleMarkShiftAsPaid}
                onDeleteWorkShift={handleDeleteWorkShift}
                initialReport={reportsInitialReport}
              />
            ) : activeTab === 'CONTAS' ? (
              <AccountsDashboard
                accounts={accounts}
                transfers={transfers}
                transactions={transactions}
                workShifts={workShifts}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                onSaveAccount={handleSaveAccount}
                onDeleteAccount={handleDeleteAccount}
                onSaveTransfer={handleSaveTransfer}
              />
            ) : activeTab === 'CARTOES' ? (
              <CreditCardsDashboard
                cards={creditCards}
                invoices={creditCardInvoices}
                _transactions={transactions}
                _accounts={accounts}
                selectedMonth={selectedMonth}
                months={months}
                onMonthChange={setSelectedMonth}
                onOpenDrawer={() => setIsDrawerOpen(true)}
                isSyncing={isSyncing}
                onAddCard={() => {
                  setEditingCreditCard(null);
                  setIsCreditCardModalOpen(true);
                }}
                onEditCard={(card) => {
                  setEditingCreditCard(card);
                  setIsCreditCardModalOpen(true);
                }}
                onViewInvoice={handleViewInvoice}
                onPayInvoice={handlePayInvoiceFromDashboard}
                onImportPdfInvoice={() => {
                  setPdfImportStep('UPLOAD');
                  setPdfImportExtracted(null);
                  setPdfImportFileName('');
                  setPdfImportCartaoId(creditCards[0]?.id || defaultSampleCards[0]?.id || '');
                  setIsPdfImportOpen(true);
                }}
              />
            ) : (
              <>
                {/* Header for Settings page + AVATAR DROPDOWN (topo visível IMEDIATAMENTE!) */}
                <header className="px-5 pb-3.5 pt-4.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-655 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Menu"
                    >
                      <Menu size={20} />
                    </button>
                    
                    <span className="text-sm font-extrabold text-slate-800 font-sans truncate">
                      Ajustes & Conta
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 py-1 px-2.5 rounded-xl text-[9px] text-slate-500 font-bold font-sans">
                      Versão {CURRENT_VERSION}
                    </div>
                    {/* Avatar Interativo com Dropdown — IMEDIATAMENTE visível no topo! */}
                    <AvatarDropdown
                      size="md"
                      avatarUrl={settingsAvatarUrl}
                      userName={userProfile?.nomeCompleto || currentUser}
                      onChangeAvatar={setSettingsAvatarUrl}
                    />
                  </div>
                </header>

                <ProfileSettings
                  userName={currentUser}
                  userEmail={userEmail}
                  userProfile={userProfile}
                  onSaveProfile={handleSaveProfile}
                  onLogout={handleLogout}
                  onSeedData={handleSeedMockData}
                  onDeleteMockData={handleDeleteMockData}
                  mockTransactionsCount={mockTransactionsCount}
                  isSyncing={isSyncing}
                  // Controlled state: o estado principal é no App.tsx (header GLOBAL), sync com ProfileSettings
                  localAvatarUrl={settingsAvatarUrl}
                  onLocalAvatarChange={setSettingsAvatarUrl}
                  showInternalHeader={false}  // Header interno já está no topo! Sem duplicar!
                  // ======= NOVO: Gerenciar Categorias & Subcategorias =======
                  categories={categories}
                  onNewCategory={openNewCategoryModal}
                  onEditCategory={openEditCategoryModal}
                  onDeleteCategory={handleDeleteCategory}
                  onAddSubcategory={openAddSubcategoryModal}
                />
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🔍 ASSISTENTE FINANCEIRO 💡 FAB (INFERIOR ESQUERDO)            */}
            {/* SIMETRIA: ESQUERDA = inteligência (assistente)                  */}
            {/*           DIREITA  = ação (+ registrar lançamento)              */}
            {/* UX RULES:                                                       */}
            {/*  • NUNCA abre automaticamente (evita irritação)                 */}
            {/*  • Usuário decide quando clicar                                 */}
            {/*  • Indicador • s/ existir insight atencao/critico NÃO dismiss   */}
            {/*  • Crítico: pulse ÚNICA 1x (sem piscar pra sempre)              */}
            {/*  • × = dismiss por (mes + status) salvo em localStorage         */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {(activeTab === 'INICIO' || activeTab === 'DIARIAS') && (
              <div className="absolute bottom-6 left-6 z-20">

                {/* 1) Popup flutuante (SÓ aparece se usuário clicar) */}
                {isInsightPopupOpen && (
                  <div
                    className="absolute bottom-[5.5rem] left-0 w-[288px] sm:w-[320px] select-none animate-fade-in"
                    style={{ animationDuration: '220ms' }}
                  >
                    {/* Triangulo aponta para o botão 💡 */}
                    <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-white rotate-45 rounded-sm shadow-[0_2px_6px_rgba(15,23,42,0.08)]" />

                    <div className="relative rounded-2xl bg-white shadow-[0_10px_40px_rgba(15,23,42,0.14)] border border-slate-100 overflow-hidden">
                      {/* Fechar × */}
                      <button
                        onClick={() => {
                          // dismiss ATÉ no positivo/neutro? só dismiss se status relevante
                          if (financialInsight.status === 'atencao' || financialInsight.status === 'critico') {
                            const next = { ...dismissedMap, [dismissKey(financialInsight.status)]: true as const };
                            persistDismissedMap(next);
                          }
                          setIsInsightPopupOpen(false);
                        }}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition z-10 cursor-pointer"
                        title="Fechar insight"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>

                      <div className="px-4 pt-4 pb-3 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] block">
                          tô quebrado?
                        </span>
                        <div>
                          <span
                            className={`text-[15px] font-black tracking-tight ${
                              financialInsight.status === 'critico' ? 'text-rose-600' :
                              financialInsight.status === 'atencao' ? 'text-cyan-700' :
                              financialInsight.status === 'ok' ? 'text-emerald-600' :
                              'text-slate-700'
                            }`}
                          >
                            {financialInsight.bold}
                          </span>
                        </div>
                        <p className="text-[13px] leading-snug text-slate-600 font-medium pt-0.5">
                          {financialInsight.description}
                        </p>
                      </div>

                      {financialInsight.cta && (
                        <div className="px-4 pb-4 pt-1">
                          <button
                            onClick={() => {
                              setIsInsightPopupOpen(false);
                              // CTA => navegar para filtrar somente SAÍDAS no mês
                              setFilterType('SAIDA');
                              setStatusFilter('TODOS');
                              setActiveTab('INICIO');
                            }}
                            className={`w-full text-left text-sm font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer ${
                              financialInsight.status === 'critico'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                            }`}
                          >
                            {financialInsight.cta}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2) Botão 💡 FAB propriamente dito */}
                <div className="relative">
                  {/* Crítico: pulse ÚNICA (1x no 1º carregamento — nunca mais) */}
                  {shouldPlayCriticalPulse && (
                    <>
                      <span
                        className="absolute -inset-2 rounded-full bg-rose-400/30 pointer-events-none"
                        style={{ animation: 'insight-pulse-once 1.6s cubic-bezier(0,0,0.2,1) forwards' }}
                      />
                      <style>{`@keyframes insight-pulse-once { 0% { transform: scale(0.85); opacity: 0.85; } 60% { transform: scale(1.55); opacity: 0.1; } 100% { transform: scale(1.7); opacity: 0; } }`}</style>
                    </>
                  )}

                  {/* Glow suave fundo (SOMENTE se existir insight não dismiss) */}
                  {showInsightDot && (
                    <span
                      className={`absolute -inset-2 rounded-full ${
                        financialInsight.status === 'critico' ? 'bg-rose-400/10' : 'bg-cyan-400/10'
                      } pointer-events-none`}
                    />
                  )}

                  <button
                    onClick={() => setIsInsightPopupOpen((prev) => !prev)}
                    className={`relative w-14 h-14 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all z-10 flex items-center justify-center cursor-pointer ${
                      (financialInsight.status === 'critico' && !insightIsDismissed)
                        ? 'bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-500/30'
                        : (financialInsight.status === 'atencao' && !insightIsDismissed)
                          ? 'bg-gradient-to-br from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700 text-white shadow-cyan-500/30'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-slate-300/40'
                    }`}
                    title="💡 Insight financeiro"
                  >
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6" />
                      <path d="M10 22h4" />
                      <path d="M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z" />
                    </svg>

                    {/* Indicador • (notificação) - só se existir insight não dismiss */}
                    {showInsightDot && (
                      <span
                        className={`absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          financialInsight.status === 'critico' ? 'bg-rose-200' : 'bg-cyan-200'
                        }`}
                      />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom-Right Circular Highlighted FAB Plus Button (Context Aware - Only for INICIO/DIARIAS) */}
            {(activeTab === 'INICIO' || activeTab === 'DIARIAS') && (
              <div className="absolute bottom-6 right-6 z-20">
                {/* pulsing glow rings to highlight */}
                <div className="absolute -inset-1.5 rounded-full bg-[#f08622]/20 animate-pulse scale-105" />
                <div className="absolute -inset-3.5 rounded-full bg-[#f08622]/5 scale-110" />
                
                <button
                  onClick={handleFABClick}
                  className="relative w-14 h-14 rounded-full bg-[#f08622] hover:bg-[#d97214] text-white flex items-center justify-center shadow-lg shadow-[#f08622]/35 hover:scale-105 active:scale-95 transition-all z-10 cursor-pointer"
                  title={activeTab === 'DIARIAS' ? 'Novo Lançamento Diário' : 'Novo Lançamento Pessoal'}
                >
                  <Plus size={28} className="stroke-[3]" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Modal (BottomSheet) */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        editingTransaction={editingTransaction}
        categoriesList={legacyCategoriesList}
        categories={categories}
        onAddNewCategory={handleAddNewCategory}
        onAddFullCategory={handleAddFullCategory}
        accounts={accounts}
        creditCards={creditCards}
        defaultType={modalDefaultType}
        onInvoiceTransactionSaved={(cartaoId, mesAno) => {
          const card = creditCards.find((c) => c.id === cartaoId);
          if (!card) return;
          getOrCreateInvoiceFor(card, mesAno).then(() =>
            recalcInvoiceTotals(card.id, mesAno)
          );
        }}
      />

      {/* Work Shift Modal (BottomSheet) */}
      <WorkShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveWorkShift}
        onDelete={handleDeleteWorkShift}
        editingEntry={editingShiftEntry}
        activeEvents={activeEvents}
        accounts={accounts}
      />

      {/* Credit Card Modal (BottomSheet) */}
      <CreditCardModal
        isOpen={isCreditCardModalOpen}
        onClose={() => {
          setIsCreditCardModalOpen(false);
          setEditingCreditCard(null);
        }}
        onSave={(payload) => {
          handleSaveCreditCard(payload);
          setIsCreditCardModalOpen(false);
          setEditingCreditCard(null);
        }}
        onDelete={handleDeleteCreditCard}
        editingCard={editingCreditCard}
        accounts={accounts}
      />

      {/* Category Modal (Nova / Editar Categoria + Subcategorias em chips) */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        editingCategory={editingCategory}
        defaultType={categoryModalDefaultType}
        onSave={handleCategoryModalSave}
      />

      {/* Invoice Detail Modal (BottomSheet) */}
      <InvoiceDetailModal
        isOpen={isInvoiceDetailOpen}
        onClose={() => {
          setIsInvoiceDetailOpen(false);
          setSelectedInvoiceCard(null);
        }}
        card={selectedInvoiceCard}
        invoice={
          selectedInvoiceCard
            ? getInvoiceForCardMonth(selectedInvoiceCard.id, invoiceDetailMonth) || null
            : null
        }
        transactions={
          selectedInvoiceCard
            ? getInvoiceTransactions(selectedInvoiceCard.id, invoiceDetailMonth)
            : []
        }
        accounts={accounts}
        selectedMonth={invoiceDetailMonth}
        months={months}
        onMonthChange={(m) => {
          setInvoiceDetailMonth(m);
          if (selectedInvoiceCard) {
            getOrCreateInvoiceFor(selectedInvoiceCard, m).then(() =>
              recalcInvoiceTotals(selectedInvoiceCard.id, m)
            );
          }
        }}
        onPayInvoice={handlePayInvoice}
        onPostponeInvoice={handlePostponeInvoice}
        onEditTransaction={(tx) => {
          setEditingTransaction(tx);
          setIsModalOpen(true);
        }}
        onDeleteTransaction={async (id) => {
          if (confirm('Tem certeza que deseja excluir esta compra da fatura?')) {
            await handleDeleteTransaction(id);
          }
        }}
      />

      {/* Apple Wallet Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsWalletModalOpen(false)} />
          
          <div className="relative w-full max-w-md h-[90vh] bg-white rounded-t-[36px] flex flex-col overflow-hidden border-t border-slate-200 shadow-2xl z-10 animate-slide-up">
            {/* Top Navigation */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 font-sans">
              <div className="flex items-center space-x-3">
                {selectedWalletCard && (
                  <button 
                    onClick={() => setSelectedWalletCard(null)} 
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {selectedWalletCard ? 'Detalhes' : 'Carteira'}
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    setIsWalletModalOpen(false);
                    setEditingCreditCard(null);
                    setIsCreditCardModalOpen(true);
                  }} 
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                  title="Novo Cartão"
                >
                  <Plus size={16} />
                </button>
                <button 
                  onClick={() => {
                    setIsWalletModalOpen(false);
                    setSelectedWalletCard(null);
                  }} 
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 scrollbar-thin">
              {!selectedWalletCard ? (
                /* STACKED CARDS VIEW */
                <div className="space-y-5 text-left">
                  {/* Financial Tip Card */}
                  <div className="bg-gradient-to-r from-blue-950/60 to-blue-950/60 rounded-[24px] p-4 border border-blue-850/40 flex items-center space-x-4 shadow-lg backdrop-blur-md font-sans">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-600 flex items-center justify-center text-white text-lg shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30">Dica Financeira</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-white leading-tight">Atenção ao Teto de Gastos</h4>
                      <p className="text-[10px] text-slate-600 leading-tight mt-0.5">Você atingiu 84% do limite mensal estipulado nos cartões. Priorize gastos essenciais até o final do mês!</p>
                    </div>
                    <button 
                      onClick={() => triggerToast('Dica marcada como lida')} 
                      className="px-2.5 py-1 bg-blue-700 hover:bg-blue-700 text-white rounded-full text-[10px] font-bold transition shrink-0 cursor-pointer"
                    >
                      Entendi
                    </button>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-3 px-1 font-sans">
                      Meus Cartões (Toque para ver detalhes)
                    </span>

                    {/* OVERLAPPING STACK OF CARDS */}
                    <div className="relative space-y-[-115px] pt-1 pb-24 font-sans">
                      {cardsToDisplay.map((card, idx) => {
                        const preset = getCardPreset(card);
                        const isSample = card.id.includes('sample');
                        return (
                          <div 
                            key={card.id}
                            onClick={() => setSelectedWalletCard(card)}
                            style={{ 
                              zIndex: 10 + idx,
                              backgroundColor: preset.gradient ? undefined : card.cor
                            }}
                            className={`card-stack-item cursor-pointer relative rounded-[24px] p-5 h-44 text-white shadow-2xl border border-white/10 flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                              preset.gradient ? `bg-gradient-to-br ${preset.gradient}` : ''
                            }`}
                          >
                            <div className="absolute top-0 left-0 right-0 bottom-0 opacity-15 pointer-events-none"
                              style={{
                                background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)'
                              }}
                            />
                            
                            <div className="relative z-10 flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {preset.logo ? (
                                  <span className="text-[10px] font-black tracking-tight select-none font-sans bg-black/15 px-2 py-0.5 rounded border border-white/10">
                                    {preset.logo}
                                  </span>
                                ) : (
                                  <span className="font-extrabold text-sm tracking-wide">{card.nome}</span>
                                )}
                              </div>
                              <span className="text-[10px] font-black bg-black/25 px-2.5 py-0.5 rounded-full border border-white/10">{card.bandeira}</span>
                            </div>
                            
                            {preset.logo && (
                              <div className="relative z-10 space-y-0.5 text-left mb-1.5">
                                <span className="font-extrabold text-sm tracking-wide text-white/95">{card.nome}</span>
                              </div>
                            )}
                            
                            <div className="relative z-10 space-y-1">
                              <p className="text-[10px] text-white/70 font-medium text-left">
                                {isSample ? 'Cartão de Demonstração' : 'Cartão de Crédito'}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-base font-mono font-bold tracking-wider">•••• {card.id.slice(-4)}</span>
                                <span className="text-xs opacity-90 font-bold">Limite: R$ {card.limiteTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* SINGLE SELECTED CARD DETAIL VIEW */
                <div className="space-y-5 text-left animate-fade-in font-sans">
                  {/* Selected Card Graphic */}
                  {(() => {
                    const preset = getCardPreset(selectedWalletCard);
                    return (
                      <div 
                        style={{ 
                          backgroundColor: preset.gradient ? undefined : selectedWalletCard.cor 
                        }}
                        className={`relative rounded-[28px] p-6 h-48 text-white shadow-2xl border border-white/10 flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                          preset.gradient ? `bg-gradient-to-br ${preset.gradient}` : ''
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 bottom-0 opacity-15 pointer-events-none"
                          style={{
                            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 40%)'
                          }}
                        />

                        <div className="relative z-10 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {preset.logo ? (
                              <span className="text-xs font-black tracking-tight select-none font-sans bg-black/15 px-2.5 py-1 rounded-md border border-white/10">
                                {preset.logo}
                              </span>
                            ) : (
                              <span className="font-black text-base tracking-wide">{selectedWalletCard.nome}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold bg-black/25 px-3 py-1 rounded-full border border-white/10">{selectedWalletCard.bandeira}</span>
                        </div>

                        {preset.logo && (
                          <div className="relative z-10 space-y-0.5 text-left mb-1.5">
                            <span className="font-black text-base tracking-wide text-white/95">{selectedWalletCard.nome}</span>
                          </div>
                        )}

                        <div className="relative z-10 space-y-1">
                          <p className="text-[10px] text-white/80 font-medium">
                            Limite Total: R$ {selectedWalletCard.limiteTotal.toFixed(2).replace('.', ',')}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-mono font-bold tracking-widest">•••• {selectedWalletCard.id.slice(-4)}</span>
                            <span className="text-xs font-bold text-white/80">Vence dia {selectedWalletCard.diaVencimento}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Status / Verification Box */}
                  {(() => {
                    const status = getCardStatus(selectedWalletCard.id);
                    return (
                      <div className="bg-white rounded-3xl p-5 border border-slate-200 space-y-3">
                        <div className="flex items-start space-x-3.5 text-left">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${status.iconClass}`}>
                            {status.icon === 'shield' ? <Info size={20} /> : <AlertTriangle size={20} />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{status.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{status.desc}</p>
                          </div>
                        </div>
                        <button 
                          onClick={status.action}
                          className="w-full py-3 bg-white text-black hover:bg-slate-200 font-extrabold rounded-2xl transition text-xs shadow-md cursor-pointer"
                        >
                          {status.btnText}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Quick Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => triggerToast(`CVV: 482 - Vence em: 08/29`)} 
                      className="p-3 bg-white hover:bg-slate-200 rounded-2xl border border-slate-200 text-center transition cursor-pointer"
                    >
                      <Info size={16} className="text-blue-500 mx-auto mb-1 block" />
                      <span className="text-[10px] font-bold text-slate-600 block">Ver Dados</span>
                    </button>
                    <button 
                      onClick={() => triggerToast('Cartão temporariamente bloqueado')} 
                      className="p-3 bg-white hover:bg-slate-200 rounded-2xl border border-slate-200 text-center transition cursor-pointer"
                    >
                      <AlertTriangle size={16} className="text-amber-400 mx-auto mb-1 block" />
                      <span className="text-[10px] font-bold text-slate-600 block">Bloquear</span>
                    </button>
                    <button 
                      onClick={() => {
                        setActiveCardId(selectedWalletCard.id);
                        triggerToast(`${selectedWalletCard.nome} definido como principal!`);
                      }} 
                      className="p-3 bg-white hover:bg-slate-200 rounded-2xl border border-slate-200 text-center transition cursor-pointer"
                    >
                      <Sparkles size={16} className="text-emerald-400 mx-auto mb-1 block" />
                      <span className="text-[10px] font-bold text-slate-600 block">Definir Principal</span>
                    </button>
                  </div>

                  {/* Card specific transactions list */}
                  <div className="space-y-3 pt-2 text-left">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Lançamentos neste Cartão
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const cardTxs = transactions.filter(tx => tx.cartaoId === selectedWalletCard.id);
                        if (cardTxs.length === 0) {
                          return (
                            <div className="py-6 text-center space-y-2 bg-white border border-dashed border-slate-200 rounded-[20px]">
                              <AlertTriangle size={22} className="text-slate-300 mx-auto" />
                              <p className="text-xs font-bold text-slate-500">Nenhum lançamento vinculado.</p>
                              <p className="text-[10px] font-bold text-slate-400 max-w-[75%] mx-auto leading-relaxed">
                                Ao cadastrar uma saída com forma de pagamento "Cartão de Crédito", ela aparecerá aqui automaticamente.
                              </p>
                            </div>
                          );
                        }
                        return cardTxs.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-[20px] bg-white border border-slate-200">
                            <div>
                              <div className="text-xs font-bold text-slate-800">{tx.descricao}</div>
                              <div className="text-[9px] text-slate-500">{tx.data.split('-').reverse().slice(0, 2).join('/')} • {tx.categoria}</div>
                            </div>
                            <span className="font-mono text-xs font-bold text-rose-400">- R$ {tx.valor.toFixed(2).replace('.', ',')}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE IMPORTAÇÃO DE FATURA PDF
         ========================================================= */}
      {isPdfImportOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/55 animate-fade-in">
          <div
            className="relative w-full max-w-md max-h-[92dvh] bg-slate-50 sm:rounded-3xl rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecalho modal */}
            <div className="px-5 pt-4 pb-3 shrink-0 bg-white border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0e69b2]/10 text-[#0e69b2] flex items-center justify-center shrink-0">
                    <FileUp size={18} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                      Importar Fatura
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 leading-tight">
                      {pdfImportStep === 'UPLOAD' ? 'Passo 1 · Envie o PDF da fatura' : 'Passo 2 · Revise os lançamentos extraídos'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsPdfImportOpen(false);
                    setPdfImportExtracted(null);
                    setPdfImportFileName('');
                    setPdfImportStep('UPLOAD');
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Steps Indicator */}
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-1.5 flex-1 rounded-full transition ${pdfImportStep === 'UPLOAD' ? 'bg-[#0e69b2]' : 'bg-emerald-500'}`} />
                <div className={`h-1.5 flex-1 rounded-full transition ${pdfImportStep === 'REVIEW' ? 'bg-[#0e69b2]' : 'bg-slate-200'}`} />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
              {pdfImportStep === 'UPLOAD' && (
                <>
                  {/* Upload Area */}
                  <label className={`w-full block cursor-pointer rounded-2xl border-2 border-dashed transition
                    ${pdfImportIsParsing ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-[#0e69b2] hover:bg-blue-50/40'}
                    p-6 text-center`}>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={pdfImportIsParsing}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePdfFileSelect(f);
                        e.target.value = '';
                      }}
                    />
                    {pdfImportIsParsing ? (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <Loader2 size={28} className="animate-spin text-[#0e69b2]" />
                        <p className="text-xs font-extrabold text-slate-800">
                          Analisando PDF...
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 max-w-[85%]">
                          Extraindo compras, datas, valores e parcelas.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-[#0e69b2]/10 text-[#0e69b2] flex items-center justify-center mx-auto mb-3">
                          <Upload size={26} />
                        </div>
                        <p className="text-sm font-extrabold text-slate-800 mb-1">
                          Envie a fatura em PDF
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed max-w-[90%] mx-auto mb-3">
                          Arraste & solte ou toque para selecionar. A leitura é feita localmente e os lançamentos extraídos aparecem na próxima etapa.
                        </p>
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e69b2] text-white text-[11px] font-bold">
                          <Upload size={12} />
                          Selecionar arquivo PDF
                        </span>
                        {pdfImportFileName && !pdfImportIsParsing && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-3">
                            Arquivo atual: {pdfImportFileName}
                          </p>
                        )}
                      </>
                    )}
                  </label>

                  {/* Seletor de cartao OBRIGATORIO */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CreditCardIcon size={11} />
                      Destino · Cartão de Crédito
                    </label>
                    <select
                      value={pdfImportCartaoId}
                      onChange={(e) => setPdfImportCartaoId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/40 focus:border-[#0e69b2] transition"
                    >
                      {(creditCards.length ? creditCards : defaultSampleCards).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} · Limite {c.limiteTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </option>
                      ))}
                    </select>
                    {pdfImportExtracted?.cartaoSugeridoNome && (
                      <p className="text-[10px] font-bold text-[#0e69b2]">
                        💡 Nome detectado no PDF: <strong>{pdfImportExtracted.cartaoSugeridoNome}</strong>
                      </p>
                    )}
                  </div>

                        <div className="rounded-2xl bg-purple-50 border border-purple-200 p-3 flex items-start gap-2.5">
                          <Sparkles size={16} className="text-purple-650 shrink-0 mt-0.5 animate-pulse" />
                          <div className="text-left font-sans">
                            <p className="text-[11px] font-extrabold text-purple-800 leading-tight mb-0.5">
                              Leitura Inteligente Local Ativada (100% Gratuito & Seguro)
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                              O sistema analisa o texto da sua fatura e localiza os lançamentos de forma 100% privada e rodando localmente no seu próprio navegador. Nenhuma informação é enviada a servidores externos.
                            </p>
                          </div>
                        </div>
                        {pdfImportMethodUsed && (
                          <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-sans">
                              <Info size={11} />
                              Método de extração
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-100 font-sans">
                              <Sparkles size={10} />
                              {pdfImportMethodUsed || 'Aguardando...'}
                            </span>
                          </div>
                        )}

                  {/* DEBUG / TEXTAREA de texto colado */}
                  <details className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                    <summary className="cursor-pointer list-none px-3.5 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                          <FileTextIcon size={13} />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black text-slate-800 leading-tight">
                            Colar texto da fatura manualmente
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 leading-tight">
                            PDF digitalizado / scaneado pode não ter texto. Cole aqui o conteúdo copiado do extrato do app do banco.
                          </p>
                        </div>
                      </div>
                      {pdfImportFileName && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {pdfImportDebugText.length} chars extraídos
                        </span>
                      )}
                    </summary>
                    <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-100">
                      <textarea
                        value={pdfImportDebugText}
                        onChange={(e) => setPdfImportDebugText(e.target.value)}
                        placeholder={`Exemplo de texto que você pode colar aqui:

Vencimento: 10/08/2026
Total da fatura: R$ 1.850,00

25/07/2026  SUPERMERCADO CARREFOUR     Parcela 2/15    R$ 372,46
02/08/2026  STARBUCKS CAFE                            R$ 42,50
05/08      POSTO SHELL GASOLINA                      R$ 220,00`}
                        rows={8}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/30 focus:border-[#0e69b2] transition resize-y"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 max-w-[65%] leading-relaxed">
                          {pdfImportDebugText.length > 100 ? `${pdfImportDebugText.length.toLocaleString('pt-BR')} caracteres prontos para análise.` : 'Cole o texto da fatura acima.'}
                        </span>
                        <button
                          onClick={() => handlePdfPasteText(pdfImportDebugText)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-extrabold transition cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                        >
                          <RefreshCw size={12} />
                          Re-analisar texto
                        </button>
                      </div>
                    </div>
                  </details>
                </>
              )}

              {pdfImportStep === 'REVIEW' && (
                <>
                  {/* Header com vencimento e total */}
                  {(() => {
                    const itens = pdfImportExtracted?.itens ?? [];
                    const sel = itens.filter(i => i.selected);
                    const totalSel = sel.reduce((s, i) => s + Number(i.valor || 0), 0);
                    const totalGeral = pdfImportExtracted?.valorTotalExtraido;
                    const venc = pdfImportExtracted?.vencimento;
                    const fmt1 = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const cartao = (creditCards.length ? creditCards : defaultSampleCards).find(c => c.id === pdfImportCartaoId);
                    return (
                      <>
                        <div className="rounded-2xl p-4 border border-slate-200 bg-white shadow-3xs space-y-2.5">
                          <div className="flex items-center gap-2">
                            <CreditCardIcon size={14} className="text-[#0e69b2]" />
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                              Fatura a importar
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[9px] font-black uppercase text-slate-400">Cartão</span>
                              <p className="text-xs font-extrabold text-slate-800 truncate">
                                {cartao?.nome ?? 'Selecione um cartão'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-slate-400">Vencimento</span>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="date"
                                  value={venc ?? ''}
                                  onChange={(e) => setPdfImportExtracted(prev => prev ? { ...prev, vencimento: e.target.value || undefined } : prev)}
                                  className="text-xs font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-[#0e69b2] w-full px-0 py-0.5"
                                />
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-slate-400">Total Extraído PDF</span>
                              <p className="text-xs font-extrabold text-slate-800">
                                {totalGeral != null ? fmt1(Number(totalGeral)) : '—'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px] font-black uppercase text-slate-400">Total Selecionado ({sel.length})</span>
                              <p className="text-sm font-black text-[#0e69b2]">
                                {fmt1(totalSel)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Toolbar: selecinar todos + adicionar manual */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => toggleAllPdfItems(sel.length !== itens.length)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            {sel.length === itens.length && itens.length > 0 ? <CheckSquare size={12} /> : <Square size={12} />}
                            {sel.length === itens.length && itens.length > 0 ? 'Desmarcar todos' : 'Marcar todos'}
                          </button>
                          <button
                            onClick={addBlankPdfItem}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0e69b2] text-white text-[10px] font-bold hover:bg-[#0b5a9a] transition cursor-pointer"
                          >
                            <Plus size={12} />
                            Adicionar lançamento manual
                          </button>
                          <span className="text-[10px] font-bold text-slate-400 ml-auto">
                            {sel.length}/{itens.length} lançamentos
                          </span>
                        </div>

                        {/* Lista de itens EDITAVEIS */}
                        <div className="space-y-2.5">
                          {itens.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-7 text-center space-y-2">
                              <FileTextIcon size={24} className="text-slate-300 mx-auto" />
                              <p className="text-xs font-extrabold text-slate-500">
                                Nenhum lançamento foi extraído do PDF
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 max-w-[85%] mx-auto leading-relaxed">
                                Toque em <strong>Adicionar lançamento manual</strong> acima para cadastrar as compras da fatura.
                              </p>
                            </div>
                          )}
                          {itens.map((it, idx) => (
                            <div key={it.id} className={`rounded-2xl border transition p-3.5 space-y-3 bg-white
                              ${it.selected ? 'border-slate-200' : 'border-slate-100 bg-slate-50/70 opacity-70'}`}>
                              <div className="flex items-start gap-2.5">
                                <button
                                  onClick={() => togglePdfItem(it.id)}
                                  className="shrink-0 mt-0.5 cursor-pointer"
                                  aria-label="selecionar"
                                >
                                  {it.selected
                                    ? <CheckSquare size={18} className="text-[#0e69b2]" />
                                    : <Square size={18} className="text-slate-300" />
                                  }
                                </button>
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <div className="col-span-2">
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                      #{idx + 1} · Descrição
                                    </label>
                                    <input
                                      type="text"
                                      value={it.descricao}
                                      onChange={(e) => patchPdfItem(it.id, { descricao: e.target.value })}
                                      placeholder="Ex: Carrefour Supermercado"
                                      className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/30 focus:border-[#0e69b2] transition"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                      Data da compra
                                    </label>
                                    <input
                                      type="date"
                                      value={it.data}
                                      onChange={(e) => patchPdfItem(it.id, { data: e.target.value })}
                                      className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/30 focus:border-[#0e69b2] transition"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                      Valor (R$)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={Number(it.valor || 0)}
                                      onChange={(e) => patchPdfItem(it.id, { valor: Number(Number(e.target.value || 0).toFixed(2)) })}
                                      className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/30 focus:border-[#0e69b2] transition"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                      Categoria
                                    </label>
                                    <select
                                      value={it.categoria}
                                      onChange={(e) => patchPdfItem(it.id, { categoria: e.target.value })}
                                      className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/30 focus:border-[#0e69b2] transition"
                                    >
                                      {categoriesListForPDF.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                        Parcela
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="999"
                                        placeholder="Atual"
                                        value={it.parcelaAtual ?? ''}
                                        onChange={(e) => patchPdfItem(it.id, { parcelaAtual: e.target.value ? Number(e.target.value) : undefined })}
                                        className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/30 focus:border-[#0e69b2] transition"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">
                                        Total
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="999"
                                        placeholder="Total"
                                        value={it.totalParcelas ?? ''}
                                        onChange={(e) => patchPdfItem(it.id, { totalParcelas: e.target.value ? Number(e.target.value) : undefined })}
                                        className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e69b2]/30 focus:border-[#0e69b2] transition"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Rodape botoes */}
            <div className="px-4 pt-3 pb-4 shrink-0 bg-white border-t border-slate-200 space-y-2">
              {pdfImportStep === 'UPLOAD' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsPdfImportOpen(false);
                      setPdfImportExtracted(null);
                      setPdfImportFileName('');
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (!pdfImportExtracted) setPdfImportExtracted({ itens: [] });
                      setPdfImportStep('REVIEW');
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    Revisar manualmente
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
              {pdfImportStep === 'REVIEW' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPdfImportStep('UPLOAD')}
                    className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft size={14} />
                    Voltar
                  </button>
                  <button
                    disabled={pdfImportIsParsing}
                    onClick={handleConfirmPdfImport}
                    className="px-4 py-3 rounded-xl bg-[#0e69b2] hover:bg-[#0b5a9a] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-md shadow-[#0e69b2]/20"
                  >
                    {pdfImportIsParsing ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                    {pdfImportIsParsing ? 'Importando...' : 'Confirmar Importação'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {showToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 z-55 border border-slate-200 animate-slide-up">
          <Info size={14} className="text-blue-500" />
          <span className="font-sans font-bold">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default App;
