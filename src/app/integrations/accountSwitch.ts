// Aviso ao trocar a conta de anúncios (F125). A conta é de onde a Maestro lê e
// onde publica; trocar não mexe no que já está no LinkedIn, mas tira essas
// campanhas da vista. O aviso diz isso ANTES de confirmar.

export interface AccountRef {
  id: string;
  name?: string | null;
  currency?: string | null;
}

export interface AccountSwitchWarning {
  title: string;
  items: string[];
  /** Texto da caixa que o usuário marca para liberar o "Trocar conta". */
  acknowledge: string;
}

/** `null` quando não é troca: primeira escolha ou a mesma conta. */
export function accountSwitchWarning(current: AccountRef | null, next: AccountRef | null): AccountSwitchWarning | null {
  if (!current?.id || !next?.id || current.id === next.id) return null;
  const from = current.name ? `"${current.name}"` : 'atual';
  const items = [
    `As campanhas já publicadas na conta ${from} continuam no LinkedIn, no ar e gastando como estão. A Maestro deixa de mostrá-las na lista e no analytics.`,
    `Para pausar ou excluir essas campanhas, volte para a conta ${from} ou use o Campaign Manager do LinkedIn.`,
    'Novas publicações, inclusive as de rascunhos salvos, passam a usar a nova conta.',
  ];
  if (current.currency && next.currency && current.currency !== next.currency) {
    items.push(`A moeda muda de ${current.currency} para ${next.currency}: confira os orçamentos dos rascunhos antes de publicar.`);
  }
  return {
    title: 'Trocar a conta afeta as campanhas existentes',
    items,
    acknowledge: 'Entendi o que acontece com as campanhas da conta atual',
  };
}
