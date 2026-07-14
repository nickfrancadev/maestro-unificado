/**
 * O KPI agregado do portfólio, contra uma carteira CONSTRUÍDA — não o mock real.
 *
 * O defeito: "Taxa média de plays fechadas" era a MÉDIA DAS TAXAS por company.
 * `computeMetrics` devolve `playsCloseRate = 0` para quem criou ZERO plays (via
 * `safeDiv`), então quem não fez NADA entrava na média como "fechou 0% das suas
 * plays" e puxava o agregado para baixo como se tivesse falhado.
 *
 * A consequência era INVERSORA: estreitando o período de 30d para 7d no mock, as
 * companies com zero plays saltavam de 2 para 13 e o KPI CAÍA pela metade
 * (46,9% → 24,7%) enquanto a taxa real entre quem de fato rodou plays SUBIA
 * (46,4% → 53,8%). O número andava para o lado errado no gesto mais comum do
 * dashboard.
 *
 * Este arquivo é separado do `pages.smoke.test.tsx` porque `vi.mock` do
 * `data/mockData` é de escopo de ARQUIVO: aqui a carteira tem exatamente duas
 * companies, e é o único jeito de assertar um número exato (50%) em vez de
 * "algum número".
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Company, Play } from './data/types';
import { TODAY } from './data/types';

const DAY = 86_400_000;
const d = (days: number) => new Date(TODAY.getTime() - days * DAY);

/** Play criada há 5d; `closed` decide se já fechou. */
function play(id: string, closed: boolean): Play {
  return {
    id,
    name: id,
    type: 'SalesPlay',
    ownerEmail: 'a@x.com.br',
    createdAt: d(5),
    startDate: d(5),
    expectedEndDate: d(-10),
    endDate: closed ? d(2) : null,
    archived: false,
    touchpoints: [],
    contactsInvolved: 3,
  };
}

function company(id: string, plays: Play[]): Company {
  return {
    id,
    name: `Company ${id}`,
    plan: 'Growth',
    seats: 5,
    onboardedAt: d(300),
    mrr: 10_000,
    users: [
      {
        id: 'u1',
        name: 'A',
        email: 'a@x.com.br',
        profile: 'ADMIN',
        lastAccessAt: d(1),
        lastActivityAt: d(1),
      },
    ],
    plays,
    accountsCount: 10,
    contactsCount: 30,
    dossiersCount: 5,
  };
}

/**
 * A carteira do bug, reduzida ao osso:
 *  - PLAYER: 10 plays criadas, 5 fechadas → 50%.
 *  - GHOST: ZERO plays. Não é "0% de fechamento" — é ausência de denominador.
 *
 * Pooled: 5 ÷ 10 = 50%.  Média das taxas (o bug): (50% + 0%) / 2 = 25%.
 */
const PLAYER = company(
  'player',
  Array.from({ length: 10 }, (_, i) => play(`p${i}`, i < 5)),
);
const GHOST = company('ghost', []);

vi.mock('./data/mockData', async () => {
  const actual = await vi.importActual<typeof import('./data/mockData')>('./data/mockData');
  return {
    ...actual,
    COMPANIES: [PLAYER, GHOST],
    getCompany: (id: string) => [PLAYER, GHOST].find((c) => c.id === id),
  };
});

const { UsagePortfolio } = await import('./UsagePortfolio');

afterEach(cleanup);

/** O card inteiro de um `StatTile` a partir do seu rótulo. */
function statTile(label: string): HTMLElement {
  const tile = screen.getByText(label).closest('.rounded-xl');
  if (!(tile instanceof HTMLElement)) throw new Error(`StatTile "${label}" não encontrado`);
  return tile;
}

function mount() {
  // período de 30d terminando em TODAY — pega as plays criadas há 5d
  const from = new Date(TODAY.getTime() - 29 * DAY).toISOString().slice(0, 10);
  const to = TODAY.toISOString().slice(0, 10);
  return render(
    <MemoryRouter initialEntries={[`/uso-clientes?from=${from}&to=${to}`]}>
      <UsagePortfolio />
    </MemoryRouter>,
  );
}

describe('taxa agregada do portfólio — a company sem plays não puxa o número', () => {
  it('10 plays / 5 fechadas + uma company com ZERO plays → 50%, não 25%', () => {
    mount();
    const tile = statTile('Taxa de plays fechadas (carteira)').textContent ?? '';

    // o valor pooled
    expect(tile).toMatch(/\b50%/);
    // e NÃO a média das taxas, que contaria a fantasma como "0% de fechamento"
    expect(tile).not.toMatch(/\b25%/);
  });

  it('o hint diz sobre QUANTOS clientes a taxa foi calculada', () => {
    mount();
    // só 1 das 2 companies criou plays: a fantasma não tem denominador
    expect(statTile('Taxa de plays fechadas (carteira)').textContent).toMatch(
      /base: 1 clientes? criaram plays no período \(de 2\)/,
    );
  });

  it('rótulo, hint e conta descrevem a MESMA estatística (pooled, não média)', () => {
    mount();
    const text = statTile('Taxa de plays fechadas (carteira)').textContent ?? '';
    // o rótulo não pode prometer "média" enquanto a conta é pooled
    expect(text).not.toMatch(/média/i);
    expect(text).toMatch(/Plays fechadas ÷ plays criadas/);
  });
});
