/**
 * Smoke das duas telas compostas (Fase 3).
 *
 * O que estes testes guardam:
 *  - o portfólio monta com as 24 companies e mostra os 4 buckets + os 5 KPIs;
 *  - o popover "como calculamos o score" LÊ os pesos de `WEIGHTS` (se alguém
 *    retunar os pesos e o texto continuar dizendo "35%", o teste cai);
 *  - a company FANTASMA (zero plays no período) aparece no board e o detalhe
 *    dela renderiza sem quebrar — ela é exatamente quem o dashboard caça;
 *  - `:companyId` desconhecido dá empty state com link de volta, não crash.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UsagePortfolio } from './UsagePortfolio';
import { UsageCompanyDetail } from './UsageCompanyDetail';
import { COMPANIES, DEFAULT_PERIOD } from './data/mockData';
import { computeMetrics } from './lib/selectors';
import { WEIGHTS } from './lib/health';
import { fromISODate, periodLabel, toISODate } from './components/PeriodFilter';

afterEach(cleanup);

const GHOST_A = COMPANIES[0];
const GHOST_B = COMPANIES[1];

/**
 * O card inteiro de um `StatTile` a partir do seu rótulo.
 *
 * `getByText(label).closest('div')` NÃO serve: o rótulo é um `<p>` dentro de uma
 * linha flex, então o `closest` para nessa linha e o `textContent` volta só com
 * o rótulo — a asserção passaria a testar nada.
 */
function statTile(label: string): HTMLElement {
  const tile = screen.getByText(label).closest('.rounded-xl');
  if (!(tile instanceof HTMLElement)) throw new Error(`StatTile "${label}" não encontrado`);
  return tile;
}

