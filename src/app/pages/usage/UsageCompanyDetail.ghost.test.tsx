/**
 * I2 + I3 — a página do cliente MORIBUNDO não pode parabenizá-lo.
 *
 * valeverde é o fantasma: o caso central que este dashboard existe para caçar.
 * Ele não faz NADA há semanas. E, pré-fix, a sua página de detalhe exibia:
 *
 *  - "Touchpoints atrasados: 0 ↘ queda de 100%"      → VERDE (TREND_GOOD)
 *  - "% de touchpoints atrasados: 0% ↘ queda de 100%" → VERDE
 *
 * `invertDelta` estava fazendo o que lhe mandaram (menos atraso = bom), mas uma
 * métrica que colapsa a zero PORQUE O CLIENTE PAROU DE EXISTIR não é uma
 * melhora: sem touchpoints criados, não há atraso a medir. E
 * "Média de contatos por play: 0 ↘100%" era `safeDiv(0, 0)` — ausência de
 * razão renderizada como queda real.
 *
 * A página cuja única função é gritar "esta conta está morrendo" tem ZERO
 * indicadores verdes.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UsageCompanyDetail } from './UsageCompanyDetail';
import { getCompany, DEFAULT_PERIOD } from './data/mockData';
import {
  computeMetrics,
  lastAccessAt,
  lastActivityAt,
  previousPeriod,
} from './lib/selectors';
import { daysAgo } from './lib/format';
import { TREND_GOOD } from './components/colors';

afterEach(cleanup);

const GHOST = 'valeverde';

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/uso-clientes/${id}`]}>
      <Routes>
        <Route path="/uso-clientes" element={<div>Portfólio</div>} />
        <Route path="/uso-clientes/:companyId" element={<UsageCompanyDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Todo elemento cuja cor inline é a cor de "melhorou". */
function greenElements(): Element[] {
  return Array.from(document.querySelectorAll('[style]')).filter((el) => {
    const style = el.getAttribute('style') ?? '';
    // jsdom normaliza o hex para rgb() — casa com os dois.
    return (
      style.toUpperCase().includes(TREND_GOOD.toUpperCase()) ||
      style.includes('rgb(22, 163, 74)')
    );
  });
}

/** O card inteiro de um `StatTile`, a partir do seu rótulo. */
function statTile(label: string): HTMLElement {
  const tile = screen.getByText(label).closest('.rounded-xl');
  if (!(tile instanceof HTMLElement)) throw new Error(`StatTile "${label}" não encontrado`);
  return tile;
}

describe('I2 — o fantasma não recebe indicadores de melhora', () => {
  it('o mock ainda encena o caso: zero atividade agora, atividade antes', () => {
    // Se o mock mudar e o fantasma deixar de ser fantasma, este arquivo vira
    // um teste vazio que passa por vacuidade. Esta guarda impede isso.
    const c = getCompany(GHOST)!;
    const m = computeMetrics(c, DEFAULT_PERIOD);
    const p = computeMetrics(c, previousPeriod(DEFAULT_PERIOD));

    expect(m.touchpointsCreated).toBe(0); // nada criado agora
    expect(p.touchpointsCreated).toBeGreaterThan(0); // havia antes
    expect(p.touchpointsLate).toBeGreaterThan(0); // e havia atraso antes
    expect(m.playsCreated).toBe(0);
    // ⇒ o Δ ingênuo de `touchpointsLate` é uma "queda de 100%", que com
    //   `invertDelta` pintaria de verde.
  });

  it('a página do fantasma não tem NENHUM indicador verde', () => {
    renderDetail(GHOST);
    const green = greenElements();
    expect(
      green.map((e) => e.textContent),
      'nenhum elemento deve usar TREND_GOOD na página de um cliente moribundo',
    ).toEqual([]);
  });

  it('os tiles sem denominador não exibem Δ nenhum — exibem o porquê', () => {
    renderDetail(GHOST);

    // Sem touchpoints criados: não há atraso a medir.
    for (const label of ['Touchpoints atrasados', '% de touchpoints atrasados']) {
      const tile = statTile(label);
      const text = tile.textContent ?? '';
      expect(text, `${label} não pode alegar queda`).not.toMatch(/queda/i);
      expect(text, `${label} não pode exibir %`).not.toMatch(/100%/);
      expect(text).toMatch(/Sem touchpoints criados/);
    }

    // Sem plays criadas: `safeDiv(0, 0)` não é uma razão.
    for (const label of [
      'Média de contatos por play',
      'Média de interações por play',
      'Média de touchpoints por play',
    ]) {
      const text = statTile(label).textContent ?? '';
      expect(text, `${label} não pode alegar queda`).not.toMatch(/queda/i);
      expect(text).toMatch(/Sem plays criadas/);
    }
  });
});

describe('I3 — o funil do fantasma mostra o estado vazio', () => {
  it('zero atividade no período → nenhum gargalo narrado', () => {
    renderDetail(GHOST);
    expect(screen.getByText(/Sem atividade no período/)).toBeTruthy();
    // Pré-fix: as 41 contas estáticas mantinham o funil de pé e ele elegia uma
    // "maior queda" dossiê→play para quem simplesmente parou de logar.
    expect(screen.queryByText('maior queda')).toBeNull();
  });
});

describe('C1 — o chip e o painel "Conta" não se contradizem', () => {
  it('o chip fala de ATIVIDADE; o painel, de acesso — e nenhum finge ser o outro', () => {
    renderDetail(GHOST);

    // O painel "Conta" mostra o último acesso de verdade (58d) — e o número que
    // ele exibe é o de `lastAccessAt`, não o da atividade. Ancorado na LINHA do
    // painel: o mesmo texto ("58d atrás") pode aparecer noutra linha por acaso.
    const accessDays = daysAgo(lastAccessAt(getCompany(GHOST)!));
    const activityDays = daysAgo(lastActivityAt(getCompany(GHOST)!));
    expect(accessDays).not.toBe(activityDays); // o mock preserva a divergência

    const accessRow = screen
      .getAllByText('Último acesso')
      .map((el) => el.closest('div'))
      .find((el): el is HTMLDivElement => el instanceof HTMLDivElement);
    expect(accessRow?.textContent).toMatch(new RegExp(`${accessDays}d atrás`));

    // O chip mede inatividade e se apresenta como tal, com o número DA
    // ATIVIDADE. Pré-fix ele dizia "Sem acesso há 46d" ao lado de
    // "Último acesso: 58d atrás" — duas respostas diferentes para a mesma
    // pergunta, na mesma tela.
    expect(screen.getByText(`Sem atividade há ${activityDays}d`)).toBeTruthy();
    expect(screen.queryByText(/^Sem acesso há \d+d$/)).toBeNull();
  });
});
