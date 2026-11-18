import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';

vi.mock('@/lib/linkedin', () => ({
  getLinkedInAuthUrl: vi.fn(),
  exchangeLinkedInCode: vi.fn(),
  disconnectLinkedIn: vi.fn(),
  selectLinkedInAdAccount: vi.fn(),
  createLinkedInAdAccount: vi.fn(),
  fetchLinkedInAdAccounts: vi.fn().mockResolvedValue([
    { id: '111', name: 'Conta Principal', currency: 'BRL', status: 'ACTIVE' },
    { id: '222', name: 'Conta Teste', currency: 'USD', status: 'DRAFT' },
  ]),
}));

import { LinkedInConnectionModal } from './LinkedInConnectionModal';

afterEach(cleanup);

const status = {
  status: 'connected',
  selected_ad_account_id: '111',
  selected_ad_account_name: 'Conta Principal',
} as any;

function renderManage() {
  return render(
    <LinkedInConnectionModal mode="manage" currentStatus={status} onClose={() => {}} onStatusRefresh={async () => {}} />,
  );
}

describe('LinkedInConnectionModal — lista de contas de anúncios', () => {
  it('expõe radiogroup/radio com aria-checked e marca a conta vinculada', async () => {
    renderManage();
    const group = await screen.findByRole('radiogroup');
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('aria-checked', 'false');
    expect(within(radios[0]).getByText('Vinculada')).toBeInTheDocument();
    expect(within(radios[1]).queryByText('Vinculada')).toBeNull();
    // Status traduzido, não o enum cru
    expect(within(radios[0]).getByText('Ativa')).toBeInTheDocument();
    expect(within(radios[1]).getByText('Em configuração')).toBeInTheDocument();
    expect(screen.queryByText('ACTIVE')).toBeNull();
  });

  it('seleciona com Enter/Espaço sem mover o selo "Vinculada"', async () => {
    renderManage();
    const radios = within(await screen.findByRole('radiogroup')).getAllByRole('radio');
    fireEvent.keyDown(radios[1], { key: ' ' });
    expect(radios[1]).toHaveAttribute('aria-checked', 'true');
    expect(radios[0]).toHaveAttribute('aria-checked', 'false');
    expect(within(radios[0]).getByText('Vinculada')).toBeInTheDocument();
    fireEvent.keyDown(radios[0], { key: 'Enter' });
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('título "Gerenciar" quando já conectado, mesmo em mode=connect', () => {
    render(
      <LinkedInConnectionModal mode="connect" currentStatus={status} onClose={() => {}} onStatusRefresh={async () => {}} />,
    );
    expect(screen.getByText('Gerenciar LinkedIn Ads')).toBeInTheDocument();
  });
});

describe('termos: "Conta de anúncios", nunca "Ad Account"', () => {
  it('nenhuma tela de LinkedIn Ads escreve "Ad Account" para o usuário', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const files = [
      'src/app/integrations/Integrations.tsx',
      'src/app/integrations/LinkedInConnectionModal.tsx',
      'src/app/integrations/statusBadge.tsx',
      'src/app/campaigns/CampaignList.tsx',
      'src/app/campaigns/CampaignAnalytics.tsx',
      'src/app/campaigns/wizard/ConfigStep.tsx',
      'src/app/campaigns/wizard/OrchestrationStep.tsx',
    ];
    for (const f of files) {
      const text = fs.readFileSync(path.resolve(process.cwd(), f), 'utf8')
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join('\n');
      expect(text, f).not.toMatch(/Ad Accounts?\b/);
    }
  });
});

describe('LinkedInConnectionModal — aviso ao trocar de conta (F125)', () => {
  it('escolher outra conta mostra o aviso e só libera "Trocar conta" depois do "Entendi"', async () => {
    renderManage();
    const radios = within(await screen.findByRole('radiogroup')).getAllByRole('radio');
    expect(screen.queryByRole('alert', { name: 'Aviso de troca de conta' })).toBeNull();

    fireEvent.click(radios[1]);
    const alert = screen.getByRole('alert', { name: 'Aviso de troca de conta' });
    expect(within(alert).getByText('Trocar a conta afeta as campanhas existentes')).toBeInTheDocument();

    const confirm = screen.getByRole('button', { name: /Trocar conta/ });
    expect(confirm).toBeDisabled();
    fireEvent.click(within(alert).getByRole('checkbox'));
    expect(confirm).not.toBeDisabled();

    // Voltar para a conta vinculada some com o aviso.
    fireEvent.click(radios[0]);
    expect(screen.queryByRole('alert', { name: 'Aviso de troca de conta' })).toBeNull();
    expect(screen.getByRole('button', { name: /Confirmar seleção/ })).not.toBeDisabled();
  });
});
