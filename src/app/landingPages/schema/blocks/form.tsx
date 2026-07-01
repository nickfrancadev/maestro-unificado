import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, TextAreaField, ItemListEditor } from './panelFields';

interface FormFieldDef { name: string; label: string; type: 'text' | 'email' | 'phone' }

export interface FormProps {
  title: string;
  subtitle: string;
  fields: FormFieldDef[];
  submitLabel: string;
}

export function formDefaults(): FormProps {
  return {
    title: 'Fale com a gente',
    subtitle: 'Preencha o formulário e nosso time entra em contato.',
    fields: [
      { name: 'name', label: 'Nome', type: 'text' },
      { name: 'email', label: 'E-mail', type: 'email' },
    ],
    submitLabel: 'Enviar',
  };
}

// Front-only prototype: this renders a static (non-submitting) form preview.
// Real submission wiring belongs to a later task / the public-page runtime.
export function FormRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as FormProps;
  const fields = p.fields ?? [];
  const primary = ctx.brandKit.colors.primary || '#0F172A';
  return (
    <section id="form" className="px-6 py-14 sm:px-12">
      <div className="mx-auto max-w-md rounded-lg border border-border/60 p-6">
        {p.title && <h2 className="text-xl font-bold text-slate-900">{resolveTokens(p.title, ctx.ctx)}</h2>}
        {p.subtitle && <p className="mt-1 text-sm text-slate-600">{resolveTokens(p.subtitle, ctx.ctx)}</p>}
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            ctx.onEvent?.('form_submit');
          }}
        >
          {fields.map((f, i) => (
            <div key={i}>
              <label className="mb-1 block text-xs font-medium text-slate-600">{resolveTokens(f.label ?? '', ctx.ctx)}</label>
              <input
                type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                disabled
                placeholder={resolveTokens(f.label ?? '', ctx.ctx)}
                className="w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm text-slate-400"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled
            className="mt-2 w-full rounded-md px-4 py-2 text-sm font-semibold text-white opacity-90"
            style={{ backgroundColor: primary }}
          >
            {resolveTokens(p.submitLabel ?? '', ctx.ctx)}
          </button>
        </form>
      </div>
    </section>
  );
}

export function FormPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as FormProps;
  const set = (patch: Partial<FormProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Título" value={p.title} onChange={(v) => set({ title: v })} />
      <TextAreaField label="Subtítulo" value={p.subtitle} onChange={(v) => set({ subtitle: v })} />
      <ItemListEditor
        label="Campos"
        items={p.fields ?? []}
        makeItem={() => ({ name: `campo_${(p.fields?.length ?? 0) + 1}`, label: 'Novo campo', type: 'text' })}
        onChange={(fields) => set({ fields: fields as FormFieldDef[] })}
        renderItem={(item, update) => (
          <TextField label="Rótulo" value={item.label as string} onChange={(v) => update({ label: v })} />
        )}
      />
      <TextField label="Texto do botão" value={p.submitLabel} onChange={(v) => set({ submitLabel: v })} />
    </div>
  );
}
