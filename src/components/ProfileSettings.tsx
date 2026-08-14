import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Globe2,
  Heart,
  LogOut,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  User as UserIcon,
  Mail,
  Lock
} from 'lucide-react';
import type { MOEDAS_PADRAO, TemaVisual, TipoPlanoConta, UserProfile, Category, CategoryType } from '../types';
import { MOEDAS_PADRAO as MOEDAS } from '../types';
import { AvatarDropdown } from './AvatarDropdown';
import { CategoryListAccordion } from './CategoryListAccordion';

interface ProfileSettingsProps {
  userName: string;
  userEmail: string;
  userProfile: UserProfile | null;
  onSaveProfile: (patch: Partial<UserProfile> & {
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<boolean>;
  onLogout: () => void;
  onSeedData: () => void;
  onDeleteMockData: () => void;
  mockTransactionsCount: number;
  isSyncing: boolean;
  // Controlled state do Avatar (para sincronizar com o header GLOBAL da tela)
  localAvatarUrl?: string | null;
  onLocalAvatarChange?: (base64OrNull: string | null) => void;
  // Se true, mostra o header interno (avatar + nome) — no cenário de header GLOBAL, passa false
  showInternalHeader?: boolean;
  // ======= NOVO: Categorias / Subcategorias =======
  categories: Category[];
  onNewCategory: (type: CategoryType) => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onAddSubcategory: (cat: Category) => void;
}

const TEMA_LABELS: { key: TemaVisual; label: string; emoji: string }[] = [
  { key: 'LIGHT', label: 'Claro', emoji: '☀️' },
  { key: 'DARK', label: 'Escuro', emoji: '🌙' },
  { key: 'SYSTEM', label: 'Sistema', emoji: '💻' }
];

const PLANO_META: Record<TipoPlanoConta, { label: string; cor: string }> = {
  PESSOAL: { label: 'Conta Pessoal', cor: 'bg-blue-50 border-blue-200 text-blue-700' },
  ULTRA: { label: 'Conta Ultra', cor: 'bg-violet-50 border-violet-200 text-violet-700' },
  PRO: { label: 'Conta Pro', cor: 'bg-amber-50 border-amber-200 text-amber-700' }
};

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  userName,
  userEmail,
  userProfile,
  onSaveProfile,
  onLogout,
  onSeedData,
  onDeleteMockData,
  mockTransactionsCount,
  isSyncing,
  localAvatarUrl,
  onLocalAvatarChange,
  showInternalHeader = false,
  categories,
  onNewCategory,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory
}) => {
  const planoAtual = userProfile?.tipoPlano || 'PESSOAL';
  const planoMeta = PLANO_META[planoAtual];

  // -------------------- FORM STATES --------------------
  const [formNome, setFormNome] = useState(userProfile?.nomeCompleto || userName);
  const [formEmail, setFormEmail] = useState(userProfile?.email || userEmail);
  const [formTelefone, setFormTelefone] = useState(userProfile?.telefone || '');
  // Avatar: prioriza controlled prop (header global), fallback estado local
  const [localAvatarInternal, setLocalAvatarInternal] = useState<string | null>(userProfile?.avatarUrl || null);
  const formAvatarUrl = typeof localAvatarUrl !== 'undefined' ? localAvatarUrl : localAvatarInternal;
  const setFormAvatarUrl = (v: string | null) => {
    if (onLocalAvatarChange) onLocalAvatarChange(v);
    setLocalAvatarInternal(v);
  };

  const [moeda, setMoeda] = useState<typeof MOEDAS_PADRAO[number]['codigo']>(
    userProfile?.moedaPadrao || 'BRL'
  );
  const [tema, setTema] = useState<TemaVisual>(userProfile?.temaVisual || 'LIGHT');
  const [ocultarSaldosDefault, setOcultarSaldosDefault] = useState<boolean>(
    userProfile?.ocultarSaldosDefault || false
  );

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [showSenhas, setShowSenhas] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  // -------------------- SYNC userProfile incoming --------------------
  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.nomeCompleto) setFormNome(userProfile.nomeCompleto);
    if (userProfile.email) setFormEmail(userProfile.email);
    if (userProfile.telefone) setFormTelefone(userProfile.telefone);
    if (userProfile.avatarUrl) setFormAvatarUrl(userProfile.avatarUrl);
    else setFormAvatarUrl(null);
    if (userProfile.moedaPadrao) setMoeda(userProfile.moedaPadrao);
    if (userProfile.temaVisual) setTema(userProfile.temaVisual);
    if (typeof userProfile.ocultarSaldosDefault === 'boolean') {
      setOcultarSaldosDefault(userProfile.ocultarSaldosDefault);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  // -------------------- Save --------------------
  const handleSave = async () => {
    setErroSenha(null);
    const querAlterarSenha = senhaAtual || novaSenha || confirmarSenha;
    if (querAlterarSenha) {
      if (!senhaAtual.trim()) {
        setErroSenha('Informe sua senha atual para alterá-la.');
        return;
      }
      if (novaSenha.length < 6) {
        setErroSenha('Nova senha precisa ter pelo menos 6 caracteres.');
        return;
      }
      if (novaSenha !== confirmarSenha) {
        setErroSenha('Confirmação de senha não bate com a nova senha.');
        return;
      }
    }

    setSalvando(true);
    try {
      // CUIDADO: avatarUrl pode ser string | null.
      // NULL = "excluir foto" — precisa MANTER null para o patch, NÃO converter para undefined!
      // Apenas undefined = "não quero alterar o avatar neste save"
      const avatarPatch: { avatarUrl?: string | null } = {};
      if (typeof formAvatarUrl !== 'undefined') {
        avatarPatch.avatarUrl = formAvatarUrl;  // pode ser string (definir foto) OU null (excluir foto)
      }

      const patch: Partial<UserProfile> & {
        currentPassword?: string;
        newPassword?: string;
      } = {
        nomeCompleto: formNome.trim() || undefined,
        email: formEmail.trim() || undefined,
        telefone: formTelefone.trim() || undefined,
        moedaPadrao: moeda,
        temaVisual: tema,
        ocultarSaldosDefault,
        ...avatarPatch
      };
      if (querAlterarSenha) {
        patch.currentPassword = senhaAtual;
        patch.newPassword = novaSenha;
      }
      const ok = await onSaveProfile(patch);
      if (ok) {
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col p-4 pb-40 space-y-5 animate-fade-in bg-slate-50 overflow-y-auto scrollbar-thin">

      {/* ========================================================
           HEADER INTERNO DO PERFIL (opcional — default false)
           Usado apenas se a tela NÃO tiver header GLOBAL com avatar.
      ========================================================== */}
      {showInternalHeader && (
        <div className="relative rounded-[28px] overflow-hidden shadow-sm bg-gradient-to-br from-[#0e69b2] via-[#2f83d4] to-[#3b82f6] text-white">
          <div className="absolute inset-0 opacity-25 pointer-events-none">
            <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/30 blur-3xl" />
            <div className="absolute -bottom-16 -right-6 w-56 h-56 rounded-full bg-white/20 blur-3xl" />
          </div>

          <div className="relative p-5 flex flex-col items-center gap-3 text-center">
            <AvatarDropdown
              size="lg"
              avatarUrl={formAvatarUrl}
              userName={formNome || userName}
              onChangeAvatar={setFormAvatarUrl}
            />

            {/* Info */}
            <div className="space-y-1 min-w-0 w-full">
              <h2 className="text-lg font-black truncate leading-tight">
                {formNome || userName || 'Sem nome'}
              </h2>
              <p className="text-[11px] font-semibold text-white/85 truncate">
                {formEmail || userEmail || 'sem@email.com'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${planoMeta.cor}`}>
                  <ShieldCheck size={10} />
                  {planoMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-white text-[10px] font-bold">
                  <Globe2 size={10} />
                  {MOEDAS.find(m => m.codigo === moeda)?.rotulo || 'BRL (R$)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
           DADOS PESSOAIS
      ========================================================== */}
      <section className="glass rounded-2xl p-4 border border-slate-200/70 bg-white/95 shadow-sm space-y-4">
        <header className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-[#0e69b2]">
            <UserIcon size={14} />
          </div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Dados Pessoais
          </h3>
        </header>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 block">Nome Completo</label>
            <input
              type="text"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Nome que aparece na saudação"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Mail size={10} /> E-mail
            </label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Smartphone size={10} /> Telefone / WhatsApp (opcional)
            </label>
            <input
              type="tel"
              value={formTelefone}
              onChange={(e) => setFormTelefone(e.target.value)}
              placeholder="(11) 98000-0000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* ========================================================
           PREFERÊNCIAS DO APLICATIVO
      ========================================================== */}
      <section className="glass rounded-2xl p-4 border border-slate-200/70 bg-white/95 shadow-sm space-y-4">
        <header className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
            <Palette size={14} />
          </div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Preferências do Aplicativo
          </h3>
        </header>

        <div className="space-y-4">
          {/* Moeda */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Moeda Padrão</label>
            <select
              value={moeda}
              onChange={(e) => setMoeda(e.target.value as typeof moeda)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs cursor-pointer"
            >
              {MOEDAS.map(m => (
                <option key={m.codigo} value={m.codigo}>{m.rotulo}</option>
              ))}
            </select>
          </div>

          {/* Tema */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Tema Visual</label>
            <div className="grid grid-cols-3 gap-2">
              {TEMA_LABELS.map(t => {
                const ativo = tema === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTema(t.key)}
                    className={`rounded-xl px-2 py-2.5 text-[10px] font-extrabold border transition-all cursor-pointer ${
                      ativo
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.02]'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-base mb-0.5">{t.emoji}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ocultar saldos por padrão */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-white text-rose-500 border border-slate-200 shrink-0">
                {ocultarSaldosDefault ? <EyeOff size={13} /> : <Eye size={13} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">Ocultar Saldos por Padrão</p>
                <p className="text-[9px] text-slate-500 font-semibold leading-tight mt-0.5">
                  Saldos principais iniciam ocultos ao abrir o app.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOcultarSaldosDefault(b => !b)}
              className={`relative w-12 h-6 rounded-full shrink-0 transition-colors cursor-pointer ${
                ocultarSaldosDefault ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                ocultarSaldosDefault ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
           SEGURANÇA E ACESSO
      ========================================================== */}
      <section className="glass rounded-2xl p-4 border border-slate-200/70 bg-white/95 shadow-sm space-y-4">
        <header className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck size={14} />
          </div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Segurança e Acesso
          </h3>
        </header>

        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 font-semibold leading-snug">
            Preencha os campos abaixo apenas se deseja alterar sua senha. Mantenha-os vazios para não alterar.
          </p>

          <div>
            <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
              <Lock size={10} /> Senha Atual
            </label>
            <div className="relative">
              <input
                type={showSenhas ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite a senha atual"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowSenhas(s => !s)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showSenhas ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Nova Senha</label>
              <input
                type={showSenhas ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Confirmar Nova</label>
              <input
                type={showSenhas ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
          </div>

          {erroSenha && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
              <Lock size={12} />
              {erroSenha}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
           GERENCIAR CATEGORIAS & SUBCATEGORIAS (NOVO!)
      ========================================================== */}
      <section className="space-y-3.5">
        <div className="glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-xs">
          <CategoryListAccordion
            categories={categories}
            onNewCategory={onNewCategory}
            onEditCategory={onEditCategory}
            onDeleteCategory={onDeleteCategory}
            onAddSubcategory={onAddSubcategory}
          />
        </div>
      </section>

      {/* ========================================================
           CONEXÃO / DADOS DEMONSTRAÇÃO
      ========================================================== */}
      <section className="space-y-3.5">
        <div className="glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-xs space-y-3">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Conexão do Sistema</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Database size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">Supabase Cloud DB</p>
                <p className="text-[10px] text-slate-500 font-semibold">Tabelas integradas na nuvem</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Online
            </span>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-xs space-y-3.5">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Ações de Demonstração</h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-left max-w-[70%]">
                <p className="text-xs font-bold text-slate-800">Carregar Lançamentos de Teste</p>
                <p className="text-[9px] text-slate-500 font-semibold leading-normal">
                  Insere 12 lançamentos fictícios para visualizar rapidamente os módulos.
                </p>
              </div>
              <button
                onClick={onSeedData}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-[#0e69b2]/10 hover:bg-[#0e69b2]/20 text-[#0e69b2] text-[10px] font-extrabold transition-all border border-[#0e69b2]/20 disabled:opacity-55 cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw size={10} className={isSyncing ? "animate-spin" : ""} />
                Carregar
              </button>
            </div>
            <div className="h-[1px] bg-slate-100" />
            <div className="flex items-center justify-between">
              <div className="text-left max-w-[70%]">
                <p className="text-xs font-bold text-slate-800">Remover Lançamentos de Teste</p>
                <p className="text-[9px] text-slate-500 font-semibold leading-normal">
                  Apaga apenas os dados fictícios inseridos.
                </p>
              </div>
              <button
                onClick={onDeleteMockData}
                disabled={isSyncing || mockTransactionsCount === 0}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100/75 text-rose-600 text-[10px] font-extrabold transition-all border border-rose-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={10} />
                Remover ({mockTransactionsCount})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
           ZONA DE AÇÃO DA CONTA (LOGOUT)
      ========================================================== */}
      <section className="glass rounded-2xl p-4 border border-slate-200/60 bg-white/95 shadow-xs space-y-3.5">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Zona de Ação da Conta</h4>

        {!confirmarLogout ? (
          <button
            onClick={() => setConfirmarLogout(true)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200 group cursor-pointer"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-lg bg-white text-rose-500 border border-rose-100 shadow-xs">
                <LogOut size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-rose-700">Sair do Sistema (Logout)</p>
                <p className="text-[9px] text-rose-600 font-semibold">Desconecta a sessão ativa com segurança</p>
              </div>
            </div>
            <ChevronRight size={15} className="text-rose-400 group-hover:translate-x-0.5 transition" />
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
              <p className="text-xs font-extrabold text-slate-800 mb-1">Confirmar Logout?</p>
              <p className="text-[10px] text-slate-500 font-semibold leading-snug">
                Você será desconectado imediatamente. Seus dados permanecem salvos na nuvem.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setConfirmarLogout(false)}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors cursor-pointer border border-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setConfirmarLogout(false);
                  onLogout();
                }}
                className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-extrabold transition-colors cursor-pointer shadow-md shadow-rose-500/20"
              >
                Sim, Sair
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================
           RODAPÉ FIXO FLUTUANTE: SALVAR ALTERAÇÕES
      ========================================================== */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pt-3 pb-5 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pointer-events-none z-40">
        <button
          onClick={handleSave}
          disabled={salvando}
          className="w-full pointer-events-auto flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#0e69b2] via-[#2f83d4] to-[#3b82f6] text-white text-sm font-extrabold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all disabled:opacity-70 cursor-pointer border border-white/20"
        >
          <Save size={15} className={salvando ? 'animate-pulse' : ''} />
          {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {/* Branding credits */}
      <div className="pt-1 pb-1 text-center space-y-1">
        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">tô quebrado v1.1.0</p>
        <p className="text-[9px] text-slate-500 font-semibold flex items-center justify-center gap-1">
          Feito com <Heart size={10} className="text-rose-500 fill-rose-500" /> para controle pessoal
        </p>
      </div>
    </div>
  );
};
