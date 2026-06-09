// Shared GTM data store — used by GtmPage and CreatePlayWizard

export interface GtmProduto {
  id: string;
  tipo: "Produto" | "Serviço" | "Treinamento";
  nome: string;
  descricao: string;
  preco: number;
  unidade: string;
  status: "Ativo" | "Inativo" | "Em desenvolvimento";
  pmfRating: number;
  momentosIds?: string[];
  publicosIds?: string[];
}

export interface GtmMomento {
  id: string;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  motivacao: string;
  descricao: string;
  percepcao: string;
  expanded: boolean;
}

export interface GtmPublico {
  id: string;
  nome: string;
  classificacao: string;
  desafios: string[];
  motivacoes: string[];
  jornada: string;
  contasVinculadas: string[];
  mercadoAlvo: string;
  expanded: boolean;
}

export interface GtmPitch {
  id: string;
  produto: string;
  momento: string;
  publico: string;
  conteudo: string;
  geradoEm: string;
  tom: string;
  canal: string;
}

export const defaultProdutos: GtmProduto[] = [
  {
    id: "p1",
    tipo: "Produto",
    nome: "Plataforma de Analytics B2B",
    descricao: "Solução completa de análise de dados para equipes de vendas e marketing com dashboards em tempo real.",
    preco: 2490,
    unidade: "mês",
    status: "Ativo",
    pmfRating: 4.2,
    momentosIds: ["m1", "m2"],
    publicosIds: ["pub1", "pub2"],
  },
  {
    id: "p2",
    tipo: "Serviço",
    nome: "Consultoria GTM",
    descricao: "Serviço de consultoria especializada em estratégias de Go-to-Market para empresas em crescimento.",
    preco: 8000,
    unidade: "projeto",
    status: "Ativo",
    pmfRating: 4.7,
    momentosIds: ["m1"],
    publicosIds: ["pub1"],
  },
  {
    id: "p3",
    tipo: "Treinamento",
    nome: "Revenue Academy",
    descricao: "Programa intensivo de capacitação em Revenue Operations para times comerciais.",
    preco: 1200,
    unidade: "pessoa",
    status: "Em desenvolvimento",
    pmfRating: 2.8,
    momentosIds: [],
    publicosIds: ["pub2"],
  },
];

export const defaultMomentos: GtmMomento[] = [
  {
    id: "m1",
    titulo: "Q2 2026 – Expansão para Mid-Market",
    dataInicio: "2026-04-01",
    dataFim: "2026-06-30",
    motivacao: "Alta demanda por soluções de automação comercial no segmento de médias empresas pós-fusões.",
    descricao: "Momento de entrada em contas mid-market que estão revisando seus stacks de tecnologia após processos de M&A.",
    percepcao: "Empresas nesse estágio percebem dificuldade em consolidar dados de CRM e ERP em uma visão única.",
    expanded: false,
  },
  {
    id: "m2",
    titulo: "Black Friday Corporativa – Nov/26",
    dataInicio: "2026-11-01",
    dataFim: "2026-11-30",
    motivacao: "Ciclo de fechamento de orçamento anual das empresas coincide com ações de desconto.",
    descricao: "Grandes contas costumam fechar contratos no Q4 para queimar orçamento remanescente.",
    percepcao: "CFOs buscam soluções com ROI comprovado para justificar investimento antes do fechamento fiscal.",
    expanded: false,
  },
];

export const defaultPublicos: GtmPublico[] = [
  {
    id: "pub1",
    nome: "VP de Vendas – Mid-Market",
    classificacao: "Decisor Econômico",
    desafios: [
      "Falta de visibilidade do pipeline em tempo real",
      "Equipe comercial sem metodologia estruturada",
      "Alta rotatividade de SDRs",
    ],
    motivacoes: [
      "Atingir meta trimestral",
      "Reduzir ciclo de vendas",
      "Aumentar ticket médio",
    ],
    jornada: "Consciência → Consideração → Decisão. Normalmente pesquisa ativamente antes de aceitar uma reunião.",
    contasVinculadas: ["Conta Alpha", "Conta Beta", "Conta Gamma"],
    mercadoAlvo: "Empresas de 200–1000 funcionários, B2B SaaS, receita >R$10M",
    expanded: false,
  },
  {
    id: "pub2",
    nome: "Head de Revenue Operations",
    classificacao: "Influenciador Técnico",
    desafios: [
      "Processos manuais e planilhas legadas",
      "Integração entre CRM e ferramentas de marketing",
      "Relatórios inconsistentes entre áreas",
    ],
    motivacoes: [
      "Automatizar relatórios",
      "Unificar fonte de dados",
      "Reduzir retrabalho da equipe",
    ],
    jornada: "Pesquisa técnica aprofundada, avalia demos e cases antes de recomendar ao decisor.",
    contasVinculadas: ["Conta Delta", "Conta Epsilon"],
    mercadoAlvo: "Scale-ups tech com time de RevOps estruturado",
    expanded: false,
  },
];
