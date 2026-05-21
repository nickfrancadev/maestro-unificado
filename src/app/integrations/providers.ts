// Provider catalog: name, description, icon, OAuth scopes, docs link.

import type { IntegrationMeta } from './types';

export const INTEGRATION_META: Record<string, IntegrationMeta> = {
  linkedin: {
    name: 'LinkedIn Ads',
    description:
      'Valide contas, crie campanhas e sincronize metricas diretamente com o LinkedIn Marketing API.',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
    permissions: [
      'r_ads — Ler Campanhas',
      'r_ads_reporting — Ler Analytics',
      'rw_ads — Criar/Editar Campanhas',
      'r_organization_social — Dados de Organizacao',
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
  },
  salesforce: {
    name: 'Salesforce CRM',
    description:
      'Importe contas alvo, sincronize contatos do buying committee e atualize status de leads.',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
    permissions: ['Ler Contas', 'Atualizar Leads', 'Ler Oportunidades'],
    docsUrl: 'https://developer.salesforce.com/',
  },
  hubspot: {
    name: 'HubSpot',
    description:
      'Automacao de marketing, rastreamento de engajamento e sincronizacao de contatos.',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/1/15/HubSpot_Logo.png',
    permissions: ['Ler Contatos', 'Rastrear Atividades', 'Gerenciar Listas'],
    docsUrl: 'https://developers.hubspot.com/',
  },
  slack: {
    name: 'Slack',
    description:
      'Receba notificacoes de aprovacao, alertas de campanha e atualizacoes em tempo real.',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg',
    permissions: ['Enviar Mensagens', 'Gerenciar Canais'],
    docsUrl: 'https://api.slack.com/',
  },
};
