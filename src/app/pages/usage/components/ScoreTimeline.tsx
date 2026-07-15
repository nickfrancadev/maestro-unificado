/**
 * Evolução do score — a trajetória do health score do cliente ao longo das
 * últimas semanas, numa escala Y FIXA (0–100) para que dois períodos, dois
 * clientes ou duas visitas sejam diretamente comparáveis. Substitui o antigo
 * heatmap de atividade, que só media "houve evento?" — um proxy fraco de saúde.
 *
 * A série (`points`) vem de `scoreTimeline` (lib pura): cada ponto é o score
 * sobre uma janela deslizante terminando naquela data, e a série é RECORTADA aos
 * dados reais (tipicamente mais curta que `weeks` — curva curta, mas honesta).
 *
 * Duas linguagens de cor, deliberadamente separadas:
 *  - A CURVA usa a cor do bucket ATUAL (`BUCKET_META[último.bucket].color`), lida
 *    da fonte única em `lib/health` — nunca um hex digitado. É um indicador de
 *    risco: onde a curva termina é a cor do risco de hoje.
 *  - O SELO de tendência usa `TREND_*` (fora da rampa): "melhorou/piorou" é uma
 *    direção, não um nível de risco. Misturar as duas colapsaria a semântica —
 *    ver `colors.ts` e o guard `rampColors.guard.test.ts`.
 */
import {
  Area,
  AreaChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { Period } from '../data/types';
import type { ScorePoint } from '../lib/timeline';
import { BUCKET_META, BUCKET_THRESHOLDS } from '../lib/health';
import { TREND_BAD, TREND_FLAT, TREND_GOOD } from './colors';

interface ScoreTimelineProps {
  points: ScorePoint[];
  period: Period;
  /** Só para o texto do subtítulo — a série pode ser mais curta (recorte real). */
  weeks?: number;
  /**
   * Largura do `ResponsiveContainer`. Em produção fica `"100%"` (responsivo).
   * jsdom não implementa layout, então o `ResponsiveContainer` mede 0×0 e não
   * renderiza a SVG interna; os testes passam uma largura em px para forçar o
   * chart a montar e poderem assertar a cor da curva no SVG. Seam mínimo, sem
   * efeito em produção.
   */
  chartWidth?: number | string;
}

const NAVY = '#212A46';
const MUTED = '#64748B';
const GRID = '#E2E8F0';
/** Marca/seleção — nunca dado. Usado só no tint sutil do período. */
const BRAND = '#FF5F39';

/** dd/mm curto, a partir de um timestamp (UTC, coerente com `TODAY`). */
function ddmm(ms: number): string {
  const d = new Date(ms);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

type Datum = { x: number; score: number; bucket: ScorePoint['bucket'] };

interface TrendBadge {
  dir: 'up' | 'down' | 'flat' | 'none';
  delta: number;
  color: string;
  label: string;
}

/**
 * Selo derivado de `points`: `delta = último.score - primeiro.score`.
 * `|delta| ≤ 2` é estável (ruído do arredondamento não vira "melhora"). Uma
 * série de um ponto só não tem tendência — mostra "novo", sem seta.
 */
function trendOf(points: ScorePoint[]): TrendBadge {
  if (points.length < 2) {
    return { dir: 'none', delta: 0, color: TREND_FLAT, label: 'novo' };
  }
  const delta = Math.round(
    points[points.length - 1].score - points[0].score,
  );
  if (Math.abs(delta) <= 2) {
    return { dir: 'flat', delta, color: TREND_FLAT, label: 'estável' };
  }
  if (delta > 0) {
    return { dir: 'up', delta, color: TREND_GOOD, label: `+${delta} pts` };
  }
  return { dir: 'down', delta, color: TREND_BAD, label: `−${Math.abs(delta)} pts` };
}

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
  none: Minus,
} as const;

interface TooltipPayloadItem {
  payload: Datum;
}

function ScoreTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const meta = BUCKET_META[d.bucket];
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 font-['Euclid_Circular_A',sans-serif] tabular-nums"
      style={{
        background: '#fff',
        border: `1px solid ${GRID}`,
        boxShadow: '0 4px 12px rgba(33,42,70,0.12)',
      }}
    >
      <p className="text-xs" style={{ color: MUTED }}>
        {ddmm(d.x)}
      </p>
      <p className="text-sm font-semibold" style={{ color: NAVY }}>
        {d.score}
        <span className="font-normal" style={{ color: meta.color }}>
          {' · '}
          {meta.label}
        </span>
      </p>
    </div>
  );
}

