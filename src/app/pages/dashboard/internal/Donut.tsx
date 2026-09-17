/**
 * Donut de duas fatias (abertas vs fechadas), em SVG puro.
 *
 * Feito à mão em vez de Recharts por três motivos: é um arco, não um gráfico;
 * renderiza em jsdom (o `ResponsiveContainer` colapsa para 0×0 nos testes); e
 * dá controle exato sobre o respiro de 2px entre as fatias.
 */
import { CLOSED_COLOR, INK, INK_MUTED, OPEN_COLOR, br } from './format';

interface DonutProps {
  open: number;
  closed: number;
  /** Cor da fatia "abertas". A de "fechadas" é sempre o navy recessivo. */
  openColor?: string;
  /** Lido por leitores de tela no lugar do desenho. */
  label: string;
}

const SIZE = 112;
const STROKE = 17;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Respiro entre as fatias, em unidades de arco (≈2px na borda). */
const GAP = 3;

export function Donut({ open, closed, openColor = OPEN_COLOR, label }: DonutProps) {
  const total = open + closed;
  const openRatio = total > 0 ? open / total : 0;
  const openPct = openRatio * 100;

  const openLength = CIRCUMFERENCE * openRatio;
  const closedLength = CIRCUMFERENCE - openLength;

  // Com uma das fatias zerada não há junção para separar: o anel é inteiro de
  // uma cor só e um gap deixaria um entalhe sem significado.
  const split = open > 0 && closed > 0;
  const openDash = split ? Math.max(0, openLength - GAP) : openLength;
  const closedDash = split ? Math.max(0, closedLength - GAP) : closedLength;

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`${label}: ${br(open)} abertas (${br(openPct, 1)}%), ${br(closed)} fechadas`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} fill="none" strokeWidth={STROKE}>
          {/* trilho: garante o anel completo mesmo com total zero */}
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#F1F2F4" />
          {closed > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={CLOSED_COLOR}
              strokeDasharray={`${closedDash} ${CIRCUMFERENCE}`}
              strokeDashoffset={-openLength}
            />
          )}
          {open > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={openColor}
              strokeDasharray={`${openDash} ${CIRCUMFERENCE}`}
            />
          )}
        </g>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-['Euclid_Circular_A',sans-serif] tabular-nums leading-none"
          style={{ fontSize: 22, fontWeight: 700, color: INK }}
        >
          {br(openPct, 1)}%
        </span>
        <span
          className="font-['Euclid_Circular_A',sans-serif] uppercase mt-1"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: INK_MUTED }}
        >
          Abertas
        </span>
      </div>
    </div>
  );
}
