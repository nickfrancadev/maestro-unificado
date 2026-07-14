/**
 * As SEMÂNTICAS renderizadas do detalhe — não a mera presença de rótulos.
 *
 * Dois testes anteriores eram vazios, e a mutação provou:
 *
 *  (I2) o teste de `invertDelta` assertava só que dois rótulos existiam. Removendo
 *       `invertDelta` dos DOIS tiles de touchpoints atrasados, os 16 smokes
 *       continuavam verdes — um tile que celebra a ALTA de touchpoints atrasados
 *       com seta verde para cima entraria em produção sem ninguém ver. O que
 *       importa não é o rótulo: é a COR e a DIREÇÃO do Δ.
 *
 *  (I3) `HEATMAP_WEEKS` alimenta `activityHeatmap(company, weeks)` E
 *       `<ActivityHeatmap weeks={…}>`. Dessincronizando a prop para `weeks={8}`,
 *       os 16 smokes continuavam verdes — mas o mapa célula→data desliza 4
 *       semanas: a célula rotulada "hoje" passa a mostrar a contagem de 4 semanas
 *       atrás. O guard tem que amarrar CONTAGEM a DATA, não contar colunas.
 *
 * Arquivo separado porque `vi.mock('./data/mockData')` é de escopo de ARQUIVO: a
 * carteira aqui é construída para produzir exatamente os sinais sob teste.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Company, Play, Touchpoint } from './data/types';
import { TODAY } from './data/types';
import { TREND_BAD, TREND_GOOD } from './components/colors';

const DAY = 86_400_000;
const d = (days: number) => new Date(TODAY.getTime() - days * DAY);

/** Janela de 15 dias terminando hoje; a anterior são os 15 dias antes dela. */
const FROM = new Date(TODAY.getTime() - 14 * DAY);
const iso = (x: Date) => x.toISOString().slice(0, 10);
const SEARCH = `?from=${iso(FROM)}&to=${iso(TODAY)}`;

/** Touchpoint ATRASADO: vencido (`dueDate` no passado) e sem `endDate`. */
function lateTp(id: string, createdDaysAgo: number): Touchpoint {
  return {
    id,
    type: 'Descoberta',
    channel: 'Email',
    responsibles: ['a@x.com.br'],
    createdAt: d(createdDaysAgo),
    dueDate: d(createdDaysAgo - 1), // vencido: um dia depois de criado, já passou
    endDate: null,
    contactsInvolved: 2,
    interactions: 1,
  };
}

/** Touchpoint FINALIZADO — entra no denominador da taxa, nunca no numerador. */
function doneTp(id: string, createdDaysAgo: number): Touchpoint {
  return {
    ...lateTp(id, createdDaysAgo),
    id,
    endDate: d(createdDaysAgo - 1),
  };
}

function play(id: string, createdDaysAgo: number, touchpoints: Touchpoint[] = []): Play {
  return {
    id,
    name: id,
    type: 'SalesPlay',
    ownerEmail: 'a@x.com.br',
    createdAt: d(createdDaysAgo),
    startDate: d(createdDaysAgo),
    expectedEndDate: d(-30),
    endDate: null,
    archived: false,
    touchpoints,
    contactsInvolved: 3,
  };
}

/**
 * Cliente construído para PIORAR:
 *  - touchpoints atrasados: 1 no período anterior → 4 no período atual (ALTA = RUIM);
 *  - % de touchpoints atrasados: 1/4 = 25% → 4/4 = 100% (ALTA = RUIM). Os 3
 *    touchpoints FINALIZADOS no período anterior existem só para dar denominador
 *    a essa taxa — sem eles, os dois lados dariam 100% e o Δ seria "estável",
 *    e um Δ estável não prova nada sobre a cor.
 *  - plays criadas: 2 no anterior → 6 no atual (ALTA = BOM).
 *
 * As plays "portadoras" dos touchpoints nascem junto com eles, então
 * `touchpointsIn` (que filtra por `createdAt` do touchpoint) os pega no período
 * certo dos dois lados.
 */
