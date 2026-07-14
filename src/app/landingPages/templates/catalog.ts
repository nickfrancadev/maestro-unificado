// ABM template catalog — seed templates for account-based landing pages.
// Each template is a pure function that builds a fresh, independent Block[]
// (via newBlock + prop overrides) so pages don't share mutable state.
import type { Block } from '../schema/blockTypes';
import { newBlock } from '../schema/registry';

export interface TemplateDef {
  id: string;
  name: string;
  useCase: string;
  play: string | null;
  tags: string[];
  buildBlocks: () => Block[];
}

function microsite1a1Blocks(): Block[] {
  const navbar = newBlock('navbar');
  navbar.props = {
    ...navbar.props,
    logoText: '{{account.name}} × Nossa Empresa',
    ctaLabel: 'Agendar conversa',
    ctaHref: '#form',
  };

  const hero = newBlock('hero');
  hero.props = {
    ...hero.props,
    eyebrow: 'Proposta exclusiva para {{account.name}}',
    headline: 'Uma solução sob medida para {{account.name}}',
    subheadline:
      'Preparamos esta página especialmente para {{account.name}} considerando os desafios do setor de {{account.industry}}.',
    ctaLabel: 'Falar com o time responsável',
    ctaHref: '#form',
  };

  const stats = newBlock('stats');
  stats.props = {
    ...stats.props,
    title: `Resultados que times como o da {{account.name}} alcançam`,
    items: [
      { value: '3x', label: 'Mais velocidade em campanhas' },
      { value: '45%', label: 'Redução de custo por lead' },
      { value: '30 dias', label: 'Tempo médio até o primeiro resultado' },
    ],
  };

  const features = newBlock('features');
  features.props = {
    ...features.props,
    title: `Pensado para o momento da {{account.name}}`,
    items: [
      { title: 'Onboarding dedicado', description: 'Time dedicado para acompanhar a implantação na {{account.name}}.' },
      { title: `Feito para {{account.industry}}`, description: 'Configurações e integrações pensadas para o seu setor.' },
      { title: 'Suporte prioritário', description: 'Canal direto com especialistas sempre que precisar.' },
    ],
  };

  const testimonial = newBlock('testimonial');
  testimonial.props = {
    ...testimonial.props,
    quote: 'A parceria transformou a forma como {{account.name}} conduz suas campanhas.',
  };

  const cta = newBlock('cta');
  cta.props = {
    ...cta.props,
    headline: 'Vamos conversar, {{contact.firstName}}?',
    subheadline: 'Monte um plano personalizado para {{account.name}} com o nosso time.',
    buttonLabel: 'Agendar demonstração',
    buttonHref: '#form',
  };

  const form = newBlock('form');
  form.props = {
    ...form.props,
    title: `Fale com a gente sobre a {{account.name}}`,
    subtitle: 'Preencha os dados e nosso time entra em contato em até 1 dia útil.',
  };

  const footer = newBlock('footer');
  footer.props = {
    ...footer.props,
    companyText: '© {{account.name}} × Nossa Empresa · Página exclusiva',
  };

  return [navbar, hero, stats, features, testimonial, cta, form, footer];
}

function verticalBlocks(): Block[] {
  const navbar = newBlock('navbar');
  navbar.props = {
    ...navbar.props,
    logoText: 'Nossa Empresa',
    ctaLabel: 'Ver demonstração',
    ctaHref: '#form',
  };

  const hero = newBlock('hero');
  hero.props = {
    ...hero.props,
    eyebrow: 'Feito para o setor de {{account.industry}}',
    headline: 'A plataforma criada para empresas de {{account.industry}}',
    subheadline: 'Ferramentas, integrações e conteúdo pensados para os desafios específicos de {{account.industry}}.',
    ctaLabel: 'Quero saber mais',
    ctaHref: '#form',
  };

  const logos = newBlock('logos');
  logos.props = {
    ...logos.props,
    title: `Empresas de {{account.industry}} que já usam a plataforma`,
  };

  const features = newBlock('features');
  features.props = {
    ...features.props,
    title: `Recursos criados para {{account.industry}}`,
    items: [
      { title: 'Integrações do setor', description: 'Conecte as ferramentas mais usadas em {{account.industry}}.' },
      { title: 'Compliance e segurança', description: 'Atendemos aos requisitos específicos do seu segmento.' },
      { title: 'Casos de sucesso', description: 'Times de {{account.industry}} que já viram resultado.' },
    ],
  };

  const faq = newBlock('faq');
  faq.props = {
    ...faq.props,
    title: `Perguntas comuns de empresas de {{account.industry}}`,
  };

  const cta = newBlock('cta');
  cta.props = {
    ...cta.props,
    headline: 'Pronto para transformar a {{account.name}}?',
    subheadline: 'Veja como empresas de {{account.industry}} estão crescendo com a gente.',
    buttonLabel: 'Falar com um especialista',
    buttonHref: '#form',
  };

  const form = newBlock('form');
  form.props = {
    ...form.props,
    title: 'Solicite uma conversa',
    subtitle: `Conte um pouco sobre a {{account.name}} e o seu contexto em {{account.industry}}.`,
  };

  const footer = newBlock('footer');

  return [navbar, hero, logos, features, faq, cta, form, footer];
}

