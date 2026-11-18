// Imagens do criativo: o rascunho guarda o CAMINHO no Storage e a tela pede
// uma URL assinada nova para exibir e para publicar. A URL assinada vence em
// 2 h; antes ela era gravada no rascunho e reabrir depois disso mostrava a
// imagem quebrada (e a publicação falhava no upload para o LinkedIn).
//
// A regra mora em `supabase/functions/make-server-a4d5bbe0/creativeStorage.ts`,
// compartilhada com o servidor.

import { SERVER_BASE, headers } from './client';
import { storagePathFromUrl } from '../../../supabase/functions/make-server-a4d5bbe0/creativeStorage';
import type { CreativeData } from '@/app/campaigns/wizard/types';

export { storagePathFromUrl };

/** Onde cada imagem mora no criativo ("imageUrl", "overrides.c1.baseImageUrl"…) → caminho no Storage. */
export type CreativeImagePaths = Record<string, string>;

type Slot = { key: string; get: (d: CreativeData) => string | null | undefined; set: (d: CreativeData, url: string) => CreativeData };

function slotsOf(data: CreativeData): Slot[] {
  const slots: Slot[] = [
    {
      key: 'imageUrl',
      get: (d) => d.imageUrl,
      set: (d, url) => ({ ...d, imageUrl: url }),
    },
    {
      key: 'templateLogo.baseImageUrl',
      get: (d) => d.templateLogo?.baseImageUrl,
      set: (d, url) => ({ ...d, templateLogo: { ...d.templateLogo, baseImageUrl: url } }),
    },
  ];
  for (const id of Object.keys(data.overrides || {})) {
    for (const field of ['imageUrl', 'baseImageUrl'] as const) {
      slots.push({
        key: `overrides.${id}.${field}`,
        get: (d) => d.overrides?.[id]?.[field],
        set: (d, url) => ({ ...d, overrides: { ...d.overrides, [id]: { ...d.overrides[id], [field]: url } } }),
      });
    }
  }
  return slots;
}

/** Caminho no Storage de cada imagem do criativo. É o que o rascunho guarda. */
export function collectCreativeImagePaths(data: CreativeData): CreativeImagePaths {
  const out: CreativeImagePaths = {};
  for (const slot of slotsOf(data)) {
    const path = storagePathFromUrl(slot.get(data));
    if (path) out[slot.key] = path;
  }
  return out;
}

/**
 * Troca a URL de cada imagem pela URL nova do mesmo caminho. `paths` é o que
 * o rascunho guardou; sem ele (rascunho antigo), o caminho sai da URL vencida.
 * Imagem cujo caminho não voltou do servidor fica como está (a Revisão trava).
 */
export function applyFreshImageUrls(
  data: CreativeData,
  freshByPath: Record<string, string>,
  paths: CreativeImagePaths = collectCreativeImagePaths(data),
): CreativeData {
  let next = data;
  for (const slot of slotsOf(data)) {
    const path = paths[slot.key] ?? storagePathFromUrl(slot.get(data));
    const fresh = path ? freshByPath[path] : undefined;
    if (fresh && fresh !== slot.get(next)) next = slot.set(next, fresh);
  }
  return next;
}

/**
 * Texto para comparar "tem alteração não salva?": a URL assinada muda a cada
 * renovação, então a comparação usa só o caminho (sem o token).
 */
export function withoutSignedTokens(json: string): string {
  return json.replace(/(\/storage\/v1\/object\/)sign\/([^"?]+)\?token=[^"]*/g, '$1sign/$2');
}

export interface SignedUrlsResult {
  urls: Record<string, string>;
  missing: string[];
  error?: string;
}

/** Pede ao servidor URLs assinadas novas para estes caminhos. Nunca lança. */
export async function fetchSignedImageUrls(paths: string[]): Promise<SignedUrlsResult> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return { urls: {}, missing: [] };
  try {
    const res = await fetch(`${SERVER_BASE}/creative-signed-urls`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ paths: unique }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { urls: {}, missing: [], error: data.error || `HTTP ${res.status}` };
    return { urls: data.urls || {}, missing: data.missing || [] };
  } catch (err: any) {
    return { urls: {}, missing: [], error: err?.message || 'Erro de rede' };
  }
}

/** Criativo com todas as imagens re-assinadas. Sem nada a renovar, devolve o mesmo objeto. */
export async function refreshCreativeImages(
  data: CreativeData,
  paths?: CreativeImagePaths,
  fetcher: (paths: string[]) => Promise<SignedUrlsResult> = fetchSignedImageUrls,
): Promise<CreativeData> {
  const all = { ...collectCreativeImagePaths(data), ...(paths || {}) };
  const list = Object.values(all);
  if (!list.length) return data;
  const { urls } = await fetcher(list);
  return applyFreshImageUrls(data, urls, all);
}
