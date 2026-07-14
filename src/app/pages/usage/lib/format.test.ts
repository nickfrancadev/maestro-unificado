import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TODAY } from '../data/types';
import { daysAgo, formatDaysAgo, formatDelta, formatNumber, formatPct } from './format';

const DAY = 86_400_000;

function d(daysAgo: number): Date {
  return new Date(TODAY.getTime() - daysAgo * DAY);
}

describe('daysAgo / formatDaysAgo', () => {
  it('"Nunca" quando a data é nula', () => {
    expect(daysAgo(null)).toBeNull();
    expect(formatDaysAgo(null)).toBe('Nunca');
  });

  it('conta dias de calendário, não frações', () => {
    expect(daysAgo(d(0))).toBe(0);
    expect(daysAgo(d(1))).toBe(1);
    expect(daysAgo(d(24))).toBe(24);
    expect(formatDaysAgo(d(0))).toBe('Hoje');
    expect(formatDaysAgo(d(1))).toBe('1d atrás');
    expect(formatDaysAgo(d(24))).toBe('24d atrás');
  });

  it('data no FUTURO não é "Hoje"', () => {
    // `dueDate` a vencer é uma data futura perfeitamente comum. Chamá-la de
    // "Hoje" (o que acontecia com o guarda `d <= 0`) é simplesmente falso.
    expect(daysAgo(d(-3))).toBe(-3);
    expect(formatDaysAgo(d(-3))).not.toBe('Hoje');
    expect(formatDaysAgo(d(-3))).toBe('em 3d');
    expect(formatDaysAgo(d(-1))).toBe('em 1d');
  });
});

describe('formatPct / formatNumber', () => {
  it('percentual com vírgula decimal (pt-BR)', () => {
    expect(formatPct(0.412)).toBe('41%');
    expect(formatPct(0.412, 1)).toBe('41,2%');
    expect(formatPct(NaN)).toBe('—');
  });

  it('número no locale pt-BR', () => {
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatNumber(Infinity)).toBe('—');
  });
});

describe('formatDelta', () => {
  it('prev 0 e curr > 0 → +100% (up)', () => {
    expect(formatDelta(5, 0)).toEqual({ pct: 100, label: '+100%', dir: 'up' });
  });

  it('prev 0 e curr 0 → 0% (flat)', () => {
    expect(formatDelta(0, 0)).toEqual({ pct: 0, label: '0%', dir: 'flat' });
  });

  it('queda → down', () => {
    expect(formatDelta(5, 10)).toEqual({ pct: -50, label: '-50%', dir: 'down' });
  });
});

describe('pureza do `lib/`', () => {
  it('nenhum módulo de lib/ importa o mock', () => {
    // `lib/` é a camada que sobrevive ao backend real. Importar `mockData`
    // (mesmo que só pelo `TODAY`) executava o gerador inteiro — 24 companies —
    // no ato de importar um `formatPct`.
    const dir = new URL('.', import.meta.url).pathname;
    for (const file of ['format.ts', 'selectors.ts', 'health.ts']) {
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src, `${file} não pode importar data/mockData`).not.toMatch(
        /from\s+['"]\.\.\/data\/mockData['"]/,
      );
    }
  });
});