function pocBlocks(): Block[] {
  const navbar = newBlock('navbar');
  navbar.props = {
    ...navbar.props,
    logoText: 'Nossa Empresa',
    ctaLabel: 'Iniciar POC',
    ctaHref: '#form',
  };

  const hero = newBlock('hero');
  hero.props = {
    ...hero.props,
    eyebrow: 'Proof of Concept para {{account.name}}',
    headline: 'Valide o impacto na {{account.name}} em poucas semanas',
    subheadline:
      'Uma prova de conceito guiada, com metas claras e acompanhamento dedicado para o time da {{account.name}}.',
    ctaLabel: 'Solicitar POC',
    ctaHref: '#form',
  };

  const richtext = newBlock('richtext');
  richtext.props = {
    ...richtext.props,
    title: 'Como funciona a POC',
    body:
      'Definimos, junto com a {{account.name}}, os critérios de sucesso da avaliação.\n\nEm até 4 semanas, o time da {{account.name}} testa a solução em um cenário real, com suporte próximo do nosso time.',
  };

  const stats = newBlock('stats');
  stats.props = {
    ...stats.props,
    title: 'O que times avaliam durante a POC',
    items: [
      { value: '4 semanas', label: 'Duração média da avaliação' },
      { value: '100%', label: 'Acompanhamento dedicado' },
      { value: '0', label: 'Custo de implantação inicial' },
    ],
  };

  const faq = newBlock('faq');
  faq.props = {
    ...faq.props,
    title: 'Perguntas frequentes sobre a POC',
    items: [
      { question: 'Quanto tempo dura a POC?', answer: 'Normalmente 4 semanas, ajustável ao cronograma da {{account.name}}.' },
      { question: 'Preciso de equipe técnica dedicada?', answer: 'Recomendamos um responsável do lado da {{account.name}}, mas nosso time conduz a maior parte do trabalho.' },
    ],
  };

  const cta = newBlock('cta');
  cta.props = {
    ...cta.props,
    headline: 'Vamos validar isso na {{account.name}}?',
    subheadline: 'Fale com nosso time e defina os critérios de sucesso da sua POC.',
    buttonLabel: 'Solicitar proposta de POC',
    buttonHref: '#form',
  };

  const form = newBlock('form');
  form.props = {
    ...form.props,
    title: 'Solicitar POC',
    subtitle: `Conte os objetivos da {{account.name}} para montarmos um plano de avaliação.`,
  };

  const footer = newBlock('footer');

  return [navbar, hero, richtext, stats, faq, cta, form, footer];
}

function demoInviteBlocks(): Block[] {
  const navbar = newBlock('navbar');
  navbar.props = {
    ...navbar.props,
    logoText: 'Nossa Empresa',
    ctaLabel: 'Confirmar presença',
    ctaHref: '#form',
  };

  const hero = newBlock('hero');
  hero.props = {
    ...hero.props,
    eyebrow: 'Convite exclusivo para {{account.name}}',
    headline: '{{contact.firstName}}, participe de uma demonstração para a {{account.name}}',
    subheadline:
      'Uma sessão personalizada mostrando como a {{account.name}} pode aplicar a solução no dia a dia.',
    ctaLabel: 'Confirmar presença',
    ctaHref: '#form',
  };

  const media = newBlock('media');
  media.props = {
    ...media.props,
    caption: `Prévia do que será apresentado para o time da {{account.name}}`,
  };

  const features = newBlock('features');
  features.props = {
    ...features.props,
    title: 'O que vamos mostrar na demonstração',
    items: [
      { title: 'Casos de uso reais', description: 'Exemplos aplicados ao contexto de {{account.industry}}.' },
      { title: 'Tour guiado', description: 'Demonstração ao vivo com espaço para perguntas do time da {{account.name}}.' },
      { title: 'Próximos passos', description: 'Um plano claro caso a {{account.name}} queira avançar.' },
    ],
  };

  const testimonial = newBlock('testimonial');
  testimonial.props = {
    ...testimonial.props,
    quote: 'A demonstração foi decisiva para mostrarmos o valor da solução para a {{account.name}}.',
  };

  const cta = newBlock('cta');
  cta.props = {
    ...cta.props,
    headline: 'Garanta sua vaga, {{contact.firstName}}',
    subheadline: 'As vagas são limitadas para manter a sessão personalizada para a {{account.name}}.',
    buttonLabel: 'Confirmar presença',
    buttonHref: '#form',
  };

  const form = newBlock('form');
  form.props = {
    ...form.props,
    title: 'Confirme sua presença',
    subtitle: `Escolha o melhor horário para o time da {{account.name}}.`,
  };

  const footer = newBlock('footer');

  return [navbar, hero, media, features, testimonial, cta, form, footer];
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'microsite-1a1',
    name: 'Microsite 1:1',
    useCase: 'Página exclusiva e altamente personalizada para uma única conta estratégica.',
    play: 'account-executive',
    tags: ['1:1', 'estrategica', 'personalizada'],
    buildBlocks: microsite1a1Blocks,
  },
  {
    id: 'vertical',
    name: 'Página por vertical',
    useCase: 'Landing page 1:muitos segmentada por setor/indústria, reaproveitável entre contas do mesmo vertical.',
    play: 'marketing',
    tags: ['1:muitos', 'vertical', 'setor'],
    buildBlocks: verticalBlocks,
  },
  {
    id: 'poc',
    name: 'Convite para POC',
    useCase: 'Página para engajar contas em uma prova de conceito guiada, com critérios de sucesso claros.',
    play: 'sales-engineering',
    tags: ['poc', 'avaliacao', 'tecnico'],
    buildBlocks: pocBlocks,
  },
  {
    id: 'demo-invite',
    name: 'Convite para demonstração',
    useCase: 'Página de convite para uma demonstração ao vivo personalizada para a conta e o contato.',
    play: 'sales-development',
    tags: ['demo', 'convite', 'evento'],
    buildBlocks: demoInviteBlocks,
  },
];

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
