import { describe, it, expect, vi, afterEach } from 'vitest';
import { getLinkedInAuthUrl } from './oauth';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLinkedInAuthUrl', () => {
  it('devolve a auth_url que o servidor gerou', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ auth_url: 'https://www.linkedin.com/oauth/v2/authorization?client_id=real' }),
      }),
    );

    await expect(getLinkedInAuthUrl('https://app/cb')).resolves.toContain('client_id=real');
  });

  // O comportamento antigo devolvia uma URL com client_id "CONFIGURE_NO_SERVIDOR".
  // O usuário era jogado numa tela do LinkedIn dizendo "The passed in client_id
  // is invalid" — mensagem que esconde a causa real (backend inalcançável) e
  // manda investigar o lugar errado.
  it('falha com mensagem própria quando não alcança o backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    await expect(getLinkedInAuthUrl('https://app/cb')).rejects.toThrow(/backend/i);
  });

  it('propaga o erro que o servidor descreveu', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'LINKEDIN_CLIENT_ID não configurado no servidor' }),
      }),
    );

    await expect(getLinkedInAuthUrl('https://app/cb')).rejects.toThrow(/LINKEDIN_CLIENT_ID/);
  });

  it('não devolve URL inválida quando a resposta vem sem auth_url', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );

    await expect(getLinkedInAuthUrl('https://app/cb')).rejects.toThrow(/auth_url/i);
  });
});
