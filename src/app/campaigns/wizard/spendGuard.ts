// Confirmação de gasto alto (F035).
//
// Acima de um teto mensal, o assistente só avança (e a Revisão só publica)
// depois de o anunciante marcar "Confirmo o gasto estimado", com a frase de
// gasto na frente dele. O teto é o do produto: 1.000 por mês, na moeda da
// conta de anúncios. Constante única: o passo Configuração, o gate do wizard e
// o checklist da Revisão leem daqui.
import { daysInclusive, DAYS_PER_MONTH } from '../format';
import type { CampaignConfig } from './types';

/** Gasto mensal estimado acima do qual é preciso confirmar. Na moeda da conta. */
export const HIGH_SPEND_MONTHLY_THRESHOLD = 1000;

type SpendConfig = Pick<CampaignConfig, 'budgetAmount' | 'budgetType' | 'startDate' | 'endDate' | 'spendConfirmedMonthly'>;

/**
 * Gasto estimado por mês, somando todos os conjuntos. Sem empresas escolhidas
 * ainda (primeira passada pelo passo 1), conta um conjunto: é o mínimo que vai
 * ao ar. Orçamento total: espalhado pelos dias da campanha; campanha de até um
 * mês (ou sem data de fim) gasta o total dentro de um mês.
 */
export function monthlySpendEstimate(config: SpendConfig, adSets: number): number {
  const perAdSet = parseFloat(config.budgetAmount) || 0;
  const total = perAdSet * Math.max(adSets, 1);
  if (config.budgetType === 'daily') return total * DAYS_PER_MONTH;
  const days = daysInclusive(config.startDate, config.endDate);
  return days && days > DAYS_PER_MONTH ? (total * DAYS_PER_MONTH) / days : total;
}

export function needsSpendConfirmation(config: SpendConfig, adSets: number): boolean {
  return monthlySpendEstimate(config, adSets) > HIGH_SPEND_MONTHLY_THRESHOLD;
}

/**
 * Confirmado vale para o valor que foi confirmado: subir o orçamento ou
 * escolher mais empresas depois pede confirmação de novo.
 */
export function isSpendConfirmed(config: SpendConfig, adSets: number): boolean {
  if (!needsSpendConfirmation(config, adSets)) return true;
  return (config.spendConfirmedMonthly ?? 0) >= monthlySpendEstimate(config, adSets);
}
