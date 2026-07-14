/**
 * Heatmap de atividade (7 dias × N semanas).
 *
 * Heatmaps são fracos em acessibilidade — a intensidade de cor é o único canal
 * e não é lida por leitor de tela nem por quem tem baixa visão. Mitigações
 * obrigatórias implementadas aqui:
 *   (a) cada célula é focável por teclado e tem tooltip/`title`/`aria-label`
 *       com o VALOR NUMÉRICO EXATO e a DATA;
 *   (b) a legenda mostra os LIMITES NUMÉRICOS da escala, não só "menos → mais";
 *   (c) célula com 0 é cinza claro visível, nunca invisível.
 *
 * Intensidade em um único matiz navy (5 níveis). Nada da rampa de risco: isto
 * mede volume, não churn.
 */
import { useState } from 'react';
import { TODAY } from '../data/types';

const NAVY = '#212A46';
const MUTED = '#64748B';
const EMPTY_CELL = '#E9EDF2';

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const DAY_NAMES = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
];

/** 5 níveis: 0 (cinza) + 4 tons de navy com opacidade crescente. */
const LEVEL_COLORS = [EMPTY_CELL, '#C6CBD6', '#949BAF', '#5B6480', NAVY];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ActivityHeatmapProps {
  cells: { week: number; day: number; count: number }[];
  weeks: number;
  /** Âncora "hoje" — só para derivar a data de cada célula. */
  today?: Date;
}

/**
 * Limites da escala derivados do máximo observado (quartis). Sempre crescentes
 * e >= 1, para que a legenda nunca mostre "1–1 / 1–1".
 */
export function thresholds(max: number): [number, number, number, number] {
  const q = (f: number) => Math.max(1, Math.round(max * f));
  const t1 = 1;
  const t2 = Math.max(t1 + 1, q(0.25));
  const t3 = Math.max(t2 + 1, q(0.5));
  const t4 = Math.max(t3 + 1, q(0.75));
  return [t1, t2, t3, t4];
}

export function levelOf(count: number, ts: [number, number, number, number]): number {
  if (count <= 0) return 0;
  if (count < ts[1]) return 1;
  if (count < ts[2]) return 2;
  if (count < ts[3]) return 3;
  return 4;
}

/**
 * Inverte o mapeamento do seletor: a coluna `weeks - 1` é a semana atual e
 * `day` é o dia da semana em UTC (0 = domingo).
 */
export function dateOfCell(week: number, day: number, weeks: number, today: Date): Date {
  const weekBack = weeks - 1 - week;
  const offsetInWeek = (today.getUTCDay() - day + 7) % 7;
  return new Date(today.getTime() - (weekBack * 7 + offsetInWeek) * MS_PER_DAY);
}

function formatDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export function ActivityHeatmap({ cells, weeks, today = TODAY }: ActivityHeatmapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const max = cells.reduce((m, c) => Math.max(m, c.count), 0);
  const total = cells.reduce((s, c) => s + c.count, 0);
  const ts = thresholds(max);

  const byKey = new Map<string, number>();
  for (const c of cells) byKey.set(`${c.week}:${c.day}`, c.count);

  const legendRanges = [
    `0`,
    `${ts[0]}–${ts[1] - 1}`,
    `${ts[1]}–${ts[2] - 1}`,
    `${ts[2]}–${ts[3] - 1}`,
    `${ts[3]}+`,
  ];

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
          Atividade por dia
        </h3>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
          Últimas {weeks} semanas · {total.toLocaleString('pt-BR')} eventos
        </p>
      </div>

      {cells.length === 0 || weeks <= 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
          Sem dados de atividade para o período.
        </p>
      ) : (
        <>
          {total === 0 && (
            <p className="text-xs mb-3" style={{ color: MUTED }}>
              Nenhuma atividade registrada nas últimas {weeks} semanas.
            </p>
          )}

          <div className="flex gap-2 overflow-x-auto">
            <div className="grid shrink-0" style={{ gridTemplateRows: 'repeat(7, 14px)', gap: 3 }}>
              {DAY_LABELS.map((label, d) => (
                <span
                  key={d}
                  className="text-[10px] leading-[14px] w-3 text-right"
                  style={{ color: MUTED }}
                  aria-hidden="true"
                >
                  {label}
                </span>
              ))}
            </div>

            <div
              role="grid"
              aria-label={`Atividade diária das últimas ${weeks} semanas`}
              className="grid"
              style={{
                gridTemplateRows: 'repeat(7, 14px)',
                gridAutoFlow: 'column',
                gridAutoColumns: '14px',
                gap: 3,
              }}
            >
              {Array.from({ length: weeks }).flatMap((_, w) =>
                DAY_LABELS.map((_label, d) => {
                  const key = `${w}:${d}`;
                  const count = byKey.get(key) ?? 0;
                  const date = dateOfCell(w, d, weeks, today);
                  const desc = `${count} ${count === 1 ? 'evento' : 'eventos'} em ${DAY_NAMES[d]}, ${formatDate(date)}`;
                  return (
                    <div
                      key={key}
                      role="gridcell"
                      tabIndex={0}
                      title={desc}
                      aria-label={desc}
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
                      onFocus={() => setHovered(key)}
                      onBlur={() => setHovered((h) => (h === key ? null : h))}
                      className="relative rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
                      style={{
                        background: LEVEL_COLORS[levelOf(count, ts)],
                        width: 14,
                        height: 14,
                      }}
                    >
                      {hovered === key && (
                        <span
                          role="tooltip"
                          className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded px-2 py-1 text-[11px] text-white tabular-nums pointer-events-none"
                          style={{ background: NAVY }}
                        >
                          {count} {count === 1 ? 'evento' : 'eventos'} · {formatDate(date)}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[10px]" style={{ color: MUTED }}>
              menos
            </span>
            {LEVEL_COLORS.map((color, i) => (
              <span key={i} className="flex items-center gap-1">
                <span
                  className="rounded-sm inline-block"
                  style={{ background: color, width: 12, height: 12 }}
                  aria-hidden="true"
                />
                <span className="text-[10px] tabular-nums" style={{ color: MUTED }}>
                  {legendRanges[i]}
                </span>
              </span>
            ))}
            <span className="text-[10px]" style={{ color: MUTED }}>
              mais
            </span>
          </div>
        </>
      )}
    </div>
  );
}
