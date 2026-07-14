/**
 * Guarda de regressão: a rampa de risco não vaza para fora dos indicadores de
 * risco.
 *
 * As quatro cores da rampa (`lib/health.ts` → `BUCKET_META`) são EXCLUSIVAS de
 * churn-risk: ring, chips de sinal, badge de bucket, stroke da sparkline. Se um
 * Δ de tendência usar `#DC2626`, "vermelho crítico" passa a significar também
 * "touchpoints caíram" e a linguagem visual do dashboard colapsa.
 *
 * Isto é exatamente o defeito que trabalho em paralelo produz: quatro agentes
 * construíram estes componentes ao mesmo tempo e dois chegaram a paletas
 * diferentes para o MESMO conceito ("melhorou"/"piorou"). Um teste é a única
 * defesa que sobrevive ao próximo lote de agentes.
 *
 * Não usa jsdom nem React: lê o fonte e faz grep.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DIR = dirname(fileURLToPath(import.meta.url));

/** As 4 cores da rampa de risco (espelho de `BUCKET_META`). */
const RAMP = ['#DC2626', '#EA580C', '#CA8A04', '#059669'];

/**
 * Único arquivo de `components/` autorizado a escrever a rampa literalmente.
 *
 * Os demais indicadores de risco (`HealthScoreRing`, `CompanyCard`,
 * o badge de bucket da `CompanyTable`, `icons.ts`) LEEM a cor de `BUCKET_META`
 * — a fonte única em `lib/health.ts` — em vez de repetir o hex. Por isso não
 * precisam de isenção, e mantê-los fora da lista é o que dá dente ao teste:
 * foi exatamente na `CompanyTable` que `#059669`/`#DC2626` vazaram para o Δ de
 * atividade (uma tendência, não um risco). Se estivesse isenta, o vazamento
 * passaria batido.
 *
 * `SignalChips` monta as cores dos chips por severidade e escreve os hexes.
 */
const ALLOWED = new Set(['SignalChips.tsx']);

function sources(): string[] {
  return readdirSync(DIR).filter(
    (f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('.test.'),
  );
}

/**
 * Remove comentários: o que interessa é a cor USADA, não a cor citada. O
 * próprio `colors.ts` documenta a rampa para explicar por que está fora dela.
 */
function code(file: string): string {
  return readFileSync(join(DIR, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

describe('rampa de risco não vaza para fora dos indicadores de risco', () => {
  it('sanity: o diretório de componentes foi lido', () => {
    const files = sources();
    expect(files.length).toBeGreaterThan(5);
    expect(files).toContain('StatTile.tsx');
    expect(files).toContain('CompanyTable.tsx');
  });

  for (const file of sources()) {
    if (ALLOWED.has(file)) continue;

    it(`${file} não usa nenhuma cor da rampa`, () => {
      const src = code(file).toUpperCase();
      const leaked = RAMP.filter((hex) => src.includes(hex.toUpperCase()));
      expect(
        leaked,
        `${file} usa ${leaked.join(', ')} — cores da rampa de risco são exclusivas ` +
          `de indicadores de churn-risk. Para tendência use TREND_GOOD/TREND_BAD/` +
          `TREND_FLAT de components/colors.ts.`,
      ).toEqual([]);
    });
  }

  it('as cores de tendência são, elas mesmas, de fora da rampa', async () => {
    const { TREND_BAD, TREND_FLAT, TREND_GOOD } = await import('./colors');
    for (const c of [TREND_GOOD, TREND_BAD, TREND_FLAT]) {
      expect(RAMP.map((h) => h.toUpperCase())).not.toContain(c.toUpperCase());
    }
  });

  it('StatTile e CompanyTable usam a MESMA fonte de cor de tendência', () => {
    for (const file of ['StatTile.tsx', 'CompanyTable.tsx']) {
      const src = readFileSync(join(DIR, file), 'utf8');
      expect(src).toMatch(/from '\.\/colors'/);
    }
  });
});
