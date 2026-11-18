// Regras da tela "Editar campanha publicada", em funções puras (testadas em
// publishedEdit.test.ts). A tela só desenha o que sai daqui; o servidor aplica
// as mesmas guardas (campaignEditGuards.ts, importado abaixo) antes de gravar.
//
// Modelo: um GRUPO de campanhas no LinkedIn = um lançamento do assistente. Cada
// empresa-alvo é uma campanha (conjunto) dentro do grupo, com orçamento e
// público próprios. As empresas do grupo são fixas.

import {
  buildTargetingCriteria,
  createEmptyPersonTargeting,
  isSamePersonTargeting,
  FACET_URN_MAP,
  PERSON_FACET_KEYS,
} from '../wizard/segmentation/targeting';
import type { FacetItem, FacetSelection, PersonTargeting } from '../wizard/segmentation/types';
import { SENIORITY_OPTIONS, JOB_FUNCTION_OPTIONS, EXPERIENCE_OPTIONS } from '../wizard/segmentation/linkedinFacets';
import { MIN_BUDGET_PER_AD_SET, OBJECTIVE_MAP } from '../wizard/types';
import { DAYS_PER_MONTH, daysInclusive, fmtDate, fmtMoney, spendStatement } from '../format';
import { plural } from '../labels';
import {
  EMPLOYERS_FACET,
  employerProblem,
  employersOf,
  tsToIsoDate,
  type UpdateRequest,
  type CampaignUpdateInput,
} from '../../../../supabase/functions/make-server-a4d5bbe0/campaignEditGuards';

export { MIN_BUDGET_PER_AD_SET };

/** Separador que o assistente usa entre a campanha e a empresa (buildLaunchPlan). */
export const NAME_SEPARATOR = ' — ';

export interface PublishedCompany {
  /** Id da campanha no LinkedIn (uma por empresa). */
  campaignId: string;
  /** Nome completo da campanha no LinkedIn: "<grupo> — <empresa>". */
  name: string;
  company: string;
  /** A empresa como faceta de público: `urn` é o employer que nunca sai. */
  employer: FacetItem;
  status: string;
  budget: number;
  /** "AAAA-MM-DD"; vazio = sem término (contínua). */
  endDate: string;
  targeting: PersonTargeting;
  /** targetingCriteria original. Facetas que a tela não edita são mantidas. */
  criteria: any;
}

export interface PublishedGroup {
  id: string;
  isMock: boolean;
  name: string;
  status: string;
  adAccountName: string;
  currency: string;
  budgetType: 'daily' | 'total';
  /** Teto do grupo no LinkedIn; null se o grupo não tiver teto. */
  groupBudget: number | null;
  /** Término do grupo no LinkedIn; vazio se o grupo não tiver. */
  groupEndDate: string;
  objective: string;
  costType: string;
  startDate: string;
  companies: PublishedCompany[];
}

/** O que o usuário está editando. Orçamentos como texto, como no campo. */
export interface EditState {
  groupName: string;
  endDate: string;
  budgets: Record<string, string>;
  targeting: Record<string, PersonTargeting>;
}

export function campaignNameFor(groupName: string, company: string): string {
  return `${groupName.trim()}${NAME_SEPARATOR}${company}`;
}

/** "Campanha X — Acme" → "Acme". Sem separador, o nome inteiro. */
export function companyFromName(name: string): string {
  const i = name.lastIndexOf(NAME_SEPARATOR);
  return i > 0 ? name.slice(i + NAME_SEPARATOR.length) : name;
}

