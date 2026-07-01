import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, TextAreaField, ItemListEditor } from './panelFields';
import { CheckCircle2 } from 'lucide-react';

interface FeatureItem { title: string; description: string }

export interface FeaturesProps {
  title: string;
  items: FeatureItem[];
}

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
  return (
    <section className="px-6 py-14 sm:px-12">
      {p.title && <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">{resolveTokens(p.title, ctx.ctx)}</h2>}
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

export function FeaturesPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as FeaturesProps;
  const set = (patch: Partial<FeaturesProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Título" value={p.title} onChange={(v) => set({ title: v })} />
      <ItemListEditor
        label="Diferenciais"
        items={p.items ?? []}
        makeItem={() => ({ title: 'Novo diferencial', description: '' })}
        onChange={(items) => set({ items: items as FeatureItem[] })}
        renderItem={(item, update) => (
          <>
            <TextField label="Título" value={item.title as string} onChange={(v) => update({ title: v })} />
            <TextAreaField label="Descrição" value={item.description as string} onChange={(v) => update({ description: v })} />
          </>
        )}
      />
    </div>
  );
}
