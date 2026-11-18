import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CampaignEditRoute } from './CampaignEditRoute';
import { MOCK_EDIT_GROUP_ID } from './mockPublishedGroup';
import type { EditDataResponse } from './publishedEdit';

const api = vi.hoisted(() => ({
  getLinkedInStatus: vi.fn(),
  fetchPublishedGroupForEdit: vi.fn(),
  updatePublishedCampaigns: vi.fn(),
  getAudienceCount: vi.fn(),
}));

vi.mock('@/lib/linkedin', async (orig) => ({ ...(await orig<object>()), ...api }));

const ACME = 'urn:li:organization:111';
const BETA = 'urn:li:organization:222';

function editData(): EditDataResponse {
  const camp = (id: string, name: string, employer: string) => ({
    id, name, status: 'ACTIVE',
    dailyBudget: { amount: '30', currencyCode: 'BRL' }, totalBudget: null,
    runSchedule: { start: Date.UTC(2026, 10, 1), end: Date.UTC(2099, 11, 31, 23, 59, 59) },
    objectiveType: 'BRAND_AWARENESS', costType: 'CPM',
    targetingCriteria: { include: { and: [
      { or: { 'urn:li:adTargetingFacet:employers': [employer] } },
      { or: { 'urn:li:adTargetingFacet:locations': ['urn:li:geo:106057199'] } },
      { or: { 'urn:li:adTargetingFacet:seniorities': ['urn:li:seniority:6'] } },
    ] } },
  });
  return {
    group: { id: '900', urn: 'urn:li:sponsoredCampaignGroup:900', name: 'ABM Q4', status: 'ACTIVE', runSchedule: null, dailyBudget: { amount: '60', currencyCode: 'BRL' }, totalBudget: null },
    campaigns: [camp('1', 'ABM Q4 — Acme', ACME), camp('2', 'ABM Q4 — Beta', BETA)],
    entityNames: { 'urn:li:geo:106057199': 'Brasil' },
    adAccountName: 'Conta Maestro',
    currency: 'BRL',
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/campaigns" element={<p>Lista de campanhas</p>} />
        <Route path="/campaigns/:id/edit" element={<CampaignEditRoute />} />
      </Routes>
    </MemoryRouter>,
  );
}

const saveButton = () => screen.getByRole('button', { name: /Salvar alterações/ });

