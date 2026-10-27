import { useEffect, useRef, useState } from 'react';
import { getAudienceCount } from '@/lib/linkedin';
import {
  buildTargetingCriteria,
  totalIncludes,
  PERSON_FACET_KEYS,
} from './targeting';
import type { PersonTargeting, TargetingData } from './types';

// Fast local approximation. Used during the 800ms debounce window so the
// audience number doesn't flicker to nothing every keystroke; the value is
// overwritten by the LinkedIn response as soon as it arrives. Not a stand-in
// for the API — if the API call fails, the stale local estimate stays on
// screen instead of resetting.
//
// Each account is its own ad set, so the estimate sums a per-account
// approximation. The person facets used per account are the effective ones
// (override if present, otherwise the default).
function personMultiplier(pt: PersonTargeting): number {
  let m = 1;
  if (pt.locations.included.length > 0)
    m *= 0.3 + pt.locations.included.length * 0.15;
  if (pt.seniorities.included.length > 0 && pt.seniorities.included.length < 5)
    m *= pt.seniorities.included.length * 0.12;
  if (pt.jobFunctions.included.length > 0 && pt.jobFunctions.included.length < 8)
    m *= pt.jobFunctions.included.length * 0.1;
  if (pt.jobTitles.included.length > 0)
    m *= 0.15 * pt.jobTitles.included.length;
  if (pt.yearsOfExperience.included.length > 0)
    m *= 0.4 + pt.yearsOfExperience.included.length * 0.05;
  const exclusions = PERSON_FACET_KEYS.reduce((s, k) => s + pt[k].excluded.length, 0);
  if (exclusions > 0) m *= Math.max(0.3, 1 - exclusions * 0.05);
  return m;
}

/** Mínimo de membros que o LinkedIn aceita por conjunto de anúncio. */
export const MIN_AUDIENCE = 300;

export interface AdSetAudience {
  id: string;
  label: string;
  count: number;
  isFromApi: boolean;
  /** API devolveu 0: o LinkedIn esconde públicos abaixo de 300. */
  isPrivacyFloor: boolean;
}

/** Conjuntos que o LinkedIn recusaria por público pequeno. */
export function smallAdSets(perAdSet: AdSetAudience[]): AdSetAudience[] {
  return perAdSet.filter((a) => a.isPrivacyFloor || a.count < MIN_AUDIENCE);
}

function localAccountEstimate(pt: PersonTargeting): number {
  return Math.max(50, Math.round(3200 * personMultiplier(pt)));
}

function localDefaultEstimate(data: TargetingData): number {
  // No accounts yet: estimate from the default person facets alone.
  return Math.max(50, Math.round(50000 * personMultiplier(data.defaultTargeting)));
}

export function useAudienceCount(data: TargetingData) {
  const [perAdSet, setPerAdSet] = useState<AdSetAudience[]>([]);
  const [defaultCount, setDefaultCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCriteriaRef = useRef<string>('');

  const hasAnySelection = totalIncludes(data) > 0;

  useEffect(() => {
    if (!hasAnySelection) {
      setPerAdSet([]);
      setDefaultCount(null);
      setIsLoading(false);
      lastCriteriaRef.current = '';
      return;
    }

    const accounts = data.companies.included;
    // One criteria object per account ad set: debounce cache key and API input.
    const allCriteria = accounts.map((acc) =>
      buildTargetingCriteria(acc, data.overrides[acc.id] ?? data.defaultTargeting),
    );
    const criteriaStr = JSON.stringify([allCriteria, data.defaultTargeting]);

    if (criteriaStr === lastCriteriaRef.current) return;
    lastCriteriaRef.current = criteriaStr;

    const local: AdSetAudience[] = accounts.map((acc) => ({
      id: acc.id,
      label: acc.label,
      count: localAccountEstimate(data.overrides[acc.id] ?? data.defaultTargeting),
      isFromApi: false,
      isPrivacyFloor: false,
    }));
    setPerAdSet(local);
    setDefaultCount(accounts.length === 0 ? localDefaultEstimate(data) : null);
    if (accounts.length === 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      // Uma consulta por conjunto: cada conjunto vai ao ar com a própria
      // segmentação, então o mínimo de 300 vale para cada um, não para a soma.
      const results = await Promise.all(
        allCriteria.map((criteria, i): Promise<AdSetAudience> =>
          getAudienceCount(criteria)
            .then((result) => {
              if (result.count === null || result.count === undefined) return local[i];
              // LinkedIn returns total=0 as a privacy floor when the real
              // audience is < 300. Showing "0" is misleading, so keep the local
              // estimate and flag the floor.
              if (result.count === 0) return { ...local[i], isPrivacyFloor: true };
              return { ...local[i], count: result.count, isFromApi: true };
            })
            .catch((err) => {
              console.warn('[AudienceCount] API error, keeping local estimate:', err);
              return local[i];
            }),
        ),
      );
      if (lastCriteriaRef.current !== criteriaStr) return;
      setPerAdSet(results);
      setIsLoading(false);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [data, hasAnySelection]);

  const count = perAdSet.length > 0 ? perAdSet.reduce((s, a) => s + a.count, 0) : defaultCount;
  const isFromApi = perAdSet.length > 0 && perAdSet.every((a) => a.isFromApi);
  const isPrivacyFloor = perAdSet.some((a) => a.isPrivacyFloor);

  return { count, perAdSet, isLoading, isFromApi, isPrivacyFloor, hasAnySelection };
}
