import { useEffect, useRef, useState } from 'react';
import { linkedInTypeahead } from '@/lib/linkedin';
import { projectId } from '@/utils/supabase/info';
import type { FacetItem } from './types';

export type LinkedInFacetType = 'companies' | 'locations' | 'titles' | 'industries';

// Estado explícito da busca, para a UI distinguir "nada encontrado" de
// "a API falhou" em vez de só fechar o dropdown em silêncio.
export type TypeaheadStatus = 'idle' | 'loading' | 'empty' | 'error' | 'results';

const LOGO_PROXY_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0/logo-proxy`;

// Real-time typeahead against the LinkedIn ad-targeting entities API.
// Returns whatever the LinkedIn API responds with. There is no offline
// fallback: sem resultado, `status` vira 'empty'; com erro, 'error' — e o
// dropdown continua aberto para a UI mostrar a mensagem certa em vez de dados falsos.
export function useLinkedInTypeahead(facetType: LinkedInFacetType) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FacetItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<TypeaheadStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      setStatus('idle');
      return;
    }

    setIsLoading(true);
    setStatus('loading');

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
        setStatus(mapped.length > 0 ? 'results' : 'empty');
        setIsOpen(true);
      } catch (err) {
        console.warn(`[Typeahead ${facetType}] API error:`, err);
        setResults([]);
        setStatus('error');
        setIsOpen(true);
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
    status,
  };
}
