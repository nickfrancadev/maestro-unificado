/**
 * O período vive na URL (`?from=YYYY-MM-DD&to=YYYY-MM-DD`), não em `useState`.
 *
 * Por quê: o fluxo real é portfólio → detalhe → voltar. Com estado local, o
 * filtro que o time acabou de escolher morre no primeiro clique num card, e o
 * detalhe abre num período diferente do que gerou o score que motivou o clique.
 * Na URL ele sobrevive à navegação, ao botão "voltar" do browser e a um
 * deep-link colado no Slack.
 *
 * A conversão Date <-> string reusa `toISODate`/`fromISODate` do `PeriodFilter`
 * (UTC-safe). Hand-rolling isso com `toISOString().slice(0,10)` renderizaria o
 * dia anterior em qualquer fuso negativo — e o mock inteiro é ancorado em UTC.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Period } from './data/types';
import { DEFAULT_PERIOD } from './data/mockData';
import { fromISODate, toISODate } from './components/PeriodFilter';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parse(iso: string | null): Date | null {
  if (!iso || !ISO.test(iso)) return null;
  const d = fromISODate(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Serializa um `Period` nos search params que este hook lê. */
function periodParams(period: Period): { from: string; to: string } {
  return { from: toISODate(period.start), to: toISODate(period.end) };
}

/** Query string `?from=…&to=…` — usada para preservar o período no breadcrumb. */
export function periodSearch(period: Period): string {
  return `?${new URLSearchParams(periodParams(period)).toString()}`;
}

/**
 * Lê o período dos search params, caindo em `DEFAULT_PERIOD` quando ausente ou
 * inválido. Escrever troca a URL com `replace` — mexer no filtro não deve
 * empilhar 20 entradas no histórico entre você e o portfólio.
 */
export function usePeriodParam(): [Period, (p: Period) => void] {
  const [params, setParams] = useSearchParams();

  const from = params.get('from');
  const to = params.get('to');

  const period = useMemo<Period>(() => {
    const start = parse(from);
    const end = parse(to);
    if (!start || !end || start.getTime() > end.getTime()) return DEFAULT_PERIOD;
    return { start, end };
  }, [from, to]);

  const setPeriod = useCallback(
    (p: Period) => {
      setParams(periodParams(p), { replace: true });
    },
    [setParams],
  );

  return [period, setPeriod];
}
