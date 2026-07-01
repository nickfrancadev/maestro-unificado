import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, TextAreaField } from './panelFields';

export interface CtaProps {
  headline: string;
  subheadline: string;
  buttonLabel: string;
  buttonHref: string;
}

export function ctaDefaults(): CtaProps {
  return {
    headline: 'Pronto para começar, {{contact.firstName}}?',
    subheadline: 'Fale com a nossa equipe e veja como {{account.name}} pode crescer mais rápido.',
    buttonLabel: 'Falar com um especialista',
    buttonHref: '#form',
  };
}

export function CtaRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as CtaProps;
  const primary = ctx.brandKit.colors.primary || '#0F172A';
  return (
    <section className="px-6 py-16 text-center sm:px-12" style={{ backgroundColor: `${primary}10` }}>
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{resolveTokens(p.headline ?? '', ctx.ctx)}</h2>
      {p.subheadline && <p className="mt-3 text-slate-600">{resolveTokens(p.subheadline, ctx.ctx)}</p>}
      <a
        href={p.buttonHref}
        className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold text-white"
        style={{ backgroundColor: primary }}
      >
        {resolveTokens(p.buttonLabel ?? '', ctx.ctx)}
      </a>
    </section>
  );
}

export function CtaPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as CtaProps;
  const set = (patch: Partial<CtaProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Título" value={p.headline} onChange={(v) => set({ headline: v })} />
      <TextAreaField label="Subtítulo" value={p.subheadline} onChange={(v) => set({ subheadline: v })} />
      <TextField label="Texto do botão" value={p.buttonLabel} onChange={(v) => set({ buttonLabel: v })} />
      <TextField label="Link do botão" value={p.buttonHref} onChange={(v) => set({ buttonHref: v })} />
    </div>
  );
}
