import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';
import { SlotText } from './slots';
import { CheckCircle2 } from 'lucide-react';

interface FeatureItem { title: string; description: string }

export interface FeaturesProps {
  title: string;
  items: FeatureItem[];
}

const FEATURES_TITLE_STYLE: SlotStyle = { fontSize: 24, fontWeight: 'bold', color: '#0F172A' };

export function featuresDefaults(): FeaturesProps {
  return {
    title: 'Por que escolher a gente',
    items: [
      { title: 'Rápido de implementar', description: 'Comece a usar em minutos, sem fricção.' },
      { title: 'Feito para {{account.industry}}', description: 'Configurações pensadas para o seu setor.' },
      { title: 'Suporte dedicado', description: 'Time pronto para ajudar quando precisar.' },
    ],
  };
}

export function FeaturesRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as FeaturesProps;
  const items = p.items ?? [];
  const primary = ctx.brandKit.colors.primary || '#0F172A';
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  return (
    <section className="px-6 py-14 sm:px-12">
      {p.title && (
        <SlotText
          slotId="title"
          as="h2"
          className="mb-8 text-center"
          value={p.title}
          ctx={ctx}
          defaultStyle={FEATURES_TITLE_STYLE}
          styleOverride={styles.title}
        />
      )}
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border/60 p-5">
            <CheckCircle2 className="mb-3 size-6" style={{ color: primary }} />
            <h3 className="font-semibold text-slate-900">{resolveTokens(item.title ?? '', ctx.ctx)}</h3>
            <p className="mt-1 text-sm text-slate-600">{resolveTokens(item.description ?? '', ctx.ctx)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
