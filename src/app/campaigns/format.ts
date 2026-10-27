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
