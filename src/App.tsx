import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, LogOut, Loader2, AlertTriangle, Info, Home, Settings, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction, TransactionStatus } from './types';
import { INITIAL_TRANSACTIONS } from './types';
import { StatsHeader } from './components/StatsHeader';
import { WeeklyAccordion } from './components/WeeklyAccordion';
import { TransactionModal } from './components/TransactionModal';
import { LoginScreen } from './components/LoginScreen';
import { ProfileSettings } from './components/ProfileSettings';
import { supabase } from './lib/supabaseClient';

const CURRENT_VERSION = '1.0.1';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Active view state
  const [activeTab, setActiveTab] = useState<'INICIO' | 'PERFIL'>('INICIO');

  // Sidebar Drawer menu state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // App version alert state
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

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
        setCurrentUser(session.user.user_metadata?.nome || session.user.email || 'Usuário');
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(session.user.user_metadata?.nome || session.user.email || 'Usuário');
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
      } else {
        setCurrentUser(null);
        setUserEmail('');
        setUserId(null);
        setTransactions([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          juros: item.juros !== null && item.juros !== undefined ? Number(item.juros) : undefined
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

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  // Date picker states for quick calendar navigation overlay
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(8); // 1-indexed (1 to 12)

  // Helper to format year-month YYYY-MM to Portuguese full label
  const getMonthLabel = (yearMonthStr: string) => {
    const [year, month] = yearMonthStr.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx]} de ${year}`;
  };

  // Safe month increment/decrement handling year boundaries dynamically
  const adjustMonth = (yearMonthStr: string, increment: number): string => {
    const [year, month] = yearMonthStr.split('-').map(Number);
    const date = new Date(year, month - 1 + increment, 15);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    return `${newYear}-${newMonth}`;
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => adjustMonth(prev, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => adjustMonth(prev, 1));
  };

  const handleOpenDatePicker = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    setPickerYear(year);
    setPickerMonth(month);
    setIsDatePickerOpen(true);
  };

  const handleConfirmDatePicker = () => {
    const monthStr = String(pickerMonth).padStart(2, '0');
    setSelectedMonth(`${pickerYear}-${monthStr}`);
    setIsDatePickerOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
    setIsDatePickerOpen(false);
  };

  // Filtered month transactions based on active dates (using dataPostergar if postponed)
  const monthTransactions = transactions.filter(tx => {
    const activeDate = (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data;
    return activeDate.startsWith(selectedMonth);
  });

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

  const handleSaveTransaction = async (payload: Omit<Transaction, 'id'> & { id?: string }) => {
    if (!userId) return;

    const dbPayload = {
      user_id: userId,
      data: payload.data,
      descricao: payload.descricao,
      categoria: payload.categoria,
      tipo: payload.tipo,
      valor: payload.valor,
      status: payload.status,
      data_postergar: payload.dataPostergar || null,
      juros: payload.juros || 0
    };

    try {
      if (payload.id) {
        // Edit mode
        const { error } = await supabase
          .from('transactions')
          .update(dbPayload)
          .eq('id', payload.id);

        if (error) throw error;
      } else {
        // Create mode
        const { error } = await supabase
          .from('transactions')
          .insert(dbPayload);

        if (error) throw error;
      }
      
      await fetchTransactions();
    } catch (err: any) {
      console.error('Error saving transaction to database:', err);
      alert('Ocorreu um erro ao salvar o lançamento no banco de dados: ' + (err.message || err.details || JSON.stringify(err)));
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      setTransactions(prev => prev.filter(tx => tx.id !== id));

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting transaction from database:', err);
      alert('Erro ao excluir lançamento do banco: ' + (err.message || err.details || JSON.stringify(err)));
      fetchTransactions();
    }
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

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await checkVersion();
      await fetchTransactions();
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
        const dbPayloads = INITIAL_TRANSACTIONS.map(tx => ({
          user_id: userId,
          data: tx.data,
          descricao: tx.descricao,
          categoria: tx.categoria,
          tipo: tx.tipo,
          valor: tx.valor,
          status: tx.status,
          data_postergar: tx.dataPostergar || null,
          juros: tx.juros || 0
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
    if (confirm('Deseja realmente sair do sistema?')) {
      await supabase.auth.signOut();
    }
  };

  const handleLoginSuccess = (name: string) => {
    setCurrentUser(name);
  };

  return (
    <div className="w-full min-h-screen flex justify-center bg-slate-100 select-none">
      {/* Centered responsive container */}
      <div className="relative w-full max-w-md h-[100dvh] bg-white flex flex-col shadow-xl md:border-x md:border-slate-200 overflow-hidden">
        
        {/* Dynamic New Version Available Alert Banner */}
        {newVersionAvailable && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-[#0e69b2]/95 backdrop-blur-md border border-blue-400/20 rounded-2xl p-3.5 shadow-xl animate-slide-down flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/10 shrink-0 text-amber-300">
                <Info size={16} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-extrabold leading-none">Novas melhorias disponíveis!</p>
                <p className="text-[9px] text-white/85 font-bold mt-1">Atualize o aplicativo para carregar a nova versão.</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-lg bg-white text-[#0e69b2] text-[10px] font-extrabold hover:bg-slate-100 transition-colors shadow-sm cursor-pointer shrink-0"
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
              className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer" 
              onClick={() => setIsDrawerOpen(false)} 
            />

            {/* Drawer container (slides from left) */}
            <div className="relative w-64 max-w-[80vw] h-full bg-white flex flex-col p-5 shadow-2xl z-10 animate-slide-right">
              {/* Header section with close and branding */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-xl font-black text-[#0e69b2] tracking-tighter lowercase select-none">
                  tô quebrado
                </span>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* User Identity info inside drawer */}
              <div className="py-4 border-b border-slate-100 mb-4">
                <p className="text-[10px] uppercase font-bold text-slate-400">Logado como</p>
                <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{currentUser}</p>
                <p className="text-[10px] text-slate-450 font-semibold truncate">{userEmail}</p>
              </div>

              {/* Navigation list items */}
              <nav className="flex-1 space-y-1.5">
                {/* Início Link */}
                <button
                  onClick={() => {
                    setActiveTab('INICIO');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'INICIO'
                      ? 'bg-[#0e69b2]/10 text-[#0e69b2]'
                      : 'text-slate-650 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Home size={16} />
                  <span>Início</span>
                </button>

                {/* Ajustes Link */}
                <button
                  onClick={() => {
                    setActiveTab('PERFIL');
                    setIsDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'PERFIL'
                      ? 'bg-[#0e69b2]/10 text-[#0e69b2]'
                      : 'text-slate-650 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <Settings size={16} />
                  <span>Ajustes & Conta</span>
                </button>
              </nav>

              {/* Bottom Drawer actions */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                {/* Refresh/Sync button */}
                <button
                  onClick={() => {
                    handleSync();
                    setIsDrawerOpen(false);
                  }}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin text-[#0e69b2]" : ""} />
                  <span>Atualizar Dados</span>
                </button>

                {/* Logout button */}
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-550 hover:bg-rose-50/50 transition-all cursor-pointer"
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
          <div className="flex-1 bg-white flex flex-col items-center justify-center text-slate-500 h-full">
            <Loader2 className="animate-spin text-[#0e69b2] mb-3" size={32} />
            <span className="text-sm font-semibold">Carregando carteira...</span>
          </div>
        ) : !currentUser ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {activeTab === 'INICIO' ? (
              <>
                {/* App Main Header (White Background) */}
                <header className="px-5 pb-3.5 pt-4.5 border-b border-slate-100 bg-white flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    
                    {/* Left: Hamburger menu + Greeting */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-650 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Menu"
                      >
                        <Menu size={20} />
                      </button>
                      
                      <span className="text-sm font-extrabold text-slate-800 font-sans">
                        Olá, {currentUser.split(' ')[0]}
                      </span>
                    </div>

                    {/* Right: Subtle sync spinner indicator */}
                    {isSyncing && (
                      <RefreshCw size={13} className="animate-spin text-[#0e69b2]" />
                    )}
                  </div>

                  {/* Month Selector Slider with Left and Right Arrows */}
                  <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      title="Mês Anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <button
                      onClick={handleOpenDatePicker}
                      className="text-xs font-black text-[#0e69b2] hover:text-[#0b548f] uppercase tracking-wider select-none font-sans cursor-pointer hover:underline transition-all"
                      title="Clique para escolher mês e ano"
                    >
                      {getMonthLabel(selectedMonth)}
                    </button>

                    <button
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
                      title="Próximo Mês"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </header>

                {/* Scrollable Content Pane */}
                <main className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 scrollbar-thin pb-28">
                  
                  {/* Stats Header Summary Cards */}
                  <StatsHeader 
                    saldoAcumulado={saldoAcumulado}
                    totalEntradas={totalEntradasMes}
                    totalSaidas={totalSaidasMes}
                  />

                  {/* Warning/Cleanup Banner for Mock Data */}
                  {mockTransactionsCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs animate-fade-in shrink-0">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-extrabold text-amber-800">Dados fictícios detectados</h4>
                          <p className="text-[10px] text-amber-650 font-semibold leading-normal">
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
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs animate-fade-in shrink-0">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
                          <Info size={18} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-extrabold text-blue-800">Primeiros passos</h4>
                          <p className="text-[10px] text-blue-650 font-semibold leading-normal">
                            Sua carteira está vazia! Deseja carregar alguns lançamentos fictícios para experimentar as funcionalidades do Tô Quebrado?
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleSeedMockData}
                          disabled={isSyncing}
                          className="px-3 py-1.5 rounded-lg bg-[#0e69b2] hover:bg-[#0c5996] text-white text-[10px] font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                        >
                          Carregar dados de teste
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filters Bar: Search & Tabs */}
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por descrição ou categoria..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-250 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e69b2] focus:bg-white transition-all font-semibold shadow-2xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setFilterType('TODOS')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          filterType === 'TODOS'
                            ? 'bg-slate-200 text-slate-800 border-slate-350 shadow-2xs'
                            : 'bg-transparent text-slate-500 border-slate-200 hover:text-slate-800'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setFilterType('ENTRADA')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                          filterType === 'ENTRADA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                            : 'bg-transparent text-slate-500 border-slate-200 hover:text-slate-800'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Receitas
                      </button>
                      <button
                        onClick={() => setFilterType('SAIDA')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                          filterType === 'SAIDA'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                            : 'bg-transparent text-slate-500 border-slate-200 hover:text-slate-800'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Despesas
                      </button>
                    </div>
                  </div>

                  {/* Weekly Accordion Lists */}
                  <div>
                    <WeeklyAccordion
                      transactions={displayTransactions}
                      onEditTransaction={handleOpenEditModal}
                      onToggleStatus={handleToggleStatus}
                    />
                  </div>
                </main>
              </>
            ) : (
              <>
                {/* Header for Settings page */}
                <header className="px-5 pb-3.5 pt-4.5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-650 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Menu"
                    >
                      <Menu size={20} />
                    </button>
                    
                    <span className="text-sm font-extrabold text-slate-800 font-sans">
                      Ajustes & Conta
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 py-1 px-2.5 rounded-xl text-[9px] text-slate-500 font-bold">
                    Versão {CURRENT_VERSION}
                  </div>
                </header>

                <ProfileSettings
                  userName={currentUser}
                  userEmail={userEmail}
                  onLogout={handleLogout}
                  onSeedData={handleSeedMockData}
                  onDeleteMockData={handleDeleteMockData}
                  mockTransactionsCount={mockTransactionsCount}
                  isSyncing={isSyncing}
                />
              </>
            )}

            {/* Bottom-Right Circular Highlighted FAB Plus Button */}
            <div className="absolute bottom-6 right-6 z-20">
              {/* pulsing glow rings to highlight */}
              <div className="absolute -inset-1.5 rounded-full bg-[#f08622]/20 animate-pulse scale-105" />
              <div className="absolute -inset-3.5 rounded-full bg-[#f08622]/5 scale-110" />
              
              <button
                onClick={handleOpenAddModal}
                className="relative w-14 h-14 rounded-full bg-[#f08622] hover:bg-[#d97214] text-white flex items-center justify-center shadow-lg shadow-[#f08622]/35 hover:scale-105 active:scale-95 transition-all z-10 cursor-pointer"
                title="Novo Lançamento"
              >
                <Plus size={28} className="stroke-[3]" />
              </button>
            </div>
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
      />

      {/* Month & Year Picker Modal (Quick Selection) */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs animate-fade-in p-4">
          {/* Backdrop click dismiss */}
          <div className="absolute inset-0" onClick={() => setIsDatePickerOpen(false)} />

          {/* Modal Content Card */}
          <div className="relative w-full max-w-xs bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl z-10 animate-scale-up flex flex-col gap-4">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-800 font-sans">Escolher Período</h4>
              <button
                onClick={() => setIsDatePickerOpen(false)}
                className="p-1 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Year selector row */}
            <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setPickerYear(prev => prev - 1)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              
              <span className="text-xs font-black text-slate-800 font-sans">{pickerYear}</span>

              <button
                type="button"
                onClick={() => setPickerYear(prev => prev + 1)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Months grid selection */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 1, label: 'Jan' },
                { val: 2, label: 'Fev' },
                { val: 3, label: 'Mar' },
                { val: 4, label: 'Abr' },
                { val: 5, label: 'Mai' },
                { val: 6, label: 'Jun' },
                { val: 7, label: 'Jul' },
                { val: 8, label: 'Ago' },
                { val: 9, label: 'Set' },
                { val: 10, label: 'Out' },
                { val: 11, label: 'Nov' },
                { val: 12, label: 'Dez' }
              ].map((m) => {
                const isSelected = pickerMonth === m.val;
                return (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setPickerMonth(m.val)}
                    className={`py-2 rounded-xl text-xs font-extrabold text-center border transition-all cursor-pointer font-sans ${
                      isSelected
                        ? 'bg-[#0e69b2] text-white border-[#0e69b2] shadow-2xs'
                        : 'bg-slate-50 text-slate-650 border-slate-150 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSetToday}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold text-xs cursor-pointer transition-colors font-sans"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handleConfirmDatePicker}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm font-sans"
              >
                Confirmar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
