/**
 * Mock determinístico do portfólio de clientes do Maestro.
 *
 * Sem `Math.random()`: um PRNG com seed fixo (mulberry32) garante que a tela é
 * idêntica em todo reload. Todas as datas ancoram em `TODAY`.
 */
import type {
  Company,
  LateTouchpointEmail,
  Period,
  Play,
  PlayType,
  Profile,
  Touchpoint,
  TouchpointType,
  User,
} from './types';
import { TODAY } from './types';

// Re-export por compatibilidade: as constantes vivem em `types.ts` para que
// `lib/` não precise importar este módulo (e executar o gerador) para lê-las.
export { PILOT_COMPANY_ID, TODAY } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Período padrão da tela: últimos 30 dias. */
export const DEFAULT_PERIOD: Period = {
  start: new Date(TODAY.getTime() - 29 * MS_PER_DAY),
  end: TODAY,
};

/**
 * Hash determinístico de string (FNV-1a, 32 bits) — semente estável a partir de
 * um id. Serve para sortear algo NOVO sem consumir o `rng` principal (o que
 * deslocaria toda a sequência já semeada).
 */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG determinístico (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function daysBefore(days: number, jitterHours = 0, rng?: Rng): Date {
  const jitter = rng ? Math.floor(rng() * jitterHours) : 0;
  return new Date(TODAY.getTime() - days * MS_PER_DAY - jitter * 3600_000);
}

const PLAY_TYPES: readonly PlayType[] = ['PrePlay', 'SalesPlay', 'CsPlay', 'OneToFewPlay'];

const TOUCHPOINT_TYPES: readonly TouchpointType[] = [
  'Relacionamento',
  'Atenção',
  'Autoridade',
  'Encantamento',
  'Descoberta',
  'Engajamento',
  'Negociação',
];

const CHANNELS: readonly string[] = [
  'LinkedIn',
  'Email',
  'Ligação',
  'WhatsApp',
  'Presencial',
  'Instagram',
  'SMS',
  'Site',
];

const PLANS: readonly string[] = ['Starter', 'Growth', 'Enterprise'];

const PROFILES: readonly Profile[] = ['ADMIN', 'AGENCY', 'EDITOR', 'VIEWER'];

const FIRST_NAMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Eduarda',
  'Felipe',
  'Gabriela',
  'Henrique',
  'Isabela',
  'João',
  'Karina',
  'Lucas',
  'Mariana',
  'Nicolas',
  'Olívia',
  'Paulo',
  'Renata',
  'Rodrigo',
  'Sofia',
  'Thiago',
  'Vanessa',
  'Wagner',
] as const;

const LAST_NAMES = [
  'Silva',
  'Souza',
  'Oliveira',
  'Costa',
  'Pereira',
  'Almeida',
  'Ferreira',
  'Rodrigues',
  'Carvalho',
  'Barbosa',
  'Ribeiro',
  'Martins',
] as const;

const PLAY_VERBS = [
  'Expansão',
  'Prospecção',
  'Retenção',
  'Reativação',
  'Onboarding',
  'Upsell',
  'Cross-sell',
  'Renovação',
] as const;

const PLAY_TARGETS = [
  'Enterprise',
  'Mid-Market',
  'Varejo',
  'Indústria',
  'Fintech',
  'Agro',
  'Saúde',
  'Educação',
  'Logística',
  'Q3',
] as const;

type ProfileKind = 'ghost' | 'hoarder' | 'hostage' | 'declining' | 'healthy' | 'watch';

interface CompanySeed {
  name: string;
  slug: string;
  kind: ProfileKind;
}