const WORSENING: Company = {
  id: 'piorando',
  name: 'Cliente Piorando',
  plan: 'Growth',
  seats: 4,
  onboardedAt: d(300),
  mrr: 8_000,
  users: [
    {
      id: 'u1',
      name: 'A',
      email: 'a@x.com.br',
      profile: 'ADMIN',
      lastAccessAt: d(1),
      lastActivityAt: d(1),
    },
    {
      id: 'u2',
      name: 'B',
      email: 'b@x.com.br',
      profile: 'EDITOR',
      lastAccessAt: d(2),
      lastActivityAt: d(2),
    },
  ],
  plays: [
    // ---- período ATUAL (0–14d): 6 plays, 4 touchpoints atrasados
    play('cur-1', 3, [lateTp('cur-tp-1', 3), lateTp('cur-tp-2', 3)]),
    play('cur-2', 4, [lateTp('cur-tp-3', 4), lateTp('cur-tp-4', 4)]),
    play('cur-3', 5),
    play('cur-4', 6),
    play('cur-5', 7),
    play('cur-6', 8),
    // ---- período ANTERIOR (15–29d): 2 plays, 1 atrasado de 4 touchpoints (25%)
    play('prev-1', 20, [
      lateTp('prev-tp-1', 20),
      doneTp('prev-tp-2', 20),
      doneTp('prev-tp-3', 20),
      doneTp('prev-tp-4', 20),
    ]),
    play('prev-2', 22),
  ],
  accountsCount: 12,
  contactsCount: 40,
  dossiersCount: 6,
};

/**
 * Cliente para o guard do heatmap. A contagem tem que ficar amarrada à DATA:
 *  - HOJE: 3 eventos (3 plays criadas hoje);
 *  - HÁ 4 SEMANAS (28d): 1 evento.
 *
 * Com `weeks` sincronizado (12 dos dois lados), a célula rotulada com a data de
 * HOJE mostra 3. Se a prop do componente cair para 8 enquanto o seletor continua
 * em 12, a última coluna renderizada deixa de ser o bucket 11 e passa a ler o
 * bucket 7 (= 4 semanas atrás) — a célula ainda diz "hoje", mas mostra 1.
 */
const HEATMAP_CO: Company = {
  ...WORSENING,
  id: 'heatmap',
  name: 'Cliente Heatmap',
  plays: [
    play('hoje-1', 0),
    play('hoje-2', 0),
    play('hoje-3', 0),
    play('ha-4-semanas', 28),
  ],
};

const FIXTURES = [WORSENING, HEATMAP_CO];

vi.mock('./data/mockData', async () => {
  const actual = await vi.importActual<typeof import('./data/mockData')>('./data/mockData');
  return {
    ...actual,
    COMPANIES: FIXTURES,
    getCompany: (id: string) => FIXTURES.find((c) => c.id === id),
  };
});

const { UsageCompanyDetail } = await import('./UsageCompanyDetail');

afterEach(cleanup);

