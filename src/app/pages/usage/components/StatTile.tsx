import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';
import { useCountUp } from '../../dashboard/useCountUp';
import { formatNumber, formatPct } from '../lib/format';

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
/** Cores de tendência — deliberadamente FORA da rampa de risco. */
const GOOD = '#16A34A';
const BAD = '#EF4444';

const PENDING_HINT =
  'Pendente de instrumentação — dado ainda não rastreado pelo produto';

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
  if (dir === 'flat') return MUTED;
  const isGood = invert ? dir === 'down' : dir === 'up';
  return isGood ? GOOD : BAD;
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
  const [tipOpen, setTipOpen] = useState(false);

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

        {pending && (
          <span className="relative inline-flex">
            <button
              type="button"
              aria-label={PENDING_HINT}
              // acessível por teclado — não é hover-only
              onMouseEnter={() => setTipOpen(true)}
              onMouseLeave={() => setTipOpen(false)}
              onFocus={() => setTipOpen(true)}
              onBlur={() => setTipOpen(false)}
              onClick={() => setTipOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-full text-[#94A3B8] hover:text-[#64748B] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39] focus-visible:ring-offset-1"
            >
              <Info size={13} aria-hidden="true" />
            </button>

            {tipOpen && (
              <span
                role="tooltip"
                className="absolute left-1/2 top-full z-20 mt-1.5 w-52 -translate-x-1/2 rounded-lg px-2.5 py-1.5 font-['Euclid_Circular_A',sans-serif] text-[11px] leading-snug text-white"
                style={{ backgroundColor: NAVY }}
              >
                {PENDING_HINT}
              </span>
            )}
          </span>
        )}
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
