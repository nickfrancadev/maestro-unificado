import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { Ban } from 'lucide-react';

export interface EmbedProps {
  url: string;
}

export function embedDefaults(): EmbedProps {
  return { url: '' };
}

// SECURITY: only a hardcoded allowlist of known providers is turned into an
// iframe (src built from parsed, known-safe IDs — never the raw user URL).
// Anything else renders a neutral placeholder. No raw HTML / dangerouslySetInnerHTML.
function toEmbedSrc(url: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v');
    if (id && /^[\w-]{6,15}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
    return null;
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '');
    if (id && /^[\w-]{6,15}$/.test(id)) return `https://www.youtube.com/embed/${id}`;
    return null;
  }
  if (host === 'vimeo.com') {
    const id = parsed.pathname.replace(/^\//, '');
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    return null;
  }
  return null;
}

export function EmbedRender({ block }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as EmbedProps;
  const src = toEmbedSrc(p.url ?? '');
  return (
    <section className="px-6 py-12 sm:px-12">
      <div className="mx-auto aspect-video max-w-3xl overflow-hidden rounded-lg bg-slate-100">
        {src ? (
          <iframe
            src={src}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <Ban className="size-8" />
            <span className="text-sm">
              {p.url ? 'Provedor não suportado (apenas YouTube/Vimeo)' : 'Nenhum link de vídeo definido'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
