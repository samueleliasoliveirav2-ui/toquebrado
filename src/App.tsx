import { useState, useEffect } from 'react';
import { Plus, Wifi, Battery, Search, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import type { Transaction, TransactionStatus } from './types';
import { INITIAL_TRANSACTIONS } from './types';
import { StatsHeader } from './components/StatsHeader';
import { WeeklyAccordion } from './components/WeeklyAccordion';
import { TransactionModal } from './components/TransactionModal';
import { LoginScreen } from './components/LoginScreen';
import { supabase } from './lib/supabaseClient';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Filtering and Searching states
  const [selectedMonth, setSelectedMonth] = useState('2026-08'); // Default to August 2026
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // 1. Session check and listener
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser(session.user.user_metadata?.nome || session.user.email || 'Usuário');
        setUserId(session.user.id);
      }
      setLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(session.user.user_metadata?.nome || session.user.email || 'Usuário');
        setUserId(session.user.id);
      } else {
        setCurrentUser(null);
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
        // Map snake_case database schema to camelCase front-end interface
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

  // Filtered month transactions
  const monthTransactions = transactions.filter(tx => tx.data.startsWith(selectedMonth));

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

  const handleToggleStatus = async (id: string) => {
    const targetTx = transactions.find(t => t.id === id);
    if (!targetTx) return;

    let newStatus: TransactionStatus;
    if (targetTx.tipo === 'ENTRADA') {
      newStatus = targetTx.status === 'RECEBIDO' ? 'PENDENTE' : 'RECEBIDO';
    } else {
      newStatus = targetTx.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
    }

    // Optimistic local state update for fast response
    setTransactions(prev =>
      prev.map(tx => tx.id === id ? { ...tx, status: newStatus, dataPostergar: undefined } : tx)
    );

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus, data_postergar: null })
        .eq('id', id);

      if (error) {
        console.error('Error updating status in database:', error);
        // Rollback state on failure
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
      
      // Load fresh data from DB
      await fetchTransactions();
    } catch (err) {
      console.error('Error saving transaction to database:', err);
      alert('Ocorreu um erro ao salvar o lançamento no banco de dados.');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      // Optimistic delete
      setTransactions(prev => prev.filter(tx => tx.id !== id));

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting transaction from database:', err);
      alert('Erro ao excluir lançamento do banco.');
      fetchTransactions();
    }
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  // Seed mock data into Supabase accounts so they don't see an empty page on start
  const handleSeedMockData = async () => {
    if (!userId) return;
    if (confirm('Deseja copiar todos os dados originais de teste do Tô Quebrado para a sua conta no Supabase?')) {
      try {
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
    <div className="flex flex-col items-center justify-center p-0 md:p-6 min-h-screen w-full select-none">
      {/* Outer Phone Shell mockup for demo wrapper */}
      <div className="relative w-full max-w-md bg-slate-950 border-[8px] border-slate-900 rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[840px] max-h-[96vh] md:h-[860px]">
        
        {/* Simulated Camera Island (Notch) */}
        <div className="w-28 h-4.5 bg-slate-900 rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800" />
          <div className="w-8 h-1 bg-slate-800 rounded-full ml-2" />
        </div>

        {/* Simulated Status Bar (Light UI) */}
        <div className="px-6 pt-3.5 pb-2.5 flex justify-between items-center bg-white text-[10px] text-slate-700 font-bold z-10 select-none border-b border-slate-50">
          <span>13:52</span>
          <div className="flex items-center gap-1.5">
            <Wifi size={11} className="text-slate-600" />
            <span className="text-[9px] text-slate-600">5G</span>
            <Battery size={13} className="text-slate-600" />
          </div>
        </div>

        {/* Conditional rendering based on loading session */}
        {loading ? (
          <div className="flex-1 bg-white flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="animate-spin text-[#0e69b2] mb-3" size={32} />
            <span className="text-sm font-semibold">Carregando carteira...</span>
          </div>
        ) : !currentUser ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            {/* App Main Header (White Background) */}
            <header className="px-5 pb-3.5 pt-1.5 border-b border-slate-100 bg-white flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center py-0.5">
                  <span className="text-2xl font-black text-[#0e69b2] tracking-tighter lowercase select-none">
                    tô quebrado
                  </span>
                </div>

                {/* User Session Info & Actions */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-1 pr-1.5 rounded-xl">
                  <span className="text-[9px] text-slate-600 font-bold ml-1 block max-w-[80px] truncate">
                    {currentUser.split(' ')[0]}
                  </span>
                  
                  {/* Reset/Seed button */}
                  <button
                    onClick={handleSeedMockData}
                    title="Carga de teste (Supabase)"
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-650 transition-colors"
                  >
                    <RefreshCw size={10} />
                  </button>

                  <div className="w-[1px] h-3 bg-slate-250" />

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    title="Sair do aplicativo"
                    className="p-1 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors"
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
            <main className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 scrollbar-thin">
              
              {/* Stats Header Summary Cards */}
              <StatsHeader 
                saldoAcumulado={saldoAcumulado}
                totalEntradas={totalEntradasMes}
                totalSaidas={totalSaidasMes}
              />

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
              <div className="pb-24">
                <WeeklyAccordion
                  transactions={displayTransactions}
                  onEditTransaction={handleOpenEditModal}
                  onToggleStatus={handleToggleStatus}
                />
              </div>
            </main>

            {/* Floating Action Button (FAB) */}
            <button
              onClick={handleOpenAddModal}
              className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#f08622] hover:bg-[#d97214] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-20 cursor-pointer animate-pulse-slow"
              title="Novo Lançamento"
            >
              <Plus size={24} />
            </button>
          </>
        )}

        {/* Bottom Simulated Indicator Bar */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 rounded-full z-10" />
      </div>

      {/* Transaction Modal (BottomSheet) */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}

export default App;