/** "50", "50,5" ou "1.234,50" → número. Vazio ou inválido → NaN. */
export function parseBudget(s: string): number {
  const t = (s ?? '').trim();
  if (!t) return Number.NaN;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** Término comum do grupo (o das empresas; o publish usa o mesmo para todas). */
export function commonEndDate(g: PublishedGroup): string {
  return g.companies[0]?.endDate ?? '';
}

export function initialEditState(g: PublishedGroup): EditState {
  return {
    groupName: g.name,
    endDate: commonEndDate(g),
    budgets: Object.fromEntries(g.companies.map((c) => [c.campaignId, String(c.budget)])),
    targeting: Object.fromEntries(g.companies.map((c) => [c.campaignId, c.targeting])),
  };
}

// ---------------------------------------------------------------------------
// Público: critérios do LinkedIn <-> facetas da Segmentação
// ---------------------------------------------------------------------------

const FIXED_OPTIONS: Partial<Record<keyof PersonTargeting, FacetItem[]>> = {
  seniorities: SENIORITY_OPTIONS,
  jobFunctions: JOB_FUNCTION_OPTIONS,
  yearsOfExperience: EXPERIENCE_OPTIONS,
};

const FACET_KEY_BY_URN: Record<string, keyof PersonTargeting> = Object.fromEntries(
  PERSON_FACET_KEYS.map((k) => [FACET_URN_MAP[k], k]),
) as Record<string, keyof PersonTargeting>;

function itemFor(key: keyof PersonTargeting, urn: string, names: Record<string, string>): FacetItem {
  const fixed = FIXED_OPTIONS[key]?.find((o) => o.urn === urn);
  if (fixed) return fixed;
  const id = urn.split(':').pop() || urn;
  const fallback = key === 'locations' ? `Localização ${id}` : key === 'jobTitles' ? `Cargo ${id}` : id;
  return { id, label: names[urn] || fallback, urn };
}

/** targetingCriteria do LinkedIn → facetas de pessoa que a Segmentação edita. */
export function personTargetingFromCriteria(criteria: any, names: Record<string, string> = {}): PersonTargeting {
  const pt = createEmptyPersonTargeting();
  for (const clause of criteria?.include?.and ?? []) {
    for (const [facetUrn, urns] of Object.entries(clause?.or ?? {})) {
      const key = FACET_KEY_BY_URN[facetUrn];
      if (!key || !Array.isArray(urns)) continue;
      pt[key] = { ...pt[key], included: [...pt[key].included, ...urns.map((u) => itemFor(key, String(u), names))] };
    }
  }
  for (const [facetUrn, urns] of Object.entries(criteria?.exclude?.or ?? {})) {
    const key = FACET_KEY_BY_URN[facetUrn];
    if (!key || !Array.isArray(urns)) continue;
    pt[key] = { ...pt[key], excluded: [...pt[key].excluded, ...urns.map((u) => itemFor(key, String(u), names))] };
  }
  return pt;
}

const EDITABLE_FACETS = new Set<string>([EMPLOYERS_FACET, ...PERSON_FACET_KEYS.map((k) => FACET_URN_MAP[k])]);

/**
 * Público novo de uma empresa. A empresa (employer) entra SEMPRE, a partir da
 * própria campanha, e não da tela: não há caminho em que ela saia. Facetas que
 * a tela não edita (idioma da interface, por exemplo) são mantidas como
 * estavam no LinkedIn, em vez de sumirem sem ninguém ver.
 */
export function mergeCriteria(original: any, employer: FacetItem, person: PersonTargeting): any {
  const next = buildTargetingCriteria(employer, person);
  const keptAnd = (original?.include?.and ?? []).filter((clause: any) =>
    Object.keys(clause?.or ?? {}).every((f) => !EDITABLE_FACETS.has(f)),
  );
  if (keptAnd.length > 0) next.include = { and: [...(next.include?.and ?? []), ...keptAnd] };
  const keptExclude = Object.fromEntries(
    Object.entries(original?.exclude?.or ?? {}).filter(([f]) => !EDITABLE_FACETS.has(f)),
  );
  if (Object.keys(keptExclude).length > 0) next.exclude = { or: { ...(next.exclude?.or ?? {}), ...keptExclude } };
  return next;
}

/**
 * Garante a empresa no público antes de mandar. Devolve o problema em
 * português, ou null. É a mesma regra que o servidor aplica (422).
 */
export function ensureEmployer(criteria: any, c: Pick<PublishedCompany, 'employer' | 'company'>): string | null {
  return employerProblem(criteria, c.employer.urn ?? '', c.company);
}

const FACET_LABELS: Record<keyof PersonTargeting, string> = {
  locations: 'Localização',
  seniorities: 'Senioridade',
  jobFunctions: 'Função',
  jobTitles: 'Cargo',
  yearsOfExperience: 'Experiência',
};

/** Resumo curto dos critérios: "Brasil · Diretor, Vice-presidente · 2 cargos". */
export function targetingSummary(pt: PersonTargeting): string {
  const parts: string[] = [];
  for (const k of PERSON_FACET_KEYS) {
    const inc = pt[k].included;
    if (inc.length === 0) continue;
    if (inc.length <= 3) parts.push(inc.map((i) => i.label).join(', '));
    else parts.push(`${inc.length} ${FACET_LABELS[k].toLowerCase()}s`);
  }
  const exc = PERSON_FACET_KEYS.reduce((s, k) => s + pt[k].excluded.length, 0);
  if (exc > 0) parts.push(`${plural(exc, 'exclusão', 'exclusões')}`);
  return parts.length > 0 ? parts.join(' · ') : 'Todas as pessoas da empresa';
}

function selectionDiff(label: string, a: FacetSelection, b: FacetSelection): string | null {
  const ids = (l: FacetItem[]) => new Set(l.map((i) => i.id));
  const added = b.included.filter((i) => !ids(a.included).has(i.id)).map((i) => `+ ${i.label}`);
  const removed = a.included.filter((i) => !ids(b.included).has(i.id)).map((i) => `− ${i.label}`);
  const exAdded = b.excluded.filter((i) => !ids(a.excluded).has(i.id)).map((i) => `exclui ${i.label}`);
  const exRemoved = a.excluded.filter((i) => !ids(b.excluded).has(i.id)).map((i) => `volta ${i.label}`);
  const all = [...added, ...removed, ...exAdded, ...exRemoved];
  return all.length > 0 ? `${label}: ${all.join(', ')}` : null;
}

/** "Senioridade: + Gerente, − CXO" por faceta que mudou. */
export function targetingChanges(before: PersonTargeting, after: PersonTargeting): string[] {
  return PERSON_FACET_KEYS.map((k) => selectionDiff(FACET_LABELS[k], before[k], after[k])).filter((s): s is string => !!s);
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

export interface EditErrors {
  groupName?: string;
  endDate?: string;
  budgets: Record<string, string>;
}

/** Regras de campo. O término só é validado se mudou (um grupo já encerrado abre sem erro). */
export function editErrors(g: PublishedGroup, s: EditState, today: string): EditErrors {
  const errors: EditErrors = { budgets: {} };
  if (!s.groupName.trim()) errors.groupName = 'Dê um nome ao grupo';
  if (s.endDate !== commonEndDate(g) && s.endDate) {
    if (s.endDate < today) errors.endDate = 'O término não pode ser antes de hoje';
    else if (g.startDate && s.endDate < g.startDate) errors.endDate = 'O término não pode ser antes do início';
  }
  const kind = g.budgetType === 'daily' ? 'diário' : 'total';
  for (const c of g.companies) {
    const n = parseBudget(s.budgets[c.campaignId] ?? '');
    if (Number.isNaN(n)) errors.budgets[c.campaignId] = `Informe o orçamento ${kind} de ${c.company}`;
    else if (n < MIN_BUDGET_PER_AD_SET) errors.budgets[c.campaignId] = `O mínimo é ${MIN_BUDGET_PER_AD_SET} por empresa`;
  }
  return errors;
}

export function hasErrors(e: EditErrors): boolean {
  return !!e.groupName || !!e.endDate || Object.keys(e.budgets).length > 0;
}

export function targetingChanged(g: PublishedGroup, s: EditState, campaignId: string): boolean {
  const c = g.companies.find((x) => x.campaignId === campaignId);
  return !!c && !isSamePersonTargeting(c.targeting, s.targeting[campaignId] ?? c.targeting);
}

/**
 * Empresas que impedem salvar por público pequeno: as que estão abaixo de 300
 * E vão mandar público novo. Uma empresa que só muda orçamento não reenvia o
 * público, e o LinkedIn não o reavalia; ela aparece como aviso, não trava.
 */
export function audienceBlockers(g: PublishedGroup, s: EditState, smallIds: string[]): PublishedCompany[] {
  return g.companies.filter((c) => smallIds.includes(c.campaignId) && targetingChanged(g, s, c.campaignId));
}

// ---------------------------------------------------------------------------
// Diff (o que vai mudar, de → para) e payload
// ---------------------------------------------------------------------------

export interface FieldChange {
  label: string;
  from: string;
  to: string;
}

export interface CompanyDiff {
  campaignId: string;
  company: string;
  changes: FieldChange[];
}

export interface EditDiff {
  group: FieldChange[];
  companies: CompanyDiff[];
  hasChanges: boolean;
}

function fmtEnd(d: string): string {
  return d ? fmtDate(d) : 'sem término';
}

function budgetLabel(g: PublishedGroup): string {
  return g.budgetType === 'daily' ? 'Orçamento diário' : 'Orçamento total';
}

/** Soma do orçamento novo das empresas (o teto do grupo acompanha). */
export function newBudgetTotal(g: PublishedGroup, s: EditState): number {
  return g.companies.reduce((sum, c) => {
    const n = parseBudget(s.budgets[c.campaignId] ?? '');
    return sum + (Number.isNaN(n) ? c.budget : n);
  }, 0);
}

function groupChanges(g: PublishedGroup, s: EditState): { name?: string; budget?: number; end?: string | null } {
  const out: { name?: string; budget?: number; end?: string | null } = {};
  if (s.groupName.trim() !== g.name) out.name = s.groupName.trim();
  if (g.groupBudget != null) {
    const total = Math.round(newBudgetTotal(g, s) * 100) / 100;
    const anyBudget = g.companies.some((c) => parseBudget(s.budgets[c.campaignId] ?? '') !== c.budget);
    if (anyBudget && total !== g.groupBudget) out.budget = total;
  }
  // Grupo com término: acompanha o das empresas, senão ele corta a campanha.
  if (g.groupEndDate && s.endDate !== g.groupEndDate && s.endDate !== commonEndDate(g)) out.end = s.endDate || null;
  return out;
}

export function buildEditDiff(g: PublishedGroup, s: EditState): EditDiff {
  const money = (n: number) => fmtMoney(n, g.currency);
  const gc = groupChanges(g, s);
  const group: FieldChange[] = [];
  if (gc.name !== undefined) group.push({ label: 'Nome do grupo', from: g.name, to: gc.name });
  if (gc.budget !== undefined) {
    group.push({ label: g.budgetType === 'daily' ? 'Teto diário do grupo' : 'Teto total do grupo', from: money(g.groupBudget ?? 0), to: money(gc.budget) });
  }
  if (gc.end !== undefined) group.push({ label: 'Término do grupo', from: fmtEnd(g.groupEndDate), to: fmtEnd(gc.end ?? '') });

  const companies: CompanyDiff[] = [];
  for (const c of g.companies) {
    const changes: FieldChange[] = [];
    if (gc.name !== undefined) {
      const to = campaignNameFor(gc.name, c.company);
      if (to !== c.name) changes.push({ label: 'Nome no LinkedIn', from: c.name, to });
    }
    const b = parseBudget(s.budgets[c.campaignId] ?? '');
    if (!Number.isNaN(b) && b !== c.budget) changes.push({ label: budgetLabel(g), from: money(c.budget), to: money(b) });
    if (s.endDate !== c.endDate) changes.push({ label: 'Término', from: fmtEnd(c.endDate), to: fmtEnd(s.endDate) });
    const after = s.targeting[c.campaignId] ?? c.targeting;
    if (!isSamePersonTargeting(c.targeting, after)) {
      for (const line of targetingChanges(c.targeting, after)) {
        const [label, rest] = [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 2)];
        changes.push({ label: `Público · ${label}`, from: '', to: rest });
      }
    }
    if (changes.length > 0) companies.push({ campaignId: c.campaignId, company: c.company, changes });
  }
  return { group, companies, hasChanges: group.length > 0 || companies.length > 0 };
}

/**
 * Pedido para o servidor (POST /linkedin/campaigns/update). Só leva o que
 * mudou. Lança se algum público sair sem a empresa: essa linha não pode
 * existir, nem por engano de quem copiar a tela.
 */
export function buildUpdateRequest(g: PublishedGroup, s: EditState): UpdateRequest {
  const gc = groupChanges(g, s);
  const campaigns: CampaignUpdateInput[] = [];
  for (const c of g.companies) {
    const u: CampaignUpdateInput = { campaign_id: c.campaignId, company_name: c.company, employer_urn: c.employer.urn ?? '' };
    let changed = false;
    if (gc.name !== undefined) {
      const name = campaignNameFor(gc.name, c.company);
      if (name !== c.name) { u.name = name; changed = true; }
    }
    const b = parseBudget(s.budgets[c.campaignId] ?? '');
    if (!Number.isNaN(b) && b !== c.budget) { u.budget_amount = b; u.budget_type = g.budgetType; changed = true; }
    if (s.endDate !== c.endDate) { u.end_date = s.endDate || null; changed = true; }
    const after = s.targeting[c.campaignId] ?? c.targeting;
    if (!isSamePersonTargeting(c.targeting, after)) {
      const criteria = mergeCriteria(c.criteria, c.employer, after);
      const problem = ensureEmployer(criteria, c);
      if (problem) throw new Error(problem);
      u.targeting_criteria = criteria;
      changed = true;
    }
    if (changed) campaigns.push(u);
  }
  const req: UpdateRequest = { group_id: g.id, currency: g.currency, start_date: g.startDate || undefined, campaigns };
  if (gc.name !== undefined || gc.budget !== undefined || gc.end !== undefined) {
    req.group = {};
    if (gc.name !== undefined) req.group.name = gc.name;
    if (gc.budget !== undefined) { req.group.budget_amount = gc.budget; req.group.budget_type = g.budgetType; }
    if (gc.end !== undefined) req.group.end_date = gc.end;
  }
  return req;
}

// ---------------------------------------------------------------------------
// Gasto
// ---------------------------------------------------------------------------

/**
 * A frase de gasto do assistente (spendStatement). Com o mesmo valor em todas
 * as empresas, é exatamente a dele ("N empresas × Y"); com valores diferentes,
 * a soma vem escrita empresa a empresa não cabe, então diz "soma de N empresas".
 */
export function editSpendStatement(g: PublishedGroup, s: EditState): string {
  const values = g.companies.map((c) => {
    const n = parseBudget(s.budgets[c.campaignId] ?? '');
    return Number.isNaN(n) ? c.budget : n;
  });
  const n = values.length;
  const end = s.endDate;
  const uniform = values.every((v) => v === values[0]);
  if (uniform) {
    return spendStatement({ perAdSet: values[0] ?? 0, adSets: n, budgetType: g.budgetType, currency: g.currency, startDate: g.startDate, endDate: end }).headline;
  }
  const total = values.reduce((a, b) => a + b, 0);
  const who = `soma de ${plural(n, 'empresa')} com valores diferentes`;
  if (g.budgetType === 'total') return `Você vai gastar até ${fmtMoney(total, g.currency)} no total (${who}).`;
  return `Você vai gastar até ${fmtMoney(total, g.currency)} por dia (${who}), ≈ ${fmtMoney(total * DAYS_PER_MONTH, g.currency)} por mês.`;
}

export function periodDetail(startDate: string, endDate: string): string {
  if (!endDate) return 'Sem término: o gasto continua até você pausar a campanha.';
  const days = daysInclusive(startDate, endDate);
  return days ? `De ${fmtDate(startDate)} a ${fmtDate(endDate)} (${plural(days, 'dia')}).` : `Termina em ${fmtDate(endDate)}.`;
}

// ---------------------------------------------------------------------------
// Resultado do salvamento
// ---------------------------------------------------------------------------

export interface CampaignResult {
  campaign_id: string;
  success: boolean;
  error?: string;
}

export interface UpdateResponse {
  success: boolean;
  partial?: boolean;
  error?: string;
  group?: { success: boolean; error?: string } | null;
  results?: CampaignResult[];
}

/**
 * O que ficou gravado no LinkedIn passa a ser a nova base da tela. Empresas que
 * falharam continuam com o valor antigo na base: a edição delas segue na tela,
 * como alteração pendente, para tentar de novo.
 */
export function applySavedResults(g: PublishedGroup, req: UpdateRequest, res: UpdateResponse): PublishedGroup {
  const ok = new Set((res.results ?? []).filter((r) => r.success).map((r) => r.campaign_id));
  const groupOk = !req.group || !!res.group?.success;
  const next: PublishedGroup = { ...g };
  if (req.group && groupOk) {
    if (req.group.name !== undefined) next.name = req.group.name;
    if (req.group.budget_amount !== undefined) next.groupBudget = req.group.budget_amount;
    if (req.group.end_date !== undefined) next.groupEndDate = req.group.end_date ?? '';
  }
  next.companies = g.companies.map((c) => {
    const u = req.campaigns.find((x) => x.campaign_id === c.campaignId);
    if (!u || !ok.has(c.campaignId)) return c;
    return {
      ...c,
      name: u.name ?? c.name,
      budget: u.budget_amount ?? c.budget,
      endDate: u.end_date === undefined ? c.endDate : (u.end_date ?? ''),
      criteria: u.targeting_criteria ?? c.criteria,
      targeting: u.targeting_criteria ? personTargetingFromCriteria(u.targeting_criteria, namesOf(c)) : c.targeting,
    };
  });
  return next;
}

/** Nomes já conhecidos (para reconverter o público salvo sem perder rótulos). */
function namesOf(c: PublishedCompany): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of PERSON_FACET_KEYS) for (const i of [...c.targeting[k].included, ...c.targeting[k].excluded]) if (i.urn) out[i.urn] = i.label;
  return out;
}

