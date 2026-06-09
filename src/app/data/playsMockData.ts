import type { Touchpoint } from '../components/touchpoints/TouchpointTimeline';

export interface PlayMock {
  id: string;
  accountId: string;
  accountName: string;
  name: string;
  dossierContaName?: string;
  dossierContatoName?: string;
  produtoName?: string;
  gtmName?: string;
  touchpoints: Touchpoint[];
}

const STAR_BANK_TOUCHPOINTS: Touchpoint[] = [
  {
    id: 1,
    itemType: 'touchpoint',
    type: 'AUTORIDADE',
    title: 'Conectar LinkedIn',
    category: 'Autoridade',
    channel: 'LinkedIn',
    responsibles: ['João Silva'],
    date: '15-01-2026',
    status: 'Executado',
    description:
      'Conectar com os principais stakeholders da empresa através do LinkedIn para estabelecer um primeiro contato.',
    subtasks: [],
    attachments: [],
    budget: 0,
    weight: 'Médio',
    score: 8,
    interactions: [],
  },
  {
    id: 2,
    itemType: 'task',
    type: 'TASKPOINT',
    title: 'Pesquisar sobre a empresa e seus concorrentes',
    category: 'Pesquisa',
    channel: '-',
    responsibles: ['Carlos Mendes'],
    date: '18-01-2026',
    status: 'Em andamento',
    description:
      'Realizar pesquisa profunda sobre a empresa alvo, identificando suas principais necessidades, desafios atuais e concorrentes diretos no mercado.',
    subtasks: [
      { id: 'st-t1', title: 'Analisar site institucional', completed: true, assignee: 'Carlos Mendes', dueDate: '2026-01-16' },
      { id: 'st-t2', title: 'Pesquisar notícias recentes', completed: true, assignee: 'João Silva', dueDate: '2026-01-17' },
      { id: 'st-t3', title: 'Mapear concorrentes', completed: false, assignee: 'Ana Lima', dueDate: '2026-01-18' },
    ],
    attachments: [],
    budget: 0,
    weight: 'Médio',
    score: 0,
    interactions: [],
  },
  {
    id: 3,
    itemType: 'touchpoint',
    type: 'ATENÇÃO',
    title: 'Email do especialista do projeto',
    category: 'Relacionamento',
    channel: 'LinkedIn',
    responsibles: ['Maria Santos'],
    date: '20-01-2026',
    status: 'Em andamento',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae semper velit. Fusce nec lacinia dolor. Cras non hendrerit massa, in imperdiet ligula.',
    subtasks: [
      { id: 'st1', title: 'Preparar conteúdo do email', completed: true, assignee: 'Maria Santos', dueDate: '2026-01-19' },
      { id: 'st2', title: 'Revisar ortografia', completed: false, assignee: 'Rafael Oliveira', dueDate: '2026-01-20' },
    ],
    attachments: [{ id: 'att1', name: 'Titulo-do-anexo.png', addedAt: 'Adicionado há 2 horas atrás' }],
    budget: 250,
    weight: 'Alto',
    score: 0,
    interactions: [
      { selected: true, name: 'Aline Macedo', role: 'Analista de Vendas', buyingFunction: 'Influenciador(a)' },
      { selected: false, name: 'Bruno Costa', role: 'Gerente de TI', buyingFunction: 'Decisor' },
      { selected: false, name: 'Carla Souza', role: 'Diretora Comercial', buyingFunction: 'Aprovador(a)' },
    ],
  },
  {
    id: 4,
    itemType: 'touchpoint',
    type: 'ATENÇÃO',
    title: 'Envio de vídeo por inbox',
    category: 'Engajamento',
    channel: 'LinkedIn',
    responsibles: ['Pedro Costa'],
    date: '20-01-2026',
    status: 'Em andamento',
    description: 'Enviar vídeo personalizado através do inbox do LinkedIn apresentando nossa solução.',
    subtasks: [],
    attachments: [],
    budget: 100,
    weight: 'Baixo',
    score: 5,
    interactions: [],
  },
];

