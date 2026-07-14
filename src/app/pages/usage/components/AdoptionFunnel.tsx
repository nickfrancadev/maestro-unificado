/**
 * Funil de adoção: barras horizontais (uma por estágio), com a relação entre
 * estágios renderizada COMO TEXTO — a largura da barra sozinha não é um canal
 * legível o bastante para ler uma taxa.
 *
 * DUAS RELAÇÕES DIFERENTES, e o componente não as confunde:
 *
 *  1. CONVERSÃO (%) — só entre estágios que genuinamente ANINHAM (o estágio é um
 *     subconjunto do outro: `Plays fechadas ⊂ Plays`). Aí "72%" quer dizer algo:
 *     de cada 100 plays criadas, 72 fecharam. Só uma conversão pode ser "queda".
 *
 *  2. RAZÃO POR UNIDADE — entre estágios de unidades que NÃO se encaixam
 *     (touchpoint não é "play convertida"; interação não é "touchpoint
 *     convertido"). "3,7 interações por touchpoint" é informativo; "374% de
 *     conversão" é ruído — e era ruído em cima justamente dos clientes
 *     saudáveis, que são os que mais expandem.
 *
 * A maior queda é procurada SÓ entre as conversões reais (1), e destacada com
 * fundo âmbar + rótulo textual "maior queda": cor nunca é o único sinal.
 *
 * Sem Recharts de propósito: `div`s são mais simples, mais acessíveis e
 * permitem colocar o valor absoluto ao lado do nome do estágio.
 */
import { TrendingDown } from 'lucide-react';
import type { FunnelStage } from '../lib/selectors';
import { formatNumber } from '../lib/format';
import { TREND_FLAT } from './colors';

const NAVY = '#212A46';
const NAVY_LIGHT = '#8A93AD';
const AMBER = '#F59E0B';
const AMBER_BG = '#FFFBEB';
const MUTED = '#64748B';

