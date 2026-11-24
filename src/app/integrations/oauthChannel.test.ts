// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import {
  OAUTH_POPUP_TTL_MS,
  clearOAuthPopup,
  isOAuthPopup,
  markOAuthPopup,
  onOAuthResult,
  postOAuthResult,
} from './oauthChannel';

afterEach(() => clearOAuthPopup());

describe('marca da janelinha do OAuth', () => {
  it('vale logo depois de abrir e expira em 15 minutos', () => {
    markOAuthPopup(1_000);
    expect(isOAuthPopup(1_000 + 60_000)).toBe(true);
    expect(isOAuthPopup(1_000 + OAUTH_POPUP_TTL_MS)).toBe(false);
  });

  it('sem marca, a página de retorno não é tratada como janelinha', () => {
    expect(isOAuthPopup()).toBe(false);
    markOAuthPopup();
    clearOAuthPopup();
    expect(isOAuthPopup()).toBe(false);
  });
});

describe('canal do resultado do OAuth', () => {
  it('entrega "connected" e "error" para quem escuta', async () => {
    const got: unknown[] = [];
    const stop = onOAuthResult((m) => got.push(m));
    postOAuthResult({ type: 'connected' });
    postOAuthResult({ type: 'error', error: 'user_cancelled_login' });
    await new Promise((r) => setTimeout(r, 30));
    stop();
    expect(got).toEqual([{ type: 'connected' }, { type: 'error', error: 'user_cancelled_login' }]);
  });
});
