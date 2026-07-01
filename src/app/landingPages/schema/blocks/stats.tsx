import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';
import { SlotText } from './slots';

interface StatItem { value: string; label: string }

export interface StatsProps {
  title: string;
  items: StatItem[];
}

const STATS_TITLE_STYLE: SlotStyle = { fontSize: 24, fontWeight: 'bold', color: '#0F172A' };

export function statsDefaults(): StatsProps {
  return {
    title: '',
    items: [
      { value: '98%', label: 'Satisfação dos clientes' },
      { value: '2x', label: 'Aumento em conversão' },
      { value: '10 min', label: 'Tempo médio de setup' },
    ],
  };
}

export function StatsRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as StatsProps;
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
          defaultStyle={STATS_TITLE_STYLE}
          styleOverride={styles.title}
        />
      )}
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <p className="text-3xl font-bold" style={{ color: primary }}>
              {resolveTokens(item.value ?? '', ctx.ctx)}
            </p>
            <p className="mt-1 text-sm text-slate-600">{resolveTokens(item.label ?? '', ctx.ctx)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
