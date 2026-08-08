import React, { useState } from 'react';
import { Menu, Plus, Edit2, ArrowRightLeft, FileText, X, Check, Landmark, Wallet, Info } from 'lucide-react';
import type { BankAccount, AccountTransfer, Transaction, WorkShiftEntry } from '../types';

interface AccountsDashboardProps {
  accounts: BankAccount[];
  transfers: AccountTransfer[];
  transactions: Transaction[];
  workShifts: WorkShiftEntry[];
  onOpenDrawer: () => void;
  onSaveAccount: (account: Omit<BankAccount, 'id'> & { id?: string }) => Promise<void>;
  onDeleteAccount?: (id: string) => Promise<void>;
  onSaveTransfer: (transfer: Omit<AccountTransfer, 'id'>) => Promise<void>;
}

export const AccountsDashboard: React.FC<AccountsDashboardProps> = ({
  accounts,
  transfers,
  transactions,
  workShifts,
  onOpenDrawer,
  onSaveAccount,
  onDeleteAccount,
  onSaveTransfer
}) => {
  const fallbackPF = accounts.find(a => a.tipoPessoa === 'PF')?.id || accounts[0]?.id || '';
  const fallbackPJ = accounts.find(a => a.tipoPessoa === 'PJ')?.id || accounts[0]?.id || '';

  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  
  // Selection states
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [selectedStatementAccount, setSelectedStatementAccount] = useState<BankAccount | null>(null);

  // Form states - Account
  const [accNome, setAccNome] = useState('');
  const [accBanco, setAccBanco] = useState('');
  const [accTipo, setAccTipo] = useState<'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'DINHEIRO'>('CORRENTE');
  const [accTipoPessoa, setAccTipoPessoa] = useState<'PF' | 'PJ'>('PF');
  const [accSaldoInicial, setAccSaldoInicial] = useState<number | ''>('');
  const [accCor, setAccCor] = useState('#3b82f6');

  // Form states - Transfer
  const [trOrigem, setTrOrigem] = useState('');
  const [trDestino, setTrDestino] = useState('');
  const [trValor, setTrValor] = useState<number | ''>('');
  const [trData, setTrData] = useState('');
  const [trObs, setTrObs] = useState('');

  // 1. Balance Calculation Helper
  const calculateAccountBalance = (account: BankAccount) => {
    const initial = Number(account.saldoInicial);
    
    // Personal transactions sum
    const txSum = transactions
      .filter(tx => (tx.contaId || fallbackPF) === account.id)
      .reduce((sum, tx) => {
        if (tx.tipo === 'ENTRADA' && tx.status === 'RECEBIDO') {
          return sum + tx.valor;
        } else if (tx.tipo === 'SAIDA' && tx.status === 'PAGO') {
          return sum - (tx.valor + (tx.juros || 0));
        }
        return sum;
      }, 0);

    // Work shifts sum
    const workSum = workShifts
      .filter(ws => (ws.contaId || fallbackPJ) === account.id)
      .reduce((sum, ws) => {
        if (ws.tipo === 'ENTRADA' && ws.status === 'RECEBIDO') {
          return sum + ws.valor;
        } else if (ws.tipo === 'SAIDA') {
          return sum - ws.valor;
        }
        return sum;
      }, 0);

    // Transfers sum
    const transfersIn = transfers
      .filter(t => t.contaDestinoId === account.id)
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const transfersOut = transfers
      .filter(t => t.contaOrigemId === account.id)
      .reduce((sum, t) => sum + Number(t.valor), 0);

    return initial + txSum + workSum + transfersIn - transfersOut;
  };

  // 2. Portfolio Summaries
  const accountsWithBalances = accounts.map(acc => ({
    ...acc,
    saldoAtual: calculateAccountBalance(acc)
  }));

  const saldoConsolidado = accountsWithBalances.reduce((sum, a) => sum + a.saldoAtual, 0);
  const saldoPF = accountsWithBalances.filter(a => a.tipoPessoa === 'PF').reduce((sum, a) => sum + a.saldoAtual, 0);
  const saldoPJ = accountsWithBalances.filter(a => a.tipoPessoa === 'PJ').reduce((sum, a) => sum + a.saldoAtual, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [, month, day] = parts;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day}/${months[Number(month) - 1]}`;
  };

  // Open Account Add Modal
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccNome('');
    setAccBanco('');
    setAccTipo('CORRENTE');
    setAccTipoPessoa('PF');
    setAccSaldoInicial('');
    setAccCor('#3b82f6');
    setIsAccountModalOpen(true);
  };

  // Open Account Edit Modal
  const handleOpenEditAccount = (acc: BankAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAccount(acc);
    setAccNome(acc.nome);
    setAccBanco(acc.banco || '');
    setAccTipo(acc.tipo);
    setAccTipoPessoa(acc.tipoPessoa);
    setAccSaldoInicial(acc.saldoInicial);
    setAccCor(acc.cor || '#3b82f6');
    setIsAccountModalOpen(true);
  };

  // Open Transfer Modal
  const handleOpenTransfer = (defaultOrigemId?: string) => {
    setTrOrigem(defaultOrigemId || (accounts[0]?.id || ''));
    setTrDestino(accounts.find(a => a.id !== (defaultOrigemId || accounts[0]?.id))?.id || '');
    setTrValor('');
    setTrData(new Date().toISOString().split('T')[0]);
    setTrObs('');
    setIsTransferModalOpen(true);
  };

  // Save Account Action
  const handleSaveAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accNome.trim()) return alert('Insira o nome da conta');
    const valorInicial = Number(accSaldoInicial) || 0;

    await onSaveAccount({
      id: editingAccount?.id,
      nome: accNome.trim(),
      banco: accBanco.trim() || undefined,
      tipo: accTipo,
      tipoPessoa: accTipoPessoa,
      saldoInicial: valorInicial,
      cor: accCor
    });

    setIsAccountModalOpen(false);
  };

  // Save Transfer Action
  const handleSaveTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trOrigem || !trDestino) return alert('Selecione as contas de origem e destino');
    if (trOrigem === trDestino) return alert('As contas de origem e destino devem ser diferentes');
    const valor = Number(trValor) || 0;
    if (valor <= 0) return alert('O valor da transferência deve ser maior que zero');
    if (!trData) return alert('Selecione uma data');

    await onSaveTransfer({
      contaOrigemId: trOrigem,
      contaDestinoId: trDestino,
      valor,
      data: trData,
      observacao: trObs.trim() || undefined
    });

    setIsTransferModalOpen(false);
  };

  // Get Statement items for selected account
  const getAccountStatement = (accountId: string) => {
    const pExpenses = transactions
      .filter(tx => (tx.contaId || fallbackPF) === accountId)
      .map(tx => ({
        id: tx.id,
        data: (tx.status === 'POSTERGAR' && tx.dataPostergar) ? tx.dataPostergar : tx.data,
        descricao: tx.descricao,
        tipo: tx.tipo,
        valor: tx.valor + (tx.juros || 0),
        status: tx.status,
        origem: 'Carteira'
      }));

    const wExpenses = workShifts
      .filter(ws => (ws.contaId || fallbackPJ) === accountId)
      .map(ws => ({
        id: ws.id,
        data: ws.data,
        descricao: ws.observacao || (ws.tipo === 'ENTRADA' ? `Ganho - ${ws.atividade}` : `Custo - ${ws.categoria}`),
        tipo: ws.tipo,
        valor: ws.valor,
        status: ws.status || 'RECEBIDO',
        origem: 'Trabalho'
      }));

    const tOut = transfers
      .filter(t => t.contaOrigemId === accountId)
      .map(t => ({
        id: t.id,
        data: t.data,
        descricao: t.observacao ? `Transf: ${t.observacao}` : `Transferência Enviada`,
        tipo: 'SAIDA' as const,
        valor: t.valor,
        status: 'PAGO',
        origem: 'Transferência'
      }));

    const tIn = transfers
      .filter(t => t.contaDestinoId === accountId)
      .map(t => ({
        id: t.id,
        data: t.data,
        descricao: t.observacao ? `Transf: ${t.observacao}` : `Transferência Recebida`,
        tipo: 'ENTRADA' as const,
        valor: t.valor,
        status: 'RECEBIDO',
        origem: 'Transferência'
      }));

    return [...pExpenses, ...wExpenses, ...tOut, ...tIn].sort((a, b) => b.data.localeCompare(a.data));
  };

  const getAccountTypeName = (tipo: string) => {
    switch (tipo) {
      case 'CORRENTE': return 'Conta Corrente';
      case 'POUPANCA': return 'Poupança';
      case 'INVESTIMENTO': return 'Investimento';
      case 'DINHEIRO': return 'Dinheiro / Carteira';
      default: return tipo;
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 space-y-5 bg-slate-55 overflow-y-auto pb-28 animate-fade-in font-sans">
      
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDrawer}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
            Carteiras & Contas
          </span>
        </div>

        <button
          onClick={handleOpenAddAccount}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-3xs cursor-pointer"
        >
          <Plus size={14} />
          Nova Conta
        </button>
      </header>

      {/* Patrimônio Resumo Card */}
      <div className="bg-slate-900 border border-slate-950 text-white p-5 rounded-3xl shadow-lg text-left relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl" />
        
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Patrimônio Consolidado</span>
        <h2 className="text-2xl font-black mt-1 leading-none">
          {formatCurrency(saldoConsolidado)}
        </h2>

        {/* Sub-balances PF/PJ grid */}
        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/10">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Pessoa Física (PF)
            </span>
            <span className="text-sm font-extrabold block mt-0.5">
              {formatCurrency(saldoPF)}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              Pessoa Jurídica (PJ)
            </span>
            <span className="text-sm font-extrabold block mt-0.5">
              {formatCurrency(saldoPJ)}
            </span>
          </div>
        </div>
      </div>

      {/* List of accounts */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider text-left pl-1">
          Minhas Contas e Carteiras
        </h3>

        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white border border-slate-200 rounded-3xl">
            <Landmark className="text-slate-350 mb-3" size={28} />
            <p className="text-slate-700 text-xs font-bold">Nenhuma conta cadastrada.</p>
            <p className="text-slate-400 text-[10px] mt-1">Toque no botão superior para criar sua primeira conta bancária.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accountsWithBalances.map(acc => {
              const isMoney = acc.tipo === 'DINHEIRO';

              return (
                <div 
                  key={acc.id}
                  onClick={() => {
                    setSelectedStatementAccount(acc);
                    setIsStatementModalOpen(true);
                  }}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs hover:border-slate-300 transition-all flex flex-col justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon with Account Color */}
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-3xs shrink-0"
                        style={{ backgroundColor: acc.cor || '#3b82f6' }}
                      >
                        {isMoney ? <Wallet size={18} /> : <Landmark size={18} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-800 group-hover:text-blue-900 transition-colors">
                            {acc.nome}
                          </h4>
                          
                          {/* titularidade badge */}
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none ${
                            acc.tipoPessoa === 'PJ' 
                              ? 'bg-orange-105 text-orange-700' 
                              : 'bg-blue-105 text-blue-700'
                          }`}>
                            {acc.tipoPessoa}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          {getAccountTypeName(acc.tipo)} {acc.banco ? `• ${acc.banco}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="text-right">
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Saldo Disponível</span>
                      <span className="text-sm font-black text-slate-850">
                        {formatCurrency(acc.saldoAtual)}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons footer */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenEditAccount(acc, e)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={10} />
                      Editar
                    </button>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedStatementAccount(acc);
                          setIsStatementModalOpen(true);
                        }}
                        className="text-[10px] text-[#0e69b2] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileText size={10} />
                        Extrato
                      </button>
                      
                      <button
                        onClick={() => handleOpenTransfer(acc.id)}
                        className="text-[10px] text-slate-900 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowRightLeft size={10} />
                        Transferir
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: CADASTRO / EDIÇÃO DE CONTA */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsAccountModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white border-t border-slate-250 rounded-t-3xl shadow-2xl p-6 z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-6 cursor-pointer" onClick={() => setIsAccountModalOpen(false)} />
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                {editingAccount ? 'Editar Conta' : 'Nova Conta / Carteira'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-655 hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAccountSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Nome da Conta / Carteira</label>
                <input
                  type="text"
                  placeholder="Ex: Itaú Principal, Dinheiro na Carteira"
                  value={accNome}
                  onChange={(e) => setAccNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Instituição / Banco (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Nubank, Itaú"
                    value={accBanco}
                    onChange={(e) => setAccBanco(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Tipo de Conta</label>
                  <select
                    value={accTipo}
                    onChange={(e: any) => setAccTipo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                    <option value="INVESTIMENTO">Investimento</option>
                    <option value="DINHEIRO">Dinheiro (Carteira)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Tipo de Pessoa (Titularidade)</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-650 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="accTipoPessoa"
                        checked={accTipoPessoa === 'PF'}
                        onChange={() => setAccTipoPessoa('PF')}
                        className="text-[#0e69b2]"
                      />
                      Pessoa Física (PF)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-655 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="accTipoPessoa"
                        checked={accTipoPessoa === 'PJ'}
                        onChange={() => setAccTipoPessoa('PJ')}
                        className="text-[#0e69b2]"
                      />
                      Pessoa Jurídica (PJ)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Saldo Inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={accSaldoInicial}
                      onChange={(e) => setAccSaldoInicial(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1.5">Cor de Identificação</label>
                <div className="flex gap-2">
                  {['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#14b8a6', '#64748b'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccCor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        accCor === c ? 'border-slate-800 scale-110 shadow-3xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                {editingAccount && onDeleteAccount && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Tem certeza de que deseja excluir esta conta? Isso removerá o vínculo das despesas a ela.')) {
                        await onDeleteAccount(editingAccount.id);
                        setIsAccountModalOpen(false);
                      }
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-50 border border-rose-150 hover:bg-rose-100/55 text-rose-600 font-bold text-xs cursor-pointer"
                  >
                    Excluir
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-[2] py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TRANSFERÊNCIA ENTRE CONTAS */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsTransferModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white border-t border-slate-250 rounded-t-3xl shadow-2xl p-6 z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-6 cursor-pointer" onClick={() => setIsTransferModalOpen(false)} />
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                Nova Transferência
              </h3>
              <button 
                type="button" 
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-655 hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTransferSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Conta de Origem</label>
                  <select
                    value={trOrigem}
                    onChange={(e) => setTrOrigem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Conta de Destino</label>
                  <select
                    value={trDestino}
                    onChange={(e) => setTrDestino(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={trValor}
                      onChange={(e) => setTrValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Data</label>
                  <input
                    type="date"
                    value={trData}
                    onChange={(e) => setTrData(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 font-bold focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase mb-1">Observação / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Repasse PJ para PF, Ajuste de caixa"
                  value={trObs}
                  onChange={(e) => setTrObs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft size={14} />
                Confirmar Transferência
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXTRATO COMPACTO DE CONTA */}
      {isStatementModalOpen && selectedStatementAccount && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-xs animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsStatementModalOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-50 border-t border-slate-250 rounded-t-3xl shadow-2xl p-5 z-10 animate-slide-up max-h-[92vh] flex flex-col">
            <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-5 cursor-pointer" onClick={() => setIsStatementModalOpen(false)} />

            <div className="flex items-center justify-between mb-4">
              <div className="text-left">
                <span className="text-[9px] uppercase font-black text-slate-400">Extrato Consolidado</span>
                <h3 className="text-sm font-black text-slate-800 uppercase">
                  {selectedStatementAccount.nome}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsStatementModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-655 hover:bg-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Statement List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
              {(() => {
                const list = getAccountStatement(selectedStatementAccount.id);
                if (list.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white border border-slate-200 rounded-2xl">
                      <Info className="text-slate-300 mb-2" size={24} />
                      <p className="text-slate-700 text-xs font-bold">Nenhuma movimentação registrada.</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">As transações e transferências vinculadas aparecerão aqui.</p>
                    </div>
                  );
                }

                return list.map(item => {
                  const isEntrada = item.tipo === 'ENTRADA';
                  return (
                    <div 
                      key={item.id} 
                      className="bg-white border border-slate-150 p-3 rounded-xl flex items-center justify-between text-left shadow-3xs"
                    >
                      <div>
                        <span className="font-extrabold text-xs text-slate-800 block">
                          {item.descricao}
                        </span>
                        
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-slate-400 font-bold">
                            {formatDate(item.data)}
                          </span>
                          <span className="text-[9px] text-slate-300 font-black">•</span>
                          <span className={`text-[8px] font-black px-1 py-0.2 rounded-md ${
                            item.origem === 'Carteira' 
                              ? 'bg-blue-50 text-blue-600' 
                              : item.origem === 'Trabalho' 
                                ? 'bg-orange-50 text-orange-600'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.origem}
                          </span>
                        </div>
                      </div>

                      <span className={`text-xs font-black shrink-0 ${isEntrada ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isEntrada ? '+' : '-'} {formatCurrency(item.valor)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
