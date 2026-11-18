import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseCampaignListResponse, fetchLinkedInCampaigns } from './analytics';

afterEach(() => vi.unstubAllGlobals());

describe('lista de campanhas — falha é erro, nunca "nenhuma campanha"', () => {
  it('HTTP de erro vira erro com a mensagem do servidor', () => {
    const r = parseCampaignListResponse(false, 502, { campaigns: [], error: 'O LinkedIn está fora do ar.' });
    expect(r.error).toBe('O LinkedIn está fora do ar.');
    expect(r.campaigns).toEqual([]);
  });

  it('HTTP de erro sem corpo ainda é erro', () => {
    expect(parseCampaignListResponse(false, 500, null).error).toMatch(/HTTP 500/);
  });

  it('200 com `error` do LinkedIn é erro', () => {
    expect(parseCampaignListResponse(true, 200, { campaigns: [], error: 'LinkedIn API 403' }).error).toBe('LinkedIn API 403');
  });

  it('200 sem a lista é erro', () => {
    expect(parseCampaignListResponse(true, 200, {}).error).toBeTruthy();
  });

  it('lista vazia de verdade não é erro', () => {
    const r = parseCampaignListResponse(true, 200, { campaigns: [], currency: 'BRL', adAccountName: 'Conta X' });
    expect(r.error).toBeUndefined();
    expect(r.currency).toBe('BRL');
  });

  it('erro de rede vira erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const r = await fetchLinkedInCampaigns();
    expect(r.error).toMatch(/Sem conexão/);
  });
});