/** 24 companies. Distribuição pensada para os 4 buckets ficarem povoados. */
const SEEDS: readonly CompanySeed[] = [
  // Fantasmas (2) → critical
  { name: 'Construtora Vale Verde', slug: 'valeverde', kind: 'ghost' },
  { name: 'Rede Farmacêutica Bonsaúde', slug: 'bonsaude', kind: 'ghost' },
  // Acumuladores (2) → critical / at_risk
  { name: 'Transportadora Aurora', slug: 'aurora', kind: 'hoarder' },
  { name: 'Metalúrgica Ipiranga', slug: 'ipiranga', kind: 'hoarder' },
  // Reféns (2) → at_risk
  { name: 'Seguradora Pantanal', slug: 'pantanal', kind: 'hostage' },
  { name: 'Agro Cerrado Insumos', slug: 'cerrado', kind: 'hostage' },
  // Em queda (2) → at_risk / watch
  { name: 'Educacional Horizonte', slug: 'horizonte', kind: 'declining' },
  { name: 'Grupo Têxtil Marajó', slug: 'marajo', kind: 'declining' },
  // Atenção (8) → watch
  { name: 'Logística Serra Azul', slug: 'serraazul', kind: 'watch' },
  { name: 'Banco Cooperativo Guará', slug: 'guara', kind: 'watch' },
  { name: 'Clínica Vitalis', slug: 'vitalis', kind: 'watch' },
  { name: 'Distribuidora Piratini', slug: 'piratini', kind: 'watch' },
  // Saudáveis (10) → healthy
  { name: 'Fintech Solaris', slug: 'solaris', kind: 'healthy' },
  { name: 'Software Ubatuba', slug: 'ubatuba', kind: 'healthy' },
  { name: 'Varejo Bom Preço Digital', slug: 'bompreco', kind: 'healthy' },
  { name: 'Indústria Guanabara', slug: 'guanabara', kind: 'healthy' },
  { name: 'Consultoria Tramontina Tech', slug: 'tramontinatech', kind: 'healthy' },
  { name: 'Energia Renovável Caatinga', slug: 'caatinga', kind: 'healthy' },
  { name: 'Telecom Araucária', slug: 'araucaria', kind: 'healthy' },
  { name: 'Alimentos Serra Gaúcha', slug: 'serragaucha', kind: 'healthy' },
  { name: 'Imobiliária Novo Porto', slug: 'novoporto', kind: 'healthy' },
  { name: 'Hospital Rede Ypê', slug: 'ype', kind: 'healthy' },
  { name: 'Marketing Amazônia Digital', slug: 'amazoniadigital', kind: 'healthy' },
  { name: 'Automotiva Pampulha', slug: 'pampulha', kind: 'healthy' },
];

interface KindConfig {
  users: number;
  /** plays criadas dentro dos últimos 30d */
  playsCurrent: [number, number];
  /** plays criadas nos 30d anteriores */
  playsPrevious: [number, number];
  /** touchpoints por play */
  tpsPerPlay: [number, number];
  /** fração das plays do período que fecham */
  closeRate: number;
  /** fração dos touchpoints já finalizados */
  tpCloseRate: number;
  /** fração dos touchpoints em aberto que estão vencidos */
  lateRate: number;
  /**
   * Fração dos touchpoints FECHADOS que foi resolvida com atraso (venceu, ficou
   * dias vencida, depois finalizou). Não conta como "atrasado" hoje — é o
   * histórico que dispara os e-mails automáticos de cobrança.
   */
  finishedLateRate: number;
  /** interações / contatos envolvidos */
  interactionRate: number;
  /** dias desde o último acesso do usuário mais ativo */
  accessDays: [number, number];
  /**
   * Janela (em dias atrás) em que as plays do período atual são criadas.
   * Clientes que estagnaram concentram a criação no início do período — é isso
   * que faz a "última atividade" deles envelhecer e a recência cair.
   */
  currentWindow: [number, number];
  /** Janela (em dias atrás) das plays do período anterior. */
  previousWindow: [number, number];
  /** share do usuário principal */
  topShare: number;
  /** usuários que nunca acessaram */
  neverAccessed: number;
}

