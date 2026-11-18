import { describe, it, expect } from 'vitest';
import { CAMPAIGN_OBJECTIVES, objectiveFor, resolveCostType } from './objectives';
import { OBJECTIVE_MAP, effectiveCostType, costTypeLabel } from '../../../src/app/campaigns/wizard/types';

describe('objetivos — tela e servidor usam a mesma tabela', () => {
  it('Visitas ao site e Engajamento cobram CPM no servidor (antes: CPC)', () => {
    expect(resolveCostType('website_visits', 'automated')).toBe('CPM');
    expect(resolveCostType('engagement', 'automated')).toBe('CPM');
    expect(objectiveFor('website_visits').optimizationTargetType).toBe('MAX_CLICK');
  });

  it('a tela mostra exatamente a cobrança que o servidor envia, objetivo a objetivo', () => {
    for (const key of Object.keys(CAMPAIGN_OBJECTIVES)) {
      for (const bidding of ['automated', 'manual_cpm', 'manual_cpc'] as const) {
        expect(effectiveCostType({ objective: key, biddingStrategy: bidding })).toBe(resolveCostType(key, bidding));
      }
      expect(OBJECTIVE_MAP[key].costType).toBe(CAMPAIGN_OBJECTIVES[key].costType);
      expect(OBJECTIVE_MAP[key].label).toBe(CAMPAIGN_OBJECTIVES[key].label);
    }
  });

  it('cobrança divergente (CPC num objetivo que não aceita) cai na do objetivo', () => {
    expect(resolveCostType('website_visits', 'manual_cpc')).toBe('CPM');
    expect(resolveCostType('brand_awareness', 'manual_cpm')).toBe('CPM');
    expect(resolveCostType('video_views', 'manual_cpm')).toBe('CPV');
  });

  it('objetivo desconhecido vira Reconhecimento da marca', () => {
    expect(objectiveFor('xyz').objectiveType).toBe('BRAND_AWARENESS');
    expect(objectiveFor(undefined).objectiveType).toBe('BRAND_AWARENESS');
  });

  it('o rótulo diz CPM para Visitas ao site', () => {
    expect(costTypeLabel({ objective: 'website_visits', biddingStrategy: 'automated' })).toMatch(/CPM/);
  });
});
