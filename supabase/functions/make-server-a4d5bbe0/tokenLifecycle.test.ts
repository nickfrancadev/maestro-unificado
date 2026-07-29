import { describe, it, expect } from 'vitest';
import {
  decideTokenAction,
  mergeRefreshedTokens,
  isRefreshLocked,
  TOKEN_REFRESH_MARGIN_MS,
  REFRESH_LOCK_TTL_MS,
} from './tokenLifecycle';

// Instante fixo de referência: nada aqui depende do relógio real.
const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const inMs = (ms: number) => new Date(NOW + ms).toISOString();
const DIA = 24 * 60 * 60 * 1000;

const conectado = (over: Record<string, unknown> = {}) => ({
  status: 'connected',
  access_token: 'at-atual',
  refresh_token: 'rt-atual',
  expires_at: inMs(60 * DIA),
  ...over,
});

describe('decideTokenAction', () => {
  it('manda reconectar quando não há integração armazenada', () => {
    expect(decideTokenAction(null, NOW)).toEqual({
      action: 'reconnect',
      reason: 'sem integração armazenada',
    });
  });

  it('manda reconectar quando a integração não está conectada', () => {
    const r = decideTokenAction(conectado({ status: 'disconnected' }), NOW);
    expect(r.action).toBe('reconnect');
  });

  it('libera o uso quando o token está longe de expirar', () => {
    expect(decideTokenAction(conectado(), NOW)).toEqual({ action: 'ok' });
  });

  it('renova quando entra na margem de segurança', () => {
    const r = decideTokenAction(conectado({ expires_at: inMs(DIA / 2) }), NOW);
    expect(r).toEqual({ action: 'refresh' });
  });

  it('renova quando o token já expirou mas há refresh_token', () => {
    const r = decideTokenAction(conectado({ expires_at: inMs(-DIA) }), NOW);
    expect(r).toEqual({ action: 'refresh' });
  });

  it('manda reconectar quando expirou e não há refresh_token', () => {
    const r = decideTokenAction(
      conectado({ expires_at: inMs(-1), refresh_token: null }),
      NOW,
    );
    expect(r.action).toBe('reconnect');
  });

  // Sem refresh_token o app não consegue renovar sozinho, mas o token ainda
  // vale: derrubar o uso aqui tiraria do ar uma integração que funciona.
  it('deixa usar o token perto de expirar quando não há refresh_token', () => {
    const r = decideTokenAction(
      conectado({ expires_at: inMs(60 * 1000), refresh_token: null }),
      NOW,
    );
    expect(r).toEqual({ action: 'ok' });
  });

  it('trata a borda exata da margem como renovação', () => {
    const r = decideTokenAction(
      conectado({ expires_at: inMs(TOKEN_REFRESH_MARGIN_MS) }),
      NOW,
    );
    expect(r).toEqual({ action: 'refresh' });
  });

  it('um milissegundo fora da margem ainda é uso normal', () => {
    const r = decideTokenAction(
      conectado({ expires_at: inMs(TOKEN_REFRESH_MARGIN_MS + 1) }),
      NOW,
    );
    expect(r).toEqual({ action: 'ok' });
  });

  // Integrações antigas gravadas antes de o expires_at existir não podem
  // virar "reconecte agora" — o token pode estar perfeitamente válido.
  it('não bloqueia quando expires_at é ausente ou ilegível', () => {
    expect(decideTokenAction(conectado({ expires_at: null }), NOW)).toEqual({ action: 'ok' });
    expect(decideTokenAction(conectado({ expires_at: 'nao-e-data' }), NOW)).toEqual({ action: 'ok' });
  });
});

