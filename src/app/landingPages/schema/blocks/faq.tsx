import type { Block } from '../blockTypes';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';
import { TextField, TextAreaField, ItemListEditor } from './panelFields';
import { SlotText } from './slots';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../../components/ui/accordion';

interface FaqItem { question: string; answer: string }

export interface FaqProps {
  title: string;
  items: FaqItem[];
}

const FAQ_TITLE_STYLE: SlotStyle = { fontSize: 24, fontWeight: 'bold', color: '#0F172A' };

export function faqDefaults(): FaqProps {
  return {
    title: 'Perguntas frequentes',
    items: [
      { question: 'Como funciona o período de teste?', answer: 'Você tem acesso completo por 14 dias, sem compromisso.' },
      { question: 'Preciso de cartão de crédito?', answer: 'Não, o teste é gratuito e sem cartão.' },
    ],
  };
}

export function FaqRender({ block, ctx }: { block: Block; ctx: RenderContext }) {
  const p = block.props as unknown as FaqProps;
  const items = p.items ?? [];
  const styles = (block.props.styles ?? {}) as Record<string, SlotStyle>;
  return (
    <section className="mx-auto max-w-2xl px-6 py-14 sm:px-12">
      {p.title && (
        <SlotText
          slotId="title"
          as="h2"
          className="mb-6 text-center"
          value={p.title}
          ctx={ctx}
          defaultStyle={FAQ_TITLE_STYLE}
          styleOverride={styles.title}
        />
      )}
      <Accordion type="single" collapsible>
        {items.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{resolveTokens(item.question ?? '', ctx.ctx)}</AccordionTrigger>
            <AccordionContent>{resolveTokens(item.answer ?? '', ctx.ctx)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function FaqPanel({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const p = block.props as unknown as FaqProps;
  const set = (patch: Partial<FaqProps>) => onChange({ props: { ...block.props, ...patch } });
  return (
    <div className="space-y-4">
      <TextField label="Título" value={p.title} onChange={(v) => set({ title: v })} />
      <ItemListEditor
        label="Perguntas"
        items={p.items ?? []}
        makeItem={() => ({ question: 'Nova pergunta', answer: '' })}
        onChange={(items) => set({ items: items as FaqItem[] })}
        renderItem={(item, update) => (
          <>
            <TextField label="Pergunta" value={item.question as string} onChange={(v) => update({ question: v })} />
            <TextAreaField label="Resposta" value={item.answer as string} onChange={(v) => update({ answer: v })} />
          </>
        )}
      />
    </div>
  );
}
