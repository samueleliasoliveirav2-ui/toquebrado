import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Search, RefreshCw, LogOut, Loader2, AlertTriangle, Info, Home, Settings, Menu, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Briefcase, BarChart2, Wallet, CreditCard as CreditCardIcon, Eye, EyeOff, Sparkles, FileUp, CheckSquare, Square, Upload, FileText as FileTextIcon } from 'lucide-react';
import type { Transaction, TransactionStatus, TransactionType, WorkShiftEntry, BankAccount, AccountTransfer, CreditCard, CreditCardInvoice, ExtractedInvoiceData, ExtractedInvoiceItem } from './types';
import { CATEGORIES, INITIAL_TRANSACTIONS } from './types';
import { StatsHeader } from './components/StatsHeader';
import { WeeklyAccordion } from './components/WeeklyAccordion';
import { TransactionModal } from './components/TransactionModal';
import { LoginScreen } from './components/LoginScreen';
import { ProfileSettings } from './components/ProfileSettings';
import { WorkShiftDashboard } from './components/WorkShiftDashboard';
import { WorkShiftModal } from './components/WorkShiftModal';
import { ReportsDashboard } from './components/ReportsDashboard';
import { AccountsDashboard } from './components/AccountsDashboard';
import { CreditCardsDashboard } from './components/CreditCardsDashboard';
import { CreditCardModal, BANK_PRESETS } from './components/CreditCardModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import type { TemaVisual, UserProfile } from './types';
import { supabase } from './lib/supabaseClient';

