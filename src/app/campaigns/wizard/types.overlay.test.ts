import { describe, it, expect } from 'vitest';
import {
  createDefaultCreativeData,
  resolveImageConfig,
  overriddenImageFields,
  IMAGE_OVERRIDE_FIELDS,
  type CreativeData,
} from './types';
import { createDefaultOverlayLayout } from './overlayLayout';

const comEmpresa = (over: Record<string, unknown>): CreativeData => ({
  ...createDefaultCreativeData(),
  overrides: { c1: { status: 'template', ...over } as never },
});

describe('resolveImageConfig — layout', () => {
  it('o template nasce com um layout resolvível', () => {
    const cfg = resolveImageConfig(createDefaultCreativeData());
    expect(cfg.layout.destaque.sizePx).toBeGreaterThan(0);
  });

  it('uma empresa sem override herda o layout do template', () => {
    const data = createDefaultCreativeData();
    data.templateLogo.layout.destaque.sizePx = 72;
    expect(resolveImageConfig(data, 'c1').layout.destaque.sizePx).toBe(72);
  });

  it('uma empresa com override usa o layout dela', () => {
    const meu = createDefaultOverlayLayout();
    meu.destaque.sizePx = 31;
    expect(resolveImageConfig(comEmpresa({ layout: meu }), 'c1').layout.destaque.sizePx).toBe(31);
  });
});

describe('overriddenImageFields', () => {
  it('inclui layout na lista de campos sobrescrevíveis', () => {
    expect(IMAGE_OVERRIDE_FIELDS).toContain('layout');
  });

  // É isso que acende o chip "personalizado" e o "Voltar ao template".
  it('reporta layout quando a empresa tem o dela', () => {
    const data = comEmpresa({ layout: createDefaultOverlayLayout() });
    expect(overriddenImageFields(data, 'c1')).toContain('layout');
  });

  it('não reporta layout quando a empresa herda', () => {
    expect(overriddenImageFields(comEmpresa({ headline: 'oi' }), 'c1')).not.toContain('layout');
  });
});

describe('showTargetLogo legado', () => {
  // Campanhas salvas antes do editor não têm `layout`. Perder o
  // "não leva logo" delas seria mudar o anúncio pelas costas do usuário.
  it('uma campanha antiga sem layout preserva showTargetLogo=false', () => {
    const data = createDefaultCreativeData();
    data.templateLogo.showTargetLogo = false;
    delete (data.templateLogo as Partial<typeof data.templateLogo>).layout;
    expect(resolveImageConfig(data).layout.targetLogo.enabled).toBe(false);
  });
});
