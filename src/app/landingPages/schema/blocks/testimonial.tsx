import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, TextAreaField } from './panelFields';
import { Quote } from 'lucide-react';

export interface TestimonialProps {
  quote: string;
  authorName: string;
  authorRole: string;
  avatarUrl: string;
}

export function testimonialDefaults(): TestimonialProps {
  return {
    quote: 'A solução transformou a forma como {{account.name}} se relaciona com clientes.',
    authorName: 'Nome do cliente',
    authorRole: 'Cargo, Empresa',
    avatarUrl: '',
  };
}

export function TestimonialRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as TestimonialProps;
  const primary = ctx.brandKit.colors.primary || '#0F172A';
  return (
    <section className="px-6 py-14 sm:px-12">
      <div className="mx-auto max-w-2xl text-center">
        <Quote className="mx-auto mb-4 size-8" style={{ color: primary }} />
        <p className="text-xl font-medium text-slate-800">“{resolveTokens(p.quote ?? '', ctx.ctx)}”</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <div className="size-10 rounded-full bg-slate-200" />
          )}
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">{resolveTokens(p.authorName ?? '', ctx.ctx)}</p>
            <p className="text-xs text-slate-500">{resolveTokens(p.authorRole ?? '', ctx.ctx)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as TestimonialProps;
  const set = (patch: Partial<TestimonialProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextAreaField label="Depoimento" value={p.quote} onChange={(v) => set({ quote: v })} />
      <TextField label="Nome" value={p.authorName} onChange={(v) => set({ authorName: v })} />
      <TextField label="Cargo/Empresa" value={p.authorRole} onChange={(v) => set({ authorRole: v })} />
      <TextField label="URL do avatar" value={p.avatarUrl} onChange={(v) => set({ avatarUrl: v })} />
    </div>
  );
}
