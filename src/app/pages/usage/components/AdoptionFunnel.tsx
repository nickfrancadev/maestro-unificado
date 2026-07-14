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
import { TREND_FLAT } from './colors';

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
   * Conversão de cada estágio para o anterior.
   *
   * Este funil NÃO é monotonicamente decrescente: os estágios têm unidades
   * diferentes (contas → contatos → dossiês → plays → touchpoints → interações
   * → plays fechadas). Um cliente saudável tem MAIS contatos que contas — a
   * razão `próximo/anterior` legitimamente passa de 1. Isso é EXPANSÃO, não
   * queda, e chamá-la de "↓ 400%" faria o componente mentir em todo cliente.
   *
   *   rate > 1  → expansão   (normal, saudável)
   *   rate < 1  → contração  (só ela é candidata a "maior queda")
   *   rate = 1  → estável    (nem seta, nem palavra)
   *
   * Denominador zero é INDEFINIDO — não é 0%, não é Infinity: sem estágio
   * anterior não existe taxa de conversão. A linha simplesmente não é
   * renderizada (é o caso dos clientes-fantasma, que zeram tudo após o topo).
   *
   * `deltaPP` é a variação em pontos percentuais (negativa numa contração).
   */
  const conversions = stages.map((s, i) => {
    if (i === 0) return null;
    const prev = stages[i - 1].value;
    if (prev <= 0) return null; // indefinido, não zero
    const rate = s.value / prev;
    return {
      rate,
      deltaPP: (rate - 1) * 100,
      isContraction: rate < 1,
      isExpansion: rate > 1,
    };
  });

  /**
   * A "maior queda" é a PIOR CONTRAÇÃO — a menor razão abaixo de 1. Uma
   * expansão nunca concorre, nem quando é a menor de todas: se o funil só
   * expande, nenhum estágio é marcado (não existe gargalo a apontar).
   */
  let worstIndex = -1;
  let worstRate = Infinity;
  conversions.forEach((c, i) => {
    if (c && c.isContraction && c.rate < worstRate) {
      worstRate = c.rate;
      worstIndex = i;
    }
  });

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
                    {/* Seta, sinal e palavra têm que concordar: uma expansão
                        jamais é descrita como queda. Estável não ganha seta. */}
                    {conv.isExpansion && <span aria-hidden="true">↑</span>}
                    {conv.isContraction && <span aria-hidden="true">↓</span>}
                    <span>{Math.round(conv.rate * 100)}%</span>
                    <span style={{ color: isWorst ? AMBER : TREND_FLAT }}>
                      {conv.isExpansion && `expansão (+${Math.round(conv.deltaPP)} pp)`}
                      {conv.isContraction && `queda (${Math.round(conv.deltaPP)} pp)`}
                      {!conv.isExpansion && !conv.isContraction && 'estável'}
                    </span>
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