function renderDetail(id: string, search = '') {
  return render(
    <MemoryRouter initialEntries={[`/uso-clientes/${id}${search}`]}>
      <Routes>
        <Route path="/uso-clientes" element={<div>Portfólio</div>} />
        <Route path="/uso-clientes/:companyId" element={<UsageCompanyDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('mock: as duas primeiras companies são fantasmas', () => {
  it('COMPANIES[0] e [1] têm zero plays no período padrão', () => {
    for (const c of [GHOST_A, GHOST_B]) {
      expect(computeMetrics(c, DEFAULT_PERIOD).playsCreated).toBe(0);
    }
  });
});

describe('UsagePortfolio', () => {
  const mount = () =>
    render(
      <MemoryRouter initialEntries={['/uso-clientes']}>
        <UsagePortfolio />
      </MemoryRouter>,
    );

  it('monta com título, contagem e os 4 buckets', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Uso de Clientes' })).toBeTruthy();
    // ancorado no início: o hint dos KPIs de taxa também declara a base em
    // "N clientes …", e um regex solto casaria com os dois.
    expect(
      screen.getByText(new RegExp(`^${COMPANIES.length} clientes ·`)),
    ).toBeTruthy();
    for (const label of ['Crítico', 'Em risco', 'Atenção', 'Saudável']) {
      expect(
        screen.getByRole('region', { name: new RegExp(`^${label} —`) }),
      ).toBeTruthy();
    }
  });

  it('renderiza os 5 KPIs agregados', () => {
    mount();
    for (const label of [
      'MRR em risco',
      'Clientes ativos',
      'Sem acesso há 7d+',
      'Taxa de plays fechadas (carteira)',
      'Taxa de interação (carteira)',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  /**
   * O rótulo dizia "Taxa MÉDIA" (média das taxas por cliente) enquanto o hint
   * prometia "Contatos que responderam ÷ envolvidos" (uma taxa POOLED): o card
   * afirmava ser duas estatísticas ao mesmo tempo, e a conta era a pior das duas.
   * Agora os três — rótulo, hint e conta — dizem a mesma coisa.
   *
   * O valor exato do pooled é assertado em `UsagePortfolio.aggregate.test.tsx`,
   * contra uma carteira construída. Aqui guardamos só a coerência do texto.
   */
  it('os KPIs de taxa não prometem "média" — a conta é pooled (carteira)', () => {
    mount();
    for (const label of [
      'Taxa de plays fechadas (carteira)',
      'Taxa de interação (carteira)',
    ]) {
      const text = statTile(label).textContent ?? '';
      expect(text).not.toMatch(/média/i);
      // o hint declara a BASE: uma taxa agregada sem a sua base não se audita
      expect(text).toMatch(new RegExp(`base: \\d+ clientes .*\\(de ${COMPANIES.length}\\)`));
    }
  });

  it('MRR em risco é formatado como moeda (não como contagem solta)', () => {
    mount();
    expect(statTile('MRR em risco').textContent).toMatch(/R\$/);
  });

  it('mostra as companies fantasma no board (elas são o alvo do dashboard)', () => {
    mount();
    for (const c of [GHOST_A, GHOST_B]) {
      expect(screen.getByRole('button', { name: new RegExp(c.name) })).toBeTruthy();
    }
  });

  it('o popover do score lê os pesos de WEIGHTS (não hardcoda)', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: /como calculamos o score/ }));
    for (const [dim, weight] of Object.entries(WEIGHTS)) {
      const pct = `${Math.round(weight * 100)}%`;
      expect(
        screen.getAllByText(pct).length,
        `peso de ${dim} (${pct}) deveria aparecer no popover`,
      ).toBeGreaterThan(0);
    }
    expect(screen.getByText('Recência')).toBeTruthy();
    expect(screen.getByText('Concentração')).toBeTruthy();
  });

  it('o toggle troca para a vista de tabela', () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Tabela' }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('Score')).toBeTruthy();
    expect(within(table).getByText(GHOST_A.name)).toBeTruthy();
  });
});

describe('UsageCompanyDetail', () => {
  it('renderiza uma company saudável com as 6 seções', () => {
    const healthy = COMPANIES[COMPANIES.length - 1];
    renderDetail(healthy.id);
    expect(screen.getByRole('heading', { name: healthy.name })).toBeTruthy();
    expect(screen.getByText('Composição do score')).toBeTruthy();
    expect(screen.getByText('Plays criadas')).toBeTruthy();
    expect(screen.getByText('Funil de adoção')).toBeTruthy();
    expect(screen.getByText('Atividade por dia')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Usuários' })).toBeTruthy();
  });

  it('não quebra na company fantasma (zero plays no período)', () => {
    for (const ghost of [GHOST_A, GHOST_B]) {
      renderDetail(ghost.id);
      expect(screen.getByRole('heading', { name: ghost.name })).toBeTruthy();
      // funil sem dado tem o próprio empty state, não um crash
      expect(screen.getByText('Funil de adoção')).toBeTruthy();
      // dias até fechamento é null → "—" + hint
      expect(screen.getByText('Nenhuma play fechada no período')).toBeTruthy();
      cleanup();
    }
  });

  /**
   * Este teste só afirma que os dois tiles EXISTEM — e é tudo o que ele deve
   * afirmar. Ele NÃO guarda o `invertDelta`: com o mock real não há como garantir
   * que estas companies tenham touchpoints atrasados em ALTA, e uma asserção de
   * cor sobre um Δ que calha de ser "estável" passaria vazia.
   *
   * A semântica renderizada (Δ de alta em touchpoints atrasados pinta TREND_BAD,
   * Δ de alta em plays criadas pinta TREND_GOOD) é guardada, contra uma carteira
   * construída para isso, em `UsageCompanyDetail.semantics.test.tsx`. Remover
   * `invertDelta` da produção deixa AQUELE arquivo vermelho — este continuaria
   * verde, e foi exatamente esse o buraco que a mutação encontrou.
   */
  it('os dois tiles de touchpoints atrasados existem', () => {
    renderDetail(COMPANIES[2].id);
    expect(screen.getByText('Touchpoints atrasados')).toBeTruthy();
    expect(screen.getByText('% de touchpoints atrasados')).toBeTruthy();
  });

  it('companyId desconhecido → empty state com link de volta', () => {
    renderDetail('nao-existe');
    expect(
      screen.getByRole('heading', { name: 'Cliente não encontrado' }),
    ).toBeTruthy();
    const back = screen.getByRole('link', { name: 'Voltar ao portfólio' });
    expect(back.getAttribute('href')).toBe('/uso-clientes');
  });
});

/**
 * O período mora na URL, não em `useState`. Sem isso, clicar num card abre o
 * detalhe num recorte diferente do que gerou o score que motivou o clique.
 */
describe('período na URL', () => {
  const c = COMPANIES[COMPANIES.length - 1];

  it('o breadcrumb do detalhe preserva o período no link de volta', () => {
    renderDetail(c.id, '?from=2026-06-01&to=2026-06-30');
    const crumb = screen.getByRole('link', { name: 'Uso de Clientes' });
    expect(crumb.getAttribute('href')).toBe(
      '/uso-clientes?from=2026-06-01&to=2026-06-30',
    );
  });

  it('sem params, o link de volta carrega o DEFAULT_PERIOD (não some)', () => {
    renderDetail(c.id);
    const crumb = screen.getByRole('link', { name: 'Uso de Clientes' });
    expect(crumb.getAttribute('href')).toBe(
      `/uso-clientes?from=${toISODate(DEFAULT_PERIOD.start)}&to=${toISODate(
        DEFAULT_PERIOD.end,
      )}`,
    );
  });

  it('params inválidos caem no DEFAULT_PERIOD em vez de produzir NaN', () => {
    renderDetail(c.id, '?from=banana&to=2026-06-30');
    const crumb = screen.getByRole('link', { name: 'Uso de Clientes' });
    expect(crumb.getAttribute('href')).toBe(
      `/uso-clientes?from=${toISODate(DEFAULT_PERIOD.start)}&to=${toISODate(
        DEFAULT_PERIOD.end,
      )}`,
    );
    // e a página renderiza de verdade, sem "NaN" na tela
    expect(screen.getByRole('heading', { name: c.name })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('o período da URL muda os números da tela', () => {
    // Um período de 1 dia bem antes do mock: praticamente nada acontece nele.
    const narrow = { start: fromISODate('2026-01-02'), end: fromISODate('2026-01-02') };
    const wide = DEFAULT_PERIOD;
    expect(computeMetrics(c, narrow).touchpointsCreated).not.toBe(
      computeMetrics(c, wide).touchpointsCreated,
    );

    renderDetail(c.id, '?from=2026-01-02&to=2026-01-02');
    const narrowText = statTile('Touchpoints criados').textContent ?? '';
    cleanup();

    renderDetail(c.id);
    expect(statTile('Touchpoints criados').textContent).not.toBe(narrowText);
  });

  it('o portfólio lê o período da URL', () => {
    render(
      <MemoryRouter initialEntries={['/uso-clientes?from=2026-06-01&to=2026-06-30']}>
        <UsagePortfolio />
      </MemoryRouter>,
    );
    // 01/06 – 30/06 não é preset nem default: o filtro mostra o range literal.
    const expected = periodLabel({
      start: fromISODate('2026-06-01'),
      end: fromISODate('2026-06-30'),
    });
    expect(screen.getByText(expected)).toBeTruthy();
  });
});
