// Onde mora a imagem do anúncio: o CAMINHO no Storage, não a URL assinada.
//
// A URL assinada vence (2 h). Ela servia de identidade da imagem no rascunho,
// e reabrir o rascunho depois disso mostrava imagem quebrada e a publicação
// falhava no upload para o LinkedIn. A regra agora:
// - o rascunho guarda o caminho (`imagePaths`);
// - para exibir ou publicar, o servidor assina de novo a partir do caminho;
// - rascunho antigo, que só tem a URL vencida, recupera o caminho da própria
//   URL (`/object/sign/<bucket>/<caminho>?token=…`).
//
// Puro (sem Deno nem npm) para rodar no Vitest e ser importado pela tela.

export const CREATIVE_BUCKET = "make-a4d5bbe0-creatives";

/** Validade das URLs assinadas. Curta de propósito: a URL é só para exibir agora. */
export const SIGNED_URL_TTL_SECONDS = 7200;

/**
 * Caminho no bucket de criativos a partir de uma URL assinada (vencida ou
 * não) ou pública do Storage. `null` para qualquer outra URL (blob:, data:,
 * site externo): essa não tem como ser renovada.
 */
export function storagePathFromUrl(url: string | null | undefined, bucket = CREATIVE_BUCKET): string | null {
  if (!url || typeof url !== "string") return null;
  const marker = new RegExp(`/storage/v1/object/(?:sign|public|authenticated)/${bucket.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([^?#]+)`);
  const m = url.match(marker);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Caminho aceito pelo servidor: relativo, sem "..", sem barra inicial. */
export function isSafeStoragePath(path: unknown): path is string {
  return typeof path === "string"
    && path.length > 0
    && path.length <= 512
    && !path.startsWith("/")
    && !path.split("/").includes("..");
}
