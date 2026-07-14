/**
 * Formatação pura (datas, percentuais, números). Não importa React.
 */
import { TODAY } from '../data/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Zera a hora (UTC) para contar dias de calendário, não frações. */
function startOfUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Dias inteiros entre `date` e `today`. `null` se a data for nula. */
export function daysAgo(date: Date | null, today: Date = TODAY): number | null {
  if (!date) return null;
  return Math.round((startOfUTCDay(today) - startOfUTCDay(date)) / MS_PER_DAY);
}

/**
 * "Nunca" | "em 3d" (futuro) | "Hoje" | "1d atrás" | "24d atrás".
 *
 * `daysAgo` é negativo para datas futuras (ex.: `dueDate` a vencer) — chamar
 * isso de "Hoje" seria mentira. O futuro ganha rótulo próprio.
 */
export function formatDaysAgo(date: Date | null, today: Date = TODAY): string {
  const d = daysAgo(date, today);
  if (d === null) return 'Nunca';
  if (d < 0) return `em ${-d}d`;
  if (d === 0) return 'Hoje';
  return `${d}d atrás`;
}

/** `formatPct(0.412)` → `"41%"`; `formatPct(0.412, 1)` → `"41,2%"` */
export function formatPct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  const value = (n * 100).toFixed(digits);
  return `${value.replace('.', ',')}%`;
}

/** Número no locale pt-BR. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n);
}

/**
 * Variação percentual de `prev` para `curr`.
 * - `prev === 0 && curr > 0` → +100% (up)
 * - `prev === 0 && curr === 0` → 0% (flat)
 */
export function formatDelta(
  curr: number,
  prev: number,
): { pct: number; label: string; dir: 'up' | 'down' | 'flat' } {
  let pct: number;
  if (prev === 0) {
    pct = curr > 0 ? 100 : 0;
  } else {
    pct = ((curr - prev) / Math.abs(prev)) * 100;
  }
  const rounded = Math.round(pct);
  const dir: 'up' | 'down' | 'flat' = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const sign = rounded > 0 ? '+' : '';
  return { pct: rounded, label: `${sign}${rounded}%`, dir };
}
