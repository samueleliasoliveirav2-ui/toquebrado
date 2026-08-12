export type TransactionType = 'ENTRADA' | 'SAIDA';
export type TransactionStatus = 'PENDENTE' | 'RECEBIDO' | 'PAGO' | 'POSTERGAR';

export const MOEDAS_PADRAO = [
  { codigo: 'BRL', simbolo: 'R$', rotulo: 'Real (BRL)' },
  { codigo: 'USD', simbolo: 'US$', rotulo: 'Dólar (USD)' },
  { codigo: 'EUR', simbolo: '€', rotulo: 'Euro (EUR)' },
  { codigo: 'ARS', simbolo: 'AR$', rotulo: 'Peso Argentino (ARS)' },
  { codigo: 'CLP', simbolo: 'CL$', rotulo: 'Peso Chileno (CLP)' },
  { codigo: 'COP', simbolo: 'COL$', rotulo: 'Peso Colombiano (COP)' },
  { codigo: 'MXN', simbolo: 'MX$', rotulo: 'Peso Mexicano (MXN)' },
  { codigo: 'GBP', simbolo: '£', rotulo: 'Libra Esterlina (GBP)' },
  { codigo: 'PYG', simbolo: '₲', rotulo: 'Guarani Paraguaio (PYG)' },
  { codigo: 'UYU', simbolo: 'UYU$', rotulo: 'Peso Uruguaio (UYU)' }
] as const;

export type TemaVisual = 'LIGHT' | 'DARK' | 'SYSTEM';
export type TipoPlanoConta = 'PESSOAL' | 'ULTRA' | 'PRO';

export interface UserProfile {
  id: string;
  nomeCompleto?: string;
  email?: string;
  telefone?: string;
  avatarUrl?: string;
  moedaPadrao: typeof MOEDAS_PADRAO[number]['codigo'];
  temaVisual: TemaVisual;
  ocultarSaldosDefault: boolean;
  tipoPlano: TipoPlanoConta;
}

export interface Transaction {
  id: string;
  data: string; // YYYY-MM-DD
  descricao: string;
  categoria: string;
  tipo: TransactionType;
  valor: number;
  status: TransactionStatus;
  dataPostergar?: string; // YYYY-MM-DD, required if status === 'POSTERGAR'
  juros?: number; // Optional, only for SAIDA
  contaId?: string; // Links transaction to a specific BankAccount
  frequencia?: 'AVULSO' | 'RECORRENTE' | 'PARCELADO';
  periodicidade?: 'SEMANAL' | 'MENSAL' | 'ANUAL';
  parcelaAtual?: number;
  totalParcelas?: number;
  grupoRecorrenciaId?: string;
  // --- Cartão de Crédito ---
  cartaoId?: string; // Vinculo com cartao_credito
  faturaId?: string; // Vinculo com fatura_cartao
  dataCompra?: string; // Data real da compra (pode diferir da data de alocação na fatura)
}

// ============================================================
// CARTÃO DE CRÉDITO
// ============================================================
export type BandeiraCartao = 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX' | 'HIPERCARD' | 'OUTROS';

export interface CreditCard {
  id: string;
  userId: string;
  nome: string;          // "Itaú Universo"
  bandeira: BandeiraCartao;
  limiteTotal: number;   // R$ 10.000,00
  diaFechamento: number; // 1-28
  diaVencimento: number; // 1-28
  cor: string;           // "#000000"
  contaPagamentoPadraoId?: string; // Conta bancária padrão para pagar a fatura
}

// ============================================================
// FATURA DE CARTÃO DE CRÉDITO
// ============================================================
export type InvoiceStatus = 'ABERTA' | 'FECHADA' | 'PAGA' | 'ATRASADA';

export interface CreditCardInvoice {
  id: string;
  userId: string;
  cartaoId: string;
  mesAno: string;         // "2026-08"
  dataFechamento: string; // YYYY-MM-DD
  dataVencimento: string; // YYYY-MM-DD
  valorTotal: number;     // atualizado dinamicamente via transações
  status: InvoiceStatus;
  valorPago?: number;
  dataPagamento?: string;
}

