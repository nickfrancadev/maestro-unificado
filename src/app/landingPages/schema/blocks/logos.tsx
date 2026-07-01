import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { TextField, ItemListEditor } from './panelFields';
import { SlotText } from './slots';

interface LogoItem { name: string; imageUrl: string }

export interface LogosProps {
  title: string;
  items: LogoItem[];
}

const LOGOS_TITLE_STYLE: SlotStyle = { fontSize: 14, fontWeight: 'medium', color: '#64748B' };

export function logosDefaults(): LogosProps {
  return {
    title: 'Empresas que confiam',
    items: [
      { name: 'Empresa A', imageUrl: '' },
      { name: 'Empresa B', imageUrl: '' },
      { name: 'Empresa C', imageUrl: '' },
    ],
  };
}

export function LogosRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as LogosProps;
  const items = p.items ?? [];
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  return (
    <section className="px-6 py-12 text-center sm:px-12">
      {p.title && (
        <SlotText
          slotId="title"
          as="p"
          className="mb-6 uppercase tracking-wide"
          value={p.title}
          ctx={ctx}
          defaultStyle={LOGOS_TITLE_STYLE}
          styleOverride={styles.title}
        />
      )}
      <div className="flex flex-wrap items-center justify-center gap-8">
        {items.map((item, i) =>
          item.imageUrl ? (
            <img key={i} src={item.imageUrl} alt={item.name ?? ''} className="h-8 object-contain opacity-70" />
          ) : (
            <span key={i} className="rounded bg-slate-100 px-4 py-2 text-sm text-slate-400">
              {item.name || 'Logo'}
            </span>
          ),
        )}
      </div>
    </section>
  );
}

export function LogosPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as LogosProps;
  const set = (patch: Partial<LogosProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Título" value={p.title} onChange={(v) => set({ title: v })} />
      <ItemListEditor
        label="Logos"
        items={p.items ?? []}
        makeItem={() => ({ name: 'Nova empresa', imageUrl: '' })}
        onChange={(items) => set({ items: items as LogoItem[] })}
        renderItem={(item, update) => (
          <>
            <TextField label="Nome" value={item.name as string} onChange={(v) => update({ name: v })} />
            <TextField label="URL da imagem" value={item.imageUrl as string} onChange={(v) => update({ imageUrl: v })} />
          </>
        )}
      />
    </div>
  );
}
