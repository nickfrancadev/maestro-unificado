import { describe, it, expect, vi } from 'vitest';
import { fetchWithRetry, retryDelayMs, translateLinkedInError, RECONNECT_MESSAGE } from './linkedinHttp';

const res = (status: number, body = '') => new Response(body, { status });

describe('nova tentativa com espera em 5xx (F140)', () => {
  it('repete em 5xx esperando 500 ms e depois 1 s, e devolve o sucesso', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(res(503))
      .mockResolvedValueOnce(res(502))
      .mockResolvedValueOnce(res(201));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const r = await fetchWithRetry('u', {}, 't', { fetchImpl, sleep, log: () => {} });
    expect(r.status).toBe(201);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([500, 1000]);
  });

  it('não repete em 4xx: recusa não muda tentando de novo', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(400));
    const sleep = vi.fn();
    expect((await fetchWithRetry('u', {}, 't', { fetchImpl, sleep, log: () => {} })).status).toBe(400);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('5xx em todas as tentativas: devolve a última resposta para ser traduzida', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(500));
    const r = await fetchWithRetry('u', {}, 't', { fetchImpl, sleep: async () => {}, log: () => {} });
    expect(r.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('erro de rede também repete; se não voltar, lança', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('network'));
    await expect(fetchWithRetry('u', {}, 't', { fetchImpl, sleep: async () => {}, log: () => {} })).rejects.toThrow('network');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('espera dobra a cada tentativa', () => {
    expect([0, 1, 2].map((a) => retryDelayMs(a))).toEqual([500, 1000, 2000]);
  });
});

describe('erro do LinkedIn traduzido, nunca o texto cru (F140)', () => {
  const raw = JSON.stringify({ status: 403, serviceErrorCode: 100, code: 'ACCESS_DENIED', message: 'Not enough permissions to access: partnerApiAdCreatives.CREATE. Member is not an administrator of the organization urn:li:organization:123' });

  it('token vencido → reconectar em Integrações (424)', () => {
    const t = translateLinkedInError(401, '{"message":"Invalid access token","code":"EXPIRED_ACCESS_TOKEN"}', 'criar o anúncio');
    expect(t).toEqual({ status: 424, kind: 'reconnect', message: RECONNECT_MESSAGE });
    expect(t.message).toContain('Reconecte o LinkedIn em Integrações');
  });

  it('não é admin da página → diz para pedir acesso de administrador', () => {
    const t = translateLinkedInError(403, raw, 'criar o anúncio');
    expect(t.kind).toBe('page_admin');
    expect(t.message).toMatch(/administradora da Página/);
  });

  it('sem permissão na conta de anúncios', () => {
    const t = translateLinkedInError(403, '{"message":"Not enough permissions to access: adCampaignGroups.CREATE"}', 'criar o grupo da campanha');
    expect(t.kind).toBe('permission');
    expect(t.message).toContain('criar o grupo da campanha');
  });

  it('5xx depois das tentativas → instável, tente de novo', () => {
    expect(translateLinkedInError(503, 'upstream', 'criar o conjunto de anúncio')).toMatchObject({ status: 502, kind: 'unavailable' });
  });

  it('400 diz qual dado foi recusado', () => {
    expect(translateLinkedInError(400, '{"message":"/totalBudget/amount: value is invalid"}', 'criar o grupo da campanha').message)
      .toBe('O LinkedIn recusou criar o grupo da campanha por causa do orçamento. Confira e tente de novo.');
    expect(translateLinkedInError(422, '{"message":"runSchedule.end must be after start"}', 'criar o conjunto').message).toMatch(/das datas/);
  });

  it('nenhuma mensagem leva o texto cru da API', () => {
    for (const status of [400, 401, 403, 404, 429, 500]) {
      const t = translateLinkedInError(status, raw, 'publicar');
      expect(t.message).not.toContain('partnerApiAdCreatives');
      expect(t.message).not.toContain('urn:li');
      expect(t.message).not.toMatch(/LinkedIn API \d/);
    }
  });
});
