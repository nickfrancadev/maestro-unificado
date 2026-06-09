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

function localEstimate(data: TargetingData): number {
  const accounts = data.companies.included;
  if (accounts.length === 0) {
    // No accounts yet: estimate from the default person facets alone.
    return Math.max(50, Math.round(50000 * personMultiplier(data.defaultTargeting)));
  }
  const total = accounts.reduce((sum, acc) => {
    const pt = data.overrides[acc.id] ?? data.defaultTargeting;
    return sum + 3200 * personMultiplier(pt);
  }, 0);
  return Math.max(50, Math.round(total));
}

// One criteria object per account ad set; used as the debounce cache key and
// for the API call (the first account stands in for the API estimate).
function buildAllCriteria(data: TargetingData): any[] {
  return data.companies.included.map((acc) =>
    buildTargetingCriteria(acc, data.overrides[acc.id] ?? data.defaultTargeting),
  );
}

export function useAudienceCount(data: TargetingData) {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromApi, setIsFromApi] = useState(false);
  const [isPrivacyFloor, setIsPrivacyFloor] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCriteriaRef = useRef<string>('');

  const hasAnySelection = totalIncludes(data) > 0;

  useEffect(() => {
    if (!hasAnySelection) {
      setCount(null);
      setIsFromApi(false);
      setIsPrivacyFloor(false);
      setIsLoading(false);
      lastCriteriaRef.current = '';
      return;
    }

    const allCriteria = buildAllCriteria(data);
    const criteriaStr = JSON.stringify(allCriteria);

    if (criteriaStr === lastCriteriaRef.current) return;
    lastCriteriaRef.current = criteriaStr;

    const localValue = localEstimate(data);
    setCount(localValue);
    setIsFromApi(false);
    setIsPrivacyFloor(false);
    setIsLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        // Representative API call: query the first ad set's criteria. The
        // sidebar shows an aggregate local estimate; a per-ad-set API
        // breakdown is a follow-up (see plan: batching out of scope).
        const apiCriteria = allCriteria[0];
        if (!apiCriteria) {
          setIsLoading(false);
          return;
        }
        const result = await getAudienceCount(apiCriteria);
        if (result.count !== null && result.count !== undefined) {
          // LinkedIn returns total=0 as a privacy floor when the real audience
          // is < 300. Showing "0" is misleading because the audience can still
          // be served — it's just below the disclosure threshold. When this
          // happens, fall back to the local estimate (clamped) and mark the
          // result as privacy-floored so the UI can communicate that.
          if (result.count === 0) {
            setCount(Math.max(localValue, 300));
            setIsFromApi(false);
            setIsPrivacyFloor(true);
          } else {
            setCount(result.count);
            setIsFromApi(true);
            setIsPrivacyFloor(false);
          }
        }
      } catch (err) {
        console.warn('[AudienceCount] API error, keeping local estimate:', err);
      } finally {
        setIsLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [data, hasAnySelection]);

  return { count, isLoading, isFromApi, isPrivacyFloor, hasAnySelection };
}
