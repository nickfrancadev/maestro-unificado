// Guardas puras da edição de campanha publicada (POST /linkedin/campaigns/update).
// Sem Deno nem npm de propósito: roda no Vitest (campaignEditGuards.test.ts) e
// é importado também pelo front (src/app/campaigns/edit/publishedEdit.ts), para
// a tela e o servidor recusarem exatamente as mesmas coisas.
//
// Mensagens em português simples: elas chegam até a tela como estão.

/** Faceta de empresa no targetingCriteria do LinkedIn. */
export const EMPLOYERS_FACET = 'urn:li:adTargetingFacet:employers';

/**
 * Orçamento mínimo por empresa (conjunto), igual ao do assistente
 * (MIN_BUDGET_PER_AD_SET em src/app/campaigns/wizard/types.ts). O teste
 * compara os dois para não divergirem.
 */
export const MIN_BUDGET_PER_COMPANY = 10;

/** Empresas (URNs) que o público inclui. Ignora o que estiver em `exclude`. */
export function employersOf(criteria: any): string[] {
  const clauses: any[] = criteria?.include?.and ?? [];
  const urns: string[] = [];
  for (const clause of clauses) {
    const list = clause?.or?.[EMPLOYERS_FACET];
    if (Array.isArray(list)) urns.push(...list.map(String));
  }
  return [...new Set(urns)];
}

/**
 * O público precisa continuar restrito à empresa da campanha. Sem a faceta de
 * empresa, o LinkedIn entrega para todo mundo que bate nos outros critérios
 * (foi assim que o produto real ampliou uma campanha para o Brasil inteiro).
 * Com outra empresa junto, o anúncio vaza para quem não é o alvo.
 */
export function employerProblem(criteria: any, employerUrn: string, companyName = 'esta empresa'): string | null {
  if (!criteria || typeof criteria !== 'object') {
    return `O público de ${companyName} veio vazio. Nada foi enviado ao LinkedIn.`;
  }
  const employers = employersOf(criteria);
  if (employers.length === 0) {
    return `O público de ${companyName} perdeu o filtro de empresa e passaria a mostrar o anúncio para qualquer pessoa com os outros critérios. Nada foi enviado ao LinkedIn.`;
  }
  if (!employers.includes(employerUrn)) {
    return `O público de ${companyName} não inclui mais ${companyName}. Para anunciar para outra empresa, crie outra campanha.`;
  }
  if (employers.length > 1) {
    return `O público de ${companyName} inclui outras empresas além dela. Cada campanha anuncia para uma empresa só.`;
  }
  const excluded: string[] = criteria?.exclude?.or?.[EMPLOYERS_FACET] ?? [];
  if (excluded.map(String).includes(employerUrn)) {
    return `O público de ${companyName} exclui a própria empresa. Nada foi enviado ao LinkedIn.`;
  }
  return null;
}

/** "AAAA-MM-DD" válida. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Término no LinkedIn: o FIM do dia escolhido (23:59:59 UTC). A campanha roda
 * o último dia inteiro, e "terminar hoje" não vira um horário que já passou.
 */
export function endOfDayTs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 23, 59, 59, 0);
}

/** Timestamp do LinkedIn → "AAAA-MM-DD" (UTC, o mesmo fuso de endOfDayTs). */
export function tsToIsoDate(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '';
  return new Date(ts).toISOString().slice(0, 10);
}

/** Hoje em "AAAA-MM-DD" no fuso de São Paulo (o do anunciante). */
export function todayIso(now: Date = new Date(), timeZone = 'America/Sao_Paulo'): string {
  return now.toLocaleDateString('en-CA', { timeZone });
}

/** Mudança pedida para UMA campanha (uma empresa). Campo ausente = não muda. */
export interface CampaignUpdateInput {
  campaign_id: string;
  company_name?: string;
  /** Empresa da campanha. O servidor confere com a do LinkedIn antes de gravar. */
  employer_urn: string;
  name?: string;
  budget_type?: 'daily' | 'total';
  budget_amount?: number;
  /** "AAAA-MM-DD" muda; null tira o término (contínua); ausente não muda. */
  end_date?: string | null;
  targeting_criteria?: any;
}

export interface GroupUpdateInput {
  name?: string;
  end_date?: string | null;
  budget_type?: 'daily' | 'total';
  /** Teto do grupo: a soma do orçamento das empresas. */
  budget_amount?: number;
}

export interface UpdateRequest {
  group_id: string;
  currency: string;
  /** Início da campanha ("AAAA-MM-DD"), só para validar o término. Não muda. */
  start_date?: string;
  group?: GroupUpdateInput;
  campaigns: CampaignUpdateInput[];
}

export interface CampaignProblems {
  campaign_id: string;
  company_name: string;
  problems: string[];
}

function budgetProblem(amount: unknown, who: string): string | null {
  const n = typeof amount === 'number' ? amount : Number.NaN;
  if (!Number.isFinite(n)) return `Informe o orçamento de ${who}.`;
  if (n < MIN_BUDGET_PER_COMPANY) return `O orçamento de ${who} está abaixo do mínimo de ${MIN_BUDGET_PER_COMPANY} por empresa.`;
  return null;
}

function endDateProblem(end: string | null | undefined, start: string | undefined, today: string): string | null {
  if (end === undefined || end === null) return null;
  if (!isIsoDate(end)) return 'A data de término é inválida.';
  if (end < today) return 'O término não pode ser antes de hoje.';
  if (start && isIsoDate(start) && end < start) return 'O término não pode ser antes do início.';
  return null;
}

