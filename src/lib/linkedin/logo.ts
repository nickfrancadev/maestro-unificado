// URL de logo de empresa via logo.dev.
//
// A chave é publicável (prefixo `pk_`) e roda no browser, mas precisa estar
// presente no build: o Vite inlina as VITE_* em tempo de compilação, então
// quando o secret falta no CI o valor vira `undefined` e toda URL sai como
// `?token=undefined` — requisição recusada, imagem quebrada em cada item da
// lista. Devolver `undefined` deixa o avatar de letra assumir sem ruído.
export function logoDevUrl(domain: string | null | undefined): string | undefined {
  const token = import.meta.env.VITE_LOGO_DEV_KEY;
  if (!token || !domain) return undefined;
  return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${token}`;
}

// Logo via PROXY do edge function, que resolve com a chave do SERVIDOR
// (Clearbit → logo.dev). É o caminho que a Segmentação usa e que funciona
// mesmo quando `VITE_LOGO_DEV_KEY` não entrou no build do cliente — foi
// exatamente essa assimetria que fazia o logo da conta sumir só no Criativo.
export function logoProxyUrl(domain: string | null | undefined): string | undefined {
  if (!domain) return undefined;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return undefined;
  return `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0/logo-proxy?domain=${encodeURIComponent(domain)}`;
}