describe('mergeRefreshedTokens', () => {
  it('grava o novo access_token e recalcula o expires_at', () => {
    const out = mergeRefreshedTokens(
      conectado(),
      { access_token: 'at-novo', expires_in: 60 * 60 * 24 * 60 },
      NOW,
    );
    expect(out.access_token).toBe('at-novo');
    expect(out.expires_at).toBe(inMs(60 * DIA));
    expect(out.status).toBe('connected');
  });

  // O LinkedIn nem sempre devolve refresh_token novo. Sobrescrever com
  // undefined mataria a renovação seguinte e forçaria OAuth manual.
  it('preserva o refresh_token atual quando a resposta não traz um novo', () => {
    const out = mergeRefreshedTokens(
      conectado(),
      { access_token: 'at-novo', expires_in: 100 },
      NOW,
    );
    expect(out.refresh_token).toBe('rt-atual');
  });

  it('adota o refresh_token novo quando ele vem na resposta (rotação)', () => {
    const out = mergeRefreshedTokens(
      conectado(),
      { access_token: 'at-novo', expires_in: 100, refresh_token: 'rt-novo' },
      NOW,
    );
    expect(out.refresh_token).toBe('rt-novo');
  });

  it('mantém os campos que não são do ciclo de token', () => {
    const out = mergeRefreshedTokens(
      conectado({ selected_ad_account_id: 532710835, scopes: ['r_ads'] }),
      { access_token: 'at-novo', expires_in: 100 },
      NOW,
    );
    expect(out.selected_ad_account_id).toBe(532710835);
    expect(out.scopes).toEqual(['r_ads']);
  });

  it('registra quando a renovação aconteceu', () => {
    const out = mergeRefreshedTokens(
      conectado(),
      { access_token: 'at-novo', expires_in: 100 },
      NOW,
    );
    expect(out.refreshed_at).toBe(new Date(NOW).toISOString());
  });

  it('guarda o prazo do refresh_token quando a resposta o informa', () => {
    const out = mergeRefreshedTokens(
      conectado(),
      { access_token: 'at-novo', expires_in: 100, refresh_token_expires_in: 365 * 24 * 60 * 60 },
      NOW,
    );
    expect(out.refresh_token_expires_at).toBe(inMs(365 * DIA));
  });

  it('preserva o prazo do refresh_token quando a resposta o omite', () => {
    const out = mergeRefreshedTokens(
      conectado({ refresh_token_expires_at: inMs(300 * DIA) }),
      { access_token: 'at-novo', expires_in: 100 },
      NOW,
    );
    expect(out.refresh_token_expires_at).toBe(inMs(300 * DIA));
  });

  it('limpa o registro da renovação que falhou antes', () => {
    const out = mergeRefreshedTokens(
      conectado({ refresh_error: 'invalid_grant', refresh_failed_at: inMs(-DIA) }),
      { access_token: 'at-novo', expires_in: 100 },
      NOW,
    );
    expect(out.refresh_error).toBeUndefined();
    expect(out.refresh_failed_at).toBeUndefined();
  });

  it('deixa expires_at nulo quando a resposta não diz o prazo', () => {
    const out = mergeRefreshedTokens(conectado(), { access_token: 'at-novo' }, NOW);
    expect(out.expires_at).toBeNull();
  });
});

describe('isRefreshLocked', () => {
  it('não trava quando não há lock registrado', () => {
    expect(isRefreshLocked(null, NOW)).toBe(false);
    expect(isRefreshLocked(undefined, NOW)).toBe(false);
  });

  it('trava enquanto o lock está fresco', () => {
    expect(isRefreshLocked(NOW - 1000, NOW)).toBe(true);
  });

  it('libera assim que o lock vence', () => {
    expect(isRefreshLocked(NOW - REFRESH_LOCK_TTL_MS, NOW)).toBe(false);
  });

  // Um lock preso no futuro (relógio fora de sincronia entre instâncias)
  // travaria a renovação para sempre — e o token venceria de vez.
  it('ignora lock com data no futuro', () => {
    expect(isRefreshLocked(NOW + 5 * REFRESH_LOCK_TTL_MS, NOW)).toBe(false);
  });
});
