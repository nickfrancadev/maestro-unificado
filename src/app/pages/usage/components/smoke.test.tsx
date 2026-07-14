// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { HealthScoreRing } from './HealthScoreRing';
import { SignalChips } from './SignalChips';
import { StatTile } from './StatTile';
import { BUCKET_ICON } from './icons';
import type { Signal } from '../data/types';

// jsdom não implementa matchMedia; `useCountUp` e `motion` dependem dele.
// Devolvemos `matches: true` (prefers-reduced-motion) para que os valores
// pulem direto ao alvo final e o teste possa assertar o número renderizado.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(cleanup);

const signals: Signal[] = [
  { id: 's1', label: 'Sem acesso há 24d', severity: 'high' },
  { id: 's2', label: 'Queda de plays', severity: 'medium' },
  { id: 's3', label: 'Uso concentrado', severity: 'low' },
];

describe('BUCKET_ICON', () => {
  it('cobre os 4 buckets', () => {
    expect(Object.keys(BUCKET_ICON).sort()).toEqual([
      'at_risk',
      'critical',
      'healthy',
      'watch',
    ]);
  });
});

describe('HealthScoreRing', () => {
  it('renderiza score 0', () => {
    render(<HealthScoreRing score={0} bucket="critical" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-label')).toContain('0 de 100');
    expect(img.getAttribute('aria-label')).toContain('Crítico');
  });

  it('renderiza score 100 no tamanho grande com rótulo', () => {
    render(<HealthScoreRing score={100} bucket="healthy" size={120} showLabel />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain(
      'Saudável',
    );
    expect(screen.getByText('100')).toBeTruthy();
    expect(screen.getByText('Saudável')).toBeTruthy();
  });

  it('faz clamp de valores fora da faixa', () => {
    render(<HealthScoreRing score={140} bucket="watch" />);
    expect(screen.getByText('100')).toBeTruthy();
  });
});

describe('SignalChips', () => {
  it('renderiza todos os chips', () => {
    render(<SignalChips signals={signals} />);
    expect(screen.getByText('Sem acesso há 24d')).toBeTruthy();
    expect(screen.getByText('Uso concentrado')).toBeTruthy();
  });

  it('trunca com max e mostra +N', () => {
    render(<SignalChips signals={signals} max={2} />);
    expect(screen.queryByText('Uso concentrado')).toBeNull();
    expect(screen.getByText(/\+1/)).toBeTruthy();
  });

  it('não quebra com signals vazio', () => {
    const { container } = render(<SignalChips signals={[]} />);
    expect(container.textContent).toBe('');
  });
});

describe('StatTile', () => {
  it('renderiza value 0 sem delta', () => {
    render(<StatTile label="Plays criados" value={0} />);
    expect(screen.getByText('Plays criados')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renderiza delta up com percentual inteiro', () => {
    render(
      <StatTile label="Plays" value={12} delta={{ pct: 25, dir: 'up' }} />,
    );
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('invertDelta troca o significado da direção', () => {
    render(
      <StatTile
        label="Touchpoints atrasados"
        value={331}
        delta={{ pct: 12, dir: 'up' }}
        invertDelta
      />,
    );
    expect(screen.getByText('12%')).toBeTruthy();
  });

  it('formata pct a partir de fração', () => {
    render(<StatTile label="Taxa" value={0.41} format="pct" />);
    expect(screen.getByText('41%')).toBeTruthy();
  });

  it('formata days fracionário', () => {
    render(<StatTile label="Ciclo" value={12.4} format="days" />);
    expect(screen.getByText('12,4d')).toBeTruthy();
  });

  it('aceita value string', () => {
    render(<StatTile label="Último acesso" value="24d atrás" />);
    expect(screen.getByText('24d atrás')).toBeTruthy();
  });

  it('pending expõe botão acessível por teclado', () => {
    render(<StatTile label="Sessões" value={0} pending hint="mock" />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toContain(
      'Pendente de instrumentação',
    );
    // foco por teclado revela o tooltip (não é hover-only)
    fireEvent.focus(btn);
    expect(screen.getByRole('tooltip').textContent).toContain(
      'Pendente de instrumentação',
    );
    fireEvent.blur(btn);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
