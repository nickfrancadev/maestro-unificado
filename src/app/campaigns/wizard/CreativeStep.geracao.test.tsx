import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
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
    // Cada formato anuncia medida e proporção, não só o nome.
    expect(screen.getByRole('button', { name: /Quadrado/ })).toBeInTheDocument();
    expect(screen.getByText('1200 × 1200 px · 1:1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Banner/ })).toBeInTheDocument();
    expect(screen.getByText('1200 × 628 px · 1.91:1')).toBeInTheDocument();
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

  it('o editor não repete o anúncio — quem renderiza o resultado é o preview', () => {
    renderStep({
      overrides: {
        c1: {
          status: 'fully_personalized',
          baseImageUrl: 'https://x/base-nubank.png',
          imageUrl: 'https://x/composto.png',
          imageFileName: 'composto.png',
        },
      },
    });
    goTo(/Nubank/);

    // Nada de um segundo slot para o mesmo anúncio dentro do formulário — o
    // guard original é por TEXTO, não por alt: ele travava o <label> que
    // envolvia o segundo slot do formulário, não o <img> do preview.
    expect(screen.queryByText('Anúncio composto')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Anúncio composto')).not.toBeInTheDocument();

    // O composto só aparece no preview quando o toggle "Composto" é acionado
    // — por padrão o preview mostra o editor ao vivo.
    fireEvent.click(screen.getByRole('button', { name: /Composto/ }));
    expect(screen.getByAltText('Anúncio composto')).toHaveAttribute('src', 'https://x/composto.png');
  });

  it('a imagem-base da própria empresa aparece no preview antes de compor', () => {
    const { container } = renderStep({
      imageUrl: 'https://x/template.png',
      overrides: {
        c1: { status: 'fully_personalized', baseImageUrl: 'https://x/base-nubank.png' },
      },
    });
    goTo(/Nubank/);

    // Sem a base da empresa na cadeia, o preview mostraria o anúncio do
    // template — que não é o que essa empresa vai rodar. Escopado ao canvas
    // do preview porque o card 2 também tem uma miniatura com o mesmo alt.
    const canvas = container.querySelector('[data-testid="overlay-canvas"]') as HTMLElement;
    expect(within(canvas).getByAltText('Imagem-base')).toHaveAttribute('src', 'https://x/base-nubank.png');
  });

  it('sem imagem-base e com origem upload, a empresa bloqueia a geração', () => {
    renderStep();
    goTo(/Nubank/);

    expect(screen.getByRole('button', { name: /^Gerar imagem$/ })).toBeDisabled();
    // O aviso vive dentro do card, não numa faixa no topo da página.
    expect(screen.queryByText(/Modo "Template \+ logo" selecionado/)).not.toBeInTheDocument();
  });

  it('a empresa tem URL de destino e CTA próprios, herdados até serem mudados', () => {
    renderStep({ landingPageUrl: '/p/campanha-geral', cta: 'LEARN_MORE' });
    goTo(/Nubank/);

    const url = screen.getByDisplayValue('/p/campanha-geral');
    expect(screen.getByDisplayValue('Learn More')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Voltar ao template/ })).not.toBeInTheDocument();

    fireEvent.change(url, { target: { value: '/p/nubank' } });
    fireEvent.change(screen.getByDisplayValue('Learn More'), { target: { value: 'REQUEST_DEMO' } });

    expect(screen.getByDisplayValue('/p/nubank')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Request Demo')).toBeInTheDocument();

    // O template segue intocado.
    goTo(/Template global/);
    expect(screen.getByDisplayValue('/p/campanha-geral')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Learn More')).toBeInTheDocument();
  });

  it('o CTA do preview segue o override da empresa, não o do template', () => {
    renderStep({
      cta: 'LEARN_MORE',
      overrides: { c1: { status: 'fully_personalized', cta: 'REQUEST_DEMO' } },
    });
    goTo(/Nubank/);

    expect(screen.getByRole('button', { name: 'Request Demo' })).toBeInTheDocument();
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
