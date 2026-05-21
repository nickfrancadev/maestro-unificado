import { useEffect, useRef, useState } from 'react';
import { linkedInTypeahead } from '@/lib/linkedin';
import { projectId } from '@/utils/supabase/info';
import type { FacetItem } from './types';

export type LinkedInFacetType = 'companies' | 'locations' | 'titles' | 'industries';

const LOGO_PROXY_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0/logo-proxy`;

// Real-time typeahead against the LinkedIn ad-targeting entities API.
// Returns whatever the LinkedIn API responds with — empty array on no
// results or on error. There is no offline fallback: if the API is
// unreachable, the dropdown shows "0 resultados" instead of fake data.
export function useLinkedInTypeahead(facetType: LinkedInFacetType) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FacetItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const apiResults = await linkedInTypeahead(query, facetType);
        const mapped: FacetItem[] = (apiResults || []).map((r: any) => {
          const urn = r.urn || '';
          const orgId = urn.split(':').pop() || '';
          const name = r.name || '';

          if (facetType === 'companies') {
            const nameLower = name.toLowerCase().replace(/\s+/g, '');
            // Server-side logo proxy bypasses CORS (Clearbit → Google Favicons)
            const proxyLogoUrl = `${LOGO_PROXY_BASE}?domain=${encodeURIComponent(nameLower + '.com')}`;
            return {
              id: orgId || urn || String(Math.random()),
              label: name,
              urn,
              subtitle: '',
              domain: '',
              logoUrl: proxyLogoUrl,
              employeeCount: undefined,
              industry: '',
            };
          }
          return {
            id: orgId || urn || String(Math.random()),
            label: name,
            urn,
          };
        });

        setResults(mapped.slice(0, 15));
        setIsOpen(mapped.length > 0);
      } catch (err) {
        console.warn(`[Typeahead ${facetType}] API error:`, err);
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, facetType]);

  return {
    query,
    setQuery,
    results,
    isOpen,
    setIsOpen,
    isLoading,
  };
}
