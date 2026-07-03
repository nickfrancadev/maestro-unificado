import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';
import { ImageOff } from 'lucide-react';
import { SlotText, SlotImage } from './slots';

export interface MediaProps {
  kind: 'image' | 'video';
  url: string;
  caption: string;
}

const MEDIA_CAPTION_STYLE: SlotStyle = { fontSize: 14, color: '#64748B' };
const MEDIA_IMAGE_STYLE: SlotStyle = { objectFit: 'cover' };

export function mediaDefaults(): MediaProps {
  return { kind: 'image', url: '', caption: '' };
}

export function MediaRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as MediaProps;
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  const caption = resolveTokens(p.caption ?? '', ctx.ctx);
  return (
    <section className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-3xl">
        {p.url ? (
          p.kind === 'video' ? (
            <video src={p.url} controls className="w-full rounded-lg" />
          ) : (
            <SlotImage
              slotId="image"
              className="w-full rounded-lg"
              url={p.url}
              alt={caption}
              ctx={ctx}
              defaultStyle={MEDIA_IMAGE_STYLE}
              styleOverride={styles.image}
            />
          )
        ) : (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 text-slate-400">
            <ImageOff className="size-8" />
            <span className="text-sm">Nenhuma mídia definida</span>
          </div>
        )}
        {p.caption && (
          <SlotText
            slotId="caption"
            as="p"
            className="mt-3 text-center"
            value={p.caption}
            ctx={ctx}
            defaultStyle={MEDIA_CAPTION_STYLE}
            styleOverride={styles.caption}
          />
        )}
      </div>
    </section>
  );
}
