// Rótulos em português para os valores que o LinkedIn e o servidor devolvem em
// inglês ou como enum. O valor (ACTIVE, LEARN_MORE, brand_awareness…) continua
// indo para a API; só o que aparece na tela passa por aqui.

/** Status de campanha: aceita o enum do LinkedIn e o rótulo em inglês do servidor. */
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa', Active: 'Ativa', active: 'Ativa',
  PAUSED: 'Pausada', Paused: 'Pausada', paused: 'Pausada',
  DRAFT: 'Rascunho', Draft: 'Rascunho', draft: 'Rascunho',
  ARCHIVED: 'Concluída', Completed: 'Concluída', completed: 'Concluída',
  CANCELED: 'Cancelada', Canceled: 'Cancelada', canceled: 'Cancelada',
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_LABELS[status] || status;
}

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Saiba mais',
  SIGN_UP: 'Inscreva-se',
  REGISTER: 'Cadastre-se',
  DOWNLOAD: 'Baixar',
  GET_QUOTE: 'Solicitar orçamento',
  APPLY_NOW: 'Candidate-se',
  SUBSCRIBE: 'Assinar',
  CONTACT_US: 'Fale conosco',
  REQUEST_DEMO: 'Solicitar demonstração',
  JOIN_NOW: 'Participe',
};

export function ctaLabel(cta: string | null | undefined): string {
  if (!cta) return '—';
  return CTA_LABELS[cta.toUpperCase()] || cta;
}

export const CTA_VALUES = Object.keys(CTA_LABELS);

/** Formato do anúncio (campaignType) e tipo de custo, como o anunciante entende. */
const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  SPONSORED_UPDATES: 'Anúncio patrocinado',
  TEXT_AD: 'Anúncio de texto',
  SPONSORED_INMAILS: 'Mensagem patrocinada',
  DYNAMIC: 'Anúncio dinâmico',
};

export function campaignTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  return CAMPAIGN_TYPE_LABELS[type] || type;
}

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativa',
  CANCELED: 'Cancelada',
  DRAFT: 'Em configuração',
  PENDING_DELETION: 'Excluindo',
  REMOVED: 'Removida',
};

export function adAccountStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return ACCOUNT_STATUS_LABELS[status] || status;
}

/** Plural simples: plural(1, 'dia') → "1 dia"; plural(3, 'dia') → "3 dias". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
