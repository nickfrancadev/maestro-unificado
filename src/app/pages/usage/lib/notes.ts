/**
 * Inputs qualitativos (feedback Bernardo) — contexto que os números não
 * capturam: o que o cliente disse na call, verbatim de NPS, percepção de risco.
 *
 * Persistência em `localStorage` (protótipo sem backend): sobrevive ao reload,
 * não sai da máquina. Toda leitura/escrita é defensiva — storage indisponível
 * (SSR, privacidade, quota) degrada para memória vazia, nunca para crash.
 *
 * Datas em ISO string ancoradas em `TODAY` (o "agora" do mock): misturar o
 * relógio real com o mock faria uma nota recém-criada aparecer "em 44d".
 */
import { PILOT_COMPANY_ID, TODAY } from '../data/types';

export type QualiNoteKind = 'call' | 'email' | 'nps' | 'risk' | 'action' | 'other';

export interface QualiNote {
  id: string;
  /** ISO — ancorada no "agora" do mock. */
  at: string;
  author: string;
  kind: QualiNoteKind;
  text: string;
}

export const NOTE_KIND_LABEL: Record<QualiNoteKind, string> = {
  call: 'Ligação',
  email: 'E-mail',
  nps: 'NPS',
  risk: 'Risco',
  action: 'Ação do playbook',
  other: 'Outro',
};

const STORAGE_PREFIX = 'usage-quali-notes:';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function iso(daysAgo: number): string {
  return new Date(TODAY.getTime() - daysAgo * MS_PER_DAY).toISOString();
}

/** Notas de exemplo do piloto — o teste do layout novo não abre numa tela vazia. */
const PILOT_SEED: QualiNote[] = [
  {
    id: 'seed-1',
    at: iso(9),
    author: 'Marina Duarte',
    kind: 'call',
    text: 'Call de acompanhamento: time comercial satisfeito; pediram treinamento de CsPlay para o time de pós-venda.',
  },
  {
    id: 'seed-2',
    at: iso(23),
    author: 'Marina Duarte',
    kind: 'nps',
    text: 'NPS 9 — "o funil de touchpoints organizou nossa operação de expansão". Promotor: candidato a case.',
  },
];

function storageKey(companyId: string): string {
  return `${STORAGE_PREFIX}${companyId}`;
}

function read(companyId: string): QualiNote[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(companyId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QualiNote[]) : null;
  } catch {
    return null;
  }
}

function write(companyId: string, notes: QualiNote[]): void {
  try {
    window.localStorage.setItem(storageKey(companyId), JSON.stringify(notes));
  } catch {
    // storage indisponível: a sessão segue em memória (estado do componente)
  }
}

/** Notas da company, mais recente primeiro. O piloto nasce com o seed. */
export function loadNotes(companyId: string): QualiNote[] {
  const stored = read(companyId);
  if (stored !== null) return stored;
  return companyId === PILOT_COMPANY_ID ? PILOT_SEED : [];
}

/** Acrescenta uma nota (no topo) e devolve a lista atualizada. */
export function addNote(
  companyId: string,
  note: { author: string; kind: QualiNoteKind; text: string },
): QualiNote[] {
  const next: QualiNote[] = [
    {
      id: `note-${companyId}-${loadNotes(companyId).length + 1}-${note.text.length}`,
      at: TODAY.toISOString(),
      ...note,
    },
    ...loadNotes(companyId),
  ];
  write(companyId, next);
  return next;
}

/**
 * O botão de ação do card registra a ação disparada como nota — o playbook
 * (Spina) e o registro qualitativo (Bernardo) fecham o mesmo ciclo.
 */
export function recordAction(companyId: string, actionLabel: string): void {
  addNote(companyId, { author: 'Você', kind: 'action', text: actionLabel });
}
