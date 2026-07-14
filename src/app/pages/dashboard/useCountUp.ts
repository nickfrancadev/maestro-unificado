import { useEffect, useRef, useState } from "react";

/**
 * Anima um número até `end`, com easing ease-out.
 *
 * Anima a partir do VALOR ATUAL, não de zero. Isso importa: quando o usuário
 * troca o filtro de período, `end` muda de 100 para 90 — animar de 0 faria
 * todos os KPIs piscarem "0" durante 1200ms. Num dashboard de churn, um
 * "0 plays criadas" na tela é o falso sinal mais alarmante possível.
 *
 * Na montagem o valor atual é 0, então o comportamento clássico (0 → N) segue
 * idêntico (é o que `InternoTab` usa).
 *
 * Respeita `prefers-reduced-motion`: nesse caso pula direto para o valor final.
 */
export function useCountUp(end: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);
  /** Último valor renderizado — ponto de partida da próxima animação. */
  const valueRef = useRef(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const from = valueRef.current;

    // `from === end` cobre o antigo curto-circuito `end === 0` na montagem.
    if (prefersReducedMotion || from === end) {
      valueRef.current = end;
      setValue(end);
      return;
    }

    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + eased * (end - from));
      valueRef.current = next;
      setValue(next);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [end, durationMs]);

  return value;
}
