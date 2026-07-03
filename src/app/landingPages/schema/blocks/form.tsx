import { useState } from 'react';
import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';
import { SlotText } from './slots';

interface FormFieldDef { name: string; label: string; type: 'text' | 'email' | 'phone' }

export interface FormProps {
  title: string;
  subtitle: string;
  fields: FormFieldDef[];
  submitLabel: string;
  successMessage?: string;
}

const FORM_TITLE_STYLE: SlotStyle = { fontSize: 20, fontWeight: 'bold', color: '#0F172A' };
const FORM_SUBTITLE_STYLE: SlotStyle = { fontSize: 14, color: '#475569' };

export function formDefaults(): FormProps {
  return {
    title: 'Fale com a gente',
    subtitle: 'Preencha o formulário e nosso time entra em contato.',
    fields: [
      { name: 'name', label: 'Nome', type: 'text' },
      { name: 'email', label: 'E-mail', type: 'email' },
    ],
    submitLabel: 'Enviar',
    successMessage: 'Obrigado! Recebemos seus dados e entraremos em contato em breve.',
  };
}

const DEFAULT_FIELDS: FormFieldDef[] = [
  { name: 'name', label: 'Nome', type: 'text' },
  { name: 'email', label: 'E-mail', type: 'email' },
];

// Renders an interactive form on the public page: inputs are controlled by
// local state and the submit handler relays both the tracking event
// (ctx.onEvent) and the lead payload (ctx.onFormSubmit) to the host. In the
// editor/preview, both hooks are undefined so the form renders the same
// markup but is inert (no network/localStorage side effects).
export function FormRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as FormProps;
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  const fields = p.fields && p.fields.length > 0 ? p.fields : DEFAULT_FIELDS;
  const primary = ctx.brandKit.colors.primary || '#0F172A';
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <section id="form" className="px-6 py-14 sm:px-12">
        <div className="mx-auto max-w-md rounded-lg border border-border/60 p-6 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {resolveTokens(p.successMessage || 'Obrigado!', ctx.ctx)}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="form" className="px-6 py-14 sm:px-12">
      <div className="mx-auto max-w-md rounded-lg border border-border/60 p-6">
        {p.title && (
          <SlotText
            slotId="title"
            as="h2"
            value={p.title}
            ctx={ctx}
            defaultStyle={FORM_TITLE_STYLE}
            styleOverride={styles.title}
          />
        )}
        {p.subtitle && (
          <SlotText
            slotId="subtitle"
            as="p"
            className="mt-1"
            value={p.subtitle}
            ctx={ctx}
            defaultStyle={FORM_SUBTITLE_STYLE}
            styleOverride={styles.subtitle}
          />
        )}
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            ctx.onEvent?.('form_submit');
            ctx.onFormSubmit?.(values);
            setSubmitted(true);
          }}
        >
          {fields.map((f, i) => (
            <div key={i}>
              <label className="mb-1 block text-xs font-medium text-slate-600">{resolveTokens(f.label ?? '', ctx.ctx)}</label>
              <input
                type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
                value={values[f.name] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                placeholder={resolveTokens(f.label ?? '', ctx.ctx)}
                className="w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm text-slate-900"
              />
            </div>
          ))}
          <button
            type="submit"
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
