import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AdoptionFunnel } from './AdoptionFunnel';
import { PlayTypeMix } from './PlayTypeMix';
import { COMPANIES, DEFAULT_PERIOD } from '../data/mockData';
import { adoptionFunnel, playTypeMix } from '../lib/selectors';
import { formatNumber } from '../lib/format';

afterEach(cleanup);

/** Cliente ativo (tem plays no período). */
const company = COMPANIES[2];
/** Cliente-fantasma: zero plays no período — o caso que este dashboard caça. */
const ghost = COMPANIES[0];

describe('AdoptionFunnel', () => {
  it('renderiza dados reais: % só nas conversões, razão por unidade no resto', () => {
    const stages = adoptionFunnel(company, DEFAULT_PERIOD);
    render(<AdoptionFunnel stages={stages} />);
    expect(screen.getByText('Contas')).toBeTruthy();

    // valor absoluto do 1º estágio, formatado pela fundação (`formatNumber`)
    expect(screen.getByText(formatNumber(stages[0].value))).toBeTruthy();

    // A % aparece SÓ onde o estágio aninha genuinamente no outro (`subsetOf`).
    // Entre unidades incomensuráveis (touchpoint → interação) uma "conversão"
    // seria ruído: ali sai a razão por unidade, sem %.
    let asserted = 0;
    for (const s of stages) {
      if (!s.subsetOf) continue;
      const base = stages.find((b) => b.stage === s.subsetOf)?.value ?? 0;
      if (base <= 0) continue;
      const label = `${Math.round((s.value / base) * 100)}%`;
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      asserted++;
    }
    expect(asserted).toBeGreaterThan(0);
  });

  it('empty state quando os estágios DO PERÍODO estão zerados', () => {
    // As contagens estáticas do topo podem estar cheias — elas não testemunham
    // sobre o período, e não devem manter o funil de pé sozinhas.
    render(
      <AdoptionFunnel
        stages={[
          { stage: 'Contas', value: 41, periodScoped: false },
          { stage: 'Plays', value: 0, periodScoped: true },
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
