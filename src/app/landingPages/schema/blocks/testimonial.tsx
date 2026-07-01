import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { Quote } from 'lucide-react';
import { SlotText } from './slots';

export interface TestimonialProps {
  quote: string;
  authorName: string;
  authorRole: string;
  avatarUrl: string;
}

const TESTIMONIAL_QUOTE_STYLE: SlotStyle = { fontSize: 20, fontWeight: 'medium', color: '#1E293B' };
const TESTIMONIAL_AUTHOR_NAME_STYLE: SlotStyle = { fontSize: 14, fontWeight: 'semibold', color: '#0F172A' };
const TESTIMONIAL_AUTHOR_ROLE_STYLE: SlotStyle = { fontSize: 12, color: '#64748B' };

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
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  return (
    <section className="px-6 py-14 sm:px-12">
      <div className="mx-auto max-w-2xl text-center">
        <Quote className="mx-auto mb-4 size-8" style={{ color: primary }} />
        <SlotText
          slotId="quote"
          as="p"
          value={`“${p.quote ?? ''}”`}
          ctx={ctx}
          defaultStyle={TESTIMONIAL_QUOTE_STYLE}
          styleOverride={styles.quote}
        />
        <div className="mt-6 flex items-center justify-center gap-3">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <div className="size-10 rounded-full bg-slate-200" />
          )}
          <div className="text-left">
            <SlotText
              slotId="authorName"
              as="p"
              value={p.authorName ?? ''}
              ctx={ctx}
              defaultStyle={TESTIMONIAL_AUTHOR_NAME_STYLE}
              styleOverride={styles.authorName}
            />
            <SlotText
              slotId="authorRole"
              as="p"
              value={p.authorRole ?? ''}
              ctx={ctx}
              defaultStyle={TESTIMONIAL_AUTHOR_ROLE_STYLE}
              styleOverride={styles.authorRole}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
