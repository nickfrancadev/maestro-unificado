import { describe, it, expect } from 'vitest';
import { artStatus, composedPatch, compositionSignature, overlayHasContent } from './composition';
import { createDefaultCreativeData, resolveImageConfig } from './types';
import type { CreativeData } from './types';
import { buildLaunchPlan, validateLaunchPlan, buildReviewChecklist, canPublishChecklist } from './launchPlan';
import { createDefaultCampaignConfig } from './types';
import { createEmptyTargeting } from './SegmentationStep';
import type { TargetingData } from './SegmentationStep';

const nubank = { id: 'c1', label: 'Nubank', domain: 'nubank.com.br' };
const itau = { id: 'c2', label: 'Itaú', domain: 'itau.com.br' };

/** Template com base e as duas empresas compostas em dia. */
function composedForBoth(): CreativeData {
  const base = createDefaultCreativeData();
  let data: CreativeData = {
    ...base,
    headline: 'ABM para {{company.name}}',
    bodyText: 'Texto',
    landingPageUrl: 'https://maestroabm.com/p/{{account.slug}}',
    imageUrl: 'https://cdn/base.png',
    templateLogo: { ...base.templateLogo, baseImageUrl: 'https://cdn/base.png', baseImageSource: 'upload' },
  };
  for (const c of [nubank, itau]) {
    data = {
      ...data,
      overrides: { ...data.overrides, [c.id]: { status: 'fully_personalized', ...composedPatch(data, c, { url: `https://cdn/${c.id}.png` }) } },
    };
  }
  return data;
}

function targeting(): TargetingData {
  const t = createEmptyTargeting();
  return {
    ...t,
    companies: { ...t.companies, included: [nubank, itau] },
    defaultTargeting: { ...t.defaultTargeting, locations: { included: [{ id: 'br', label: 'Brasil' }], excluded: [] } },
  } as TargetingData;
}

