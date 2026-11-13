// Formatação única da área de Campanhas, sempre em pt-BR. Antes cada tela
// montava o número do seu jeito (toFixed com ponto, toLocaleString no locale do
// navegador, "R$" ou "$" fixos), e o mesmo valor aparecia de formas diferentes.

const CURRENCY_SYMBOL: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€' };

function symbol(currency: string): string {
  return CURRENCY_SYMBOL[currency] || currency || 'R$';
}

/** Moeda com 2 casas: R$ 1.234,56. A partir de 10 mil, compacta: R$ 12,3 mil. */
export function fmtCurrency(amount: number, currency: string): string {
  const s = symbol(currency);
  if (Math.abs(amount) >= 10000) {
    return `${s} ${(amount / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return `${s} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Inteiros com separador de milhar; a partir de 10 mil, compacta (12,3 mil / 1,2 mi). */
export function fmtNum(n: number): string {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 10000) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return Math.round(n).toLocaleString('pt-BR');
}

/** Recebe o valor JÁ em porcentagem (6.25 → "6,25%"). */
export function fmtPct(value: number, digits = 2): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/** Métrica que o LinkedIn pode não devolver: mostra "—" em vez de um 0 falso. */
export function fmtOptional(value: number | null | undefined, format: (n: number) => string = fmtNum): string {
  return value == null || Number.isNaN(value) ? '—' : format(value);
}

export function fmtDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
}

/** "2026-10-27" → "27/10/2026". Sem passar por Date, para não trocar o dia pelo fuso. */
export function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d.slice(0, 2)}/${m}/${y}`;
}

/** Símbolo da moeda da conta de anúncios (USD → "US$"). */
export function currencySymbol(currency: string): string {
  return symbol(currency);
}

/** Moeda sempre por extenso, sem compactar: para frases de gasto, onde "12,3 mil" esconde centavos. */
export function fmtMoney(amount: number, currency: string): string {
  return `${symbol(currency)} ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Dias corridos entre duas datas "AAAA-MM-DD", contando as duas pontas. Null se faltar uma. */
export function daysInclusive(start: string, end: string): number | null {
  if (!start || !end) return null;
  const a = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10));
  const b = Date.UTC(+end.slice(0, 4), +end.slice(5, 7) - 1, +end.slice(8, 10));
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return Math.round((b - a) / 86400000) + 1;
}

/** Média de dias num mês, para o "≈ por mês" do orçamento diário. */
export const DAYS_PER_MONTH = 30;

export interface SpendInput {
  /** Orçamento de cada conjunto (cada empresa). */
  perAdSet: number;
  /** Número de empresas; 0 = ainda não escolhidas. */
  adSets: number;
  budgetType: 'daily' | 'total';
  currency: string;
  startDate?: string;
  endDate?: string;
}

/**
 * A frase de gasto que toda tela com dinheiro mostra. O orçamento é POR
 * conjunto, e cada empresa é um conjunto: a multiplicação fica escrita na
 * frase para ninguém publicar 10 empresas achando que vai gastar o valor de uma.
 */
export function spendStatement(input: SpendInput): { headline: string; detail: string | null; maxTotal: number | null } {
  const { perAdSet, adSets, budgetType, currency, startDate = '', endDate = '' } = input;
  const total = perAdSet * adSets;
  const breakdown = `${adSets} ${adSets === 1 ? 'empresa' : 'empresas'} × ${fmtMoney(perAdSet, currency)}`;
  const days = daysInclusive(startDate, endDate);

  if (budgetType === 'total') {
    return {
      headline: `Você vai gastar até ${fmtMoney(total, currency)} no total (${breakdown}).`,
      detail: days ? `Distribuído entre ${fmtDate(startDate)} e ${fmtDate(endDate)} (${days} ${days === 1 ? 'dia' : 'dias'}).` : null,
      maxTotal: total,
    };
  }
  const month = total * DAYS_PER_MONTH;
  return {
    headline: `Você vai gastar até ${fmtMoney(total, currency)} por dia (${breakdown}), ≈ ${fmtMoney(month, currency)} por mês.`,
    detail: days
      ? `De ${fmtDate(startDate)} a ${fmtDate(endDate)} (${days} ${days === 1 ? 'dia' : 'dias'}), o máximo é ${fmtMoney(total * days, currency)}.`
      : 'Sem data de encerramento: o gasto continua até você pausar a campanha.',
    maxTotal: days ? total * days : null,
  };
}