const ABM_LINKEDIN_TOUCHPOINTS: Touchpoint[] = [
  {
    id: 1,
    itemType: 'touchpoint',
    type: 'AUTORIDADE',
    title: 'Conectar com decisores no LinkedIn',
    category: 'Autoridade',
    channel: 'LinkedIn',
    responsibles: ['João Silva'],
    date: '15-01-2026',
    status: 'Executado',
    description: 'Conectar com os principais stakeholders da conta-alvo no LinkedIn.',
    subtasks: [],
    attachments: [],
    budget: 0,
    weight: 'Médio',
    score: 8,
    interactions: [],
  },
  {
    id: 2,
    itemType: 'task',
    type: 'TASKPOINT',
    title: 'Mapear buying committee da conta',
    category: 'Pesquisa',
    channel: '-',
    responsibles: ['Carlos Mendes'],
    date: '17-01-2026',
    status: 'Executado',
    description: 'Mapear os papéis (decisor, influenciador, aprovador) dentro da conta-alvo.',
    subtasks: [
      { id: 'abm-st1', title: 'Identificar VP de Marketing', completed: true, assignee: 'Carlos Mendes', dueDate: '2026-01-16' },
      { id: 'abm-st2', title: 'Identificar CMO', completed: true, assignee: 'Carlos Mendes', dueDate: '2026-01-17' },
    ],
    attachments: [],
    budget: 0,
    weight: 'Médio',
    score: 0,
    interactions: [],
  },
  {
    id: 3,
    itemType: 'linkedin-ad',
    type: 'LINKEDIN_AD',
    title: 'Criar LinkedIn Ads para a conta-alvo',
    category: 'LinkedIn Ads',
    channel: 'LinkedIn Ads',
    responsibles: ['Maria Santos'],
    date: '22-01-2026',
    status: 'Em andamento',
    description:
      'Lançar campanha de LinkedIn Ads segmentada para os contatos e empresas relacionadas a esta play, criando awareness antes da abordagem direta.',
    subtasks: [],
    attachments: [],
    budget: 0,
    weight: 'Alto',
    score: 0,
    interactions: [],
    linkedinAd: { status: 'draft' },
  },
  {
    id: 4,
    itemType: 'touchpoint',
    type: 'ATENÇÃO',
    title: 'Follow-up por email após exposição ao anúncio',
    category: 'Relacionamento',
    channel: 'Email',
    responsibles: ['Pedro Costa'],
    date: '28-01-2026',
    status: 'Em andamento',
    description: 'Enviar email personalizado para os contatos que foram impactados pelo anúncio.',
    subtasks: [],
    attachments: [],
    budget: 0,
    weight: 'Médio',
    score: 0,
    interactions: [],
  },
];

export const PLAYS_MOCK: Record<string, PlayMock> = {
  'p1': {
    id: 'p1',
    accountId: '1',
    accountName: 'STAR BANK',
    name: 'Envio de proposta',
    dossierContaName: 'ODM ALERT',
    dossierContatoName: 'OPERATOR.CUR1',
    produtoName: 'Maestro ABM',
    gtmName: 'Consultoria Enterprise',
    touchpoints: STAR_BANK_TOUCHPOINTS,
  },
  'p-linkedin-ads': {
    id: 'p-linkedin-ads',
    accountId: '1',
    accountName: 'STAR BANK',
    name: 'Aquecimento ABM com LinkedIn Ads',
    dossierContaName: 'ODM ALERT',
    dossierContatoName: 'OPERATOR.CUR1',
    produtoName: 'Maestro ABM',
    gtmName: 'Consultoria Enterprise',
    touchpoints: ABM_LINKEDIN_TOUCHPOINTS,
  },
};

export function getPlayMock(playId: string): PlayMock | undefined {
  return PLAYS_MOCK[playId];
}