describe('artStatus — a arte composta fica desatualizada', () => {
  it('logo depois de compor, a arte vale', () => {
    const data = composedForBoth();
    expect(artStatus(data, nubank)).toBe('ok');
    expect(artStatus(data, itau)).toBe('ok');
  });

  it('mudar o texto sobre a imagem no template desatualiza toda empresa que herda o texto', () => {
    const data = composedForBoth();
    data.templateLogo = { ...data.templateLogo, textoDestaque: 'NOVO TEXTO' };
    expect(artStatus(data, nubank)).toBe('stale');
    expect(artStatus(data, itau)).toBe('stale');
  });

  it('empresa com texto próprio não é afetada pela mudança do texto do template', () => {
    let data = composedForBoth();
    data.overrides.c1 = { ...data.overrides.c1, textoDestaque: 'SÓ DO NUBANK' };
    data.overrides.c1 = { ...data.overrides.c1, ...composedPatch(data, nubank, { url: 'https://cdn/c1-v2.png' }) };
    data = { ...data, templateLogo: { ...data.templateLogo, textoDestaque: 'NOVO TEXTO' } };
    expect(artStatus(data, nubank)).toBe('ok');
    expect(artStatus(data, itau)).toBe('stale');
  });

  it('trocar a imagem-base da empresa desatualiza só a arte dela', () => {
    const data = composedForBoth();
    data.overrides.c2 = { ...data.overrides.c2, baseImageUrl: 'https://cdn/itau-base.png', baseImageSource: 'upload' };
    expect(artStatus(data, nubank)).toBe('ok');
    expect(artStatus(data, itau)).toBe('stale');
  });

  it('trocar o formato desatualiza', () => {
    const data = composedForBoth();
    data.templateLogo = { ...data.templateLogo, format: 'square' };
    expect(artStatus(data, nubank)).toBe('stale');
  });

  it('trocar o logo do anunciante desatualiza; com "Meu logo" desligado, não', () => {
    const data = composedForBoth();
    const layout = resolveImageConfig(data, 'c1').layout;
    // Liga "Meu logo" e recompõe: a partir daí o logo do anunciante faz parte da arte.
    const on = { ...layout, advertiserLogo: { ...layout.advertiserLogo, enabled: true } };
    let d1: CreativeData = { ...data, templateLogo: { ...data.templateLogo, layout: on } };
    d1 = { ...d1, overrides: { ...d1.overrides, c1: { ...d1.overrides.c1, ...composedPatch(d1, nubank, { url: 'x' }) } } };
    expect(artStatus(d1, nubank)).toBe('ok');
    expect(artStatus({ ...d1, brandKit: { ...d1.brandKit, logo: 'https://cdn/novo-logo.png' } }, nubank)).toBe('stale');

    // Sem "Meu logo", o logo do anunciante não entra no pixel.
    const off = { ...layout, advertiserLogo: { ...layout.advertiserLogo, enabled: false } };
    let d2: CreativeData = { ...data, templateLogo: { ...data.templateLogo, layout: off } };
    d2 = { ...d2, overrides: { ...d2.overrides, c1: { ...d2.overrides.c1, ...composedPatch(d2, nubank, { url: 'x' }) } } };
    expect(artStatus({ ...d2, brandKit: { ...d2.brandKit, logo: 'https://cdn/outro.png' } }, nubank)).toBe('ok');
  });

  it('desligar o logo da conta desatualiza', () => {
    const data = composedForBoth();
    const layout = data.templateLogo.layout;
    data.templateLogo = { ...data.templateLogo, layout: { ...layout, targetLogo: { ...layout.targetLogo, enabled: false } } };
    expect(artStatus(data, nubank)).toBe('stale');
  });

  it('arte gravada sem assinatura (rascunho antigo) conta como desatualizada', () => {
    const data = composedForBoth();
    data.overrides.c1 = { status: 'fully_personalized', imageUrl: 'https://cdn/antiga.png' };
    expect(artStatus(data, nubank)).toBe('stale');
  });

  it('sem arte e com textos ou logos no editor: falta gerar (a base crua não serve)', () => {
    const data = { ...composedForBoth(), overrides: {} };
    expect(overlayHasContent(resolveImageConfig(data, 'c1'))).toBe(true);
    expect(artStatus(data, nubank)).toBe('missing');
  });

  it('sem nada sobre a imagem, a própria base é o anúncio', () => {
    const base = createDefaultCreativeData();
    const layout = base.templateLogo.layout;
    const data: CreativeData = {
      ...base,
      templateLogo: {
        ...base.templateLogo, textoDestaque: '', textoComplementar: '',
        layout: { ...layout, advertiserLogo: { ...layout.advertiserLogo, enabled: false }, targetLogo: { ...layout.targetLogo, enabled: false } },
      },
    };
    expect(artStatus(data, nubank)).toBe('not_needed');
  });

  it('a assinatura muda com o domínio da conta (o logo da conta sai dele)', () => {
    const data = composedForBoth();
    expect(compositionSignature(data, nubank)).not.toBe(compositionSignature(data, { ...nubank, domain: 'outro.com' }));
  });
});

describe('Revisão barra arte desatualizada dizendo qual empresa', () => {
  const config = { ...createDefaultCampaignConfig(), campaignName: 'Q4', budgetAmount: '15' };
  const ready = { audience: { pending: false, small: [] }, linkedInReady: true, hasBilling: true };

  it('arte em dia: publica', () => {
    const plan = buildLaunchPlan(config, targeting(), composedForBoth());
    const items = buildReviewChecklist({ config, plan, creativeIssues: validateLaunchPlan(plan), ...ready });
    expect(canPublishChecklist(items)).toBe(true);
  });

  it('arte desatualizada do Itaú trava, com o nome da empresa e o link para Criativos', () => {
    const data = composedForBoth();
    data.overrides.c2 = { ...data.overrides.c2, textoDestaque: 'Outro texto' };
    const plan = buildLaunchPlan(config, targeting(), data);
    const items = buildReviewChecklist({ config, plan, creativeIssues: validateLaunchPlan(plan), ...ready });
    const item = items.find((i) => i.id === 'creative-c2');
    expect(item?.label).toMatch(/^Itaú: A arte está desatualizada/);
    expect(item?.fix).toMatchObject({ step: 4, companyId: 'c2' });
    expect(items.find((i) => i.id === 'creative-c1')).toBeUndefined();
    expect(canPublishChecklist(items)).toBe(false);
  });

  it('sem arte composta, não publica a imagem-base crua', () => {
    const data = { ...composedForBoth(), overrides: {} };
    const issues = validateLaunchPlan(buildLaunchPlan(config, targeting(), data));
    expect(issues.c1).toEqual(['A imagem ainda não tem os textos e os logos aplicados. Gere a imagem desta empresa']);
  });
});
