import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { TextField, TextAreaField } from './panelFields';
import { SlotText } from './slots';

export interface RichTextProps {
  title: string;
  body: string;
}

const RICHTEXT_TITLE_STYLE: SlotStyle = { fontSize: 24, fontWeight: 'bold', color: '#0F172A' };
const RICHTEXT_BODY_STYLE: SlotStyle = { color: '#334155' };

export function richtextDefaults(): RichTextProps {
  return {
    title: 'Sobre a solução',
    body: 'Escreva aqui o conteúdo em texto simples.\n\nUse quebras de linha para separar parágrafos.',
  };
}

// SECURITY: body is rendered as plain text only — no HTML parsing, no
// dangerouslySetInnerHTML. Line/paragraph breaks are preserved visually via
// `whitespace-pre-line`; React escapes all text content by default.
export function RichTextRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as RichTextProps;
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  const body = p.body ?? '';
  return (
    <section className="mx-auto max-w-3xl px-6 py-12 sm:px-12">
      {p.title && (
        <SlotText
          slotId="title"
          as="h2"
          className="mb-4"
          value={p.title}
          ctx={ctx}
          defaultStyle={RICHTEXT_TITLE_STYLE}
          styleOverride={styles.title}
        />
      )}
      <div className="text-slate-700">
        {body ? (
          <SlotText
            slotId="body"
            as="p"
            className="whitespace-pre-line leading-relaxed"
            value={body}
            ctx={ctx}
            defaultStyle={RICHTEXT_BODY_STYLE}
            styleOverride={styles.body}
          />
        ) : (
          <p className="text-slate-400">Nenhum conteúdo ainda.</p>
        )}
      </div>
    </section>
  );
}

export function RichTextPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as RichTextProps;
  const set = (patch: Partial<RichTextProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Título" value={p.title} onChange={(v) => set({ title: v })} />
      <TextAreaField label="Texto" value={p.body} onChange={(v) => set({ body: v })} rows={8} />
      <p className="text-xs text-muted-foreground">Apenas texto simples é suportado (sem HTML).</p>
    </div>
  );
}
