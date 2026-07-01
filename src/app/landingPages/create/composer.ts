// Simulated "AI" page composer — fully deterministic, no network calls.
// Given a brief, picks a base template and injects the brief's copy into
// hero/cta text props. `regenerateBlock` deterministically varies a single
// block's props using a rotating index persisted in `props._gen`.
import type { Block } from '../schema/blockTypes';
import { getTemplate } from '../templates/catalog';

export interface AiBrief {
  objective: 'demo' | 'material' | 'poc';
  accountName?: string;
  industry?: string;
  message?: string;
  angle?: string;
}

const OBJECTIVE_TEMPLATE: Record<AiBrief['objective'], string> = {
  demo: 'demo-invite',
  poc: 'poc',
  material: 'vertical',
};

// `newBlock` (consumed from the schema registry) mints ids off a global
// counter + Date.now(), so two calls to a template's buildBlocks() never
// produce the same ids. composePage must be byte-identical for the same
// brief, so we re-derive stable, deterministic ids here instead of trusting
// the ones newBlock assigned — keyed only by template id + block index.
function stableId(templateId: string, index: number, type: string): string {
  return `ai_${templateId}_${index}_${type}`;
}

function injectBrief(blocks: Block[], brief: AiBrief): Block[] {
  return blocks.map((block) => {
    if (block.type === 'hero') {
      const props: Record<string, unknown> = { ...block.props };
      if (brief.angle) props.eyebrow = brief.angle;
      if (brief.message) props.subheadline = brief.message;
      if (brief.accountName) {
        props.headline = typeof props.headline === 'string'
          ? props.headline.replace(/\{\{account\.name\}\}/g, brief.accountName)
          : props.headline;
      }
      if (brief.industry) {
        props.subheadline = typeof props.subheadline === 'string'
          ? props.subheadline.replace(/\{\{account\.industry\}\}/g, brief.industry)
          : props.subheadline;
      }
      return { ...block, props };
    }
    if (block.type === 'cta') {
      const props: Record<string, unknown> = { ...block.props };
      if (brief.message) props.subheadline = brief.message;
      if (brief.accountName) {
        props.headline = typeof props.headline === 'string'
          ? props.headline.replace(/\{\{account\.name\}\}/g, brief.accountName)
          : props.headline;
      }
      return { ...block, props };
    }
    return block;
  });
}

/**
 * Deterministically composes a full page (block list) from a brief.
 * Same brief in => byte-identical block list out.
 */
export function composePage(brief: AiBrief): Block[] {
  const templateId = OBJECTIVE_TEMPLATE[brief.objective];
  const template = getTemplate(templateId);
  const base = template ? template.buildBlocks() : [];
  const stable = base.map((block, index) => ({
    ...block,
    id: stableId(templateId, index, block.type),
  }));
  return injectBrief(stable, brief);
}

// Fixed, small pools of alternate copy per block type, selected by a
// rotating index (props._gen) — deterministic, never random.
const HERO_HEADLINE_VARIANTS = [
  'Acelere o crescimento da {{account.name}}',
  'Uma solução sob medida para {{account.name}}',
  'O próximo passo para {{account.name}} começa aqui',
  'Resultados reais para {{account.name}}',
];

const HERO_SUBHEADLINE_VARIANTS = [
  'Uma solução pensada para {{account.industry}}, feita para quem quer resultado rápido.',
  'Feito sob medida para os desafios do setor de {{account.industry}}.',
  'Uma abordagem direta para acelerar os resultados de {{account.industry}}.',
];

const CTA_HEADLINE_VARIANTS = [
  'Pronto para começar, {{contact.firstName}}?',
  'Vamos conversar, {{contact.firstName}}?',
  'Dê o próximo passo, {{contact.firstName}}',
];

const GENERIC_LABEL_VARIANTS = [
  'Falar com um especialista',
  'Agendar demonstração',
  'Quero saber mais',
];

function pick<T>(pool: T[], gen: number): T {
  return pool[gen % pool.length];
}

/**
 * Returns a NEW block (same id, same type) with deterministically varied
 * props. Variation is driven by an incrementing counter stored in
 * `props._gen`, not randomness — calling this repeatedly cycles through a
 * fixed set of alternates.
 */
export function regenerateBlock(block: Block, brief: AiBrief): Block {
  const prevGen = typeof block.props._gen === 'number' ? block.props._gen : 0;
  const gen = prevGen + 1;
  const props: Record<string, unknown> = { ...block.props, _gen: gen };

  if (block.type === 'hero') {
    props.headline = pick(HERO_HEADLINE_VARIANTS, gen);
    props.subheadline = brief.message ?? pick(HERO_SUBHEADLINE_VARIANTS, gen);
    if (brief.angle) props.eyebrow = `${brief.angle} (v${gen})`;
  } else if (block.type === 'cta') {
    props.headline = pick(CTA_HEADLINE_VARIANTS, gen);
    props.buttonLabel = pick(GENERIC_LABEL_VARIANTS, gen);
  } else {
    // Generic fallback for any other block type: mark the regeneration so
    // props are guaranteed to differ even without type-specific copy pools.
    props._variant = gen;
  }

  return { ...block, props };
}
