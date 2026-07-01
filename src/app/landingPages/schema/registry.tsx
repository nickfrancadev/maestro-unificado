// Block registry — the heart of the WYSIWYG system. For each of the 14
// BlockTypes we define defaults, a Render component (reused by editor
// canvas, mobile preview and public page) and a Panel (props editor).
import type { RenderContext, BlockDef } from './registryTypes';
import type { Block, BlockType } from './blockTypes';

import { NavbarRender, NavbarPanel, navbarDefaults } from './blocks/navbar';
import { HeroRender, HeroPanel, heroDefaults } from './blocks/hero';
import { LogosRender, LogosPanel, logosDefaults } from './blocks/logos';
import { FeaturesRender, FeaturesPanel, featuresDefaults } from './blocks/features';
import { RichTextRender, RichTextPanel, richtextDefaults } from './blocks/richtext';
import { MediaRender, MediaPanel, mediaDefaults } from './blocks/media';
import { TestimonialRender, TestimonialPanel, testimonialDefaults } from './blocks/testimonial';
import { StatsRender, StatsPanel, statsDefaults } from './blocks/stats';
import { CtaRender, CtaPanel, ctaDefaults } from './blocks/cta';
import { FormRender, FormPanel, formDefaults } from './blocks/form';
import { FaqRender, FaqPanel, faqDefaults } from './blocks/faq';
import { FooterRender, FooterPanel, footerDefaults } from './blocks/footer';
import { SpacerRender, SpacerPanel, spacerDefaults } from './blocks/spacer';
import { EmbedRender, EmbedPanel, embedDefaults } from './blocks/embed';

export type { RenderContext, BlockDef, EditingContext } from './registryTypes';

export const REGISTRY: Record<BlockType, BlockDef> = {
  navbar: {
    type: 'navbar',
    label: 'Navbar',
    group: 'estrutura',
    defaults: () => navbarDefaults() as unknown as Record<string, unknown>,
    tokens: ['account.name'],
    Render: NavbarRender,
    Panel: NavbarPanel,
    slots: [
      { id: 'logoText', kind: 'text', label: 'Logo' },
      { id: 'cta', kind: 'button', label: 'Botão' },
    ],
  },
  hero: {
    type: 'hero',
    label: 'Hero',
    group: 'conteudo',
    defaults: () => heroDefaults() as unknown as Record<string, unknown>,
    tokens: ['account.name', 'account.industry'],
    Render: HeroRender,
    Panel: HeroPanel,
    slots: [
      { id: 'eyebrow', kind: 'text', label: 'Chamada superior' },
      { id: 'headline', kind: 'text', label: 'Título' },
      { id: 'subheadline', kind: 'text', label: 'Subtítulo' },
      { id: 'cta', kind: 'button', label: 'Botão' },
      { id: 'image', kind: 'image', label: 'Imagem' },
    ],
  },
  logos: {
    type: 'logos',
    label: 'Logos de clientes',
    group: 'prova',
    defaults: () => logosDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: LogosRender,
    Panel: LogosPanel,
    slots: [
      { id: 'title', kind: 'text', label: 'Título' },
    ],
  },
  features: {
    type: 'features',
    label: 'Diferenciais',
    group: 'conteudo',
    defaults: () => featuresDefaults() as unknown as Record<string, unknown>,
    tokens: ['account.industry'],
    Render: FeaturesRender,
    Panel: FeaturesPanel,
    slots: [
      { id: 'title', kind: 'text', label: 'Título' },
    ],
  },
  richtext: {
    type: 'richtext',
    label: 'Texto livre',
    group: 'conteudo',
    defaults: () => richtextDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: RichTextRender,
    Panel: RichTextPanel,
    slots: [
      { id: 'title', kind: 'text', label: 'Título' },
      { id: 'body', kind: 'text', label: 'Texto' },
    ],
  },
  media: {
    type: 'media',
    label: 'Imagem/Vídeo',
    group: 'conteudo',
    defaults: () => mediaDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: MediaRender,
    Panel: MediaPanel,
    slots: [
      { id: 'image', kind: 'image', label: 'Imagem' },
      { id: 'caption', kind: 'text', label: 'Legenda' },
    ],
  },
  testimonial: {
    type: 'testimonial',
    label: 'Depoimento',
    group: 'prova',
    defaults: () => testimonialDefaults() as unknown as Record<string, unknown>,
    tokens: ['account.name'],
    Render: TestimonialRender,
    Panel: TestimonialPanel,
    slots: [
      { id: 'quote', kind: 'text', label: 'Depoimento' },
      { id: 'authorName', kind: 'text', label: 'Nome' },
      { id: 'authorRole', kind: 'text', label: 'Cargo/Empresa' },
    ],
  },
  stats: {
    type: 'stats',
    label: 'Métricas',
    group: 'prova',
    defaults: () => statsDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: StatsRender,
    Panel: StatsPanel,
    slots: [
      { id: 'title', kind: 'text', label: 'Título' },
    ],
  },
  cta: {
    type: 'cta',
    label: 'Chamada para ação',
    group: 'conversao',
    defaults: () => ctaDefaults() as unknown as Record<string, unknown>,
    tokens: ['contact.firstName', 'account.name'],
    Render: CtaRender,
    Panel: CtaPanel,
    slots: [
      { id: 'headline', kind: 'text', label: 'Título' },
      { id: 'subheadline', kind: 'text', label: 'Subtítulo' },
      { id: 'cta', kind: 'button', label: 'Botão' },
    ],
  },
  form: {
    type: 'form',
    label: 'Formulário',
    group: 'conversao',
    defaults: () => formDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: FormRender,
    Panel: FormPanel,
    slots: [
      { id: 'title', kind: 'text', label: 'Título' },
      { id: 'subtitle', kind: 'text', label: 'Subtítulo' },
    ],
  },
  faq: {
    type: 'faq',
    label: 'Perguntas frequentes',
    group: 'conteudo',
    defaults: () => faqDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: FaqRender,
    Panel: FaqPanel,
    slots: [
      { id: 'title', kind: 'text', label: 'Título' },
    ],
  },
  footer: {
    type: 'footer',
    label: 'Rodapé',
    group: 'estrutura',
    defaults: () => footerDefaults() as unknown as Record<string, unknown>,
    tokens: ['account.name'],
    Render: FooterRender,
    Panel: FooterPanel,
    slots: [
      { id: 'companyText', kind: 'text', label: 'Texto de rodapé' },
    ],
  },
  spacer: {
    type: 'spacer',
    label: 'Espaçador',
    group: 'estrutura',
    defaults: () => spacerDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: SpacerRender,
    Panel: SpacerPanel,
    slots: [],
  },
  embed: {
    type: 'embed',
    label: 'Vídeo incorporado',
    group: 'conteudo',
    defaults: () => embedDefaults() as unknown as Record<string, unknown>,
    tokens: [],
    Render: EmbedRender,
    Panel: EmbedPanel,
    slots: [],
  },
};

let counter = 0;
function id(): string {
  counter += 1;
  return `blk_${Date.now().toString(36)}_${counter}`;
}

export function newBlock(type: BlockType): Block {
  return {
    id: id(),
    type,
    props: REGISTRY[type].defaults(),
  };
}
