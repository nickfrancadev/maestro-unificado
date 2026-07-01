import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, TextAreaField } from './panelFields';

export interface RichTextProps {
  title: string;
  body: string;
}

export function richtextDefaults(): RichTextProps {
  return {
    title: 'Sobre a solução',
    body: 'Escreva aqui o conteúdo em texto simples.\n\nUse quebras de linha para separar parágrafos.',
  };
}

// SECURITY: body is rendered as plain text only — no HTML parsing, no
// dangerouslySetInnerHTML. Paragraphs are derived by splitting on blank
// lines; React escapes all text content by default.
export function RichTextRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as RichTextProps;
  const body = resolveTokens(p.body ?? '', ctx.ctx);
  const paragraphs = body.split(/\n\s*\n/).filter(Boolean);
  return (
    <section className="mx-auto max-w-3xl px-6 py-12 sm:px-12">
      {p.title && <h2 className="mb-4 text-2xl font-bold text-slate-900">{resolveTokens(p.title, ctx.ctx)}</h2>}
      <div className="space-y-4 text-slate-700">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, i) => (
            <p key={i} className="whitespace-pre-line leading-relaxed">
              {para}
            </p>
          ))
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
