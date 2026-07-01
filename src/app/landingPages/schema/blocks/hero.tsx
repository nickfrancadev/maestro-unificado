import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, TextAreaField } from './panelFields';

export interface HeroProps {
  eyebrow: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
}

export function heroDefaults(): HeroProps {
  return {
    eyebrow: 'Para {{account.name}}',
    headline: 'Acelere o crescimento da {{account.name}}',
    subheadline: 'Uma solução pensada para {{account.industry}}, feita para quem quer resultado rápido.',
    ctaLabel: 'Agendar demonstração',
    ctaHref: '#form',
    imageUrl: '',
  };
}

export function HeroRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as HeroProps;
  const primary = ctx.brandKit.colors.primary || '#0F172A';
  return (
    <section className="grid gap-8 px-6 py-16 sm:grid-cols-2 sm:items-center sm:px-12">
      <div>
        {p.eyebrow && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: primary }}>
            {resolveTokens(p.eyebrow, ctx.ctx)}
          </p>
        )}
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl" style={{ fontFamily: ctx.brandKit.fontFamily || undefined }}>
          {resolveTokens(p.headline ?? '', ctx.ctx)}
        </h1>
        <p className="mt-4 text-lg text-slate-600">{resolveTokens(p.subheadline ?? '', ctx.ctx)}</p>
        <a
          href={p.ctaHref}
          className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: primary }}
        >
          {resolveTokens(p.ctaLabel ?? '', ctx.ctx)}
        </a>
      </div>
      <div className="flex items-center justify-center">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" className="max-h-80 w-full rounded-lg object-cover" />
        ) : (
          <div className="flex h-56 w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
            Imagem de destaque
          </div>
        )}
      </div>
    </section>
  );
}

export function HeroPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as HeroProps;
  const set = (patch: Partial<HeroProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Chamada superior" value={p.eyebrow} onChange={(v) => set({ eyebrow: v })} />
      <TextField label="Título" value={p.headline} onChange={(v) => set({ headline: v })} />
      <TextAreaField label="Subtítulo" value={p.subheadline} onChange={(v) => set({ subheadline: v })} />
      <TextField label="Texto do botão" value={p.ctaLabel} onChange={(v) => set({ ctaLabel: v })} />
      <TextField label="Link do botão" value={p.ctaHref} onChange={(v) => set({ ctaHref: v })} />
      <TextField label="URL da imagem" value={p.imageUrl} onChange={(v) => set({ imageUrl: v })} placeholder="https://..." />
    </div>
  );
}