/** Depois de salvar, quem foi gravado volta a mostrar a base (sem pendência). */
export function stateAfterSave(prev: EditState, saved: PublishedGroup): EditState {
  const targeting = { ...prev.targeting };
  for (const c of saved.companies) {
    if (isSamePersonTargeting(c.targeting, prev.targeting[c.campaignId] ?? c.targeting)) targeting[c.campaignId] = c.targeting;
  }
  return { ...prev, targeting };
}

// ---------------------------------------------------------------------------
// Dados: LinkedIn (edit-data do servidor) e demonstração
// ---------------------------------------------------------------------------

export interface EditDataResponse {
  group: {
    id: string;
    urn: string;
    name: string;
    status: string;
    runSchedule: { start?: number; end?: number } | null;
    dailyBudget: { amount: string; currencyCode: string } | null;
    totalBudget: { amount: string; currencyCode: string } | null;
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    dailyBudget: { amount: string; currencyCode: string } | null;
    totalBudget: { amount: string; currencyCode: string } | null;
    runSchedule: { start?: number; end?: number } | null;
    objectiveType: string | null;
    costType: string | null;
    targetingCriteria: any;
  }>;
  entityNames: Record<string, string>;
  adAccountName: string | null;
  currency: string;
}

const STATUS_FROM_API: Record<string, string> = {
  ACTIVE: 'Active', PAUSED: 'Paused', DRAFT: 'Draft', ARCHIVED: 'Completed', CANCELED: 'Canceled',
};