const CURRENT_VERSION = '1.0.1';



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
  const [invoiceDetailMonth, setInvoiceDetailMonth] = useState('2026-08');

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
  const [selectedMonth, setSelectedMonth] = useState('2026-08'); // Default to August 2026
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('SAIDA');

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
    const statusPago = fatura?.status === 'PAGA';
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

  // 1. Session check and listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const nome = session.user.user_metadata?.nome || session.user.email || 'Usuário';
        setCurrentUser(nome);
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const nome = session.user.user_metadata?.nome || session.user.email || 'Usuário';
        setCurrentUser(nome);
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setUserEmail('');
        setUserId(null);
        setUserProfile(null);
        setTransactions([]);
        setWorkShifts([]);
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
        const profile: UserProfile = {
          id: data.id,
          nomeCompleto: data.nome_completo || undefined,
          email: data.email || undefined,
          telefone: data.telefone || undefined,
          avatarUrl: data.avatar_url || undefined,
          moedaPadrao: data.moeda_padrao || 'BRL',
          temaVisual: (data.tema_visual as TemaVisual) || 'LIGHT',
          ocultarSaldosDefault: !!data.ocultar_saldos_default,
          tipoPlano: data.tipo_plano || 'PESSOAL'
        };
        setUserProfile(profile);
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
          contaId: item.conta_id || undefined
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

  const months = [
    { key: '2026-06', label: 'Junho de 2026' },
    { key: '2026-07', label: 'Julho de 2026' },
    { key: '2026-08', label: 'Agosto de 2026' },
    { key: '2026-09', label: 'Setembro de 2026' },
    { key: '2026-10', label: 'Outubro de 2026' }
  ];

  const currentIndex = months.findIndex(m => m.key === selectedMonth);

  const handlePrevMonth = () => {
    if (currentIndex > 0) {
      setSelectedMonth(months[currentIndex - 1].key);
    }
  };

  const handleNextMonth = () => {
    if (currentIndex < months.length - 1) {
      setSelectedMonth(months[currentIndex + 1].key);
    }
  };

  // Filtered month transactions based on active dates (using dataPostergar if postponed)
  const monthTransactions = transactions.filter(tx => {
    const activeDate = (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
    return activeDate.startsWith(selectedMonth);
  });

  // Filtered month work shifts
  const monthWorkShifts = workShifts.filter(e => e.data.startsWith(selectedMonth));

  // Cumulative Balance (All-time actual liquid: RECEIVED entries - PAID exits)
  const saldoAcumulado = transactions.reduce((sum, tx) => {
    if (tx.tipo === 'ENTRADA' && tx.status === 'RECEBIDO') {
      return sum + tx.valor;
    } else if (tx.tipo === 'SAIDA' && tx.status === 'PAGO') {
      return sum - (tx.valor + (tx.juros || 0));
    }
    return sum;
  }, 0);

  // Projected Income this month (All ENTRADAs in selected month)
  const totalEntradasMes = monthTransactions
    .filter(tx => tx.tipo === 'ENTRADA')
    .reduce((sum, tx) => sum + tx.valor, 0);

  // Projected Expenses this month (All SAIDAs in selected month + their juros)
  const totalSaidasMes = monthTransactions
    .filter(tx => tx.tipo === 'SAIDA')
    .reduce((sum, tx) => sum + tx.valor + (tx.juros || 0), 0);

  // Filtered list display
  const displayTransactions = monthTransactions.filter((tx) => {
    const matchesSearch = 
      tx.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.categoria.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'TODOS' || tx.tipo === filterType;
    return matchesSearch && matchesType;
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

    try {
      // ==============================
      // CASO 1: EDIÇÃO (payload.id existe)
      // ==============================
      if (payload.id) {
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
          data_compra: payload.dataCompra || null
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
        return;
      }

      // ==============================
      // CASO 2: CRIAÇÃO (novo lançamento)
      // ==============================
      const frequencia = payload.frequencia || 'AVULSO';
      const cartao = payload.cartaoId ? creditCards.find((c) => c.id === payload.cartaoId) : null;

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
  }) => {
    if (!userId) return;

    try {
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
        const dbPayload = {
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
      // 1) Tenta atualizar na tabela profiles
      const dbPayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (patch.nomeCompleto !== undefined) dbPayload.nome_completo = patch.nomeCompleto;
      if (patch.email !== undefined) dbPayload.email = patch.email;
      if (patch.telefone !== undefined) dbPayload.telefone = patch.telefone;
      if (patch.avatarUrl !== undefined) dbPayload.avatar_url = patch.avatarUrl;
      if (patch.moedaPadrao !== undefined) dbPayload.moeda_padrao = patch.moedaPadrao;
      if (patch.temaVisual !== undefined) dbPayload.tema_visual = patch.temaVisual;
      if (patch.ocultarSaldosDefault !== undefined) dbPayload.ocultar_saldos_default = patch.ocultarSaldosDefault;

      if (Object.keys(dbPayload).length > 1) {
        const { error: errProfile } = await supabase
          .from('profiles')
          .upsert({ id: userId, ...dbPayload });
        if (errProfile) {
          console.error('handleSaveProfile profiles error:', errProfile.message || errProfile);
        }
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
      setUserProfile(prev => {
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
          avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : next.avatarUrl,
          moedaPadrao: patch.moedaPadrao ?? next.moedaPadrao,
          temaVisual: patch.temaVisual ?? next.temaVisual,
          ocultarSaldosDefault: patch.ocultarSaldosDefault ?? next.ocultarSaldosDefault,
          tipoPlano: next.tipoPlano
        };

        if (merged.nomeCompleto) setCurrentUser(merged.nomeCompleto);
        if (merged.email) setUserEmail(merged.email);
        setIsBalanceVisible(!merged.ocultarSaldosDefault);
        return merged;
      });

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
    return transactions.filter(
      (t) => t.cartaoId === cardId && t.data.startsWith(mesAno) && t.tipo === 'SAIDA'
    );
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
      // Carrega o worker padrao via unpkg CDN com fallback de Blob para contornar restrições de CORS
      try {
        if (typeof pdfjs.GlobalWorkerOptions !== 'undefined') {
          const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
          try {
            const resp = await fetch(workerUrl);
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            pdfjs.GlobalWorkerOptions.workerSrc = blobUrl;
          } catch (corsErr) {
            console.warn('[pdf.js] blob fallback falhou, usando URL direta:', corsErr);
            pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
          }
        }
      } catch (err) {
        console.warn('[pdf.js] erro ao configurar worker:', err);
      }
      const ab = await new Promise<ArrayBuffer>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as ArrayBuffer);
        fr.onerror = () => reject(fr.error);
        fr.readAsArrayBuffer(file);
      });
      const pdf = await pdfjs.getDocument({ data: ab, useSystemFonts: true, enableXfa: true }).promise;
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
      for (const mesAno of Array.from(mesAnoSet)) {
        await getOrCreateInvoiceFor(card, mesAno);
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
        const fatura = getInvoiceForCardMonth(card.id, mesAno);
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
          for (const tx of novasTransacoes) {
            const payload = {
              id: tx.id,
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
            };
            await supabase.from('transactions').upsert(payload, { onConflict: 'id', ignoreDuplicates: false });
          }
          await fetchTransactions();
          await fetchCreditCardInvoices();
          // Recalcula totais das faturas
          for (const mesAno of Array.from(mesAnoSet)) {
            await recalcInvoiceTotals(card.id, mesAno);
          }
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
            <div className="relative w-64 max-w-[80vw] h-full bg-white text-slate-800 flex flex-col p-5 shadow-2xl border-r border-slate-200 z-10 animate-slide-right">
              {/* Header section with close and branding */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-rose-400 flex items-center justify-center text-white font-black text-base shadow-revolut-glow">
                    R
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm leading-tight text-slate-800 font-sans">Samuel Finanças</h2>
                    <span className="text-[10px] text-blue-500 font-bold font-sans">Conta Ultra</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* User Identity info inside drawer */}
              <div className="py-4 border-b border-slate-200 mb-4 text-left font-sans">
                <p className="text-[9px] uppercase font-bold text-slate-500">Logado como</p>
                <p className="text-xs font-bold text-slate-600 truncate mt-0.5">{currentUser}</p>
                <p className="text-[10px] text-slate-500 font-semibold truncate">{userEmail}</p>
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
                      ? 'bg-blue-50 text-[#0e69b2] border border-blue-100 shadow-inner'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
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
                      ? 'bg-blue-50 text-[#0e69b2] border border-blue-100 shadow-inner'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
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
                      ? 'bg-blue-50 text-[#0e69b2] border border-blue-100 shadow-inner'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
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
                      ? 'bg-blue-50 text-[#0e69b2] border border-blue-100 shadow-inner'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
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
                      ? 'bg-blue-50 text-[#0e69b2] border border-blue-100 shadow-inner'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <CreditCardIcon size={16} />
                  <span>Cartões de Crédito</span>
                </button>

                {/* Ajustes Link */}
                <button
                  onClick={() => {
                    setActiveTab('PERFIL');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'PERFIL'
                      ? 'bg-blue-50 text-[#0e69b2] border border-blue-100 shadow-inner'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Settings size={16} />
                  <span>Ajustes & Conta</span>
                </button>
              </nav>

              {/* Bottom Drawer actions */}
              <div className="border-t border-slate-200 pt-4 space-y-2 font-sans">
                {/* Refresh/Sync button */}
                <button
                  onClick={() => {
                    handleSync();
                    setIsDrawerOpen(false);
                  }}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin text-blue-500" : ""} />
                  <span>Atualizar Dados</span>
                </button>

                {/* Logout button */}
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
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
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === 'INICIO' ? (
              <>
                {/* Top Header Navigation (Revolut Inspired Mesh Background) */}
                <header className="revolut-hero-bg text-white pt-6 pb-12 px-5 rounded-b-[36px] shadow-revolut-glow relative shrink-0">
                  <div className="flex items-center justify-between gap-3 mb-6">
                    {/* Profile Avatar & Drawer Menu Trigger */}
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full glass-pill hover:bg-white/25 transition cursor-pointer"
                      title="Menu"
                    >
                      <img 
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                        alt="Samuel Avatar" 
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white/60"
                      />
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
                        disabled={currentIndex === 0}
                        className="text-white/70 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Mês Anterior"
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span className="uppercase">{months[currentIndex]?.label}</span>
                      <button
                        onClick={handleNextMonth}
                        disabled={currentIndex === months.length - 1}
                        className="text-white/70 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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

                      <div className="pt-1">
                        <span className="inline-block px-3 py-0.5 rounded-full glass-pill text-[10px] text-blue-50 font-bold font-sans">
                          Lançamentos Efetivados
                        </span>
                      </div>
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
                    if (y < 20) {
                      if (isHeaderCollapsed) setIsHeaderCollapsed(false);
                    } else if (dy > 14) {
                      if (!isHeaderCollapsed) setIsHeaderCollapsed(true);
                    }
                    mainInicioScrollRef.current = y;
                  }}
                  className={`flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 scrollbar-thin pb-28 transition-all duration-500 ease-out ${isHeaderCollapsed ? 'pt-2' : ''}`}
                >
                  
                  {/* Stats Header Summary Cards (Inputs vs Expenses) - HIDE on collapse */}
                  <div className={`overflow-hidden transition-all duration-500 ease-out ${isHeaderCollapsed ? 'max-h-0 opacity-0 mb-0 pointer-events-none scale-95 origin-top' : 'max-h-[280px] opacity-100'}`}>
                    <StatsHeader 
                      saldoAcumulado={saldoAcumulado}
                      totalEntradas={totalEntradasMes}
                      totalSaidas={totalSaidasMes}
                    />
                  </div>

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

                  {/* Filters Bar: Search & Tabs */}
                  <div className="space-y-3 font-sans">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por descrição ou categoria..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-semibold shadow-inner"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-1 bg-white border border-slate-200 p-1 rounded-2xl text-xs font-bold shadow-inner">
                      <button
                        onClick={() => setFilterType('TODOS')}
                        className={`flex-1 py-2 rounded-xl text-[10.5px] font-extrabold text-center transition-all cursor-pointer ${
                          filterType === 'TODOS'
                            ? 'bg-slate-200 text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-600'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setFilterType('ENTRADA')}
                        className={`flex-1 py-2 rounded-xl text-[10.5px] font-extrabold text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          filterType === 'ENTRADA'
                            ? 'bg-slate-200 text-emerald-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-600'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Receitas
                      </button>
                      <button
                        onClick={() => setFilterType('SAIDA')}
                        className={`flex-1 py-2 rounded-xl text-[10.5px] font-extrabold text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          filterType === 'SAIDA'
                            ? 'bg-slate-200 text-rose-455 shadow-sm'
                            : 'text-slate-500 hover:text-slate-600'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Despesas
                      </button>
                    </div>
                  </div>

                  {/* Summary filter toggle view inside INICIO (small top-left) */}
                  <div className="flex items-center justify-between -mb-1">
                    <div className="inline-flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-3xs gap-0.5">
                      <button
                        onClick={() => setInicioViewMode('LIST')}
                        className={[
                          'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
                          inicioViewMode === 'LIST'
                            ? 'bg-[#0e69b2] text-white shadow-sm shadow-blue-500/20'
                            : 'text-slate-500 hover:text-slate-700'
                        ].join(' ')}
                      >
                        Lista
                      </button>
                      <button
                        onClick={() => setInicioViewMode('CHART')}
                        className={[
                          'px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
                          inicioViewMode === 'CHART'
                            ? 'bg-[#0e69b2] text-white shadow-sm shadow-blue-500/20'
                            : 'text-slate-500 hover:text-slate-700'
                        ].join(' ')}
                      >
                        Gráficos
                      </button>
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
              <>
                {/* Header for Work Shifts page */}
                <header className="px-5 pb-3.5 pt-4.5 border-b border-slate-100 bg-white flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-650 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Menu"
                      >
                        <Menu size={20} />
                      </button>
                      
                      <span className="text-sm font-extrabold text-slate-800 font-sans">
                        Diárias & Trabalho
                      </span>
                    </div>

                    {isSyncing && (
                      <RefreshCw size={13} className="animate-spin text-[#0e69b2]" />
                    )}
                  </div>

                  {/* Month Selector Slider */}
                  <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                    <button
                      onClick={handlePrevMonth}
                      disabled={currentIndex === 0}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Mês Anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <span className="text-xs font-black text-[#0e69b2] uppercase tracking-wider select-none font-sans">
                      {months[currentIndex]?.label}
                    </span>

                    <button
                      onClick={handleNextMonth}
                      disabled={currentIndex === months.length - 1}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Próximo Mês"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </header>

                <WorkShiftDashboard
                  entries={monthWorkShifts}
                  onEditEntry={(entry) => {
                    setEditingShiftEntry(entry);
                    setIsShiftModalOpen(true);
                  }}
                  onSendToWallet={handleSendToWallet}
                  onMarkAsPaid={handleMarkShiftAsPaid}
                />
              </>
            ) : activeTab === 'RELATORIOS' ? (
              <ReportsDashboard
                transactions={transactions}
                workShifts={workShifts}
                onOpenDrawer={() => setIsDrawerOpen(true)}
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
              <>
                <header className="px-5 pb-3.5 pt-4.5 border-b border-slate-100 bg-white flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-655 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Menu"
                      >
                        <Menu size={20} />
                      </button>
                      <span className="text-sm font-extrabold text-slate-800 font-sans">
                        Cartões de Crédito
                      </span>
                    </div>
                    {isSyncing && (
                      <RefreshCw size={13} className="animate-spin text-[#0e69b2]" />
                    )}
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 scrollbar-thin pb-28">
                  <CreditCardsDashboard
                    cards={creditCards}
                    invoices={creditCardInvoices}
                    _transactions={transactions}
                    _accounts={accounts}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    months={months}
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
                </div>
              </>
            ) : (
              <>
                {/* Header for Settings page */}
                <header className="px-5 pb-3.5 pt-4.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-655 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Menu"
                    >
                      <Menu size={20} />
                    </button>
                    
                    <span className="text-sm font-extrabold text-slate-800 font-sans">
                      Ajustes & Conta
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 py-1 px-2.5 rounded-xl text-[9px] text-slate-500 font-bold font-sans">
                    Versão {CURRENT_VERSION}
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
                />
              </>
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
        categoriesList={customCategories}
        onAddNewCategory={handleAddNewCategory}
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
