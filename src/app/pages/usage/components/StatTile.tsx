import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useCountUp } from '../../dashboard/useCountUp';
import { formatNumber, formatPct } from '../lib/format';
import { TREND_BAD, TREND_FLAT, TREND_GOOD } from './colors';
import { PendingMarker } from './PendingMarker';

type Delta = { pct: number; dir: 'up' | 'down' | 'flat' };

interface StatTileProps {
  label: string;
  value: number | string;
  delta?: Delta;
  hint?: string;
  format?: 'number' | 'pct' | 'days';
  /** true quando "subir" é ruim (ex.: touchpoints atrasados) */
  invertDelta?: boolean;
  /** métrica ainda não instrumentada pelo produto */
  pending?: boolean;
}

const NAVY = '#212A46';
const MUTED = '#64748B';

const DELTA_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
} as const;

/** Rótulo textual da direção — cor nunca é o único sinal. */
const DELTA_DIR_LABEL = {
  up: 'alta',
  down: 'queda',
  flat: 'estável',
} as const;

function deltaColor(dir: Delta['dir'], invert: boolean): string {
  if (dir === 'flat') return TREND_FLAT;
  const isGood = invert ? dir === 'down' : dir === 'up';
  return isGood ? TREND_GOOD : TREND_BAD;
}

/**
 * `useCountUp` só sabe animar inteiros (arredonda a cada frame). Então
 * animamos um inteiro "cru" e reconstruímos o valor real a partir dele.
 *
 * - `pct`: a fonte é uma fração (0..1, ver `UsageMetrics.playsCloseRate`);
 *   animamos o percentual inteiro (41) e dividimos por 100 na formatação.
 * - `number` / `days`: valores fracionários (ex.: `avgDaysToClose = 12.4`)
 *   perderiam a casa decimal se fossem animados — nesses casos não animamos.
 */
function toCountTarget(n: number, format: StatTileProps['format']): number {
  if (!Number.isFinite(n)) return 0;
  if (format === 'pct') return Math.round(n * 100);
  return Number.isInteger(n) ? n : 0;
}

function fromCountValue(
  counted: number,
  raw: number,
  format: StatTileProps['format'],
): string {
  if (!Number.isFinite(raw)) return '—';
  if (format === 'pct') return formatPct(counted / 100);
  // fracionário: `useCountUp` não serve, usa o valor real
  const n = Number.isInteger(raw) ? counted : raw;
  return format === 'days' ? `${formatNumber(n)}d` : formatNumber(n);
}

export function StatTile({
  label,
  value,
  delta,
  hint,
  format = 'number',
  invertDelta = false,
  pending = false,
}: StatTileProps) {
  const isNumber = typeof value === 'number';
  const raw = isNumber ? (value as number) : 0;
  // Hook precisa ser chamado incondicionalmente.
  const counted = useCountUp(toCountTarget(raw, format));
  const display = isNumber
    ? fromCountValue(counted, raw, format)
    : (value as string);

  const DeltaIcon = delta ? DELTA_ICON[delta.dir] : null;
  const color = delta ? deltaColor(delta.dir, invertDelta) : MUTED;

  return (
    <div
      className="bg-white rounded-xl border border-[#d8d8d8] p-4 flex flex-col gap-1"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-center gap-1.5">
        <p
          className="font-['Euclid_Circular_A',sans-serif] leading-tight"
          style={{ fontSize: 12, fontWeight: 600, color: MUTED }}
        >
          {label}
        </p>

        {/* mesmo mecanismo (Radix popover) que a `UsersTable` — ver PendingMarker */}
        {pending && <PendingMarker />}
      </div>

      <p
        className="font-['Euclid_Circular_A',sans-serif] tabular-nums"
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: pending ? MUTED : NAVY,
          lineHeight: 1.1,
        }}
      >
        {display}
      </p>

      {delta && DeltaIcon && (
        <p
          className="inline-flex items-center gap-1 font-['Euclid_Circular_A',sans-serif] tabular-nums leading-none"
          style={{ fontSize: 12, fontWeight: 600, color }}
        >
          <DeltaIcon size={13} aria-hidden="true" className="shrink-0" />
          <span className="sr-only">{DELTA_DIR_LABEL[delta.dir]} de </span>
          {/* `delta.pct` já vem como percentual inteiro de `formatDelta` (ex.: -12) */}
          {`${Math.abs(Math.round(delta.pct))}%`}
        </p>
      )}

      {hint && (
        <p
          className="font-['Euclid_Circular_A',sans-serif] leading-snug"
          style={{ fontSize: 11, color: MUTED }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
