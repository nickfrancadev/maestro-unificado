// Decisões puras sobre o ciclo de vida do token do LinkedIn.
//
// Este arquivo NÃO importa nada de Deno nem de npm de propósito: ele é
// consumido tanto pelo edge function (Deno) quanto pela suíte do Vitest
// (Node). Todo I/O — KV, fetch de renovação — fica no index.ts.
//
// O "agora" sempre chega por parâmetro, nunca de Date.now() aqui dentro,
// para os testes fixarem o instante sem mexer no relógio.

// O access_token do LinkedIn Marketing dura ~60 dias. Renovar só no instante
// exato da virada perde as requisições em voo, então antecipamos em 1 dia.
export const TOKEN_REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

export interface StoredIntegration {
  status?: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  [key: string]: unknown;
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string | null;
  // O refresh_token também vence (~365 dias). Sem guardar esse prazo, o dia em
  // que ele morre vira a mesma falha silenciosa que o access_token causava.
  refresh_token_expires_in?: number;
}

export type TokenAction =
  | { action: 'ok' }
  | { action: 'refresh' }
  | { action: 'reconnect'; reason: string };

// Responde "o que fazer com este token antes de usá-lo".
export function decideTokenAction(
  integration: StoredIntegration | null | undefined,
  nowMs: number,
): TokenAction {
  if (!integration) {
    return { action: 'reconnect', reason: 'sem integração armazenada' };
  }

  if (integration.status !== 'connected') {
    return { action: 'reconnect', reason: 'integração não está conectada' };
  }

  const expiresAt = integration.expires_at ?? null;
  if (!expiresAt) return { action: 'ok' };

  const expiresMs = Date.parse(expiresAt);
  // Integrações gravadas por versões antigas podem ter data ausente ou
  // ilegível. Nesse caso o token provavelmente vale — travar o acesso seria
  // pior que deixar a chamada seguir e falhar com o erro real do LinkedIn.
  if (Number.isNaN(expiresMs)) return { action: 'ok' };

  const dentroDaMargem = expiresMs - nowMs <= TOKEN_REFRESH_MARGIN_MS;
  if (!dentroDaMargem) return { action: 'ok' };

  if (integration.refresh_token) return { action: 'refresh' };

  // Sem refresh_token não dá para renovar sozinho. Se ainda não venceu, o
  // token continua servindo; só quando vence é que exige OAuth manual.
  if (expiresMs <= nowMs) {
    return { action: 'reconnect', reason: 'token expirado e sem refresh_token' };
  }
  return { action: 'ok' };
}

// Constrói o registro atualizado a partir da resposta de renovação.
export function mergeRefreshedTokens(
  integration: StoredIntegration,
  token: LinkedInTokenResponse,
  nowMs: number,
): StoredIntegration {
  // Uma renovação bem-sucedida apaga o registro da que falhou antes, senão o
  // /status continuaria pedindo reconexão de uma integração já sadia.
  const { refresh_error: _e, refresh_failed_at: _f, ...resto } = integration;

  return {
    ...resto,
    status: 'connected',
    access_token: token.access_token,
    // O LinkedIn só devolve refresh_token novo quando rotaciona. Sobrescrever
    // com undefined apagaria o atual e mataria a renovação seguinte.
    refresh_token: token.refresh_token ?? integration.refresh_token ?? null,
    expires_at: token.expires_in
      ? new Date(nowMs + token.expires_in * 1000).toISOString()
      : null,
    // Só sobrescreve quando a resposta traz o prazo novo; caso contrário
    // mantém o que já se sabia sobre a validade do refresh_token.
    refresh_token_expires_at: token.refresh_token_expires_in
      ? new Date(nowMs + token.refresh_token_expires_in * 1000).toISOString()
      : (integration.refresh_token_expires_at ?? null),
    refreshed_at: new Date(nowMs).toISOString(),
  };
}

// Um refresh em andamento não deve ser disparado de novo por requisições
// paralelas: o refresh_token do LinkedIn pode ser de uso único e a corrida
// invalidaria a integração. Como a renovação acontece com 1 dia de folga, quem
// perde a corrida segue usando o token atual sem prejuízo.
export const REFRESH_LOCK_TTL_MS = 60 * 1000;

export function isRefreshLocked(
  lockedAtMs: number | null | undefined,
  nowMs: number,
): boolean {
  if (!lockedAtMs) return false;
  const idade = nowMs - lockedAtMs;
  // Lock com idade negativa (relógio andou para trás) ou vencido não segura.
  return idade >= 0 && idade < REFRESH_LOCK_TTL_MS;
}