/** Resposta do servidor → grupo da tela. A empresa sai do próprio público. */
export function groupFromEditData(d: EditDataResponse): PublishedGroup {
  const budgetType: 'daily' | 'total' = d.campaigns.some((c) => c.totalBudget) && !d.campaigns.some((c) => c.dailyBudget) ? 'total' : 'daily';
  const companies: PublishedCompany[] = d.campaigns.map((c) => {
    const company = companyFromName(c.name);
    const employerUrn = employersOf(c.targetingCriteria)[0] ?? '';
    const budget = budgetType === 'total' ? c.totalBudget : c.dailyBudget;
    return {
      campaignId: c.id,
      name: c.name,
      company,
      employer: { id: c.id, label: company, urn: employerUrn },
      status: STATUS_FROM_API[c.status] ?? c.status,
      budget: budget ? Number(budget.amount) : 0,
      endDate: tsToIsoDate(c.runSchedule?.end ?? null),
      targeting: personTargetingFromCriteria(c.targetingCriteria, d.entityNames),
      criteria: c.targetingCriteria,
    };
  });
  const starts = d.campaigns.map((c) => c.runSchedule?.start).filter((n): n is number => n != null);
  const groupBudget = budgetType === 'total' ? d.group.totalBudget : d.group.dailyBudget;
  const first = d.campaigns[0];
  // Nome do grupo: o do LinkedIn; o prefixo das campanhas se ele vier vazio.
  const prefix = first && first.name.lastIndexOf(NAME_SEPARATOR) > 0 ? first.name.slice(0, first.name.lastIndexOf(NAME_SEPARATOR)) : '';
  return {
    id: d.group.id,
    isMock: false,
    name: d.group.name || prefix,
    status: aggregate(companies.map((c) => c.status)),
    adAccountName: d.adAccountName || 'Conta de anúncios',
    currency: d.currency,
    budgetType,
    groupBudget: groupBudget ? Number(groupBudget.amount) : null,
    groupEndDate: tsToIsoDate(d.group.runSchedule?.end ?? null),
    objective: first?.objectiveType ?? '',
    costType: first?.costType ?? '',
    startDate: starts.length ? tsToIsoDate(Math.min(...starts)) : '',
    companies,
  };
}

function aggregate(statuses: string[]): string {
  for (const s of ['Active', 'Paused', 'Draft', 'Completed', 'Canceled']) if (statuses.includes(s)) return s;
  return statuses[0] ?? '';
}

/** "BRAND_AWARENESS" → "Reconhecimento da marca". */
export function objectiveLabel(objective: string): string {
  return OBJECTIVE_MAP[objective.toLowerCase()]?.label ?? (objective || '—');
}

export function costTypeText(costType: string): string {
  switch (costType) {
    case 'CPM': return 'cobra por mil impressões (CPM)';
    case 'CPC': return 'cobra por clique (CPC)';
    case 'CPV': return 'cobra por visualização de vídeo (CPV)';
    default: return costType ? `cobra por ${costType}` : '';
  }
}
