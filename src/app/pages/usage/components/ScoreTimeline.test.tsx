import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ScoreTimeline } from './ScoreTimeline';
import { scoreTimeline } from '../lib/timeline';
import type { ScorePoint } from '../lib/timeline';
import { COMPANIES, DEFAULT_PERIOD } from '../data/mockData';
import { TODAY } from '../data/types';
import { BUCKET_META } from '../lib/health';
import { TREND_BAD, TREND_GOOD } from './colors';

// Shims de matchMedia/ResizeObserver vivem em `vitest.setup.ts` (setupFiles).
//
// jsdom não implementa layout, então um `ResponsiveContainer` com `width="100%"`
// mede 0×0 e NÃO monta a SVG interna (só o `<div>` externo). Para poder assertar
// a COR da curva no SVG renderizado, os testes passam `chartWidth={NNN}` em px —
// aí o Recharts monta o chart de verdade e o `stroke` da área aparece no DOM.
// Sem isso, só o cabeçalho/selo seriam assertáveis.
const CHART_W = 420;

afterEach(cleanup);

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Constrói uma série sintética com scores/buckets controlados. */
function series(steps: Array<[number, ScorePoint['bucket']]>): ScorePoint[] {
  const n = steps.length;
  return steps.map(([score, bucket], i) => ({
    // ponto 0 = mais antigo; último = mais recente (ancorado em TODAY)
    date: new Date(TODAY.getTime() - (n - 1 - i) * MS_PER_WEEK),
    score,
    bucket,
    inFilter: true,
  }));
}

describe('ScoreTimeline', () => {
  it('renderiza uma série real (scoreTimeline do mock) sem crash', () => {
    const points = scoreTimeline(COMPANIES[2], DEFAULT_PERIOD);
    expect(points.length).toBeGreaterThan(1); // pré-condição do teste
    const { container } = render(
      <ScoreTimeline points={points} period={DEFAULT_PERIOD} chartWidth={CHART_W} />,
    );
    expect(screen.getByText('Evolução do score')).toBeTruthy();
    expect(screen.getByText('Últimas 12 semanas')).toBeTruthy();
    // A SVG do chart montou (width em px), não só o card.
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  it('respeita o prop weeks no subtítulo', () => {
    const points = scoreTimeline(COMPANIES[2], DEFAULT_PERIOD, 8);
    render(<ScoreTimeline points={points} period={DEFAULT_PERIOD} weeks={8} />);
    expect(screen.getByText('Últimas 8 semanas')).toBeTruthy();
  });

  it('renderiza série de 1 ponto sem crash e mostra "novo" no selo', () => {
    const points = series([[62, 'watch']]);
    render(<ScoreTimeline points={points} period={DEFAULT_PERIOD} chartWidth={CHART_W} />);
    expect(screen.getByText('Evolução do score')).toBeTruthy();
    expect(screen.getByTestId('trend-badge').textContent).toContain('novo');
  });

  it('renderiza [] no empty state sem crash', () => {
    render(<ScoreTimeline points={[]} period={DEFAULT_PERIOD} />);
    expect(screen.getByText('Sem histórico de score no período.')).toBeTruthy();
  });

  it('selo de tendência DECRESCENTE usa TREND_BAD (#EF4444) — cor, não só texto', () => {
    // 70 → 40: delta -30, bem além do limiar de ±2.
    const points = series([
      [70, 'watch'],
      [55, 'at_risk'],
      [40, 'at_risk'],
    ]);
    render(<ScoreTimeline points={points} period={DEFAULT_PERIOD} chartWidth={CHART_W} />);
    const badge = screen.getByTestId('trend-badge');
    expect(badge.textContent).toContain('30'); // −30 pts
    expect(badge.getAttribute('style')).toContain(hexToRgb(TREND_BAD));
    expect(TREND_BAD).toBe('#EF4444'); // trava do contrato de cor
  });

  it('selo de tendência CRESCENTE usa TREND_GOOD (#16A34A) — cor, não só texto', () => {
    // 40 → 78: delta +38.
    const points = series([
      [40, 'at_risk'],
      [60, 'watch'],
      [78, 'healthy'],
    ]);
    render(<ScoreTimeline points={points} period={DEFAULT_PERIOD} chartWidth={CHART_W} />);
    const badge = screen.getByTestId('trend-badge');
    expect(badge.textContent).toContain('38');
    expect(badge.getAttribute('style')).toContain(hexToRgb(TREND_GOOD));
    expect(TREND_GOOD).toBe('#16A34A');
  });

  it('delta dentro de ±2 é "estável" (usa TREND_FLAT, não sobe nem desce)', () => {
    const points = series([
      [61, 'watch'],
      [60, 'watch'],
      [62, 'watch'],
    ]);
    render(<ScoreTimeline points={points} period={DEFAULT_PERIOD} chartWidth={CHART_W} />);
    expect(screen.getByTestId('trend-badge').textContent).toContain('estável');
  });

  it('a cor da curva segue o ÚLTIMO bucket: critical → #DC2626 no SVG', () => {
    const points = series([
      [60, 'watch'],
      [40, 'at_risk'],
      [15, 'critical'],
    ]);
    const { container } = render(
      <ScoreTimeline points={points} period={DEFAULT_PERIOD} chartWidth={CHART_W} />,
    );
    // Lido de BUCKET_META (fonte única), não hardcoded no teste tampouco.
    expect(BUCKET_META.critical.color).toBe('#DC2626');
    expect(container.innerHTML).toContain(BUCKET_META.critical.color);
  });

  it('a cor da curva segue o ÚLTIMO bucket: healthy → #059669 no SVG', () => {
    const points = series([
      [55, 'at_risk'],
      [78, 'healthy'],
      [92, 'healthy'],
    ]);
    const { container } = render(
      <ScoreTimeline points={points} period={DEFAULT_PERIOD} chartWidth={CHART_W} />,
    );
    expect(BUCKET_META.healthy.color).toBe('#059669');
    expect(container.innerHTML).toContain(BUCKET_META.healthy.color);
  });
});

/** '#EF4444' → 'rgb(239, 68, 68)' — o inline style é serializado assim no DOM. */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}
