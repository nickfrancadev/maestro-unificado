import { OctagonAlert, TriangleAlert, Info, type LucideIcon } from 'lucide-react';
import type { Signal } from '../data/types';

interface SignalChipsProps {
  signals: Signal[];
  /** máximo de chips visíveis; o excedente vira "+N" */
  max?: number;
}

interface SeverityStyle {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  /** rótulo textual — cor nunca é o único sinal */
  srLabel: string;
}

const SEVERITY: Record<Signal['severity'], SeverityStyle> = {
  high: {
    icon: OctagonAlert,
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FCA5A5',
    srLabel: 'Severidade alta',
  },
  medium: {
    icon: TriangleAlert,
    color: '#CA8A04',
    bg: '#FEFCE8',
    border: '#FDE047',
    srLabel: 'Severidade média',
  },
  low: {
    icon: Info,
    color: '#64748B',
    bg: '#F8FAFC',
    border: '#CBD5E1',
    srLabel: 'Severidade baixa',
  },
};

export function SignalChips({ signals, max }: SignalChipsProps) {
  if (!signals || signals.length === 0) return null;

  const limit = typeof max === 'number' && max >= 0 ? max : signals.length;
  const shown = signals.slice(0, limit);
  const hidden = signals.length - shown.length;

  return (
    <ul className="flex flex-wrap items-center gap-1.5 list-none p-0 m-0">
      {shown.map((signal) => {
        const style = SEVERITY[signal.severity];
        const Icon = style.icon;
        return (
          <li key={signal.id}>
            <span
              className="inline-flex items-center gap-1 rounded-full border font-['Euclid_Circular_A',sans-serif] text-[11px] leading-none px-2 py-1"
              style={{
                color: style.color,
                backgroundColor: style.bg,
                borderColor: style.border,
                fontWeight: 500,
              }}
            >
              <Icon size={12} aria-hidden="true" className="shrink-0" />
              <span className="sr-only">{style.srLabel}: </span>
              {signal.label}
            </span>
          </li>
        );
      })}

      {hidden > 0 && (
        <li>
          <span
            className="inline-flex items-center rounded-full border font-['Euclid_Circular_A',sans-serif] text-[11px] leading-none px-2 py-1 tabular-nums"
            style={{
              color: '#64748B',
              backgroundColor: '#F8FAFC',
              borderColor: '#CBD5E1',
              fontWeight: 500,
            }}
            title={signals.slice(limit).map((s) => s.label).join(' · ')}
          >
            +{hidden}
            <span className="sr-only"> sinais adicionais</span>
          </span>
        </li>
      )}
    </ul>
  );
}
