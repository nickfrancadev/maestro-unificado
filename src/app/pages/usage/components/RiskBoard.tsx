/**
 * Risk Board — as 24 companies em 4 colunas, uma por bucket de risco.
 *
 * Ordem das colunas = ordem de leitura: o pior primeiro. Dentro da coluna, as
 * companies vêm por score ASCENDENTE — dentro do "Crítico", o pior dos críticos
 * está no topo.
 *
 * As cores vêm de `BUCKET_META` (`lib/health.ts`), fonte única da rampa. Este
 * arquivo NÃO escreve os hexes da rampa — o teste `rampColors.guard.test.ts`
 * varre este diretório e falharia. Cabeçalho de coluna = ícone + rótulo + cor.
 */
import { motion, useReducedMotion } from 'motion/react';
import type { Company, Health, RiskBucket } from '../data/types';
import type { UsageMetrics } from '../lib/selectors';
import { BUCKET_META } from '../lib/health';
import { BUCKET_ICON } from './icons';
import { CompanyCard } from './CompanyCard';

const MUTED = '#64748B';

export interface RiskBoardRow {
  company: Company;
  health: Health;
  metrics: UsageMetrics;
  /** atividade por semana — `activityByWeek(company, 12)` */
  sparkline: number[];
}

interface RiskBoardProps {
  rows: RiskBoardRow[];
  onSelect: (companyId: string) => void;
}

/** Do pior ao melhor: é a ordem em que o time deve olhar. */
const BUCKET_ORDER: RiskBucket[] = ['critical', 'at_risk', 'watch', 'healthy'];

/** Stagger de 40ms entre cards (spec). */
const STAGGER_MS = 40;

export function RiskBoard({ rows, onSelect }: RiskBoardProps) {
  const reduceMotion = useReducedMotion();

  const byBucket: Record<RiskBucket, RiskBoardRow[]> = {
    critical: [],
    at_risk: [],
    watch: [],
    healthy: [],
  };
  for (const row of rows) byBucket[row.health.bucket].push(row);
  // Score ascendente: o mais crítico no topo da sua coluna.
  for (const b of BUCKET_ORDER) {
    byBucket[b].sort((a, c) => a.health.score - c.health.score);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {BUCKET_ORDER.map((bucket) => {
        const meta = BUCKET_META[bucket];
        const Icon = BUCKET_ICON[bucket];
        const items = byBucket[bucket];

        return (
          <section
            key={bucket}
            aria-label={`${meta.label} — ${items.length} ${items.length === 1 ? 'cliente' : 'clientes'}`}
            className="flex flex-col gap-3 min-w-0 font-['Euclid_Circular_A',sans-serif]"
          >
            {/* cabeçalho: cor + ícone + rótulo + contagem (cor nunca sozinha) */}
            <header
              className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2"
              style={{
                borderColor: meta.color,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <Icon size={16} style={{ color: meta.color }} aria-hidden="true" />
              <span
                className="flex-1 leading-none"
                style={{ fontSize: 13, fontWeight: 600, color: meta.color }}
              >
                {meta.label}
              </span>
              <span
                className="tabular-nums leading-none rounded-full px-2 py-1"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: meta.color,
                  background: '#F8FAFC',
                }}
              >
                {items.length}
              </span>
            </header>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-260px)] pr-0.5">
              {items.length === 0 ? (
                <p
                  className="rounded-xl border border-dashed border-[#d8d8d8] bg-white/60 px-3 py-6 text-center"
                  style={{ fontSize: 12, color: MUTED }}
                >
                  Nenhum cliente neste bucket.
                </p>
              ) : (
                items.map((row, i) => (
                  <motion.div
                    key={row.company.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.2,
                            ease: 'easeOut',
                            delay: (i * STAGGER_MS) / 1000,
                          }
                    }
                  >
                    <CompanyCard
                      company={row.company}
                      health={row.health}
                      metrics={row.metrics}
                      sparkline={row.sparkline}
                      onClick={() => onSelect(row.company.id)}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
