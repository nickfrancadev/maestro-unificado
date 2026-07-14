import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { SlotText, SlotButton } from './slots';

export interface CtaProps {
  headline: string;
  subheadline: string;
  buttonLabel: string;
  buttonHref: string;
}

const CTA_HEADLINE_STYLE: SlotStyle = { fontSize: 24, fontWeight: 'bold', color: '#0F172A' };
const CTA_SUBHEADLINE_STYLE: SlotStyle = { fontSize: 16, color: '#475569' };

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
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  const buttonStyle: SlotStyle = { bgColor: primary, textColor: '#FFFFFF', radius: 6 };
  return (
    <section className="px-6 py-16 text-center sm:px-12" style={{ backgroundColor: `${primary}10` }}>
      <SlotText
        slotId="headline"
        as="h2"
        className="sm:text-3xl"
        value={p.headline ?? ''}
        ctx={ctx}
        defaultStyle={CTA_HEADLINE_STYLE}
        styleOverride={styles.headline}
      />
      {p.subheadline && (
        <SlotText
          slotId="subheadline"
          as="p"
          className="mt-3"
          value={p.subheadline}
          ctx={ctx}
          defaultStyle={CTA_SUBHEADLINE_STYLE}
          styleOverride={styles.subheadline}
        />
      )}
      <SlotButton
        slotId="cta"
        className="mt-6 inline-block px-6 py-3 text-sm font-semibold"
        label={p.buttonLabel ?? ''}
        href={p.buttonHref}
        onClick={() => ctx.onEvent?.('cta_click')}
        ctx={ctx}
        defaultStyle={buttonStyle}
        styleOverride={styles.cta}
      />
    </section>
  );
}
