/**
 * Funil de adoção: barras horizontais (uma por estágio) com a % de conversão
 * entre estágios consecutivos renderizada COMO TEXTO — a largura da barra
 * sozinha não é um canal legível o bastante para ler uma taxa.
 *
 * A maior queda do funil é calculada e destacada (fundo âmbar + rótulo textual
 * "maior queda"): cor nunca é o único sinal.
 *
 * Sem Recharts de propósito: `div`s são mais simples, mais acessíveis e
 * permitem colocar o valor absoluto ao lado do nome do estágio.
 */
import { TrendingDown } from 'lucide-react';
import { formatNumber } from '../lib/format';

const NAVY = '#212A46';
const NAVY_LIGHT = '#8A93AD';
const AMBER = '#F59E0B';
const AMBER_BG = '#FFFBEB';
const MUTED = '#64748B';

export interface AdoptionFunnelProps {
  stages: { stage: string; value: number }[];
}

/** Interpola do navy cheio (topo do funil) até um navy claro (base). */
function shadeFor(index: number, total: number): string {
  if (total <= 1) return NAVY;
  const t = index / (total - 1);
  const from = [0x21, 0x2a, 0x46];
  const to = [0x8a, 0x93, 0xad];
  const ch = from.map((c, i) => Math.round(c + (to[i] - c) * t));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}

export function AdoptionFunnel({ stages }: AdoptionFunnelProps) {
  const hasData = stages.length > 0 && stages.some((s) => s.value > 0);
  const max = stages.reduce((m, s) => Math.max(m, s.value), 0);

  /**
   * Conversão de cada estágio para o anterior. `dropPct` é a queda em pontos
   * percentuais — é ela que define a "maior queda", não a diferença absoluta
   * (perder 900 de 1000 contatos é pior que perder 900 de 100000 interações).
   */
  const conversions = stages.map((s, i) => {
    if (i === 0) return null;
    const prev = stages[i - 1].value;
    if (prev <= 0) return null;
    const rate = s.value / prev;
    return { rate, dropPct: (1 - rate) * 100 };
  });

  let worstIndex = -1;
  let worstDrop = -1;
  conversions.forEach((c, i) => {
    if (c && c.dropPct > worstDrop) {
      worstDrop = c.dropPct;
      worstIndex = i;
    }
  });
  // Só faz sentido chamar de "maior queda" se de fato houve queda.
  if (worstDrop <= 0) worstIndex = -1;

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
          Funil de adoção
        </h3>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
          Conversão entre etapas no período
        </p>
      </div>

      {!hasData ? (
        <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
          Sem atividade no período — o cliente não avançou em nenhuma etapa do funil.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {stages.map((s, i) => {
            const conv = conversions[i];
            const isWorst = i === worstIndex;
            const width = max > 0 ? Math.max((s.value / max) * 100, s.value > 0 ? 1.5 : 0) : 0;

            return (
              <li key={s.stage}>
                {conv && (
                  <div
                    className="flex items-center gap-1.5 pl-1 py-0.5 text-xs tabular-nums"
                    style={{ color: isWorst ? AMBER : MUTED }}
                  >
                    <span aria-hidden="true">↓</span>
                    <span>{Math.round(conv.rate * 100)}%</span>
                    {isWorst && (
                      <span
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
                        style={{ background: AMBER_BG, color: '#92400E' }}
                      >
                        <TrendingDown size={12} aria-hidden="true" />
                        maior queda
                      </span>
                    )}
                  </div>
                )}

                <div
                  className="rounded-md px-2 py-1.5"
                  style={
                    isWorst
                      ? { background: AMBER_BG, border: `1px solid ${AMBER}` }
                      : { border: '1px solid transparent' }
                  }
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-xs font-medium" style={{ color: NAVY }}>
                      {s.stage}
                    </span>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: NAVY }}
                    >
                      {formatNumber(s.value)}
                    </span>
                  </div>
                  <div
                    className="h-2.5 rounded-full w-full overflow-hidden"
                    style={{ background: '#E2E8F0' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        background: shadeFor(i, stages.length),
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
