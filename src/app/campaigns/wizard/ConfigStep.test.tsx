import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfigStep, configErrors } from './ConfigStep';
import { createDefaultCampaignConfig } from './types';
import type { CampaignConfig } from './types';
import type { LinkedInIntegrationStatus } from '@/lib/linkedin';

afterEach(cleanup);

const usdAccount = {
  status: 'connected',
  selected_ad_account_id: '1',
  selected_ad_account_name: 'Conta teste',
  selected_ad_account_currency: 'USD',
} as unknown as LinkedInIntegrationStatus;

function Harness({ showErrors = false, adSetCount = 0, initial }: { showErrors?: boolean; adSetCount?: number; initial?: Partial<CampaignConfig> }) {
  const [config, setConfig] = useState<CampaignConfig>({ ...createDefaultCampaignConfig(), ...initial });
  return (
    <MemoryRouter>
      <ConfigStep config={config} onChange={setConfig} linkedinStatus={usdAccount} adSetCount={adSetCount} showErrors={showErrors} />
    </MemoryRouter>
  );
}

describe('ConfigStep: erro só depois de interagir', () => {
  it('abre sem erro em vermelho', () => {
    render(<Harness />);
    expect(screen.queryByText('Informe o orçamento diário')).toBeNull();
    expect(screen.queryByText('Dê um nome à campanha')).toBeNull();
  });

  it('mostra o erro ao sair do campo vazio', () => {
    render(<Harness />);
    fireEvent.blur(screen.getByPlaceholderText('Ex.: 50'));
    expect(screen.getByText('Informe o orçamento diário')).toBeTruthy();
    expect(screen.queryByText('Dê um nome à campanha')).toBeNull();
  });

  it('mostra todos os erros depois de tentar avançar', () => {
    render(<Harness showErrors />);
    expect(screen.getByText('Informe o orçamento diário')).toBeTruthy();
    expect(screen.getByText('Dê um nome à campanha')).toBeTruthy();
  });

  it('regra pura: mínimo do LinkedIn por empresa', () => {
    const c = { ...createDefaultCampaignConfig(), campaignName: 'x', budgetAmount: '5' };
    expect(configErrors(c).budgetAmount).toMatch(/no mínimo 10 por empresa/);
    expect(configErrors({ ...c, budgetAmount: '10' })).toEqual({});
  });
});

describe('ConfigStep: gasto explícito', () => {
  it('sem empresas ainda, diz que o valor é multiplicado no passo 2', () => {
    render(<Harness initial={{ budgetAmount: '10' }} />);
    expect(screen.getByText(/multiplicado pelo número de empresas que você escolher no passo 2/)).toBeTruthy();
  });

  it('com empresas, faz a conta na moeda da conta de anúncios', () => {
    render(<Harness adSetCount={2} initial={{ budgetAmount: '10' }} />);
    expect(screen.getByText('Por empresa. Com 2 empresas, você vai gastar até US$ 20,00 por dia (≈ US$ 600,00 por mês).')).toBeTruthy();
    expect(screen.getByText(/Esta conta cobra em USD/)).toBeTruthy();
  });

  it('não mostra o enum cru do custo e não oferece lance por clique em visitas ao site', () => {
    render(<Harness initial={{ objective: 'website_visits' }} />);
    expect(screen.getAllByText('Otimiza para cliques, cobra por mil impressões (CPM)').length).toBeGreaterThan(0);
    const cpc = screen.getByLabelText(/Manual, por clique/) as HTMLInputElement;
    expect(cpc.disabled).toBe(true);
  });
});
