/**
 * Linha rótulo → valor do painel "Conta" do detalhe. Extraída para o piloto de
 * layout usar as mesmas linhas (inclusive o `PendingMarker` de dado fabricado).
 */
import { PendingMarker } from './PendingMarker';

const NAVY = '#212A46';
const MUTED = '#64748B';
const GRID = '#E2E8F0';

export function FactRow({
  label,
  value,
  pending = false,
  pendingText,
}: {
  label: string;
  value: string;
  pending?: boolean;
  /** Explicação específica no popover do marcador (default: texto genérico). */
  pendingText?: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5 border-b last:border-b-0"
      style={{ borderColor: GRID }}
    >
      <span className="inline-flex items-center gap-1.5" style={{ fontSize: 12, color: MUTED }}>
        {label}
        {pending && <PendingMarker text={pendingText} />}
      </span>
      <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>
        {value}
      </span>
    </div>
  );
}
