import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, SelectField } from './panelFields';
import { ImageOff } from 'lucide-react';

export interface MediaProps {
  kind: 'image' | 'video';
  url: string;
  caption: string;
}

export function mediaDefaults(): MediaProps {
  return { kind: 'image', url: '', caption: '' };
}

export function MediaRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as MediaProps;
  const caption = resolveTokens(p.caption ?? '', ctx.ctx);
  return (
    <section className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-3xl">
        {p.url ? (
          p.kind === 'video' ? (
            <video src={p.url} controls className="w-full rounded-lg" />
          ) : (
            <img src={p.url} alt={caption} className="w-full rounded-lg object-cover" />
          )
        ) : (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 text-slate-400">
            <ImageOff className="size-8" />
            <span className="text-sm">Nenhuma mídia definida</span>
          </div>
        )}
        {caption && <p className="mt-3 text-center text-sm text-slate-500">{caption}</p>}
      </div>
    </section>
  );
}

export function MediaPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as MediaProps;
  const set = (patch: Partial<MediaProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <SelectField
        label="Tipo"
        value={p.kind ?? 'image'}
        options={[
          { value: 'image', label: 'Imagem' },
          { value: 'video', label: 'Vídeo' },
        ]}
        onChange={(v) => set({ kind: v as MediaProps['kind'] })}
      />
      <TextField label="URL" value={p.url} onChange={(v) => set({ url: v })} placeholder="https://..." />
      <TextField label="Legenda" value={p.caption} onChange={(v) => set({ caption: v })} />
    </div>
  );
}
