import { describe, expect, it } from 'vitest';
import { COMPANIES, DEFAULT_PERIOD, TODAY, getCompany } from '../data/mockData';
import type { Company, Period } from '../data/types';
import { computeHealth } from './health';
import { scoreTimeline } from './timeline';

const DAY = 86_400_000;

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

describe('scoreTimeline', () => {
  it('o último ponto coincide com computeHealth(company, period) — score e bucket', () => {
    const company = COMPANIES[0];
    const series = scoreTimeline(company, DEFAULT_PERIOD);
    const h = computeHealth(company, DEFAULT_PERIOD, TODAY);

    expect(series.length).toBeGreaterThan(0);
    const tip = last(series);
    expect(tip.score).toBe(h.score);
    expect(tip.bucket).toBe(h.bucket);
    // O último ponto termina exatamente hoje.
    expect(tip.date.getTime()).toBe(DEFAULT_PERIOD.end.getTime());
  });

  it('a janela de cada ponto tem duração == period.end - period.start; pontos a 7 dias', () => {
    const company = COMPANIES[0];
    const duration = DEFAULT_PERIOD.end.getTime() - DEFAULT_PERIOD.start.getTime();
    const series = scoreTimeline(company, DEFAULT_PERIOD);

    for (let i = 1; i < series.length; i++) {
      // Pontos consecutivos ficam a 7 dias um do outro.
      expect(series[i].date.getTime() - series[i - 1].date.getTime()).toBe(7 * DAY);
    }
    // A duração da janela é constante e igual ao período: reconstrói start = date - duration.
    for (const p of series) {
      const windowStart = p.date.getTime() - duration;
      const reconstructed = computeHealth(
        company,
        { start: new Date(windowStart), end: p.date },
        TODAY,
      );
      expect(p.score).toBe(reconstructed.score);
    }
  });

  it('company onboardada há ~4 semanas gera ≤ 4 pontos, nenhum antes do onboarding', () => {
    // Filtro de 30 dias → janela de 29 dias. Uma company nova só rende os pontos
    // cuja janela inteira cabe depois do onboarding. Com onboarding há ~5 semanas
    // (35d), poucas janelas cabem (a mais antiga precisaria de ≥50d de história).
    const base = COMPANIES[0];
    const onboardedAt = new Date(TODAY.getTime() - 35 * DAY);
    const young: Company = { ...base, onboardedAt };

    const duration = DEFAULT_PERIOD.end.getTime() - DEFAULT_PERIOD.start.getTime();
    const series = scoreTimeline(young, DEFAULT_PERIOD);

    expect(series.length).toBeLessThanOrEqual(4);
    expect(series.length).toBeGreaterThan(0);
    for (const p of series) {
      const windowStart = p.date.getTime() - duration;
      // Nenhum ponto tem janela iniciando antes do onboarding.
      expect(windowStart).toBeGreaterThanOrEqual(onboardedAt.getTime());
    }
  });

  it('inFilter é true exatamente para os pontos cujo date cai em [period.start, period.end]', () => {
    const company = COMPANIES[0];
    const series = scoreTimeline(company, DEFAULT_PERIOD);

    for (const p of series) {
      const inside =
        p.date.getTime() >= DEFAULT_PERIOD.start.getTime() &&
        p.date.getTime() <= DEFAULT_PERIOD.end.getTime();
      expect(p.inFilter).toBe(inside);
    }

    // O último ponto (hoje) está dentro do filtro.
    expect(last(series).inFilter).toBe(true);
    // Um ponto de 10 semanas atrás (fora dos 30 dias) não está.
    const tenWeeksAgo = series.find(
      (p) => p.date.getTime() === TODAY.getTime() - 10 * 7 * DAY,
    );
    expect(tenWeeksAgo).toBeDefined();
    expect(tenWeeksAgo!.inFilter).toBe(false);
  });

  it('cliente em queda tem série com tendência não-crescente ao final (último abaixo do pico)', () => {
    // 'horizonte' é um seed 'declining': o volume do período atual é ~1/3 do
    // anterior. Na série deslizante isso aparece como uma queda no fim — o último
    // ponto (score do filtro atual) fica abaixo do pico recente da série.
    const declining = getCompany('horizonte');
    expect(declining).toBeDefined();
    const series = scoreTimeline(declining!, DEFAULT_PERIOD);

    expect(series.length).toBeGreaterThan(1);
    const peak = Math.max(...series.map((p) => p.score));
    // Tendência não-crescente ao final: o cliente já esteve mais saudável do que
    // está agora — o último ponto não supera o pico da série.
    expect(last(series).score).toBeLessThanOrEqual(peak);
    // E, para um cliente de fato em queda, o recuo é real (não apenas empate).
    expect(last(series).score).toBeLessThan(peak);
  });
});
