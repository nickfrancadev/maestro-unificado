/**
 * Mix de tipos de play + a ANOTAÇÃO INTERPRETATIVA derivada dos dados.
 *
 * A anotação é o ponto do componente: um gráfico de 4 barras não diz nada
 * acionável, mas "só PrePlay" diz que o cliente nunca chegou a vender.
 *
 * Barras em navy sólido: tipos de play são categorias, não uma escala — sem
 * gradiente e (obviamente) sem a rampa de risco, que é exclusiva de churn.
 */
import { Info, Sparkles, TriangleAlert } from 'lucide-react';
import type { PlayType } from '../data/types';

const NAVY = '#212A46';
const MUTED = '#64748B';

export interface PlayTypeMixProps {
  mix: { type: PlayType; count: number }[];
}

type Annotation = {
  tone: 'warn' | 'good' | 'neutral';
  text: string;
};

/** Exportada para o teste — a regra é a razão de ser do componente. */
export function annotate(mix: { type: PlayType; count: number }[]): Annotation | null {
  const total = mix.reduce((s, m) => s + m.count, 0);
  if (total === 0) return null;

  const countOf = (t: PlayType) => mix.find((m) => m.type === t)?.count ?? 0;

  if (countOf('CsPlay') > 0) {
    return { tone: 'good', text: 'Tem CsPlay — sinal de expansão/pós-venda.' };
  }
  if (countOf('PrePlay') === total) {
    return { tone: 'warn', text: 'Só PrePlay — o cliente nunca chegou a vender.' };
  }
  return null;
}

const TONE_STYLE: Record<Annotation['tone'], { bg: string; fg: string; Icon: typeof Info }> = {
  warn: { bg: '#FFFBEB', fg: '#92400E', Icon: TriangleAlert },
  good: { bg: '#ECFDF5', fg: '#065F46', Icon: Sparkles },
  neutral: { bg: '#F1F5F9', fg: '#334155', Icon: Info },
};

export function PlayTypeMix({ mix }: PlayTypeMixProps) {
  const total = mix.reduce((s, m) => s + m.count, 0);
  const max = mix.reduce((m, x) => Math.max(m, x.count), 0);
  const annotation = annotate(mix);

  return (
    <div
      className="bg-white rounded-xl p-5 border border-[#d8d8d8] font-['Euclid_Circular_A',sans-serif]"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: NAVY }}>
          Mix de tipos de play
        </h3>
        <p className="text-xs mt-0.5" style={{ color: MUTED }}>
          Plays criadas no período, por tipo
        </p>
      </div>

      {total === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
          Nenhuma play criada no período.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {mix.map((m) => {
              const width = max > 0 ? Math.max((m.count / max) * 100, m.count > 0 ? 1.5 : 0) : 0;
              return (
                <li key={m.type}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-xs font-medium" style={{ color: NAVY }}>
                      {m.type}
                    </span>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: m.count === 0 ? MUTED : NAVY }}
                    >
                      {m.count}
                    </span>
                  </div>
                  <div
                    className="h-2.5 rounded-full w-full overflow-hidden"
                    style={{ background: '#E2E8F0' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${width}%`, background: NAVY }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {annotation && (
            <p
              className="mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-medium"
              style={{
                background: TONE_STYLE[annotation.tone].bg,
                color: TONE_STYLE[annotation.tone].fg,
              }}
            >
              {(() => {
                const Icon = TONE_STYLE[annotation.tone].Icon;
                return <Icon size={14} className="shrink-0 mt-px" aria-hidden="true" />;
              })()}
              <span>{annotation.text}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
