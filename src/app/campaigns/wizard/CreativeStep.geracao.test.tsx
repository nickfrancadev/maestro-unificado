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

    expect(screen.queryByPlaceholderText(/Descreva a imagem que deseja gerar/)).not.toBeInTheDocument();

    goTo(/Gerar com IA/);

    expect(screen.getByPlaceholderText(/Descreva a imagem que deseja gerar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar imagem-base/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enviar arquivo/ })).not.toBeInTheDocument();
  });

  it('o modo IA expõe o conjunto completo de campos da composição', () => {
    renderStep();
    goTo(/Template global/);
    goTo(/Gerar com IA/);

    expect(screen.getByPlaceholderText('Descreva a imagem que deseja gerar')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Texto principal na imagem')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Texto secundário na imagem')).toBeInTheDocument();
    expect(screen.getByText('Fonte')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quadrado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Banner' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Aplicar logo da empresa-alvo/)).toBeInTheDocument();
  });

  it('numa empresa, o header gera os dois e cada card gera a sua parte', () => {
    renderStep();
    goTo(/Nubank/);

    expect(screen.getByRole('button', { name: /Gerar texto \+ imagem/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Gerar texto$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Gerar imagem$/ })).toBeInTheDocument();
  });

  it('a empresa tem as duas origens e o bloco completo, herdando o template', () => {
    renderStep({
      templateLogo: { ...createDefaultCreativeData().templateLogo, textoDestaque: 'WORKSHOP ABM' },
    });
    goTo(/Nubank/);

    // As mesmas duas origens que o template oferece.
    expect(screen.getByRole('button', { name: /Enviar imagem/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar com IA/ })).toBeInTheDocument();
    // Campos editáveis aqui, pré-preenchidos com o valor herdado do template.
    expect(screen.getByPlaceholderText('Texto principal na imagem')).toHaveValue('WORKSHOP ABM');
  });

  it('editar um campo na empresa vira override, com volta ao template', () => {
    renderStep();
    goTo(/Nubank/);

    expect(screen.queryByRole('button', { name: /Voltar ao template/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Texto principal na imagem'), {
      target: { value: 'SÓ DA NUBANK' },
    });
    expect(screen.getByPlaceholderText('Texto principal na imagem')).toHaveValue('SÓ DA NUBANK');

    // O override é reversível, e voltar restaura o valor do template.
    fireEvent.click(screen.getByRole('button', { name: /Voltar ao template/ }));
    expect(screen.getByPlaceholderText('Texto principal na imagem')).toHaveValue('WORKSHOP ABM');
  });

  it('sem imagem-base e com origem upload, a empresa bloqueia a geração', () => {
    renderStep();
    goTo(/Nubank/);

    expect(screen.getByRole('button', { name: /^Gerar imagem$/ })).toBeDisabled();
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
