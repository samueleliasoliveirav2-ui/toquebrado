import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, LogOut, Loader2, AlertTriangle, Info, Home, Settings } from 'lucide-react';
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
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== CURRENT_VERSION) {
            setNewVersionAvailable(true);
          }
        }
      } catch (e) {
        console.error('Error checking version:', e);
      }
    };

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

  const months = [
    { key: '2026-06', label: 'JUN' },
    { key: '2026-07', label: 'JUL' },
    { key: '2026-08', label: 'AGO' },
    { key: '2026-09', label: 'SET' },
    { key: '2026-10', label: 'OUT' }
  ];

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
                    <div className="flex items-center py-0.5">
                      <span className="text-2xl font-black text-[#0e69b2] tracking-tighter lowercase select-none">
                        tô quebrado
                      </span>
                    </div>

                    {/* User Session Info & Actions */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-1 pr-1.5 rounded-xl">
                      <span className="text-[9px] text-slate-600 font-bold ml-1 block max-w-[80px] truncate font-sans">
                        {currentUser.split(' ')[0]}
                      </span>
                      
                      {/* Sync/Refresh button */}
                      <button
                        onClick={handleSync}
                        title="Atualizar dados"
                        disabled={isSyncing}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-655 transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        <RefreshCw size={10} className={isSyncing ? "animate-spin text-[#0e69b2]" : ""} />
                      </button>

                      <div className="w-[1px] h-3 bg-slate-250" />

                      {/* Logout button */}
                      <button
                        onClick={handleLogout}
                        title="Sair do aplicativo"
                        className="p-1 rounded-lg hover:bg-rose-50 text-rose-550 hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        <LogOut size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Month Selector Slider */}
                  <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {months.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setSelectedMonth(m.key)}
                        className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg transition-all ${
                          selectedMonth === m.key
                            ? 'bg-[#0e69b2] text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
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
                  <span className="text-xl font-bold text-slate-800">Ajustes & Conta</span>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 py-1 px-2.5 rounded-xl text-[9px] text-slate-500 font-bold">
                    Versão 1.0.0
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

            {/* Symmetrical Floating Navigation Footer (Voice-mockup style, no background bar) */}
            <div className="absolute bottom-6 left-4 right-4 h-16 bg-transparent flex items-center justify-between px-6 z-30 select-none">
              
              {/* Left Button: Início */}
              <button
                onClick={() => setActiveTab('INICIO')}
                title="Início"
                className={`w-12 h-12 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
                  activeTab === 'INICIO' 
                    ? 'bg-[#0e69b2] border-[#0e69b2] text-white shadow-[#0e69b2]/20' 
                    : 'bg-white border-slate-200/80 text-slate-500 hover:text-slate-700'
                }`}
              >
                <Home size={20} className={activeTab === 'INICIO' ? "stroke-[2.5]" : "stroke-[2]"} />
              </button>

              {/* Center Raised Highlight Plus Button */}
              <div className="relative">
                {/* pulsing glow rings to match voice record visual */}
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

              {/* Right Button: Ajustes */}
              <button
                onClick={() => setActiveTab('PERFIL')}
                title="Ajustes"
                className={`w-12 h-12 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
                  activeTab === 'PERFIL' 
                    ? 'bg-[#0e69b2] border-[#0e69b2] text-white shadow-[#0e69b2]/20' 
                    : 'bg-white border-slate-200/80 text-slate-500 hover:text-slate-700'
                }`}
              >
                <Settings size={20} className={activeTab === 'PERFIL' ? "stroke-[2.5]" : "stroke-[2]"} />
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
    </div>
  );
}

export default App;
