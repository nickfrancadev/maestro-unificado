import { useEffect, useRef, useState } from 'react';
import { getAudienceCount } from '@/lib/linkedin';
import { buildTargetingCriteria, totalIncludes } from './targeting';
import type { TargetingData } from './types';

// Fast local approximation. Used during the 800ms debounce window so the
// audience number doesn't flicker to nothing every keystroke; the value is
// overwritten by the LinkedIn response as soon as it arrives. Not a stand-in
// for the API — if the API call fails, the stale local estimate stays on
// screen instead of resetting.
function localEstimate(data: TargetingData): number {
  let base = 50000;
  if (data.companies.included.length > 0)
    base = data.companies.included.length * 3200;
  if (data.locations.included.length > 0)
    base = Math.round(base * (0.3 + data.locations.included.length * 0.15));
  if (data.seniorities.included.length > 0 && data.seniorities.included.length < 5)
    base = Math.round(base * (data.seniorities.included.length * 0.12));
  if (data.jobFunctions.included.length > 0 && data.jobFunctions.included.length < 8)
    base = Math.round(base * (data.jobFunctions.included.length * 0.1));
  if (data.jobTitles.included.length > 0)
    base = Math.round(base * 0.15 * data.jobTitles.included.length);
  if (data.industries.included.length > 0)
    base = Math.round(base * (data.industries.included.length * 0.08));
  if (data.companySizes.included.length > 0)
    base = Math.round(base * (data.companySizes.included.length * 0.12));

  const totalExclusions = Object.values(data).reduce((s, sel) => s + sel.excluded.length, 0);
  if (totalExclusions > 0)
    base = Math.round(base * Math.max(0.3, 1 - totalExclusions * 0.05));

  return Math.max(50, base);
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

    const criteria = buildTargetingCriteria(data);
    const criteriaStr = JSON.stringify(criteria);

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
        const result = await getAudienceCount(criteria);
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
