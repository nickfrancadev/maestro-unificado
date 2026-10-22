// Pure helpers for the targeting state shape and the LinkedIn API
// payload it serializes to. No state, no I/O.

import type {
  FacetItem,
  FacetSelection,
  PersonTargeting,
  TargetingData,
} from './types';

export const EMPTY_ITEMS: FacetItem[] = [];

export function emptySelection(): FacetSelection {
  return { included: [], excluded: [] };
}

export function createEmptyPersonTargeting(): PersonTargeting {
  return {
    locations: emptySelection(),
    seniorities: emptySelection(),
    jobFunctions: emptySelection(),
    jobTitles: emptySelection(),
    yearsOfExperience: emptySelection(),
  };
}

export function createEmptyTargeting(): TargetingData {
  return {
    companies: emptySelection(),
    defaultTargeting: createEmptyPersonTargeting(),
    overrides: {},
  };
}

// Facetas de pessoa que compõem um PersonTargeting (ordem de exibição).
export const PERSON_FACET_KEYS: Array<keyof PersonTargeting> = [
  'locations',
  'seniorities',
  'jobFunctions',
  'jobTitles',
  'yearsOfExperience',
];

// Retorna o targeting efetivo de uma conta: override se existir, senão o padrão.
export function resolveTargetingForAccount(
  data: TargetingData,
  accountId: string,
): PersonTargeting {
  return data.overrides[accountId] ?? data.defaultTargeting;
}

export function countSelections(sel: FacetSelection) {
  return { inc: sel.included.length, exc: sel.excluded.length };
}

// Total de critérios incluídos: contas + facetas do padrão + facetas de cada override.
export function totalIncludes(data: TargetingData): number {
  const personSum = (pt: PersonTargeting) =>
    PERSON_FACET_KEYS.reduce((s, k) => s + pt[k].included.length, 0);
  return (
    data.companies.included.length +
    personSum(data.defaultTargeting) +
    Object.values(data.overrides).reduce((s, pt) => s + personSum(pt), 0)
  );
}

// Maps facet field names to the LinkedIn API facet URNs they target.
export const FACET_URN_MAP: Record<'companies' | keyof PersonTargeting, string> = {
  companies: 'urn:li:adTargetingFacet:employers',
  locations: 'urn:li:adTargetingFacet:locations',
  seniorities: 'urn:li:adTargetingFacet:seniorities',
  jobFunctions: 'urn:li:adTargetingFacet:jobFunctions',
  jobTitles: 'urn:li:adTargetingFacet:titles',
  yearsOfExperience: 'urn:li:adTargetingFacet:yearsOfExperience',
};

// Builds the targetingCriteria payload LinkedIn's adCampaigns API expects
// for a SINGLE ad set (one account + its effective person facets).
export function buildTargetingCriteria(
  account: FacetItem,
  person: PersonTargeting,
): any {
  const includeAnd: any[] = [];
  const excludeOr: Record<string, string[]> = {};

  const pushFacet = (facetUrn: string, sel: FacetSelection) => {
    if (sel.included.length > 0) {
      const urns = sel.included.map((i) => i.urn || '').filter(Boolean);
      if (urns.length > 0) includeAnd.push({ or: { [facetUrn]: urns } });
    }
    if (sel.excluded.length > 0) {
      const urns = sel.excluded.map((i) => i.urn || '').filter(Boolean);
      if (urns.length > 0) excludeOr[facetUrn] = urns;
    }
  };

  // The account itself becomes the employer facet for this ad set.
  if (account.urn) {
    includeAnd.push({ or: { [FACET_URN_MAP.companies]: [account.urn] } });
  }
  for (const key of PERSON_FACET_KEYS) {
    pushFacet(FACET_URN_MAP[key], person[key]);
  }

  const criteria: any = {};
  if (includeAnd.length > 0) criteria.include = { and: includeAnd };
  if (Object.keys(excludeOr).length > 0) criteria.exclude = { or: excludeOr };
  return criteria;
}

// Duas seleções são equivalentes quando incluem e excluem os mesmos itens
// (por id), independente da ordem em que foram clicados.
function sameItems(a: FacetItem[], b: FacetItem[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((i) => i.id));
  return b.every((i) => ids.has(i.id));
}

export function isSameSelection(a: FacetSelection, b: FacetSelection): boolean {
  return sameItems(a.included, b.included) && sameItems(a.excluded, b.excluded);
}

export function isSamePersonTargeting(a: PersonTargeting, b: PersonTargeting): boolean {
  return PERSON_FACET_KEYS.every((k) => isSameSelection(a[k], b[k]));
}

// Edita uma faceta do conjunto de anúncio de uma conta. Na primeira
// divergência cria o override (semeado a partir do padrão). Se depois da
// edição o override voltar a ser igual ao padrão, ele é removido — a conta
// deixa de aparecer como "personalizado".
export function setAccountFacet(
  data: TargetingData,
  accountId: string,
  facetKey: keyof PersonTargeting,
  sel: FacetSelection,
): TargetingData {
  const base = data.overrides[accountId] ?? data.defaultTargeting;
  const next: PersonTargeting = { ...base, [facetKey]: sel };
  const overrides = { ...data.overrides };
  if (isSamePersonTargeting(next, data.defaultTargeting)) {
    delete overrides[accountId];
  } else {
    overrides[accountId] = next;
  }
  return { ...data, overrides };
}