export const CATEGORIES = {
  ENTRADA: ['Pró-Labore', 'Salário', 'Investimentos', 'Freelance', 'Outros'],
  SAIDA: ['Aluguel', 'Supermercado', 'Assinaturas', 'Transporte', 'Lazer', 'Saúde', 'Cartão', 'Empréstimo', 'Outros']
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Semana 1 (03/Ago - 09/Ago)
  {
    id: 'tx-1',
    data: '2026-08-03',
    descricao: 'Pró-Labore Fixo',
    categoria: 'Pró-Labore',
    tipo: 'ENTRADA',
    valor: 4500.00,
    status: 'RECEBIDO'
  },
  {
    id: 'tx-2',
    data: '2026-08-03',
    descricao: 'Aluguel do Apê',
    categoria: 'Aluguel',
    tipo: 'SAIDA',
    valor: 1500.00,
    status: 'PAGO'
  },
  {
    id: 'tx-3',
    data: '2026-08-05',
    descricao: 'Supermercado Mensal',
    categoria: 'Supermercado',
    tipo: 'SAIDA',
    valor: 642.50,
    status: 'PAGO'
  },
  {
    id: 'tx-4',
    data: '2026-08-07',
    descricao: 'Corrida Uber',
    categoria: 'Transporte',
    tipo: 'SAIDA',
    valor: 32.90,
    status: 'PAGO'
  },
  {
    id: 'tx-5',
    data: '2026-08-08',
    descricao: 'Netflix + Spotify',
    categoria: 'Assinaturas',
    tipo: 'SAIDA',
    valor: 75.80,
    status: 'PENDENTE'
  },

  // Semana 2 (10/Ago - 16/Ago)
  {
    id: 'tx-6',
    data: '2026-08-10',
    descricao: 'Fatura Shopee',
    categoria: 'Cartão',
    tipo: 'SAIDA',
    valor: 249.90,
    status: 'PENDENTE'
  },
  {
    id: 'tx-7',
    data: '2026-08-12',
    descricao: 'Freelance UI/UX design',
    categoria: 'Freelance',
    tipo: 'ENTRADA',
    valor: 1200.00,
    status: 'RECEBIDO'
  },
  {
    id: 'tx-8',
    data: '2026-08-14',
    descricao: 'Consulta Dentista',
    categoria: 'Saúde',
    tipo: 'SAIDA',
    valor: 200.00,
    status: 'POSTERGAR',
    dataPostergar: '2026-08-25'
  },

  // Semana 3 (17/Ago - 23/Ago)
  {
    id: 'tx-9',
    data: '2026-08-17',
    descricao: 'Academia Mensalidade',
    categoria: 'Saúde',
    tipo: 'SAIDA',
    valor: 119.90,
    status: 'PENDENTE'
  },
  {
    id: 'tx-10',
    data: '2026-08-19',
    descricao: 'Jantar com amigos',
    categoria: 'Lazer',
    tipo: 'SAIDA',
    valor: 180.00,
    status: 'PENDENTE'
  },

  // Semana 4 (24/Ago - 30/Ago)
  {
    id: 'tx-11',
    data: '2026-08-25',
    descricao: 'Parcela Empréstimo',
    categoria: 'Empréstimo',
    tipo: 'SAIDA',
    valor: 450.00,
    status: 'PENDENTE',
    juros: 15.50
  },
  {
    id: 'tx-12',
    data: '2026-08-28',
    descricao: 'Rendimento CDI',
    categoria: 'Investimentos',
    tipo: 'ENTRADA',
    valor: 85.40,
    status: 'RECEBIDO'
  }
];

export interface WorkShiftEntry {
  id: string;
  data: string; // YYYY-MM-DD
  atividade: string; // 'Motorista de App' | 'Evento' | 'Outro'
  tipo: 'ENTRADA' | 'SAIDA';
  categoria?: string; // 'Combustível' | 'Alimentação/Lanche' | 'Pedágio/Estacionamento' | 'Manutenção' | 'Outros'
  valor: number;
  valorDiaria?: number;
  quantidadeDias?: number;
  status?: 'RECEBIDO' | 'A_RECEBER';
  dataRecebimento?: string; // YYYY-MM-DD
  observacao?: string;
  vinculoId?: string; // Links SAIDA (costs) to an ENTRADA event or activity
  contaId?: string; // Links shift or operational cost to a specific BankAccount
}

export interface BankAccount {
  id: string;
  nome: string;
  banco?: string;
  tipo: 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'DINHEIRO';
  tipoPessoa: 'PF' | 'PJ';
  saldoInicial: number;
  cor?: string;
}

export interface AccountTransfer {
  id: string;
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  data: string; // YYYY-MM-DD
  observacao?: string;
}

export const ACTIVITIES = ['Motorista de App', 'Evento', 'Outro'];

export const SHIFT_EXPENSE_CATEGORIES = [
  'Combustível',
  'Alimentação/Lanche',
  'Pedágio/Estacionamento',
  'Manutenção',
  'Outros'
];

// ============================================================
// IMPORTAÇÃO INTELIGENTE DE FATURA PDF
// ============================================================
export interface ExtractedInvoiceItem {
  id: string;                  // temporario apenas para UI render
  data: string;                // YYYY-MM-DD
  descricao: string;
  categoria: string;           // Sugerida / editavel
  valor: number;
  parcelaAtual?: number;       // 2  (de 2/15)
  totalParcelas?: number;      // 15 (de 2/15)
  selected: boolean;           // checkbox do usuário
}

export interface ExtractedInvoiceData {
  cartaoSugeridoNome?: string;
  vencimento?: string;          // YYYY-MM-DD
  valorTotalExtraido?: number;
  itens: ExtractedInvoiceItem[];
}
