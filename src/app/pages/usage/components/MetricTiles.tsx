/**
 * Os 10 StatTiles do detalhe do cliente, com Δ vs. período anterior.
 *
 * Extraído de `UsageCompanyDetail` para o piloto de layout (`PILOT_COMPANY_ID`)
 * renderizar EXATAMENTE os mesmos tiles com as mesmas regras de honestidade —
 * duplicar este bloco é duplicar as regras de `deltaIfMeasurable`, e é
 * exatamente nelas que a mutação achou buraco uma vez.
 */
import type { UsageMetrics } from '../lib/selectors';
import { formatDelta } from '../lib/format';
import { StatTile } from './StatTile';

/**
 * Δ só existe onde existe DENOMINADOR — nos dois períodos.
 *
 * Um cliente que morreu vê `touchpointsLate` cair de 7 para 0 e
 * `touchpointsLateRate` de 100% para 0%. Com `invertDelta`, "menos atraso" é
 * bom, e os dois tiles pintavam VERDE — a página cuja única função é gritar
 * "esta conta está morrendo" parabenizava o defunto. O número não caiu porque o
 * cliente melhorou; caiu porque ele parou de existir: sem touchpoints criados,
 * não há atraso a medir.
 *
 * Idem para as médias `por play`: `safeDiv(0, 0) = 0` não é "zero contatos por
 * play", é a ausência de razão. Renderizar isso como "-100%" inventa uma queda.
 *
 * Um tile sem Δ é honesto. Um tile verde num cliente moribundo não é.
 *
 * @param delta  o Δ calculado
 * @param currDen denominador no período atual
 * @param prevDen denominador no período anterior
 */
function deltaIfMeasurable(
  delta: ReturnType<typeof formatDelta>,
  currDen: number,
  prevDen: number,
): ReturnType<typeof formatDelta> | undefined {
  return currDen > 0 && prevDen > 0 ? delta : undefined;
}

/** Texto que explica a AUSÊNCIA do Δ — o vazio precisa se justificar. */
function noDeltaHint(currDen: number, prevDen: number, unit: string): string | undefined {
  if (currDen > 0 && prevDen > 0) return undefined;
  if (currDen === 0 && prevDen === 0) return `Sem ${unit} em nenhum dos dois períodos`;
  if (currDen === 0) return `Sem ${unit} no período — não há razão a medir`;
  return `Sem ${unit} no período anterior — não há base de comparação`;
}

interface MetricTilesProps {
  /** Métricas do período atual. */
  m: UsageMetrics;
  /** Métricas do período anterior (base dos Δ). */
  p: UsageMetrics;
}

export function MetricTiles({ m, p }: MetricTilesProps) {
  return (
    /*
     * `auto-rows-fr` + `h-full` no `StatTile`: TODAS as linhas do grid têm a
     * mesma altura, então os 10 tiles ficam do mesmo tamanho. Sem isso, a linha
     * que tem hints de coorte cresce e o conjunto deixa de ler como um bloco só.
     */
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 auto-rows-fr">
      <StatTile
        label="Plays criadas"
        value={m.playsCreated}
        delta={formatDelta(m.playsCreated, p.playsCreated)}
      />
      {/*
       * Coorte diferente da de "Plays criadas": fecha no período quem
       * fecha no período, tenha nascido quando tiver nascido. Por isso
       * "fechadas" pode passar de "criadas" sem que nada esteja errado —
       * e por isso o rótulo diz de quem está falando.
       */}
      <StatTile
        label="Plays fechadas no período"
        value={m.playsClosed}
        delta={formatDelta(m.playsClosed, p.playsClosed)}
        hint="Fechadas dentro do período, independente de quando foram criadas"
      />
      <StatTile
        label="Touchpoints criados"
        value={m.touchpointsCreated}
        delta={formatDelta(m.touchpointsCreated, p.touchpointsCreated)}
      />
      <StatTile
        label="Touchpoints finalizados no período"
        value={m.touchpointsClosed}
        delta={formatDelta(m.touchpointsClosed, p.touchpointsClosed)}
        hint="Finalizados dentro do período, independente de quando foram criados"
      />
      {/*
       * subir é RUIM: invertDelta. Mas o Δ SÓ aparece se houver
       * touchpoints criados nos dois períodos — ver `deltaIfMeasurable`.
       * Sem denominador, "0 atrasados" não é uma melhora, é um vazio.
       */}
      <StatTile
        label="Touchpoints atrasados"
        value={m.touchpointsLate}
        delta={deltaIfMeasurable(
          formatDelta(m.touchpointsLate, p.touchpointsLate),
          m.touchpointsCreated,
          p.touchpointsCreated,
        )}
        hint={noDeltaHint(m.touchpointsCreated, p.touchpointsCreated, 'touchpoints criados')}
        invertDelta
      />
      <StatTile
        label="% de touchpoints atrasados"
        value={m.touchpointsLateRate}
        format="pct"
        delta={deltaIfMeasurable(
          formatDelta(m.touchpointsLateRate, p.touchpointsLateRate),
          m.touchpointsCreated,
          p.touchpointsCreated,
        )}
        hint={noDeltaHint(m.touchpointsCreated, p.touchpointsCreated, 'touchpoints criados')}
        invertDelta
      />
      {/* Médias "por play": o denominador é `playsCreated`. */}
      <StatTile
        label="Média de touchpoints por play"
        value={m.avgTouchpointsPerPlay}
        delta={deltaIfMeasurable(
          formatDelta(m.avgTouchpointsPerPlay, p.avgTouchpointsPerPlay),
          m.playsCreated,
          p.playsCreated,
        )}
        hint={noDeltaHint(m.playsCreated, p.playsCreated, 'plays criadas')}
      />
      <StatTile
        label="Média de contatos por play"
        value={m.avgContactsPerPlay}
        delta={deltaIfMeasurable(
          formatDelta(m.avgContactsPerPlay, p.avgContactsPerPlay),
          m.playsCreated,
          p.playsCreated,
        )}
        hint={noDeltaHint(m.playsCreated, p.playsCreated, 'plays criadas')}
      />
      <StatTile
        label="Média de interações por play"
        value={m.avgInteractionsPerPlay}
        delta={deltaIfMeasurable(
          formatDelta(m.avgInteractionsPerPlay, p.avgInteractionsPerPlay),
          m.playsCreated,
          p.playsCreated,
        )}
        hint={noDeltaHint(m.playsCreated, p.playsCreated, 'plays criadas')}
      />
      <StatTile
        label="Dias até fechamento"
        value={m.avgDaysToClose === null ? '—' : m.avgDaysToClose}
        format="days"
        hint={m.avgDaysToClose === null ? 'Nenhuma play fechada no período' : undefined}
      />
    </div>
  );
}
