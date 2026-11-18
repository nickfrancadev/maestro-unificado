import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { FacetSelection, FacetItem } from './segmentation/types';

// O site confirmado da empresa (domínio) chega pelo enriquecimento do LinkedIn.
// Ele roda no hover da linha da busca e de novo depois do clique. Quando o
// hover já tinha terminado, o clique ia pelo cache e lia a seleção ANTIGA: o
// domínio nunca entrava no rascunho, e o Criativo dizia "Não achamos o site".

const inter: FacetItem = {
  id: '123', label: 'Inter', urn: 'urn:li:organization:123', domain: '', logoUrl: undefined,
};

vi.mock('@/lib/linkedin', () => ({
  enrichOrganization: vi.fn(async () => ({ domain: 'inter.co', location: 'Belo Horizonte, BR', logo_url: null })),
  fetchSimilarEntities: vi.fn(async () => []),
  fetchOrgLogos: vi.fn(async () => ({})),
  logoDevUrl: vi.fn(() => undefined),
}));

// Referência estável: um array novo a cada render dispara efeitos em laço.
const typeahead = vi.hoisted(() => ({ value: null as any }));
vi.mock('./segmentation/useLinkedInTypeahead', () => ({
  useLinkedInTypeahead: () => typeahead.value,
}));

import { CompanyHeroCard } from './SegmentationStep';

typeahead.value = {
  query: 'inter', setQuery: () => {}, results: [inter], isOpen: true, setIsOpen: () => {}, isLoading: false, status: 'results',
};

let latest: FacetSelection;
function Harness() {
  const [sel, setSel] = useState<FacetSelection>({ included: [], excluded: [] });
  latest = sel;
  return <CompanyHeroCard selection={sel} onSelectionChange={(s) => { latest = s; setSel(s); }} />;
}

describe('Segmentação: site confirmado da empresa', () => {
  beforeEach(() => { latest = { included: [], excluded: [] }; });

  it('grava o domínio quando o enriquecimento terminou no hover, antes do clique', async () => {
    render(<Harness />);
    const row = screen.getAllByRole('button').find((b) => b.textContent?.includes('Inter'))!;
    await act(async () => { fireEvent.mouseEnter(row); });
    // Espera o enriquecimento do hover terminar (a linha passa a mostrar o site).
    await waitFor(() => expect(screen.getAllByText(/inter\.co/).length).toBeGreaterThan(0));
    await act(async () => { fireEvent.click(row); });
    await waitFor(() => expect(latest.included[0]?.domain).toBe('inter.co'));
  });

  it('grava o domínio quando o clique vem antes do enriquecimento', async () => {
    render(<Harness />);
    const row = screen.getAllByRole('button').find((b) => b.textContent?.includes('Inter'))!;
    await act(async () => { fireEvent.click(row); });
    await waitFor(() => expect(latest.included[0]?.domain).toBe('inter.co'));
  });
});
