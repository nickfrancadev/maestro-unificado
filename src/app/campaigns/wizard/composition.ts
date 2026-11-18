// Arte composta por empresa: quando ela ainda vale.
//
// A arte de cada empresa é a imagem-base com os textos e os logos pintados por
// cima (`composeLogoOverlay`). Ela é um arquivo pronto: mudar depois o texto
// sobre a imagem, a imagem-base, o formato, o layout ou os logos NÃO muda o
// arquivo. Sem esta regra, o editor mostrava a arte nova e a publicação levava
// a antiga — ou, sem arte nenhuma, a imagem-base crua, sem textos nem logos.
//
// A regra: ao compor, grava-se a ASSINATURA do que foi composto
// (`composedSignature`). A arte só vale enquanto a assinatura calculada agora
// for igual à gravada. Como a assinatura sai da configuração JÁ RESOLVIDA
// (template + personalização da empresa), uma mudança no template marca como
// desatualizadas todas as empresas que herdam aquele campo, e só elas.
import { resolveImageConfig } from './types';
import type { CreativeData, ResolvedImageConfig } from './types';

export interface CompositionTarget {
  id: string;
  label: string;
  domain?: string;
}

/**
 * - `ok`: a arte composta bate com o que o editor mostra.
 * - `stale`: existe arte, mas o texto, a base, o formato, o layout ou os logos
 *   mudaram depois dela. Precisa gerar de novo.
 * - `missing`: o editor mostra textos ou logos sobre a imagem, mas a empresa
 *   ainda não tem arte composta: publicar levaria a imagem-base crua.
 * - `not_needed`: nada a pintar sobre a base (sem textos e sem logos), então a
 *   própria base é o anúncio.
 */
export type ArtStatus = 'ok' | 'stale' | 'missing' | 'not_needed';

/** Os textos que a composição pinta. Com "Textos pela IA" eles já estão na base. */
function paintedTexts(cfg: ResolvedImageConfig): { destaque: string; complementar: string } {
  const aiTexts = cfg.imageMode === 'ai' && cfg.aiTexts;
  return aiTexts
    ? { destaque: '', complementar: '' }
    : { destaque: cfg.textoDestaque.trim(), complementar: cfg.textoComplementar.trim() };
}

/** O editor mostra alguma coisa por cima da imagem-base? */
export function overlayHasContent(cfg: ResolvedImageConfig): boolean {
  const t = paintedTexts(cfg);
  return !!(t.destaque || t.complementar || cfg.layout.advertiserLogo.enabled || cfg.layout.targetLogo.enabled);
}

/**
 * Tudo o que entra na arte desta empresa, numa string comparável. Inclui só o
 * que muda o pixel: o logo do anunciante só conta com "Meu logo" ligado, o
 * domínio da conta só com "Logo da conta" ligado.
 */
export function compositionSignature(data: CreativeData, company: CompositionTarget): string {
  const cfg = resolveImageConfig(data, company.id);
  const texts = paintedTexts(cfg);
  return JSON.stringify({
    base: cfg.baseImageUrl ?? '',
    texts,
    font: cfg.fontFamily,
    format: cfg.format,
    layout: cfg.layout,
    advertiserLogo: cfg.layout.advertiserLogo.enabled
      ? { logo: data.brandKit?.logo ?? null, site: data.brandKit?.websiteUrl ?? '' }
      : null,
    targetLogo: cfg.layout.targetLogo.enabled ? (company.domain ?? null) : null,
  });
}

export function artStatus(data: CreativeData, company: CompositionTarget): ArtStatus {
  if (!data.templateLogo) return 'not_needed';
  const ovr = data.overrides?.[company.id];
  if (ovr?.imageUrl) {
    return ovr.composedSignature === compositionSignature(data, company) ? 'ok' : 'stale';
  }
  return overlayHasContent(resolveImageConfig(data, company.id)) ? 'missing' : 'not_needed';
}

/** Frase da pendência, para o passo Criativos e para a Revisão. */
export function artIssue(status: ArtStatus): string | null {
  if (status === 'stale') {
    return 'A arte está desatualizada: o texto sobre a imagem, a imagem-base, o formato ou os logos mudaram depois de gerar. Gere a imagem de novo';
  }
  if (status === 'missing') {
    return 'A imagem ainda não tem os textos e os logos aplicados. Gere a imagem desta empresa';
  }
  return null;
}

/**
 * O patch que a composição grava na empresa: a arte E a assinatura do que foi
 * composto. `data` é o estado do momento em que a composição COMEÇOU: o que for
 * editado enquanto o servidor compõe já deixa a arte desatualizada.
 */
export function composedPatch(
  data: CreativeData,
  company: CompositionTarget,
  art: { url: string; filename?: string },
): { imageUrl: string; imageFileName?: string; composedSignature: string } {
  return { imageUrl: art.url, imageFileName: art.filename, composedSignature: compositionSignature(data, company) };
}
