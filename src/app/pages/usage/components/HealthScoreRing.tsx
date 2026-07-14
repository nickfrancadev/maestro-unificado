import { motion, useReducedMotion } from 'motion/react';
import { BUCKET_META } from '../lib/health';
import type { RiskBucket } from '../data/types';
import { BUCKET_ICON } from './icons';

interface HealthScoreRingProps {
  score: number;
  bucket: RiskBucket;
  /** diâmetro em px — 56 no card, 120 no detalhe */
  size?: number;
  /** mostra o rótulo do bucket abaixo do número (útil no tamanho grande) */
  showLabel?: boolean;
}

const TRACK = '#E2E8F0';

export function HealthScoreRing({
  score,
  bucket,
  size = 56,
  showLabel = false,
}: HealthScoreRingProps) {
  const reduceMotion = useReducedMotion();
  const meta = BUCKET_META[bucket];
  const Icon = BUCKET_ICON[bucket];

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = size >= 100 ? 9 : size >= 72 ? 7 : 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (clamped / 100);

  const large = size >= 100;

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <div
        role="img"
        aria-label={`Health score ${clamped} de 100 — ${meta.label}`}
        className="relative inline-flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={TRACK}
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={meta.color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            // começa no topo, sentido horário
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: reduceMotion ? circumference - progress : circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.4, ease: 'easeOut' }
            }
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-['Euclid_Circular_A',sans-serif] tabular-nums leading-none"
            style={{
              fontSize: large ? 34 : Math.max(13, Math.round(size * 0.32)),
              fontWeight: 700,
              color: meta.color,
            }}
          >
            {clamped}
          </span>
        </div>
      </div>

      {/* cor nunca sozinha: ícone + rótulo textual do bucket */}
      {showLabel && (
        <span
          className="inline-flex items-center gap-1 font-['Euclid_Circular_A',sans-serif] leading-none"
          style={{ fontSize: 12, fontWeight: 600, color: meta.color }}
        >
          <Icon size={13} aria-hidden="true" />
          {meta.label}
        </span>
      )}
    </div>
  );
}
