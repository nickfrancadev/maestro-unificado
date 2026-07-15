import { describe, expect, it } from 'vitest';
import { COMPANIES, DEFAULT_PERIOD, TODAY, getCompany } from '../data/mockData';
import type { Company, Period } from '../data/types';
import { BUCKET_THRESHOLDS, computeHealth } from './health';
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

  it('o último ponto coincide com computeHealth mesmo quando o período NÃO termina hoje (Bug 2)', () => {
    // Presets de 7d/30d/90d terminam hoje, mas "Este trimestre" e o range
    // customizado podem produzir period.end != today. A série precisa ancorar em
    // period.end (não em today) para que o último ponto use exatamente o filtro —
    // caso contrário o último ponto do gráfico não bate com o número grande no topo.
    const company = COMPANIES[0];
    const shifted: Period = {
      start: new Date(DEFAULT_PERIOD.start.getTime() - 14 * DAY),
      end: new Date(DEFAULT_PERIOD.end.getTime() - 14 * DAY),
    };
    // today continua sendo o "agora" da recência; só a âncora da janela muda.
    const series = scoreTimeline(company, shifted, 12, TODAY);
    const h = computeHealth(company, shifted, TODAY);

    expect(series.length).toBeGreaterThan(0);
    const tip = last(series);
    // O último ponto termina em period.end (não em today).
    expect(tip.date.getTime()).toBe(shifted.end.getTime());
    expect(tip.date.getTime()).not.toBe(TODAY.getTime());
    expect(tip.score).toBe(h.score);
    expect(tip.bucket).toBe(h.bucket);
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
    // O ponto mais antigo da série clampada fica antes do início do filtro
    // (a série volta mais que 30 dias), logo está fora do filtro.
    expect(series[0].date.getTime()).toBeLessThan(DEFAULT_PERIOD.start.getTime());
    expect(series[0].inFilter).toBe(false);
  });

  it('discrimina queda real: horizonte recua no fim; um cliente saudável, não', () => {
    // 'horizonte' é um seed 'declining': o volume do período atual é ~1/3 do
    // anterior. Sem a dead-zone (Bug 1), a série clampada trend genuinamente para
    // baixo no fim — o último ponto fica MUITO abaixo do máximo dentro do filtro.
    //
    // O teste antigo (`last < peak`) NÃO discriminava: valia também para clientes
    // saudáveis, cujo score oscila 1-2 pontos. Aqui a métrica é a MAGNITUDE do
    // recuo, e o teste prova que separa: verdadeira para o declinante, falsa para
    // o saudável.
    const declineDepth = (id: string): number => {
      const series = scoreTimeline(getCompany(id)!, DEFAULT_PERIOD);
      const inFilter = series.filter((p) => p.inFilter).map((p) => p.score);
      const inFilterMax = Math.max(...inFilter);
      return inFilterMax - last(series).score;
    };

    const THRESHOLD = 15;

    const horizonteDrop = declineDepth('horizonte');
    // Cliente de fato em queda: recuo real e substancial no fim.
    expect(horizonteDrop).toBeGreaterThanOrEqual(THRESHOLD);

    // A MESMA expressão é falsa para clientes saudáveis — o teste discrimina, não
    // apenas passa uma vez. Score saudável oscila poucos pontos, nunca ~15+.
    expect(declineDepth('solaris')).toBeLessThan(THRESHOLD);
    expect(declineDepth('ubatuba')).toBeLessThan(THRESHOLD);
  });

  it('regressão Bug 1: cliente saudável NÃO começa na faixa de dead-zone (~35)', () => {
    // Antes do clamp estrito, as janelas mais antigas caíam sobre dados não
    // semeados: computeHealth colapsava trend/depth/concentration a 0 e só a
    // recência (medida contra today) sobrevivia, fabricando uma subida
    // 'em risco → saudável' para TODO MUNDO — inclusive clientes saudáveis, cujo
    // primeiro ponto virava ~35. Com o clamp, o primeiro ponto de um cliente
    // saudável já reflete a saúde real (bem acima da faixa de dead-zone).
    const solaris = getCompany('solaris');
    expect(solaris).toBeDefined();
    const series = scoreTimeline(solaris!, DEFAULT_PERIOD);

    expect(series.length).toBeGreaterThan(0);
    // A subida fabricada 35→90 sumiu: o primeiro ponto não está na faixa ~35.
    expect(series[0].score).toBeGreaterThan(55);
    // E não há nenhum salto colossal do primeiro para o pico (marca da dead-zone).
    const peak = Math.max(...series.map((p) => p.score));
    expect(peak - series[0].score).toBeLessThan(15);
  });

  it('regressão Bug 1: o fantasma não sobe — série clampada uniformemente baixa', () => {
    // valeverde é um 'ghost': quase sem atividade. Antes, a dead-zone o fazia
    // subir de 0 a ~27 e voltar (curva com falso pico). Com o clamp, a série é
    // uniformemente baixa — nenhum cliente exibe mais o salto fabricado.
    const ghost = getCompany('valeverde');
    expect(ghost).toBeDefined();
    const series = scoreTimeline(ghost!, DEFAULT_PERIOD);

    expect(series.length).toBeGreaterThan(0);
    const max = Math.max(...series.map((p) => p.score));
    // Nunca chega perto de 'saudável': continua no fundo do poço.
    expect(max).toBeLessThan(BUCKET_THRESHOLDS.at_risk);
  });

  it('clamp estrito: nenhum ponto tem janela começando antes da primeira atividade real', () => {
    // O piso de dados reais é max(onboardedAt, primeira atividade). A primeira
    // atividade é o menor createdAt entre plays e touchpoints. Nenhuma janela pode
    // começar antes disso — senão computeHealth calcularia sobre dados que não
    // existem (a origem da subida fabricada do Bug 1).
    const duration = DEFAULT_PERIOD.end.getTime() - DEFAULT_PERIOD.start.getTime();

    const firstActivityMs = (company: Company): number => {
      let min = Infinity;
      for (const play of company.plays) {
        min = Math.min(min, play.createdAt.getTime());
        for (const tp of play.touchpoints) min = Math.min(min, tp.createdAt.getTime());
      }
      return min;
    };

    for (const company of COMPANIES) {
      const floor = Math.max(company.onboardedAt.getTime(), firstActivityMs(company));
      const series = scoreTimeline(company, DEFAULT_PERIOD);
      for (const p of series) {
        const windowStart = p.date.getTime() - duration;
        expect(windowStart).toBeGreaterThanOrEqual(floor);
      }
    }
  });
});
