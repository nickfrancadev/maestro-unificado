/**
 * I1 — "Último acesso" é FABRICADO, e a tabela densa tem que dizer isso.
 *
 * O backend real não rastreia login (ver spec, §"⚠️ Login não é rastreado"). O
 * `PendingMarker` já cobria as outras três superfícies, mas NÃO a `CompanyTable`
 * — justamente a única onde a coluna inventada fica lado a lado com a coluna
 * derivável ("Última atividade") e AMBAS são ordenáveis. O gesto mais natural
 * de churn que existe — "ordena a carteira por último acesso" — devolvia um
 * ranking inteiro construído sobre dado inventado, sem nada na tela dizendo.
 *
 * C2 — "criadas 7 · fechadas 10 · 86%" é aritmética que ninguém reconcilia.
 *
 * As três células falam de COORTES diferentes (e isso é correto, é o fix da
 * Fase 1). O que faltava era o rótulo dizer de quem cada uma fala.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import { CompanyTable, type CompanyRow } from './CompanyTable';
import { COMPANIES, DEFAULT_PERIOD } from '../data/mockData';
import { computeMetrics, previousPeriod } from '../lib/selectors';
import { computeHealth } from '../lib/health';

afterEach(cleanup);

const rows: CompanyRow[] = COMPANIES.map((company) => ({
  company,
  health: computeHealth(company, DEFAULT_PERIOD),
  metrics: computeMetrics(company, DEFAULT_PERIOD),
  prevMetrics: computeMetrics(company, previousPeriod(DEFAULT_PERIOD)),
}));

function mount() {
  return render(<CompanyTable rows={rows} onRowClick={() => {}} />);
}

/** O `<th>` cujo texto contém `label`. */
function header(label: string): HTMLElement {
  const th = screen
    .getAllByRole('columnheader')
    .find((el) => (el.textContent ?? '').includes(label));
  if (!th) throw new Error(`coluna "${label}" não encontrada`);
  return th;
}

describe('I1 — a coluna fabricada declara a sua procedência', () => {
  it('"Último acesso" carrega o marcador de pendente de instrumentação', () => {
    mount();
    const marker = within(header('Último acesso')).queryByRole('button', {
      name: /Pendente de instrumentação/i,
    });
    expect(
      marker,
      '"Último acesso" é dado inventado (login não é rastreado) e é ordenável: ' +
        'sem o PendingMarker, ordenar por ela devolve um ranking sobre ficção',
    ).not.toBeNull();
  });

  it('"Última atividade" NÃO carrega o marcador — ela é derivável de verdade', () => {
    mount();
    // O marcador só vale alguma coisa se for seletivo. Se toda coluna o
    // tivesse, ele não distinguiria mais o fabricado do real.
    const marker = within(header('Última atividade')).queryByRole('button', {
      name: /Pendente de instrumentação/i,
    });
    expect(marker).toBeNull();
  });

  it('a coluna fabricada continua ordenável (o marcador não a desabilita)', () => {
    mount();
    expect(
      within(header('Último acesso')).getByRole('button', { name: /Último acesso/ }),
    ).toBeTruthy();
  });
});

describe('C2 — as colunas de coorte dizem de quem falam', () => {
  it('"Fechadas" e "% fechadas" não se apresentam como a mesma coorte', () => {
    mount();

    // Pré-fix: "Fechadas" e "% fechadas", lado a lado com "Plays criadas",
    // liam-se como uma divisão — e não dividiam (fechadas > criadas em metade
    // das companies saudáveis).
    const closed = header('Fechadas no período');
    const rate = header('% da coorte criada');

    expect(closed.textContent).toMatch(/no período/i);
    expect(rate.textContent).toMatch(/coorte/i);

    // e cada uma explica a sua coorte num popover, no próprio cabeçalho
    for (const th of [closed, rate]) {
      const hint = within(th).getByRole('button', { name: /O que ".*" mede/i });
      expect(hint.getAttribute('aria-label')).toMatch(/coorte|independente de quando/i);
    }
  });

  it('a coluna de touchpoints finalizados recebe o mesmo tratamento', () => {
    mount();
    const th = header('Finalizados no período');
    expect(th.textContent).toMatch(/no período/i);
    expect(within(th).getByRole('button', { name: /O que ".*" mede/i })).toBeTruthy();
  });

  /**
   * A prova de que o problema era REAL: existem, no mock, companies saudáveis
   * onde "fechadas no período" excede "plays criadas no período". Os números
   * estão certos; sem rótulo de coorte é que eles pareciam impossíveis.
   */
  it('o mock ainda contém o caso que parecia impossível (fechadas > criadas)', () => {
    const impossible = rows.filter(
      (r) => r.metrics.playsClosed > r.metrics.playsCreated,
    );
    expect(impossible.length).toBeGreaterThan(0);
  });
});
