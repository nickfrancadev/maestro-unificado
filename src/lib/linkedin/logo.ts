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
