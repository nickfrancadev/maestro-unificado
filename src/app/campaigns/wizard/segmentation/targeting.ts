// Pure helpers for the targeting state shape and the LinkedIn API
// payload it serializes to. No state, no I/O.

import type { FacetItem, FacetSelection, TargetingData } from './types';

export const EMPTY_ITEMS: FacetItem[] = [];

export function emptySelection(): FacetSelection {
  return { included: [], excluded: [] };
}

export function createEmptyTargeting(): TargetingData {
  return {
    companies: emptySelection(),
    locations: emptySelection(),
    seniorities: emptySelection(),
    jobFunctions: emptySelection(),
    jobTitles: emptySelection(),
    industries: emptySelection(),
    companySizes: emptySelection(),
    yearsOfExperience: emptySelection(),
  };
}

export function countSelections(sel: FacetSelection) {
  return { inc: sel.included.length, exc: sel.excluded.length };
}

export function totalIncludes(data: TargetingData): number {
  return Object.values(data).reduce(
    (sum, sel) => sum + sel.included.length,
    0,
  );
}

// Maps state field names to the LinkedIn API facet URNs they target.
export const FACET_URN_MAP: Record<keyof TargetingData, string> = {
  companies: 'urn:li:adTargetingFacet:employers',
  locations: 'urn:li:adTargetingFacet:locations',
  seniorities: 'urn:li:adTargetingFacet:seniorities',
  jobFunctions: 'urn:li:adTargetingFacet:jobFunctions',
  jobTitles: 'urn:li:adTargetingFacet:titles',
  industries: 'urn:li:adTargetingFacet:industries',
  companySizes: 'urn:li:adTargetingFacet:staffCountRanges',
  yearsOfExperience: 'urn:li:adTargetingFacet:yearsOfExperience',
};

// Builds the targetingCriteria payload LinkedIn's adCampaigns API
// expects, with include/exclude clauses derived from the wizard state.
export function buildTargetingCriteria(data: TargetingData): any {
  const includeAnd: any[] = [];
  const excludeOr: Record<string, string[]> = {};

  for (const [key, sel] of Object.entries(data) as Array<[keyof TargetingData, FacetSelection]>) {
    const facetUrn = FACET_URN_MAP[key];
    if (!facetUrn) continue;

    if (sel.included.length > 0) {
      const urns = sel.included.map((item) => item.urn || '').filter(Boolean);
      if (urns.length > 0) {
        includeAnd.push({ or: { [facetUrn]: urns } });
      }
    }

    if (sel.excluded.length > 0) {
      const urns = sel.excluded.map((item) => item.urn || '').filter(Boolean);
      if (urns.length > 0) {
        excludeOr[facetUrn] = urns;
      }
    }
  }

  const criteria: any = {};
  if (includeAnd.length > 0) {
    criteria.include = { and: includeAnd };
  }
  if (Object.keys(excludeOr).length > 0) {
    criteria.exclude = { or: excludeOr };
  }
  return criteria;
}
