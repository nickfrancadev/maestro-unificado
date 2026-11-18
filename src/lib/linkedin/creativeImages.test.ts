import { describe, it, expect, vi } from 'vitest';
import {
  collectCreativeImagePaths,
  applyFreshImageUrls,
  refreshCreativeImages,
  withoutSignedTokens,
} from './creativeImages';
import { createDefaultCreativeData } from '@/app/campaigns/wizard/types';

const signed = (path: string, token = 'vencido') =>
  `https://abc.supabase.co/storage/v1/object/sign/make-a4d5bbe0-creatives/${path}?token=${token}`;

function draftCreative() {
  const d = createDefaultCreativeData();
  return {
    ...d,
    imageUrl: signed('composed/template.png'),
    templateLogo: { ...d.templateLogo, baseImageUrl: signed('base/bg.png') },
    overrides: {
      c1: { status: 'fully_personalized' as const, imageUrl: signed('composed/nubank.png') },
      c2: { status: 'template' as const, imageUrl: 'blob:http://localhost/x' },
    },
  };
}

describe('imagens do rascunho — caminho guardado, URL renovada', () => {
  it('guarda o caminho de cada imagem do Storage (e ignora blob:)', () => {
    expect(collectCreativeImagePaths(draftCreative())).toEqual({
      imageUrl: 'composed/template.png',
      'templateLogo.baseImageUrl': 'base/bg.png',
      'overrides.c1.imageUrl': 'composed/nubank.png',
    });
  });

  it('rascunho antigo com URL vencida se recupera pelo caminho', async () => {
    const fetcher = vi.fn(async (paths: string[]) => ({
      urls: Object.fromEntries(paths.map((p) => [p, signed(p, 'novo')])),
      missing: [],
    }));
    const fresh = await refreshCreativeImages(draftCreative(), undefined, fetcher);
    expect(fetcher).toHaveBeenCalledWith(['composed/template.png', 'base/bg.png', 'composed/nubank.png']);
    expect(fresh.imageUrl).toBe(signed('composed/template.png', 'novo'));
    expect(fresh.templateLogo.baseImageUrl).toBe(signed('base/bg.png', 'novo'));
    expect(fresh.overrides.c1.imageUrl).toBe(signed('composed/nubank.png', 'novo'));
    // O que não é do Storage fica como está (a Revisão confere se carrega).
    expect(fresh.overrides.c2.imageUrl).toBe('blob:http://localhost/x');
  });

  it('caminho que não voltou do servidor não troca a URL', () => {
    const d = draftCreative();
    expect(applyFreshImageUrls(d, {}).imageUrl).toBe(d.imageUrl);
  });

  it('sem imagem no Storage, não chama o servidor', async () => {
    const fetcher = vi.fn();
    const d = createDefaultCreativeData();
    expect(await refreshCreativeImages(d, undefined, fetcher)).toBe(d);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('renovar a URL não conta como alteração não salva', () => {
    const a = JSON.stringify({ img: signed('a.png', 'velho') });
    const b = JSON.stringify({ img: signed('a.png', 'novo') });
    expect(withoutSignedTokens(a)).toBe(withoutSignedTokens(b));
    expect(withoutSignedTokens(a)).not.toBe(withoutSignedTokens(JSON.stringify({ img: signed('b.png') })));
  });
});