/**
 * Tudo o que dá para recusar sem ir ao LinkedIn. Lista vazia = pode seguir.
 * Qualquer problema recusa o pedido inteiro (422) e nada é gravado.
 */
export function validateUpdateRequest(req: UpdateRequest, today: string): { general: string[]; campaigns: CampaignProblems[] } {
  const general: string[] = [];
  if (!req || typeof req !== 'object') return { general: ['Pedido vazio.'], campaigns: [] };
  if (!req.group_id) general.push('Falta o grupo de campanhas.');
  if (!Array.isArray(req.campaigns)) general.push('Falta a lista de empresas.');
  if (req.group?.name !== undefined && !String(req.group.name).trim()) general.push('Dê um nome ao grupo.');
  const groupEnd = endDateProblem(req.group?.end_date, req.start_date, today);
  if (groupEnd) general.push(groupEnd);
  if (req.group?.budget_amount !== undefined) {
    const n = req.group.budget_amount;
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) general.push('O teto do grupo é inválido.');
  }

  const campaigns: CampaignProblems[] = [];
  for (const c of Array.isArray(req.campaigns) ? req.campaigns : []) {
    const who = c.company_name || 'esta empresa';
    const problems: string[] = [];
    if (!c.campaign_id) problems.push('Falta o id da campanha.');
    if (!c.employer_urn) problems.push(`Falta a empresa da campanha de ${who}.`);
    if (c.name !== undefined && !String(c.name).trim()) problems.push(`O nome da campanha de ${who} está vazio.`);
    if (c.budget_amount !== undefined) {
      const p = budgetProblem(c.budget_amount, who);
      if (p) problems.push(p);
    }
    const end = endDateProblem(c.end_date, req.start_date, today);
    if (end) problems.push(end);
    if (c.targeting_criteria !== undefined && c.employer_urn) {
      const p = employerProblem(c.targeting_criteria, c.employer_urn, who);
      if (p) problems.push(p);
    }
    if (problems.length > 0) campaigns.push({ campaign_id: c.campaign_id, company_name: who, problems });
  }
  return { general, campaigns };
}

/**
 * Corpo do PARTIAL_UPDATE de /rest/adCampaigns/{urn}. Só leva o que mudou.
 * O término vai como patch aninhado em runSchedule para não reenviar o início
 * (que não muda depois de publicada). null em end_date tira o término.
 * Devolve null se não houver nada a mudar.
 */
export function buildCampaignPatch(c: CampaignUpdateInput, currency: string): any | null {
  const set: Record<string, any> = {};
  if (c.name !== undefined) set.name = c.name;
  if (c.budget_amount !== undefined) {
    const key = c.budget_type === 'total' ? 'totalBudget' : 'dailyBudget';
    set[key] = { amount: c.budget_amount.toFixed(2), currencyCode: currency };
  }
  if (c.targeting_criteria !== undefined) set.targetingCriteria = c.targeting_criteria;
  const patch: Record<string, any> = {};
  if (Object.keys(set).length > 0) patch.$set = set;
  if (c.end_date !== undefined) {
    patch.runSchedule = c.end_date === null ? { $delete: ['end'] } : { $set: { end: endOfDayTs(c.end_date) } };
  }
  return Object.keys(patch).length > 0 ? { patch } : null;
}

/** Corpo do PARTIAL_UPDATE de /rest/adCampaignGroups/{urn}. Null sem mudança. */
export function buildGroupPatch(g: GroupUpdateInput | undefined, currency: string): any | null {
  if (!g) return null;
  const set: Record<string, any> = {};
  if (g.name !== undefined) set.name = g.name;
  if (g.budget_amount !== undefined) {
    const key = g.budget_type === 'total' ? 'totalBudget' : 'dailyBudget';
    set[key] = { amount: g.budget_amount.toFixed(2), currencyCode: currency };
  }
  const patch: Record<string, any> = {};
  if (Object.keys(set).length > 0) patch.$set = set;
  if (g.end_date !== undefined) {
    patch.runSchedule = g.end_date === null ? { $delete: ['end'] } : { $set: { end: endOfDayTs(g.end_date) } };
  }
  return Object.keys(patch).length > 0 ? { patch } : null;
}

/**
 * Confere o pedido contra a campanha COMO ESTÁ no LinkedIn: ela é do grupo e
 * o público novo mantém a mesma empresa. O front não é a fonte da verdade da
 * empresa; se ele mandar outra `employer_urn`, a campanha real decide.
 */
export function liveCampaignProblem(
  live: { campaignGroup?: string | null; targetingCriteria?: any } | null,
  update: CampaignUpdateInput,
  groupUrn: string,
): string | null {
  const who = update.company_name || 'esta empresa';
  if (!live) return `Não foi possível ler a campanha de ${who} no LinkedIn. Nada foi mudado nela.`;
  if (live.campaignGroup && live.campaignGroup !== groupUrn) {
    return `A campanha de ${who} não é deste grupo. Nada foi mudado nela.`;
  }
  const liveEmployers = employersOf(live.targetingCriteria);
  if (liveEmployers.length > 0 && !liveEmployers.includes(update.employer_urn)) {
    return `A empresa de ${who} no LinkedIn é outra. Recarregue a página antes de salvar.`;
  }
  if (update.targeting_criteria !== undefined) {
    const expected = liveEmployers.length === 1 ? liveEmployers[0] : update.employer_urn;
    return employerProblem(update.targeting_criteria, expected, who);
  }
  return null;
}
