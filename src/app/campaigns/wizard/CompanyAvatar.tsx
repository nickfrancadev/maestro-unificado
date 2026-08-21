import React, { useState, useRef } from 'react';
import { logoDevUrl, logoProxyUrl } from '@/lib/linkedin/logo';
import type { FacetItem } from './segmentation/types';

// Uma URL de logo com token vazio/undefined é pior que nenhuma: o logo.dev
// devolve 401 e a tela desenharia um ícone de imagem quebrada. Tratá-la como
// ausente deixa o fallback assumir.
export function usableLogoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /[?&]token=(undefined|null)?(&|$)/i.test(url) ? null : url;
}

// "Tera" → "tera.com". Palpite, não verdade: o logo.dev devolve 404 para
// domínio que não existe e a tela cai no avatar de letra, então errar aqui
// custa nada. Mesma heurística de `SegmentationStep`.
export function domainFromCompanyName(name: string | undefined): string | undefined {
  const slug = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug ? `${slug}.com` : undefined;
}

export function getAccountColor(name: string) {
  const colors: Record<string, string> = {
    NVIDIA: '#76b900', Revolut: '#0075EB', Datadog: '#632CA6', Figma: '#F24E1E',
    Stripe: '#635BFF', Snowflake: '#29b5e8', Databricks: '#FF3621', Notion: '#000000',
  };
  return colors[name] || '#6366f1';
}

/**
 * Ordem importa. O `logoUrl` hidratado pela Segmentação JÁ é a URL do proxy do
 * servidor; depois dele vem o proxy montado na hora (mesmo caminho, para a
 * conta cuja hidratação não rodou), e só então a URL direta do logo.dev. A
 * direta fica por último de propósito: ela depende de `VITE_LOGO_DEV_KEY` estar
 * no build do cliente, e é essa assimetria — Segmentação via proxy, Criativo
 * via chave do cliente — que fazia o logo aparecer lá e sumir aqui.
 *
 * É uma LISTA, não um `||`: o candidato preferido pode responder erro em vez
 * de simplesmente faltar (o proxy inteiro devolveu 500 quando a Clearbit
 * morreu), e nesse caso o `<img>` precisa ter para onde avançar.
 */
export function companyLogoCandidates(company: Pick<FacetItem, 'label' | 'domain' | 'logoUrl'>): string[] {
  const candidates = [
    usableLogoUrl(company.logoUrl),
    logoProxyUrl(company.domain),
    logoProxyUrl(domainFromCompanyName(company.label)),
    logoDevUrl(company.domain),
  ].filter((u): u is string => !!u);
  return [...new Set(candidates)];
}

export function resolveCompanyLogoUrl(company: Pick<FacetItem, 'label' | 'domain' | 'logoUrl'>): string | null {
  return companyLogoCandidates(company)[0] ?? null;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
} as const;

/**
 * Logo da empresa com degradação garantida para o avatar de letra.
 *
 * O `onError` anterior fazia `style.display = 'none'` no próprio <img>: quando
 * a URL falhava o elemento sumia e NADA tomava o lugar dele — a empresa ficava
 * sem avatar e o nome encostava na borda. Marcar o erro em estado é o que
 * permite trocar de ramo e desenhar a inicial.
 */
export function CompanyAvatar({
  company,
  size = 'sm',
}: {
  company: Pick<FacetItem, 'id' | 'label' | 'domain' | 'logoUrl'>;
  size?: keyof typeof SIZE_CLASSES;
}) {
  // Índice do candidato em teste; cada onError avança um. A letra só entra
  // quando a lista inteira se esgota.
  const [attempt, setAttempt] = useState(0);
  const candidates = companyLogoCandidates(company);

  // Trocar de empresa (ou de URLs) precisa dar uma nova chance ao <img>; sem
  // este reset, os erros de uma empresa condenariam a próxima que
  // reutilizasse esta posição na lista.
  const signature = candidates.join('\n');
  const prevSigRef = useRef(signature);
  if (signature !== prevSigRef.current) {
    prevSigRef.current = signature;
    if (attempt !== 0) setAttempt(0);
  }

  const src = attempt < candidates.length ? candidates[attempt] : null;

  if (src) {
    return (
      <img
        key={src}
        src={src}
        alt=""
        className={`${SIZE_CLASSES[size]} rounded-md object-contain bg-white border border-slate-100 shrink-0`}
        onError={() => setAttempt((a) => a + 1)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-md flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: getAccountColor(company.label) }}
    >
      {company.label?.[0]?.toUpperCase() || '?'}
    </div>
  );
}
