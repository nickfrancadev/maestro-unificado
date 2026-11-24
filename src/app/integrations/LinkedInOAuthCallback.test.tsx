import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/lib/linkedin', () => ({ exchangeLinkedInCode: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { exchangeLinkedInCode } from '@/lib/linkedin';
import { LinkedInOAuthCallback } from './LinkedInOAuthCallback';
import { clearOAuthPopup, isOAuthPopup, markOAuthPopup, onOAuthResult } from './oauthChannel';

afterEach(() => { cleanup(); clearOAuthPopup(); vi.restoreAllMocks(); });

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/auth/linkedin/callback" element={<LinkedInOAuthCallback />} />
        <Route path="/integrations" element={<p>integrações</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LinkedInOAuthCallback — janelinha que perdeu o vínculo com a página', () => {
  it('troca o código, avisa a página principal pelo canal e tenta fechar', async () => {
    markOAuthPopup();
    const close = vi.spyOn(window, 'close').mockImplementation(() => {});
    const got: unknown[] = [];
    const stop = onOAuthResult((m) => got.push(m));
    renderAt('/auth/linkedin/callback?code=abc');
    await waitFor(() => expect(got).toEqual([{ type: 'connected' }]));
    stop();
    expect(exchangeLinkedInCode).toHaveBeenCalledWith('abc');
    expect(close).toHaveBeenCalled();
    expect(isOAuthPopup()).toBe(false);
  });

  it('erro do LinkedIn também chega pelo canal', async () => {
    markOAuthPopup();
    vi.spyOn(window, 'close').mockImplementation(() => {});
    const got: unknown[] = [];
    const stop = onOAuthResult((m) => got.push(m));
    renderAt('/auth/linkedin/callback?error=user_cancelled_login');
    await waitFor(() => expect(got).toEqual([{ type: 'error', error: 'user_cancelled_login' }]));
    stop();
  });
});
