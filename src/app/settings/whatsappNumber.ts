import { useSyncExternalStore } from 'react';

// No produto real o número do WhatsApp é um campo só do usuário (`user.phone`,
// salvo pela tela de Notificações em maestro_frontend). Tanto os avisos por
// WhatsApp quanto a conversa com a Maestro via MCP usam esse mesmo número, por
// isso as duas telas do protótipo leem e escrevem o mesmo valor.
const KEY = 'maestro.proto.whatsapp';

let current: string | null = read();
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function setWhatsappNumber(digits: string | null) {
  current = digits;
  try {
    if (digits) window.localStorage.setItem(KEY, digits);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* modo privado: fica só em memória */
  }
  emit();
}

export function useWhatsappNumber(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

/** Só dígitos do número nacional (DDD + número), sem o +55. */
export function onlyDigits(v: string) {
  return v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
}

export function isValidBrPhone(digits: string) {
  return /^[1-9]{2}9?\d{8}$/.test(digits);
}

/** (11) 98836-4930 */
export function formatBrPhone(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  const cut = rest.length > 8 ? 5 : 4;
  if (rest.length <= cut) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, cut)}-${rest.slice(cut)}`;
}
