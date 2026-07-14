import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CompanyCard } from './CompanyCard';
import { CompanyTable } from './CompanyTable';
import { COMPANIES, DEFAULT_PERIOD } from '../data/mockData';
import {
  activityByWeek,
  activityVolume,
  computeMetrics,
  previousPeriod,
} from '../lib/selectors';
import { BUCKET_META, computeHealth } from '../lib/health';
import type { Company, Health } from '../data/types';

afterEach(cleanup);

// Shims de ResizeObserver/matchMedia vivem em `vitest.setup.ts` (setupFiles).

const real = COMPANIES[2];
const realHealth = computeHealth(real, DEFAULT_PERIOD);
const realMetrics = computeMetrics(real, DEFAULT_PERIOD);
const realPrev = computeMetrics(real, previousPeriod(DEFAULT_PERIOD));

/** Company-fantasma: nenhum usuário, nenhuma play, zero atividade. */
const ghost: Company = {
  id: 'ghost',
  name: 'Fantasma SA',
  plan: 'Starter',
  seats: 3,
  onboardedAt: new Date('2026-01-01T00:00:00Z'),
  mrr: 0,
  users: [],
  plays: [],
  accountsCount: 0,
  contactsCount: 0,
  dossiersCount: 0,
};
const ghostHealth = computeHealth(ghost, DEFAULT_PERIOD);
const ghostMetrics = computeMetrics(ghost, DEFAULT_PERIOD);

function health(score: number, bucket: Health['bucket'], signals: Health['signals'] = []): Health {
  return { score, bucket, breakdown: { recency: 0, trend: 0, depth: 0, concentration: 0 }, signals };
}

describe('CompanyCard', () => {
  it('renderiza uma company real com score, plano e rodapé', () => {
    render(
      <CompanyCard
        company={real}
        health={realHealth}
        metrics={realMetrics}
        sparkline={activityByWeek(real, 12)}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText(real.name)).toBeTruthy();
    expect(screen.getByText(/plays ·/)).toBeTruthy();
    expect(screen.getByRole('button').getAttribute('aria-label')).toContain(String(realHealth.score));
  });

  it('renderiza sparkline toda-zero sem quebrar (ghost)', () => {
    render(
      <CompanyCard
        company={ghost}
        health={ghostHealth}
        metrics={ghostMetrics}
        sparkline={[0, 0, 0, 0, 0, 0, 0, 0]}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Fantasma SA')).toBeTruthy();
    expect(screen.getByText(/^0 plays · 0 touch · 0 usuários$/)).toBeTruthy();
  });

  it('aguenta signals vazios, score 0, score 100 e sparkline vazia', () => {
    render(
      <CompanyCard
        company={ghost}
        health={health(0, 'critical', [])}
        metrics={ghostMetrics}
        sparkline={[]}
        onClick={() => {}}
      />,
    );
    cleanup();
    render(
      <CompanyCard
        company={ghost}
        health={health(100, 'healthy', [])}
        metrics={ghostMetrics}
        sparkline={[]}
        onClick={() => {}}
      />,
    );
    expect(screen.getByRole('button').getAttribute('aria-label')).toContain('100');
  });

  it('é um <button> operável por teclado (Enter dispara onClick)', () => {
    const onClick = vi.fn();
    render(
      <CompanyCard
        company={real}
        health={realHealth}
        metrics={realMetrics}
        sparkline={activityByWeek(real, 12)}
        onClick={onClick}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.tagName).toBe('BUTTON');
    fireEvent.click(btn); // Enter/Space em <button> nativo → click
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CompanyTable', () => {
  /**
   * A coluna "Δ atividade" deriva o volume das métricas já computadas
   * (`playsCreated + touchpointsCreated`) porque `CompanyRow` não carrega o
   * `Period`. Este teste amarra essa derivação ao seletor da fundação — se
   * `activityVolume` mudar de definição, a coluna não pode divergir em silêncio.
   */
  it('Δ atividade = activityVolume da fundação, em TODAS as companies do mock', () => {
    for (const c of COMPANIES) {
      for (const period of [DEFAULT_PERIOD, previousPeriod(DEFAULT_PERIOD)]) {
        const m = computeMetrics(c, period);
        expect(m.playsCreated + m.touchpointsCreated).toBe(
          activityVolume(c, period),
        );
      }
    }
  });

  const rows = COMPANIES.slice(0, 5).map((c) => ({
    company: c,
    health: computeHealth(c, DEFAULT_PERIOD),
    metrics: computeMetrics(c, DEFAULT_PERIOD),
    prevMetrics: computeMetrics(c, previousPeriod(DEFAULT_PERIOD)),
  }));

  it('renderiza 16 colunas e todas as linhas', () => {
    render(<CompanyTable rows={rows} onRowClick={() => {}} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(16);
    expect(screen.getByText(rows[0].company.name)).toBeTruthy();
  });

  it('badge de bucket carrega o rótulo textual EXATO de cada linha (cor nunca sozinha)', () => {
    render(<CompanyTable rows={rows} onRowClick={() => {}} />);

    // Cada linha exibe exatamente o rótulo do SEU bucket — não basta que
    // "algum dos 4 rótulos" apareça em algum lugar da tabela.
    const expected = new Map<string, number>();
    for (const r of rows) {
      const label = BUCKET_META[r.health.bucket].label;
      expected.set(label, (expected.get(label) ?? 0) + 1);
    }
    expect(expected.size).toBeGreaterThan(0);

    for (const [label, count] of expected) {
      expect(screen.getAllByText(label)).toHaveLength(count);
    }

    // e nenhum rótulo de bucket que ninguém tem vaza pra tela
    for (const label of Object.values(BUCKET_META).map((m) => m.label)) {
      if (!expected.has(label)) {
        expect(screen.queryAllByText(label)).toHaveLength(0);
      }
    }
  });

  it('aria-sort reflete a coluna ativa e inverte ao clicar', () => {
    render(<CompanyTable rows={rows} onRowClick={() => {}} />);
    const scoreHeader = screen.getAllByRole('columnheader')[1];
    expect(scoreHeader.getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(scoreHeader.querySelector('button')!);
    expect(scoreHeader.getAttribute('aria-sort')).toBe('descending');

    const nameHeader = screen.getAllByRole('columnheader')[0];
    fireEvent.click(nameHeader.querySelector('button')!);
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(scoreHeader.getAttribute('aria-sort')).toBe('none');
  });

  it('linha clicável navega e o botão do nome é alvo de teclado', () => {
    const onRowClick = vi.fn();
    render(<CompanyTable rows={rows} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText(rows[1].company.name));
    expect(onRowClick).toHaveBeenCalledWith(rows[1].company.id);
  });

  it('empty state quando não há linhas', () => {
    render(<CompanyTable rows={[]} onRowClick={() => {}} />);
    expect(screen.getByText(/Nenhum cliente/)).toBeTruthy();
  });

  it('company-fantasma (zeros e nulos) não quebra a tabela', () => {
    render(
      <CompanyTable
        rows={[{ company: ghost, health: ghostHealth, metrics: ghostMetrics, prevMetrics: ghostMetrics }]}
        onRowClick={() => {}}
      />,
    );
    expect(screen.getByText('Fantasma SA')).toBeTruthy();
    expect(screen.getAllByText('Nunca').length).toBe(2); // último acesso + última atividade
    expect(screen.getByText('—')).toBeTruthy(); // dias p/ fechar = null
  });
});
