import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';
import { createDefaultCreativeData, type CreativeData } from './types';

afterEach(cleanup);

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchClientVoice: vi.fn().mockResolvedValue({
    voice: '', brand_context: '', website_url: '',
    product_service: '', audience_market: '', persona: '',
  }),
  saveClientVoice: vi.fn().mockResolvedValue(undefined),
}));

const targeting = {
  companies: { included: [{ id: 'c1', label: 'Nubank' }], excluded: [] },
  defaultTargeting: {
    locations: { included: [], excluded: [] },
    seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] },
    jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

function Host({ initial }: { initial?: Partial<CreativeData> }) {
  const [data, setData] = useState<CreativeData>({ ...createDefaultCreativeData(), ...initial });
  return (
    <CreativeStep
      selectedAccounts={[]}
      targetingData={targeting as never}
      creativeData={data}
      onCreativeChange={setData}
      campaignId="camp-1"
    />
  );
}

const renderStep = (initial?: Partial<CreativeData>) =>
  render(<MemoryRouter><Host initial={initial} /></MemoryRouter>);

const goTo = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('CreativeStep — botões de geração por bloco', () => {
  it('no Template global, cada card tem seu botão e o header faz o fan-out', () => {
    renderStep();
    goTo(/Template global/);

    // Card 1 e card 2 carregam a ação que preenche cada um.
    expect(screen.getByRole('button', { name: /Gerar texto$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar arquivo/ })).toBeInTheDocument();
    // Header carrega a ação do nível inteiro.
    expect(screen.getByRole('button', { name: /Gerar para todas \(1\)/ })).toBeInTheDocument();
    // ...e não a ação de uma empresa só.
    expect(screen.queryByRole('button', { name: /Gerar texto \+ imagem/ })).not.toBeInTheDocument();
  });

  it('trocar a origem para IA revela o prompt e o botão de gerar a imagem-base', () => {
    renderStep();
    goTo(/Template global/);

    expect(screen.queryByPlaceholderText(/mesa de reunião executiva/)).not.toBeInTheDocument();

    goTo(/Gerar com IA/);

    expect(screen.getByPlaceholderText(/mesa de reunião executiva/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar imagem-base/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar arquivo/ })).not.toBeInTheDocument();
  });

  it('numa empresa, o header gera os dois e cada card gera a sua parte', () => {
    renderStep();
    goTo(/Nubank/);

    expect(screen.getByRole('button', { name: /Gerar texto \+ imagem/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Gerar texto$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Gerar imagem$/ })).toBeInTheDocument();
  });

  it('a config global aparece só como resumo na empresa, com atalho para o template', () => {
    renderStep({ templateLogo: { ...createDefaultCreativeData().templateLogo, baseImageUrl: 'https://x/base.png' } });
    goTo(/Nubank/);

    // Os campos globais não são editáveis aqui — só o resumo e o atalho.
    expect(screen.queryByPlaceholderText('WORKSHOP ABM')).not.toBeInTheDocument();
    expect(screen.getByText(/WORKSHOP ABM/)).toBeInTheDocument();

    goTo(/Editar no template/);
    expect(screen.getByPlaceholderText('WORKSHOP ABM')).toBeInTheDocument();
  });

  it('sem imagem-base e com origem upload, a empresa bloqueia a geração no próprio card', () => {
    renderStep();
    goTo(/Nubank/);

    expect(screen.getByRole('button', { name: /^Gerar imagem$/ })).toBeDisabled();
    expect(screen.getByText(/Nenhuma imagem-base definida/)).toBeInTheDocument();
    // O aviso vive dentro do card, não numa faixa no topo da página.
    expect(screen.queryByText(/Modo "Template \+ logo" selecionado/)).not.toBeInTheDocument();
  });

  it('o Brand Brief sai do header e passa a ser acessível pelo card de Texto', () => {
    renderStep();
    goTo(/Nubank/);

    // Nada de botão "Brand Brief" no header da página — o acesso é pelo card 1.
    expect(screen.queryByRole('button', { name: /^Brand Brief$/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Brand Brief de Nubank/ }));
    expect(screen.getByText(/Vamos analisar o site da Nubank/)).toBeInTheDocument();
  });
});