beforeEach(() => {
  api.getLinkedInStatus.mockResolvedValue({ status: 'connected', provider: 'linkedin', selected_ad_account_id: '1' });
  api.fetchPublishedGroupForEdit.mockResolvedValue({ ok: true, status: 200, data: editData() });
  api.getAudienceCount.mockResolvedValue({ count: 5000 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Editar campanha publicada: abrir', () => {
  it('id inexistente mostra erro com volta para a lista (nunca o assistente vazio)', async () => {
    api.fetchPublishedGroupForEdit.mockResolvedValue({ ok: false, status: 404, error: 'Grupo de campanhas não encontrado' });
    renderAt('/campaigns/123/edit');
    expect(await screen.findByText('Campanha não encontrada')).toBeTruthy();
    expect(screen.queryByText('Nova campanha')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para campanhas' }));
    expect(screen.getByText('Lista de campanhas')).toBeTruthy();
  });

  it('sem LinkedIn conectado, id real mostra erro claro', async () => {
    api.getLinkedInStatus.mockResolvedValue({ status: 'disconnected', provider: 'linkedin' });
    renderAt('/campaigns/123/edit');
    expect(await screen.findByText('Não encontramos esta campanha')).toBeTruthy();
    expect(api.fetchPublishedGroupForEdit).not.toHaveBeenCalled();
  });

  it('a demonstração abre sem LinkedIn, com cabeçalho, travados e frase de gasto', async () => {
    api.getLinkedInStatus.mockResolvedValue({ status: 'disconnected', provider: 'linkedin' });
    renderAt(`/campaigns/${MOCK_EDIT_GROUP_ID}/edit`);
    expect(await screen.findByText(/Editar campanha publicada ·/)).toBeTruthy();
    expect(screen.getByText('O que não dá para mudar')).toBeTruthy();
    expect(screen.getByText(/Para anunciar para outra empresa, crie outra campanha/)).toBeTruthy();
    expect(screen.getByTestId('spend-statement').textContent).toBe('Você vai gastar até R$ 150,00 por dia (5 empresas × R$ 30,00), ≈ R$ 4.500,00 por mês.');
  });
});

describe('Editar campanha publicada: salvar', () => {
  it('salvar fica desabilitado sem mudança', async () => {
    renderAt('/campaigns/900/edit');
    await screen.findByText(/Editar campanha publicada ·/);
    expect(saveButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Nenhuma alteração')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Orçamento diário de Acme'), { target: { value: '50' } });
    expect(saveButton().hasAttribute('disabled')).toBe(false);
  });

  it('público abaixo de 300 bloqueia salvar e nomeia a empresa', async () => {
    api.getAudienceCount.mockResolvedValue({ count: 120 });
    renderAt('/campaigns/900/edit?empresa=1');
    await screen.findByText(/Editar campanha publicada ·/);
    // Abre já focada na empresa: muda a senioridade da Acme.
    const acme = screen.getByTestId('company-1');
    fireEvent.click(within(acme).getByRole('button', { name: /Senioridade/ }));
    fireEvent.click(within(acme).getByRole('button', { name: 'Gerente' }));
    await waitFor(
      () => expect(screen.getByText('Acme está abaixo de 300 pessoas. Amplie o público para salvar.')).toBeTruthy(),
      { timeout: 3000 },
    );
    fireEvent.click(saveButton());
    expect(screen.queryByRole('dialog')).toBeNull();
    // Beta também está abaixo, mas não muda o público: avisa e não trava.
    expect(screen.getByText(/O público de Beta está abaixo de 300 pessoas. Como ele não vai ser alterado/)).toBeTruthy();
  });

  it('confirmação lista o que muda em cada empresa (de → para) e o gasto novo', async () => {
    renderAt('/campaigns/900/edit');
    await screen.findByText(/Editar campanha publicada ·/);
    fireEvent.change(screen.getByLabelText('Orçamento diário de Acme'), { target: { value: '50' } });
    fireEvent.click(saveButton());
    const dialog = await screen.findByRole('dialog');
    const acme = within(dialog).getByTestId('diff-1');
    expect(acme.textContent).toContain('Acme');
    expect(acme.textContent).toContain('Orçamento diário: R$ 30,00 → R$ 50,00');
    expect(within(dialog).queryByTestId('diff-2')).toBeNull();
    expect(dialog.textContent).toContain('Teto diário do grupo: R$ 60,00 → R$ 80,00');
    expect(dialog.textContent).toContain('Você vai gastar até R$ 80,00 por dia (soma de 2 empresas com valores diferentes)');
  });

  it('sucesso parcial: diz claramente e marca a empresa que falhou', async () => {
    api.updatePublishedCampaigns.mockResolvedValue({
      success: false, partial: true, group: { success: true },
      results: [{ campaign_id: '1', success: true }, { campaign_id: '2', success: false, error: 'LinkedIn API 400' }],
    });
    renderAt('/campaigns/900/edit');
    await screen.findByText(/Editar campanha publicada ·/);
    fireEvent.change(screen.getByLabelText('Orçamento diário de Acme'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Orçamento diário de Beta'), { target: { value: '40' } });
    fireEvent.click(saveButton());
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salvar no LinkedIn' }));
    expect(await screen.findByText('Salvo em parte: 1 de 2 empresas foram atualizadas.')).toBeTruthy();
    const req = api.updatePublishedCampaigns.mock.calls[0][0];
    expect(req.campaigns.map((c: any) => c.employer_urn)).toEqual([ACME, BETA]);
    expect(within(screen.getByTestId('company-2')).getByText(/Não foi salvo: LinkedIn API 400/)).toBeTruthy();
    expect(within(screen.getByTestId('company-1')).getByText('Salvo no LinkedIn')).toBeTruthy();
    // Beta segue pendente para tentar de novo.
    expect(screen.getByText('1 empresa com alterações')).toBeTruthy();
  });
});