export function ScoreTimeline({
  points,
  period,
  weeks = 12,
  chartWidth = '100%',
}: ScoreTimelineProps) {
  const reduced = useReducedMotion();
  const trend = trendOf(points);
  const TrendIcon = TREND_ICON[trend.dir];

  // Cor da curva = bucket do ÚLTIMO ponto, lida de BUCKET_META (nunca hex fixo).
  const lastBucket = points.length > 0 ? points[points.length - 1].bucket : 'healthy';
  const lineColor = BUCKET_META[lastBucket].color;
  const gradientId = `score-grad-${lastBucket}`;

  const data: Datum[] = points.map((p) => ({
    x: p.date.getTime(),
    score: p.score,
    bucket: p.bucket,
  }));

  const periodStart = period.start.getTime();
  const periodEnd = period.end.getTime();

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
            Evolução do score
          </h3>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            Últimas {weeks} semanas
          </p>
        </div>

        {/* Selo de tendência: ícone lucide + palavra + cor de TENDÊNCIA (fora da
            rampa). Cor nunca é o único sinal — o ícone e o texto carregam a direção. */}
        <span
          className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums shrink-0"
          style={{ color: trend.color }}
          data-testid="trend-badge"
        >
          <TrendIcon size={14} aria-hidden="true" className="shrink-0" />
          {trend.label}
        </span>
      </div>

      {points.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: MUTED }}>
          Sem histórico de score no período.
        </p>
      ) : (
        <div>
          <ResponsiveContainer width={chartWidth} height={180}>
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
              <defs key="score-defs">
                <linearGradient
                  key={gradientId}
                  id={gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Tint sutil do período selecionado dentro da janela fixa. Marca,
                  não dado — não briga com a curva a 6% de opacidade. */}
              <ReferenceArea
                key="period-area"
                x1={periodStart}
                x2={periodEnd}
                fill={BRAND}
                fillOpacity={0.06}
                stroke="none"
                ifOverflow="hidden"
                label={{
                  value: 'período',
                  position: 'insideTopRight',
                  fontSize: 10,
                  fill: MUTED,
                }}
              />

              {/* Fronteiras de bucket (30/55/75) — finas, em cinza de gridline. */}
              <ReferenceLine key="thr-critical" y={BUCKET_THRESHOLDS.critical} stroke={GRID} strokeWidth={1} />
              <ReferenceLine key="thr-at_risk" y={BUCKET_THRESHOLDS.at_risk} stroke={GRID} strokeWidth={1} />
              <ReferenceLine key="thr-watch" y={BUCKET_THRESHOLDS.watch} stroke={GRID} strokeWidth={1} />

              <XAxis
                key="x-axis"
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={ddmm}
                tick={{ fontSize: 11, fill: MUTED }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                minTickGap={24}
              />
              <YAxis
                key="y-axis"
                domain={[0, 100]}
                ticks={[0, 30, 55, 75, 100]}
                tick={{ fontSize: 11, fill: MUTED }}
                tickLine={false}
                axisLine={false}
                width={32}
              />

              <Tooltip key="tooltip" content={<ScoreTooltip />} />

              <Area
                key="score-area"
                type="monotone"
                dataKey="score"
                stroke={lineColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={points.length === 1 ? { r: 3, fill: lineColor, stroke: lineColor } : false}
                activeDot={{ r: 4, fill: lineColor, stroke: '#fff', strokeWidth: 1.5 }}
                isAnimationActive={!reduced}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
