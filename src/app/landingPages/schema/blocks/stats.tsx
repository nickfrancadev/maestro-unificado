import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, ItemListEditor } from './panelFields';

interface StatItem { value: string; label: string }

export interface StatsProps {
  title: string;
  items: StatItem[];
}

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
  return (
    <section className="px-6 py-14 sm:px-12">
      {p.title && <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">{resolveTokens(p.title, ctx.ctx)}</h2>}
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

export function StatsPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as StatsProps;
  const set = (patch: Partial<StatsProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Título (opcional)" value={p.title} onChange={(v) => set({ title: v })} />
      <ItemListEditor
        label="Métricas"
        items={p.items ?? []}
        makeItem={() => ({ value: '0%', label: 'Nova métrica' })}
        onChange={(items) => set({ items: items as StatItem[] })}
        renderItem={(item, update) => (
          <>
            <TextField label="Valor" value={item.value as string} onChange={(v) => update({ value: v })} />
            <TextField label="Legenda" value={item.label as string} onChange={(v) => update({ label: v })} />
          </>
        )}
      />
    </div>
  );
}
