import { describe, it, expect, beforeEach } from 'vitest';
import { saveDraft, getDraft, deleteDraft, listDrafts, newDraftId, isDraftId } from './drafts';
import type { WizardDraftState } from './drafts';
import { createEmptyTargeting } from './wizard/SegmentationStep';
import { createDefaultCampaignConfig, createDefaultCreativeData } from './wizard/types';
import { createEmptyBriefDraft } from './wizard/BriefStep';

// Os testes `.ts` rodam em Node: um localStorage em memória basta.
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
});

/** Estado com tudo que o produto perde ao reabrir: imagem, textos na imagem, produto/público/persona e segmentação por empresa. */
function fullState(): WizardDraftState {
  const nubank = { id: 'c1', label: 'Nubank', urn: 'urn:li:organization:1', domain: 'nubank.com.br' };
  const inter = { id: 'c2', label: 'Inter', urn: 'urn:li:organization:2' };
  const t = createEmptyTargeting();
  const brasil = { id: 'urn:li:geo:106057199', label: 'Brasil' };
  const sp = { id: 'urn:li:geo:104746682', label: 'São Paulo' };
  const creative = createDefaultCreativeData();
  return {
    campaignConfig: { ...createDefaultCampaignConfig(), campaignName: 'Q4 ABM fintechs', budgetAmount: '25', objective: 'website_visits', endDate: '2026-12-31' },
    targetingData: {
      ...t,
      companies: { included: [nubank, inter], excluded: [] },
      defaultTargeting: { ...t.defaultTargeting, locations: { included: [brasil], excluded: [] } },
      // Inter tem segmentação própria: só São Paulo e só diretores.
      overrides: {
        c2: {
          ...t.defaultTargeting,
          locations: { included: [sp], excluded: [] },
          seniorities: { included: [{ id: '6', label: 'Diretor', urn: 'urn:li:seniority:6' }], excluded: [] },
        },
      },
    },
    creativeData: {
      ...creative,
      imageUrl: 'https://storage/template.png',
      headline: 'ABM para {{company.name}}',
      templateLogo: { ...creative.templateLogo, baseImageUrl: 'https://storage/base.png', textoDestaque: 'WORKSHOP', textoComplementar: 'Convite VIP' },
      overrides: {
        c1: {
          status: 'fully_personalized',
          headline: 'Nubank, vamos conversar',
          imageUrl: 'https://storage/nubank-final.png',
          baseImageUrl: 'https://storage/nubank-base.png',
          textoDestaque: 'NUBANK',
          textoComplementar: 'Só para o time roxo',
          landingPageUrl: 'https://maestro.abm/p/nubank',
        },
      },
      clientProductService: 'Plataforma ABM',
      clientAudienceMarket: 'Fintechs',
      clientPersona: 'Diretora de marketing',
    },
    briefDraft: { ...createEmptyBriefDraft(), voice: 'Direto e próximo', persona: 'CMO' },
    selectedAccounts: [],
    step: 4,
  };
}

describe('rascunhos', () => {
  it('salvar e reabrir devolve exatamente o mesmo estado', () => {
    const id = newDraftId();
    const state = fullState();
    saveDraft(id, state);
    const back = getDraft(id);
    expect(back?.state).toEqual(state);
    expect(back?.name).toBe('Q4 ABM fintechs');
    // O que o produto perde hoje, conferido um a um:
    expect(back?.state.creativeData.overrides.c1.imageUrl).toBe('https://storage/nubank-final.png');
    expect(back?.state.creativeData.overrides.c1.textoDestaque).toBe('NUBANK');
    expect(back?.state.creativeData.clientPersona).toBe('Diretora de marketing');
    expect(back?.state.targetingData.overrides.c2.locations.included[0].label).toBe('São Paulo');
    expect(back?.state.step).toBe(4);
  });

  it('salvar de novo atualiza o mesmo rascunho, sem duplicar', () => {
    const id = newDraftId();
    saveDraft(id, fullState());
    saveDraft(id, { ...fullState(), step: 5 });
    expect(listDrafts().filter((d) => d.id === id)).toHaveLength(1);
    expect(getDraft(id)?.state.step).toBe(5);
  });

  it('publicar apaga o rascunho', () => {
    const id = newDraftId();
    saveDraft(id, fullState());
    deleteDraft(id);
    expect(getDraft(id)).toBeNull();
  });

  it('só ids de rascunho abrem como rascunho na rota de edição', () => {
    expect(isDraftId(newDraftId())).toBe(true);
    expect(isDraftId('123456')).toBe(false);
    expect(isDraftId(undefined)).toBe(false);
  });
});
