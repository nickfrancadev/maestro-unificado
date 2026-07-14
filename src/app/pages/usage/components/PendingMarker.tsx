import * as Popover from '@radix-ui/react-popover';
import { Info } from 'lucide-react';

/** Âmbar — exceção permitida à rampa de risco: "falta instrumentar" não é risco. */
const AMBER = '#F59E0B';
const AMBER_BG = '#FFFBEB';
const AMBER_TEXT = '#92400E';

export const PENDING_HINT =
  'Pendente de instrumentação — dado ainda não rastreado pelo produto';

interface PendingMarkerProps {
  /** Explicação exibida no popover. */
  text?: string;
}

/**
 * Marcador de "métrica pendente de instrumentação".
 *
 * Mecanismo único (Radix Popover) para os dois consumidores — `StatTile` e
 * `UsersTable`. Antes eram duas implementações (uma à mão com `useState`, outra
 * com Radix) transmitindo a MESMA mensagem com aparências e comportamentos
 * diferentes.
 *
 * Abre por clique (mouse e teclado — o trigger é um `<button>`), não por hover:
 * hover-only exclui teclado e toque.
 */
export function PendingMarker({ text = PENDING_HINT }: PendingMarkerProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Pendente de instrumentação. ${text}`}
          className="inline-flex items-center justify-center rounded-full p-0.5 align-middle transition-colors hover:bg-[#FEF3C7] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5F39]"
          style={{ color: AMBER }}
        >
          <Info size={13} aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          className="z-50 max-w-[260px] rounded-lg border p-2.5 font-['Euclid_Circular_A',sans-serif] normal-case"
          style={{
            background: AMBER_BG,
            borderColor: '#FDE68A',
            color: AMBER_TEXT,
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 0,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {text}
          <Popover.Arrow style={{ fill: AMBER_BG }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
