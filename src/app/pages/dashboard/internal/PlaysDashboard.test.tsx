import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PlaysDashboard } from './PlaysDashboard';
import { CHURN_ANALYSIS } from './churnAnalysis.mock';
import { br } from './format';

// Shims de matchMedia/ResizeObserver vivem em `vitest.setup.ts`. Com
// prefers-reduced-motion ligado, `useCountUp` pula ao valor final — dá pra
// assertar o número direto, sem esperar rAF.

afterEach(cleanup);

const W30 = CHURN_ANALYSIS.windows['30d'];
const W365 = CHURN_ANALYSIS.windows['365d'];

describe('PlaysDashboard', () => {
  it('abre em 30 dias com os cinco KPIs da tela real', () => {
    render(<PlaysDashboard />);

    expect(screen.getByRole('radio', { name: 'Últimos 30 dias' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    for (const label of [
      'Quantidade de plays',
      'Média de touchpoints',
      'Média de contatos',
      'Média de interações',
      'Dias até fechar plays',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    // o mesmo número aparece em mais de um bloco; a asserção se ancora no card
    const kpi = screen.getByText('Quantidade de plays').closest('section')!;
    expect(
      within(kpi).getByText(br(W30.summary.playsCount.current, 0))
    ).toBeInTheDocument();
  });

  it('troca a janela e repinta os números', () => {
    render(<PlaysDashboard />);

    fireEvent.click(screen.getByRole('radio', { name: 'Últimos 365 dias' }));

    expect(screen.getByRole('radio', { name: 'Últimos 365 dias' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(
      screen.getByText(`${br(W365.summary.playsCount.current)} plays no total`)
    ).toBeInTheDocument();
  });

  it('desenha os dois donuts com o percentual de abertas', () => {
    render(<PlaysDashboard />);

    const open = W30.total.byType.reduce((acc, t) => acc + t.open, 0);
    const closed = W30.total.byType.reduce((acc, t) => acc + t.closed, 0);
    const pct = (open / (open + closed)) * 100;

    const donut = screen.getByRole('img', { name: /Todas as plays/ });
    expect(donut.getAttribute('aria-label')).toContain(`${br(pct, 1)}%`);

    expect(screen.getByRole('img', { name: /^One-to-few/ })).toBeInTheDocument();
  });

  it('mostra na tabela por tipo os campos que a tela real ignora', () => {
    render(<PlaysDashboard />);

    const table = screen.getByRole('table', { name: 'Desempenho por tipo de play' });
    for (const header of [
      '% fechadas',
      'Contatos/play',
      'Interações/play',
      'Dias até fechar',
    ]) {
      expect(within(table).getByText(header)).toBeInTheDocument();
    }
  });

  it('não reporta "0 dias" quando nada fechou no período', () => {
    render(<PlaysDashboard />);

    const semFechamento = W30.total.byType.filter((t) => t.closed === 0);
    // o mock de 30d tem tipos sem fechamento; se um dia não tiver, o teste
    // deixa de ter o que provar e avisa em vez de passar vazio
    expect(semFechamento.length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(
      semFechamento.length
    );
  });
});