const KIND_CONFIG: Record<ProfileKind, KindConfig> = {
  // O fantasma: sumiu. Último acesso e última atividade > 40 dias atrás.
  ghost: {
    users: 4,
    playsCurrent: [0, 0],
    playsPrevious: [3, 5],
    tpsPerPlay: [2, 4],
    closeRate: 0,
    tpCloseRate: 0,
    lateRate: 1,
    finishedLateRate: 0.6,
    interactionRate: 0.05,
    accessDays: [45, 70],
    currentWindow: [1, 28],
    previousWindow: [46, 75], // sumiu: nada nos últimos 45 dias
    topShare: 1,
    neverAccessed: 2,
  },
  // O acumulador: abre plays sem parar e nunca fecha nenhuma. Movimento
  // recente existe, mas nada converte — e o ritmo já está caindo.
  hoarder: {
    users: 4,
    // O brief pede "15-30 plays criadas" no período — antes o mock semeava 8-10
    // e o teste "provava" o perfil olhando `plays.length` (TODAS as plays, das
    // duas janelas), o que mascarava o sub-seeding.
    playsCurrent: [16, 20],
    playsPrevious: [24, 28],
    tpsPerPlay: [3, 5],
    closeRate: 0, // ZERO plays fechadas — endDate: null em todas
    tpCloseRate: 0.05,
    lateRate: 0.95,
    finishedLateRate: 0.7,
    interactionRate: 0.08,
    accessDays: [11, 16],
    currentWindow: [10, 28], // parou de mexer há ~10d
    previousWindow: [31, 58],
    topShare: 0.85,
    neverAccessed: 1,
  },
  // O refém: 1 usuário responde por >90% de tudo; os demais assentos nunca
  // foram usados.
  hostage: {
    users: 5,
    playsCurrent: [5, 7],
    playsPrevious: [11, 13],
    tpsPerPlay: [4, 6],
    closeRate: 0.15,
    tpCloseRate: 0.25,
    lateRate: 0.75,
    finishedLateRate: 0.6,
    interactionRate: 0.22,
    accessDays: [12, 18],
    currentWindow: [12, 28],
    previousWindow: [31, 58],
    topShare: 0.97, // >90% da atividade num único usuário
    neverAccessed: 4,
  },
  // O em queda: volume das últimas 4 semanas ~1/3 das 4 anteriores.
  declining: {
    users: 4,
    playsCurrent: [3, 3],
    playsPrevious: [9, 10],
    tpsPerPlay: [4, 6],
    closeRate: 0.3,
    tpCloseRate: 0.35,
    lateRate: 0.6,
    finishedLateRate: 0.5,
    interactionRate: 0.3,
    accessDays: [8, 12],
    currentWindow: [8, 28],
    previousWindow: [31, 58],
    topShare: 0.55,
    neverAccessed: 1,
  },
  // "Atenção": ainda mexe, mas a execução é morna — fecha pouco, atrasa muito e
  // as pessoas do outro lado quase não respondem. Antes o mock configurava um
  // closeRate de 0.3 que na prática nunca se materializava (o lag de
  // fechamento caía no futuro e a play ficava aberta); com o mock corrigido, os
  // números precisam ser explicitamente mornos, e não acidentalmente ruins.
  watch: {
    users: 4,
    playsCurrent: [5, 7],
    playsPrevious: [9, 11],
    tpsPerPlay: [4, 6],
    closeRate: 0.22,
    tpCloseRate: 0.3,
    lateRate: 0.6,
    finishedLateRate: 0.45,
    interactionRate: 0.32,
    accessDays: [5, 8],
    currentWindow: [5, 28],
    previousWindow: [31, 58],
    topShare: 0.5,
    neverAccessed: 0,
  },
  healthy: {
    users: 5,
    playsCurrent: [7, 10],
    playsPrevious: [6, 9],
    tpsPerPlay: [5, 8],
    closeRate: 0.65, // ≥50% das plays fechadas
    tpCloseRate: 0.85,
    lateRate: 0.08,
    finishedLateRate: 0.3,
    interactionRate: 0.78,
    accessDays: [0, 2], // acesso nos últimos 3 dias
    currentWindow: [1, 28],
    previousWindow: [31, 58],
    topShare: 0.38, // distribuído entre 3+ usuários
    neverAccessed: 0,
  },
};