interface AdoptionFunnelProps {
  stages: FunnelStage[];
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

/** A relação entre um estágio e o seu antecessor — ou a sua base de aninhamento. */
type Relation =
  | {
      kind: 'conversion';
      /** 0–1+. Fração da base que chegou até aqui. */
      rate: number;
      /** Variação em pontos percentuais (negativa numa contração). */
      deltaPP: number;
      isContraction: boolean;
      isExpansion: boolean;
      base: string;
    }
  | {
      kind: 'ratio';
      /** Ex.: 3,7 — "3,7 interações por touchpoint". */
      perUnit: number;
      label: string;
    };

export function AdoptionFunnel({ stages }: AdoptionFunnelProps) {
  /**
   * "Tem dado?" é uma pergunta sobre o PERÍODO.
   *
   * Antes: `stages.some(s => s.value > 0)` — mas os três primeiros estágios
   * (Contas/Contatos/Dossiês) são contagens estáticas do cadastro, nunca zero e
   * nunca recortadas pelo período. O estado vazio era, portanto, INALCANÇÁVEL: o
   * cliente-fantasma, que não fez absolutamente nada, ainda ganhava um funil de
   * aparência confiante ("Dossiês 15 → Plays 0, maior queda") e o componente
   * diagnosticava um gargalo de conversão para quem simplesmente parou de
   * logar. Só os estágios do período testemunham sobre o período.
   */
  const scoped = stages.filter((s) => s.periodScoped);
  const hasData = scoped.length > 0 && scoped.some((s) => s.value > 0);

  const max = stages.reduce((m, s) => Math.max(m, s.value), 0);
  const valueOf = (name: string) => stages.find((s) => s.stage === name)?.value;

  /**
   * A relação que precede cada estágio.
   *
   *  - `subsetOf` → CONVERSÃO (%). O estágio aninha na base: a razão é uma taxa
   *    de verdade, e só ela pode ser chamada de queda/expansão.
   *      rate > 1  → expansão   (impossível num aninhamento correto, mas o
   *                              componente não mente se acontecer)
   *      rate < 1  → contração  (só ela concorre a "maior queda")
   *      rate = 1  → estável    (nem seta, nem palavra)
   *
   *  - senão → RAZÃO POR UNIDADE. As unidades não se encaixam; a porcentagem
   *    seria ruído. "3,7 interações por touchpoint" diz o que há para dizer, e
   *    nunca é descrita como queda nem como expansão.
   *
   * Denominador zero é INDEFINIDO em ambos os casos — não é 0%, não é Infinity:
   * sem base não existe razão. A linha simplesmente não é renderizada.
   */
  const relations: (Relation | null)[] = stages.map((s, i) => {
    if (s.subsetOf) {
      const base = valueOf(s.subsetOf);
      if (base === undefined || base <= 0) return null; // indefinido, não zero
      const rate = s.value / base;
      return {
        kind: 'conversion',
        rate,
        deltaPP: (rate - 1) * 100,
        isContraction: rate < 1,
        isExpansion: rate > 1,
        base: s.subsetOf,
      };
    }

    if (i === 0) return null;
    const prev = stages[i - 1].value;
    if (prev <= 0 || !s.perUnitLabel) return null; // indefinido, não zero
    return { kind: 'ratio', perUnit: s.value / prev, label: s.perUnitLabel };
  });

  /**
   * A "maior queda" é a PIOR CONTRAÇÃO, e só uma CONVERSÃO pode ser uma queda.
   *
   * Uma razão por unidade nunca concorre: "0,3 dossiês por contato" não é um
   * gargalo de 70%, é só a forma do negócio. Apontar a "maior queda" no meio de
   * razões incomensuráveis era inventar um gargalo — e era exatamente o que o
   * fantasma exibia. Se não há conversão contraindo, nenhum estágio é marcado.
   */
  let worstIndex = -1;
  let worstRate = Infinity;
  relations.forEach((r, i) => {
    if (r && r.kind === 'conversion' && r.isContraction && r.rate < worstRate) {
      worstRate = r.rate;
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
        {/* O subtítulo não promete "conversão entre etapas": só uma das
            transições é uma conversão. As outras são razões por unidade. */}
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
          Etapas do período · % só onde uma etapa é subconjunto da outra
        </p>
      </div>

      {!hasData ? (
        <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
          Sem atividade no período — o cliente não avançou em nenhuma etapa do funil.
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {stages.map((s, i) => {
            const rel = relations[i];
            const isWorst = i === worstIndex;
            const width = max > 0 ? Math.max((s.value / max) * 100, s.value > 0 ? 1.5 : 0) : 0;

            return (
              <li key={s.stage}>
                {rel?.kind === 'conversion' && (
                  <div
                    className="flex items-center gap-1.5 pl-1 py-0.5 text-xs tabular-nums"
                    style={{ color: isWorst ? AMBER : MUTED }}
                  >
                    {/* Seta, sinal e palavra têm que concordar: uma expansão
                        jamais é descrita como queda. Estável não ganha seta. */}
                    {rel.isExpansion && <span aria-hidden="true">↑</span>}
                    {rel.isContraction && <span aria-hidden="true">↓</span>}
                    <span>{Math.round(rel.rate * 100)}%</span>
                    <span style={{ color: isWorst ? AMBER : TREND_FLAT }}>
                      {rel.isExpansion && `expansão (+${Math.round(rel.deltaPP)} pp)`}
                      {rel.isContraction && `queda (${Math.round(rel.deltaPP)} pp)`}
                      {!rel.isExpansion && !rel.isContraction && 'estável'}
                    </span>
                    {/* A conversão diz de QUE base ela fala: "de Plays" — sem
                        isso, uma taxa que salta dois estágios é inescrutável. */}
                    <span style={{ color: MUTED }}>de {rel.base}</span>
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

                {/* Razão por unidade: sem %, sem seta, sem "queda"/"expansão" —
                    não há conversão aqui para afirmar. */}
                {rel?.kind === 'ratio' && (
                  <div
                    className="flex items-center gap-1.5 pl-1 py-0.5 text-xs tabular-nums"
                    style={{ color: MUTED }}
                  >
                    <span aria-hidden="true">·</span>
                    <span>
                      {formatNumber(rel.perUnit)} {rel.label}
                    </span>
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