function renderDetail(id: string, search = SEARCH) {
  return render(
    <MemoryRouter initialEntries={[`/uso-clientes/${id}${search}`]}>
      <Routes>
        <Route path="/uso-clientes/:companyId" element={<UsageCompanyDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

function statTile(label: string): HTMLElement {
  const tile = screen.getByText(label).closest('.rounded-xl');
  if (!(tile instanceof HTMLElement)) throw new Error(`StatTile "${label}" não encontrado`);
  return tile;
}

/**
 * A linha do Δ dentro de um tile, com a cor RESOLVIDA e a direção lida do
 * texto acessível (`sr-only`: "alta de " / "queda de "). É isso que o usuário vê
 * — não o nome da prop no JSX.
 */
function deltaOf(label: string): { color: string; dir: string; text: string } {
  const tile = statTile(label);
  const row = Array.from(tile.querySelectorAll('p')).find((p) =>
    /alta de|queda de|estável/.test(p.textContent ?? ''),
  );
  if (!row) throw new Error(`Δ não renderizado no tile "${label}"`);
  const text = row.textContent ?? '';
  const dir = /alta de/.test(text)
    ? 'up'
    : /queda de/.test(text)
      ? 'down'
      : 'flat';
  return { color: row.style.color, dir, text };
}

/** `style.color` volta como `rgb(r, g, b)` no jsdom. */
function toRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

describe('I2 — invertDelta: a COR do Δ, não a existência do rótulo', () => {
  it('touchpoints atrasados SOBEM → Δ em TREND_BAD (subir é ruim)', () => {
    renderDetail(WORSENING.id);
    const delta = deltaOf('Touchpoints atrasados');
    // 1 → 4: a direção é alta…
    expect(delta.dir).toBe('up');
    // …e alta em touchpoints atrasados é RUIM. Sem `invertDelta`, isto seria
    // TREND_GOOD: uma seta verde comemorando a piora.
    expect(delta.color).toBe(toRgb(TREND_BAD));
    expect(delta.color).not.toBe(toRgb(TREND_GOOD));
  });

  it('% de touchpoints atrasados SOBE → Δ em TREND_BAD', () => {
    renderDetail(WORSENING.id);
    const delta = deltaOf('% de touchpoints atrasados');
    expect(delta.dir).toBe('up');
    expect(delta.color).toBe(toRgb(TREND_BAD));
    expect(delta.color).not.toBe(toRgb(TREND_GOOD));
  });

  it('plays criadas SOBEM → Δ em TREND_GOOD (aqui subir é bom)', () => {
    renderDetail(WORSENING.id);
    const delta = deltaOf('Plays criadas');
    // 2 → 6: mesma DIREÇÃO do tile acima, semântica OPOSTA. Se os dois tiles
    // pintassem igual, `invertDelta` não estaria fazendo nada.
    expect(delta.dir).toBe('up');
    expect(delta.color).toBe(toRgb(TREND_GOOD));
    expect(delta.color).not.toBe(toRgb(TREND_BAD));
  });

  it('a mesma direção (alta) pinta DIFERENTE nos dois tiles', () => {
    renderDetail(WORSENING.id);
    const bad = deltaOf('Touchpoints atrasados');
    const good = deltaOf('Plays criadas');
    expect(bad.dir).toBe(good.dir); // ambos "alta"
    expect(bad.color).not.toBe(good.color); // e ainda assim cores opostas
  });
});

describe('I3 — heatmap: a célula de HOJE mostra a contagem de HOJE', () => {
  /** `dd/mm/aaaa` em UTC, igual ao `formatDate` do ActivityHeatmap. */
  function ddmmyyyy(x: Date): string {
    const dd = String(x.getUTCDate()).padStart(2, '0');
    const mm = String(x.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${x.getUTCFullYear()}`;
  }

  it('as `weeks` do seletor e as da prop concordam — senão o mapa célula→data desliza', () => {
    renderDetail(HEATMAP_CO.id);

    // 3 eventos hoje. Se `<ActivityHeatmap weeks>` dessincronizar do
    // `activityHeatmap(company, weeks)`, a última coluna renderizada passa a ler
    // um bucket antigo: a célula continua rotulada "hoje", mas mostra 1 (os
    // eventos de 4 semanas atrás) em vez de 3.
    const cell = screen.getByRole('gridcell', {
      name: new RegExp(`^3 eventos em .*${ddmmyyyy(TODAY)}$`),
    });
    expect(cell).toBeTruthy();
  });

  it('a célula de 4 semanas atrás mostra o evento de 4 semanas atrás', () => {
    renderDetail(HEATMAP_CO.id);
    const cell = screen.getByRole('gridcell', {
      name: new RegExp(`^1 evento em .*${ddmmyyyy(d(28))}$`),
    });
    expect(cell).toBeTruthy();
  });

  it('o número de colunas renderizadas bate com as semanas do seletor', () => {
    renderDetail(HEATMAP_CO.id);
    const grid = screen.getByRole('grid');
    // 7 dias × N semanas. Se a prop e o seletor divergirem, isto muda junto com
    // o teste acima — os dois juntos amarram contagem, data e geometria.
    const cells = grid.querySelectorAll('[role="gridcell"]');
    expect(cells.length % 7).toBe(0);
    expect(cells.length / 7).toBe(12); // HEATMAP_WEEKS
  });
});