function makeUsers(rng: Rng, seed: CompanySeed, cfg: KindConfig): User[] {
  const users: User[] = [];
  const used = new Set<string>();
  for (let i = 0; i < cfg.users; i++) {
    let first = pick(rng, FIRST_NAMES);
    let last = pick(rng, LAST_NAMES);
    let local = `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let guard = 0;
    while (used.has(local) && guard++ < 20) {
      first = pick(rng, FIRST_NAMES);
      last = pick(rng, LAST_NAMES);
      local = `${first}.${last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    used.add(local);

    const neverAccessed = i >= cfg.users - cfg.neverAccessed;
    const profile: Profile = i === 0 ? 'ADMIN' : pick(rng, PROFILES.slice(1));

    // Usuário 0 é o mais recente; os demais decaem.
    const accessDays = neverAccessed
      ? null
      : randInt(rng, cfg.accessDays[0], cfg.accessDays[1]) + i * randInt(rng, 0, 3);

    users.push({
      id: `${seed.slug}-u${i + 1}`,
      name: `${first} ${last}`,
      email: `${local}@${seed.slug}.com.br`,
      profile,
      lastAccessAt: accessDays === null ? null : daysBefore(accessDays, 12, rng),
      lastActivityAt: null, // preenchido depois, derivado dos eventos
    });
  }
  return users;
}

/**
 * Distribui `count` itens entre os usuários respeitando `topShare` para o
 * usuário 0 e repartindo o resto entre os usuários que já acessaram.
 */
function assignOwner(rng: Rng, users: User[], cfg: KindConfig): User {
  const eligible = users.filter((u) => u.lastAccessAt !== null);
  const pool = eligible.length > 0 ? eligible : [users[0]];
  if (pool.length === 1) return pool[0];
  if (rng() < cfg.topShare) return pool[0];
  const rest = pool.slice(1);
  return rest[Math.floor(rng() * rest.length)];
}

function makeTouchpoints(
  rng: Rng,
  playId: string,
  playCreatedAt: Date,
  playClosed: boolean,
  owner: User,
  users: User[],
  cfg: KindConfig,
  floorDays: number,
): Touchpoint[] {
  const n = randInt(rng, cfg.tpsPerPlay[0], cfg.tpsPerPlay[1]);
  const tps: Touchpoint[] = [];
  const createdDaysAgo = Math.round((TODAY.getTime() - playCreatedAt.getTime()) / MS_PER_DAY);

  for (let i = 0; i < n; i++) {
    // Touchpoint nasce até 6d depois do play, mas nunca no futuro.
    const offset = randInt(rng, 0, 6);
    const tpDaysAgo = Math.max(floorDays, createdDaysAgo - offset);
    const createdAt = daysBefore(tpDaysAgo, 10, rng);

    const closed = playClosed ? rng() < Math.max(cfg.tpCloseRate, 0.8) : rng() < cfg.tpCloseRate;
    // dueDate vencida (passado) para os que sobram em aberto → touchpoint atrasado.
    const late = !closed && rng() < cfg.lateRate;
    const dueDays = late ? Math.max(0, tpDaysAgo - randInt(rng, 2, 6)) : -randInt(rng, 2, 10);

    const endDate = closed
      ? new Date(
          Math.min(
            TODAY.getTime(),
            createdAt.getTime() + randInt(rng, 1, 8) * MS_PER_DAY,
          ),
        )
      : null;

    /**
     * Parte dos touchpoints FECHADOS foi resolvida com atraso: venceu, ficou
     * alguns dias vencida e só então foi finalizada.
     *
     * Sem isso, todo touchpoint fechado nascia com `dueDate` no futuro e nenhuma
     * conta jamais tinha histórico de atraso — o cliente saudável não gerava um
     * único e-mail automático de "touchpoints atrasados", e o card do novo dado
     * abria vazio para sempre. Atraso resolvido é o caso mais comum de todos, e
     * é exatamente o que esses e-mails cobram.
     *
     * NÃO altera nenhuma métrica da tela: "atrasado" (`isLate`) exige
     * `endDate === null`, então um touchpoint já finalizado nunca entra na
     * contagem, tenha vencido antes ou não.
     *
     * O sorteio usa um PRNG PRÓPRIO (semeado pelo id do play): consumir o `rng`
     * principal deslocaria toda a sequência seguinte e mudaria os dados já
     * semeados de todas as companies.
     */
    const lateRng = mulberry32(hashSeed(`${playId}-tp${i + 1}`));
    const finishedLate = endDate !== null && lateRng() < cfg.finishedLateRate;
    const dueDate =
      endDate !== null && finishedLate
        ? new Date(
            // vencida de 1 a 8 dias antes de ser finalizada, nunca antes de nascer
            Math.max(
              createdAt.getTime() + MS_PER_DAY,
              endDate.getTime() - randInt(lateRng, 1, 8) * MS_PER_DAY,
            ),
          )
        : new Date(TODAY.getTime() - dueDays * MS_PER_DAY);

    const contactsInvolved = randInt(rng, 2, 6);
    const interactions = Math.min(
      contactsInvolved,
      Math.round(contactsInvolved * cfg.interactionRate + (rng() < 0.3 ? 1 : 0)),
    );

    // Responsáveis: o dono + eventualmente um colega (respeitando concentração).
    const responsibles = [owner.email];
    if (rng() > cfg.topShare) {
      const helper = assignOwner(rng, users, cfg);
      if (helper.email !== owner.email) responsibles.push(helper.email);
    }

    tps.push({
      id: `${playId}-tp${i + 1}`,
      type: pick(rng, TOUCHPOINT_TYPES),
      channel: pick(rng, CHANNELS),
      responsibles,
      createdAt,
      dueDate,
      endDate,
      contactsInvolved,
      interactions,
    });
  }
  return tps;
}

function makePlays(
  rng: Rng,
  seed: CompanySeed,
  users: User[],
  cfg: KindConfig,
  window: 'current' | 'previous',
  startIndex: number,
): Play[] {
  const [lo, hi] = window === 'current' ? cfg.playsCurrent : cfg.playsPrevious;
  const [wLo, wHi] = window === 'current' ? cfg.currentWindow : cfg.previousWindow;
  const count = randInt(rng, lo, hi);
  const plays: Play[] = [];

  for (let i = 0; i < count; i++) {
    const createdDaysAgo = randInt(rng, wLo, wHi);
    const createdAt = daysBefore(createdDaysAgo, 12, rng);

    const owner = assignOwner(rng, users, cfg);
    const closed = rng() < cfg.closeRate;

    const startDate = new Date(createdAt.getTime() + MS_PER_DAY);
    const expectedEndDate = new Date(createdAt.getTime() + randInt(rng, 14, 40) * MS_PER_DAY);

    // Fecha entre 2 e 25 dias após a criação, nunca no futuro. O teto é o tempo
    // que de fato passou: sortear um lag maior que a idade da play a deixaria
    // silenciosamente aberta, e o `closeRate` efetivo despencaria para bem
    // abaixo do configurado justamente nas plays recentes (as dos clientes
    // saudáveis). Aqui o lag é sorteado dentro do que é fisicamente possível.
    const ageDays = Math.floor((TODAY.getTime() - createdAt.getTime()) / MS_PER_DAY);
    const maxLag = Math.min(25, ageDays);
    const endDate =
      closed && maxLag >= 2
        ? new Date(createdAt.getTime() + randInt(rng, 2, maxLag) * MS_PER_DAY)
        : null;

    const id = `${seed.slug}-p${startIndex + i + 1}`;
    const type = pick(rng, PLAY_TYPES);

    plays.push({
      id,
      name: `${pick(rng, PLAY_VERBS)} ${pick(rng, PLAY_TARGETS)}`,
      type,
      ownerEmail: owner.email,
      createdAt,
      startDate,
      expectedEndDate,
      endDate,
      archived: false,
      touchpoints: makeTouchpoints(
        rng,
        id,
        createdAt,
        endDate !== null,
        owner,
        users,
        cfg,
        wLo,
      ),
      contactsInvolved: randInt(rng, 3, 12),
      saleClosed: endDate !== null ? rng() < 0.55 : undefined,
    });
  }
  return plays;
}

/** Deriva `lastActivityAt` de cada usuário a partir dos eventos reais. */
function deriveActivity(users: User[], plays: Play[]): void {
  const byEmail = new Map<string, number>();
  const bump = (email: string, t: number) => {
    const cur = byEmail.get(email);
    if (cur === undefined || t > cur) byEmail.set(email, t);
  };
  for (const p of plays) {
    bump(p.ownerEmail, p.createdAt.getTime());
    if (p.endDate) bump(p.ownerEmail, p.endDate.getTime());
    for (const tp of p.touchpoints) {
      for (const r of tp.responsibles) {
        bump(r, tp.createdAt.getTime());
        if (tp.endDate) bump(r, tp.endDate.getTime());
      }
    }
  }
  for (const u of users) {
    const t = byEmail.get(u.email);
    u.lastActivityAt = t === undefined ? null : new Date(t);
  }
}

/** CSMs da carteira (mock — viria do CRM). Atribuição round-robin determinística. */
export const CSMS = [
  'Marina Duarte',
  'Rafael Pinto',
  'Camila Nogueira',
  'Otávio Ramos',
] as const;

/** Próximo aniversário anual de `onboardedAt` estritamente depois de `today`. */
function nextAnniversary(onboardedAt: Date, today: Date): Date {
  const r = new Date(onboardedAt.getTime());
  while (r.getTime() <= today.getTime()) {
    r.setUTCFullYear(r.getUTCFullYear() + 1);
  }
  return r;
}

/** Engajamento com os e-mails automáticos, por perfil (taxas de abertura/clique). */
const EMAIL_ENGAGEMENT: Record<ProfileKind, { open: number; click: number }> = {
  ghost: { open: 0.05, click: 0 },
  hoarder: { open: 0.25, click: 0.05 },
  hostage: { open: 0.3, click: 0.1 },
  declining: { open: 0.35, click: 0.1 },
  watch: { open: 0.5, click: 0.2 },
  healthy: { open: 0.62, click: 0.34 },
};

/** Faixas de mock por perfil para os campos de CRM/suporte (não instrumentados). */
const CS_FIELDS: Record<
  ProfileKind,
  { contactDays: [number, number]; tickets: [number, number]; nps: [number, number] | null }
> = {
  ghost: { contactDays: [30, 60], tickets: [0, 1], nps: null }, // sumiu: nem NPS responde
  hoarder: { contactDays: [15, 45], tickets: [1, 4], nps: [4, 7] },
  hostage: { contactDays: [15, 45], tickets: [1, 5], nps: [3, 6] },
  declining: { contactDays: [10, 35], tickets: [0, 3], nps: [3, 6] },
  watch: { contactDays: [7, 25], tickets: [0, 3], nps: [6, 8] },
  healthy: { contactDays: [2, 15], tickets: [0, 2], nps: [8, 10] },
};

/**
 * E-mails automáticos de touchpoints atrasados (novo dado — feedback Bernardo).
 *
 * Digest SEMANAL das últimas 9 semanas (cobre o período padrão e o anterior,
 * para o Δ ter base). Cada envio é derivado do estado real da base NAQUELA
 * data: um touchpoint estava vencido na semana W se já tinha nascido, o prazo
 * já havia passado e ele ainda não fora finalizado.
 *
 * É por isso que uma conta saudável TAMBÉM recebe esses e-mails: ela resolve os
 * atrasos (e por isso hoje mostra "0 atrasados"), mas resolveu depois de ser
 * cobrada. Olhar só para o presente esconderia justamente o que o e-mail fez.
 *
 * Semana sem nada vencido não gera envio — o produto não manda cobrança vazia.
 */
function makeLateTpEmails(
  rng: Rng,
  seed: CompanySeed,
  kind: ProfileKind,
  users: User[],
  plays: Play[],
): LateTouchpointEmail[] {
  const touchpoints = plays.flatMap((p) => p.touchpoints);
  const recipients = users.filter((u) => u.lastAccessAt !== null).length || 1;
  const { open, click } = EMAIL_ENGAGEMENT[kind];

  const out: LateTouchpointEmail[] = [];
  for (let week = 0; week < 9; week++) {
    const sentAt = daysBefore(week * 7);
    const at = sentAt.getTime();

    const overdueCount = touchpoints.filter(
      (tp) =>
        tp.createdAt.getTime() <= at &&
        tp.dueDate.getTime() < at &&
        (tp.endDate === null || tp.endDate.getTime() > at),
    ).length;
    if (overdueCount === 0) continue;

    const opens = Math.min(recipients, Math.round(recipients * open + (rng() < 0.4 ? 1 : 0)));
    const clicks = Math.min(opens, Math.round(opens * click + (rng() < 0.2 ? 1 : 0)));
    out.push({
      id: `${seed.slug}-ltp-email-${week + 1}`,
      sentAt,
      recipients,
      opens,
      clicks,
      overdueCount,
    });
  }
  return out;
}

function makeCompany(seedIndex: number, seed: CompanySeed): Company {
  const rng = mulberry32(0x9e3779b9 + seedIndex * 7919);
  const cfg = KIND_CONFIG[seed.kind];

  const users = makeUsers(rng, seed, cfg);
  const previous = makePlays(rng, seed, users, cfg, 'previous', 0);
  const current = makePlays(rng, seed, users, cfg, 'current', previous.length);
  const plays = [...previous, ...current];

  deriveActivity(users, plays);

  const seats = users.length + randInt(rng, 0, 3);
  const plan = seats >= 7 ? 'Enterprise' : seats >= 5 ? 'Growth' : pick(rng, PLANS);
  const mrr =
    plan === 'Enterprise'
      ? randInt(rng, 22, 40) * 1000
      : plan === 'Growth'
        ? randInt(rng, 8, 22) * 1000
        : randInt(rng, 2, 8) * 1000;

  const accountsCount = randInt(rng, 18, 90);
  const contactsCount = accountsCount * randInt(rng, 2, 5);
  const dossiersCount = Math.round(accountsCount * (0.3 + rng() * 0.7));

  const onboardedAt = daysBefore(randInt(rng, 90, 900), 0);

  // PRNG PRÓPRIO para os campos novos de CS: adicionar sorteios ao `rng`
  // principal deslocaria TODOS os valores já semeados (plays, datas, nomes) e
  // mudaria a tela inteira num commit que só deveria acrescentar campos.
  const csRng = mulberry32(0x51f0a1 + seedIndex * 104729);
  const cs = CS_FIELDS[seed.kind];

  return {
    id: seed.slug,
    name: seed.name,
    plan,
    seats,
    onboardedAt,
    mrr,
    users,
    plays,
    accountsCount,
    contactsCount,
    dossiersCount,
    renewalAt: nextAnniversary(onboardedAt, TODAY),
    csm: CSMS[seedIndex % CSMS.length],
    lastCsContactAt: daysBefore(randInt(csRng, cs.contactDays[0], cs.contactDays[1]), 12, csRng),
    openTickets: randInt(csRng, cs.tickets[0], cs.tickets[1]),
    nps: cs.nps === null ? null : randInt(csRng, cs.nps[0], cs.nps[1]),
    lateTouchpointEmails: makeLateTpEmails(csRng, seed, seed.kind, users, plays),
  };
}

export const COMPANIES: Company[] = SEEDS.map((seed, i) => makeCompany(i, seed));

export function getCompany(id: string): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}
