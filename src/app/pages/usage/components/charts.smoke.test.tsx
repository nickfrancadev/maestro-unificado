import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AdoptionFunnel } from './AdoptionFunnel';
import { PlayTypeMix } from './PlayTypeMix';
import { ActivityHeatmap } from './ActivityHeatmap';
import { COMPANIES, DEFAULT_PERIOD } from '../data/mockData';
import { adoptionFunnel, playTypeMix, activityHeatmap } from '../lib/selectors';
import { formatNumber } from '../lib/format';
import { TODAY } from '../data/types';

afterEach(cleanup);

/** Cliente ativo (tem plays no período). */
const company = COMPANIES[2];
/** Cliente-fantasma: zero plays no período — o caso que este dashboard caça. */
const ghost = COMPANIES[0];

describe('AdoptionFunnel', () => {
  it('renderiza dados reais com % de conversão em texto e a maior queda sinalizada', () => {
    const stages = adoptionFunnel(company, DEFAULT_PERIOD);
    render(<AdoptionFunnel stages={stages} />);
    expect(screen.getByText('Contas')).toBeTruthy();
    expect(screen.getByText('maior queda')).toBeTruthy();

    // valor absoluto do 1º estágio, formatado pela fundação (`formatNumber`)
    expect(screen.getByText(formatNumber(stages[0].value))).toBeTruthy();

    // a taxa de conversão de CADA par consecutivo aparece como texto exato —
    // não basta "algum % em algum lugar da página". (Estágio anterior zerado
    // não rende conversão: divisão por zero não vira "0%", vira nada.)
    let asserted = 0;
    for (let i = 1; i < stages.length; i++) {
      const prev = stages[i - 1].value;
      if (prev <= 0) continue;
      const label = `${Math.round((stages[i].value / prev) * 100)}%`;
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      asserted++;
    }
    expect(asserted).toBeGreaterThan(0);
  });

  it('empty state com todos os estágios zerados', () => {
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Contas', value: 0 },
          { stage: 'Plays', value: 0 },
        ]}
      />,
    );
    expect(screen.getByText(/Sem atividade no período/)).toBeTruthy();
  });

  it('empty state com stages = []', () => {
    render(<AdoptionFunnel stages={[]} />);
    expect(screen.getByText(/Sem atividade no período/)).toBeTruthy();
  });
});

describe('PlayTypeMix', () => {
  it('renderiza dados reais', () => {
    render(<PlayTypeMix mix={playTypeMix(company, DEFAULT_PERIOD)} />);
    expect(screen.getByText('PrePlay')).toBeTruthy();
  });

  it('anota "só PrePlay"', () => {
    render(
      <PlayTypeMix
        mix={[
          { type: 'PrePlay', count: 4 },
          { type: 'SalesPlay', count: 0 },
          { type: 'CsPlay', count: 0 },
          { type: 'OneToFewPlay', count: 0 },
        ]}
      />,
    );
    expect(
      screen.getByText('Só PrePlay — o cliente nunca chegou a vender.'),
    ).toBeTruthy();
  });

  it('anota "tem CsPlay"', () => {
    render(
      <PlayTypeMix
        mix={[
          { type: 'PrePlay', count: 4 },
          { type: 'SalesPlay', count: 2 },
          { type: 'CsPlay', count: 1 },
          { type: 'OneToFewPlay', count: 0 },
        ]}
      />,
    );
    expect(
      screen.getByText('Tem CsPlay — sinal de expansão/pós-venda.'),
    ).toBeTruthy();
  });

  it('empty state com contagens zeradas e com mix = []', () => {
    render(<PlayTypeMix mix={[{ type: 'PrePlay', count: 0 }]} />);
    expect(screen.getByText('Nenhuma play criada no período.')).toBeTruthy();
    cleanup();
    render(<PlayTypeMix mix={[]} />);
    expect(screen.getByText('Nenhuma play criada no período.')).toBeTruthy();
  });

  it('empty state para o cliente-fantasma real do mock', () => {
    render(<PlayTypeMix mix={playTypeMix(ghost, DEFAULT_PERIOD)} />);
    expect(screen.getByText('Nenhuma play criada no período.')).toBeTruthy();
  });
});

describe('ActivityHeatmap', () => {
  it('renderiza 7*weeks células focáveis com valor exato + data e legenda numérica', () => {
    const weeks = 12;
    render(<ActivityHeatmap cells={activityHeatmap(company, weeks)} weeks={weeks} />);
    const cellEls = screen.getAllByRole('gridcell');
    expect(cellEls.length).toBe(7 * weeks);
    expect(cellEls[0].getAttribute('tabindex')).toBe('0');
    expect(cellEls[0].getAttribute('aria-label')).toMatch(
      /^\d+ eventos? em \S+, \d{2}\/\d{2}\/\d{4}$/,
    );
    expect(screen.getByText('menos')).toBeTruthy();
    expect(screen.getByText('mais')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('a célula da semana atual no weekday de TODAY mapeia para TODAY', () => {
    const weeks = 4;
    render(
      <ActivityHeatmap cells={activityHeatmap(company, weeks)} weeks={weeks} today={TODAY} />,
    );
    const dd = String(TODAY.getUTCDate()).padStart(2, '0');
    const mm = String(TODAY.getUTCMonth() + 1).padStart(2, '0');
    const label = `${dd}/${mm}/${TODAY.getUTCFullYear()}`;
    const matches = screen
      .getAllByRole('gridcell')
      .filter((el) => (el.getAttribute('aria-label') ?? '').includes(label));
    expect(matches.length).toBe(1);
  });

  it('não quebra com todas as células zeradas', () => {
    const weeks = 4;
    const zeros = Array.from({ length: weeks * 7 }, (_, i) => ({
      week: Math.floor(i / 7),
      day: i % 7,
      count: 0,
    }));
    render(<ActivityHeatmap cells={zeros} weeks={weeks} />);
    expect(screen.getAllByRole('gridcell').length).toBe(28);
    expect(screen.getByText(/Nenhuma atividade registrada/)).toBeTruthy();
  });

  it('empty state com cells = []', () => {
    render(<ActivityHeatmap cells={[]} weeks={0} />);
    expect(screen.getByText(/Sem dados de atividade/)).toBeTruthy();
  });

  it('renderiza o cliente-fantasma real do mock sem quebrar', () => {
    render(<ActivityHeatmap cells={activityHeatmap(ghost, 8)} weeks={8} />);
    expect(screen.getAllByRole('gridcell').length).toBe(56);
  });
});
