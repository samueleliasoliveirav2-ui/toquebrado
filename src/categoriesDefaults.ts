import type { Category, CategoryType } from './types';

/**
 * Categorias DEFAULT (seed inicial)
 * Migramos os valores antigos de CATEGORIES no types.ts para o novo formato
 * de Category + subcategorias iniciais (sugestões de uso comum)
 */
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'userId'>[] = [
  // ============ RECEITAS (INCOME) ============
  {
    name: 'Salário',
    type: 'INCOME',
    subcategories: ['CLT', 'Estágio', 'Horas Extras', 'Comissão', 'Bônus/PLR']
  },
  {
    name: 'Pró-Labore',
    type: 'INCOME',
    subcategories: ['Sócio', 'MEI', 'Retirada Mensal']
  },
  {
    name: 'Freelance / Serviços',
    type: 'INCOME',
    subcategories: ['Design', 'Programação', 'Consultoria', 'Marketing', 'Outros Serviços']
  },
  {
    name: 'Investimentos',
    type: 'INCOME',
    subcategories: ['CDB', 'Tesouro Direto', 'Ações', 'FIIs', 'Criptomoedas', 'Dividendos']
  },
  {
    name: 'Aluguel Recebido',
    type: 'INCOME',
    subcategories: ['Imóvel Residencial', 'Imóvel Comercial', 'Temporada']
  },
  {
    name: 'Outras Receitas',
    type: 'INCOME',
    subcategories: ['Venda de Bens', 'Cashback', 'Reembolso', 'Doação', 'Premiação']
  },

  // ============ DESPESAS (EXPENSE) ============
  {
    name: 'Casa / Moradia',
    type: 'EXPENSE',
    subcategories: ['Aluguel', 'Financiamento Imobiliário', 'Condomínio', 'IPTU', 'Seguro Residencial']
  },
  {
    name: 'Alimentação',
    type: 'EXPENSE',
    subcategories: ['Restaurante', 'Lanche', 'Marmita/Ifood', 'Uber Eats/99 Food']
  },
  {
    name: 'Supermercado',
    type: 'EXPENSE',
    subcategories: ['Mercado Mensal', 'Feira Livre', 'Hortifruti', 'Padaria']
  },
  {
    name: 'Transporte',
    type: 'EXPENSE',
    subcategories: ['Uber / 99 / Táxi', 'Combustível', 'Estacionamento', 'Ônibus / Metrô', 'Manutenção Carro', 'IPVA', 'Seguro Auto']
  },
  {
    name: 'Saúde',
    type: 'EXPENSE',
    subcategories: ['Plano de Saúde', 'Consulta Médica', 'Farmácia/Medicamentos', 'Dentista', 'Academia']
  },
  {
    name: 'Lazer / Entretenimento',
    type: 'EXPENSE',
    subcategories: ['Cinema / Teatro', 'Streaming', 'Jogos', 'Viagem', 'Bares / Baladas', 'Festas']
  },
  {
    name: 'Educação',
    type: 'EXPENSE',
    subcategories: ['Mensalidade Faculdade', 'Curso Online', 'Escola / Colégio', 'Material Didático', 'Livros']
  },
  {
    name: 'Compras / Vestuário',
    type: 'EXPENSE',
    subcategories: ['Roupas', 'Calçados', 'Acessórios', 'Eletrônicos', 'Eletrodomésticos']
  },
  {
    name: 'Serviços / Assinaturas',
    type: 'EXPENSE',
    subcategories: ['Internet', 'Telefone Celular', 'Energia Elétrica', 'Água', 'Gás', 'TV a Cabo']
  },
  {
    name: 'Cartão de Crédito',
    type: 'EXPENSE',
    subcategories: ['Fatura Fechada', 'Juros / Multas', 'Anuidade']
  },
  {
    name: 'Empréstimo / Financiamento',
    type: 'EXPENSE',
    subcategories: ['Empréstimo Pessoal', 'Consignado', 'Financiamento Veículo', 'Juros']
  },
  {
    name: 'Outras Despesas',
    type: 'EXPENSE',
    subcategories: ['Doação', 'Impostos', 'Taxas Bancárias', 'Multa', 'Pet']
  }
];

/**
 * Helper de compatibilidade:
 * Mapeia Tipo Antigo ("ENTRADA"/"SAIDA") -> Novo CategoryType ("INCOME"/"EXPENSE") e vice-versa.
 * Para manter o TransactionModal funcionando sem mudanças radicais.
 */
export const MAP_TIPO_CATEGORIA: Record<'ENTRADA' | 'SAIDA', CategoryType> = {
  ENTRADA: 'INCOME',
  SAIDA: 'EXPENSE'
};
export const MAP_CATEGORYTYPE_TO_TIPO: Record<CategoryType, 'ENTRADA' | 'SAIDA'> = {
  INCOME: 'ENTRADA',
  EXPENSE: 'SAIDA'
};
