import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { TextField, TextAreaField } from './panelFields';
import { SlotText, SlotButton, SlotImage } from './slots';

export interface HeroProps {
  eyebrow: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
}

const HERO_SUBHEADLINE_STYLE: SlotStyle = { fontSize: 18, color: '#475569' };
const HERO_IMAGE_STYLE: SlotStyle = { objectFit: 'cover', radius: 8 };

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
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  const eyebrowStyle: SlotStyle = { fontSize: 14, fontWeight: 'semibold', color: primary };
  const headlineStyle: SlotStyle = { fontSize: 32, fontWeight: 'bold', color: '#0F172A' };
  const ctaStyle: SlotStyle = { bgColor: primary, textColor: '#FFFFFF', radius: 6 };
  return (
    <section className="grid gap-8 px-6 py-16 sm:grid-cols-2 sm:items-center sm:px-12">
      <div>
        {p.eyebrow && (
          <SlotText
            slotId="eyebrow"
            as="p"
            className="mb-3 uppercase tracking-wide"
            value={p.eyebrow}
            ctx={ctx}
            defaultStyle={eyebrowStyle}
            styleOverride={styles.eyebrow}
          />
        )}
        <div style={{ fontFamily: ctx.brandKit.fontFamily || undefined }}>
          <SlotText
            slotId="headline"
            as="h1"
            className="sm:text-4xl"
            value={p.headline ?? ''}
            ctx={ctx}
            defaultStyle={headlineStyle}
            styleOverride={styles.headline}
          />
        </div>
        <SlotText
          slotId="subheadline"
          as="p"
          className="mt-4"
          value={p.subheadline ?? ''}
          ctx={ctx}
          defaultStyle={HERO_SUBHEADLINE_STYLE}
          styleOverride={styles.subheadline}
        />
        <SlotButton
          slotId="cta"
          className="mt-6 inline-block px-6 py-3 text-sm font-semibold"
          label={p.ctaLabel ?? ''}
          href={p.ctaHref}
          ctx={ctx}
          defaultStyle={ctaStyle}
          styleOverride={styles.cta}
        />
      </div>
      <div className="flex items-center justify-center">
        {p.imageUrl ? (
          <SlotImage
            slotId="image"
            className="max-h-80 w-full"
            url={p.imageUrl}
            alt=""
            ctx={ctx}
            defaultStyle={HERO_IMAGE_STYLE}
            styleOverride={styles.image}
          />
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
