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
  // `logoUrl` está aqui porque é o que a segmentação real entrega. Sem ele
  // `targetLogoUrl` cairia no logo.dev, que depende de VITE_LOGO_DEV_KEY e é
  // undefined em teste — e o logo da conta sumiria do preview.
  companies: {
    included: [{ id: 'c1', label: 'Nubank', domain: 'nubank.com.br', logoUrl: 'https://exemplo/nubank.png' }],
    excluded: [],
  },
  defaultTargeting: {
    locations: { included: [], excluded: [] }, seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] }, jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

function Host({ initial }: { initial?: Partial<CreativeData> }) {
  const [data, setData] = useState<CreativeData>({ ...createDefaultCreativeData(), ...initial });
  return (
    <CreativeStep
      selectedAccounts={[]} targetingData={targeting as never}
      creativeData={data} onCreativeChange={setData} campaignId="camp-1"
    />
  );
}

const withBaseImage = () => {
  const d = createDefaultCreativeData();
  d.templateLogo.baseImageUrl = 'https://exemplo/base.png';
  d.templateLogo.baseImageSource = 'upload';
  return d;
};

const renderStep = (initial?: Partial<CreativeData>) =>
  render(<MemoryRouter><Host initial={initial} /></MemoryRouter>);

const goTo = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
// Cards do editor são um acordeão colapsado por padrão; este arquivo só mexe
// no card Imagem, então abri-lo após navegar é seguro em todos os testes.
const openCard = (title: string) =>
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${title}$`) }));
// Os controles de uma camada de texto só aparecem com a camada ATIVA (foco no
// input ou clique no texto do preview).
const activateDestaque = () =>
  fireEvent.focus(screen.getByPlaceholderText('Texto principal na imagem'));

// jsdom devolve zero em todo getBoundingClientRect; sem um retângulo real o
// arrasto não teria escala para converter px em fração (mesmo padrão de
// OverlayCanvas.test.tsx).
function stubRect(el: Element, w: number, h: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('CreativeStep — formato reflete no preview', () => {
  it('banner mantém o preview em 1.91:1', () => {
    const { container } = renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/628]');
  });

  // A regressão trancada aqui: o preview tinha aspect-[1200/628] hardcoded e
  // escolher Quadrado não mudava nada na tela.
  it('escolher Quadrado deixa o preview 1:1', () => {
    const { container } = renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    // `/Quadrado.*1:1/`, não só `/Quadrado/`: a Task 7 acrescentou o wrap
    // "Quadrado" do logo da conta (habilitado por padrão), que também é um
    // <button> com esse texto — sem o pedaço da proporção o seletor bate em
    // dois elementos e `getByRole` estoura.
    fireEvent.click(screen.getByRole('button', { name: /Quadrado.*1:1/ }));
    expect(container.querySelector('[data-testid="overlay-canvas"]')).toHaveClass('aspect-[1200/1200]');
  });
});

describe('CreativeStep — editor no lugar da imagem', () => {
  it('com imagem-base, o preview mostra os textos do overlay como camadas', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    expect(screen.getByText('WORKSHOP ABM')).toBeInTheDocument();
  });

  it('sem imagem-base, mostra o placeholder', () => {
    renderStep();
    goTo(/Template global/);
    openCard('Imagem');
    expect(screen.getByText(/Imagem aparecerá aqui/)).toBeInTheDocument();
  });

  // Sem PNG composto não há o que comparar, então o toggle não aparece.
  it('o toggle Composto só existe quando há imagem composta', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    expect(screen.queryByRole('button', { name: /Composto/ })).not.toBeInTheDocument();
  });
});

describe('CreativeStep — "Voltar ao template" também restaura o layout', () => {
  // Regressão: `setLayout` grava `layout` no override da empresa (primeiro
  // caminho de código que escreve esse campo), mas `resetImageOverrides` não
  // sabia limpá-lo. Como `layout` está em IMAGE_OVERRIDE_FIELDS, o botão
  // "Voltar ao template" nunca sumia e o layout arrastado ficava preso na
  // empresa para sempre, sem caminho de volta.
  it('arrastar uma camada na empresa e depois resetar restaura a posição do template e some com o botão', () => {
    const { container } = renderStep(withBaseImage());
    goTo(/Nubank/);
    openCard('Imagem');

    const canvas = container.querySelector('[data-testid="overlay-canvas"]')!;
    stubRect(canvas, 600, 314); // metade do canvas de referência (banner: 1200×628)

    // Posição default do destaque é x=0.30 → left: 30%.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ left: '30%' });
    expect(screen.queryByRole('button', { name: /Voltar ao template/ })).not.toBeInTheDocument();

    fireEvent.pointerDown(screen.getByText('WORKSHOP ABM'), { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    // 60px de 600 = 0.1 do canvas, somado ao x default de 0.30 → left: 40%.
    // O arrasto virou override, e o botão de reset aparece.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ left: '40%' });
    const resetButton = screen.getByRole('button', { name: /Voltar ao template/ });

    fireEvent.click(resetButton);

    // O layout volta ao do template e o botão some — sem os dois, a empresa
    // fica com um layout descolado do template e sem caminho de volta.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ left: '30%' });
    expect(screen.queryByRole('button', { name: /Voltar ao template/ })).not.toBeInTheDocument();
  });
});

describe('CreativeStep — ordem do card Imagem', () => {
  // O pedido: upload antes dos textos. E formato antes do upload, porque é ele
  // que define as dimensões que a dropzone pede.
  it('formato vem antes da origem, que vem antes da imagem-base, que vem antes dos textos', () => {
    const { container } = renderStep();
    goTo(/Template global/);
    openCard('Imagem');
    // Busca pelo conteúdo e não por índice: a posição do <section> muda toda
    // vez que alguém acrescenta um card, e o teste passaria a medir outra coisa.
    const card = Array.from(container.querySelectorAll('section'))
      .find((sec) => (sec.textContent || '').includes('Origem da imagem-base'))!;
    // Normaliza para maiúsculas: os rótulos são Title Case na fonte (só viram
    // caixa alta visualmente via CSS `uppercase`), e `.textContent` não é
    // afetado por CSS — comparar em maiúsculas é o que torna a checagem
    // insensível a essa diferença puramente visual.
    const cardText = (card.textContent || '').toUpperCase();

    const formatoIdx = cardText.indexOf('FORMATO');
    const origemIdx = cardText.indexOf('ORIGEM DA IMAGEM-BASE');
    const dropzoneIdx = cardText.indexOf('CLIQUE OU ARRASTE A IMAGEM-BASE');
    const textoDestaqueIdx = cardText.indexOf('TEXTO DESTAQUE');

    // `indexOf` devolve -1 quando não acha o marcador, e `-1 < N` passa como
    // se a ordem estivesse certa mesmo com o bloco inteiro sumido do card —
    // foi assim que a checagem anterior ficou vácua sob um teste de mutação
    // que só renomeou o rótulo "Formato". Garantir presença antes de comparar
    // ordem é o que fecha esse buraco.
    expect(formatoIdx).toBeGreaterThanOrEqual(0);
    expect(origemIdx).toBeGreaterThanOrEqual(0);
    expect(dropzoneIdx).toBeGreaterThanOrEqual(0);
    expect(textoDestaqueIdx).toBeGreaterThanOrEqual(0);

    expect(formatoIdx).toBeLessThan(origemIdx);
    // Upload da imagem-base antes dos textos é literalmente o pedido que
    // motivou esta task — sem esta linha, mover o box de Textos+Fonte para
    // cima do bloco de Imagem-base não quebra teste nenhum.
    expect(origemIdx).toBeLessThan(dropzoneIdx);
    expect(dropzoneIdx).toBeLessThan(textoDestaqueIdx);
  });

  it('a dropzone anuncia a dimensão do formato escolhido', () => {
    renderStep();
    goTo(/Template global/);
    openCard('Imagem');
    // `getAllByText`: o rótulo aparece DUAS vezes — no FormatButton e na
    // dropzone —, e `getByText` estouraria com "found multiple elements".
    expect(screen.getAllByText(/1200 × 628 px/).length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: /Quadrado.*1:1/ }));
    expect(screen.getAllByText(/1200 × 1200 px/).length).toBeGreaterThan(1);
    // O FormatButton do Banner continua na tela mostrando a SUA própria
    // dimensão (ele é o seletor do outro formato, não um resumo do escolhido)
    // — por isso a checagem final é escopada ao hint da dropzone, não à
    // página inteira.
    const dropzoneHint = screen.getByText(/JPG ou PNG/);
    expect(dropzoneHint.textContent).toContain('1200 × 1200 px');
    expect(dropzoneHint.textContent).not.toContain('1200 × 628 px');
  });
});

describe('CreativeStep — controles de camada', () => {
  it('mudar o tamanho do destaque grava no layout', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    activateDestaque();
    const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
    expect(slider.value).toBe('56');
    fireEvent.change(slider, { target: { value: '90' } });
    // Só volta 90 se tiver dado a volta inteira: setLayout → updateCreative →
    // prop → imageCfg.layout. É esse circuito que o teste tranca.
    expect(slider.value).toBe('90');
  });

  // jsdom não implementa canvas.measureText, então `measureTextWidthPx` devolve 0
  // e o teto cai no máximo duro. O que este teste garante é o contrato do
  // atributo; a aritmética do teto está coberta em `overlayLayout.test.ts`.
  it('o slider do destaque expõe piso e teto', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    activateDestaque();
    const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
    expect(Number(slider.min)).toBe(16);
    expect(Number(slider.max)).toBeGreaterThan(0);
  });

  // O teto vivo precisa aparecer no badge e no preview SEM gravar nada — é
  // um valor DERIVADO a cada render (`effectiveTextSize`), não escrito de
  // volta no layout. Fix round 1 tentou gravar via `useEffect`; fix round 2
  // reverteu isso porque a escrita criava um override de empresa sozinha
  // (ver describe abaixo). Stuba `canvas.getContext('2d')` para controlar a
  // medição de verdade — sem isso jsdom devolve null e `measureTextWidthPx`
  // sempre cai no fallback de 0, o que mascara qualquer teto abaixo do
  // máximo duro (160).
  describe('o teto vivo deriva o valor efetivo, sem gravar nada', () => {
    let getContextSpy: ReturnType<typeof vi.spyOn> | undefined;

    afterEach(() => {
      getContextSpy?.mockRestore();
      getContextSpy = undefined;
    });

    // A largura mockada ESCALA com o `px` do `ctx.font`, igual à medição real
    // (a largura de um texto é linear no tamanho da fonte). 14.45px de
    // largura por px de fonte dá teto de 80: largura útil do canvas (1156px)
    // / 14.45 = 80.
    function stubLinearCanvasMeasure() {
      getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
        const ctx = {
          font: '',
          measureText(_text: string) {
            const sizePx = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? '0');
            return { width: sizePx * 14.45 };
          },
        };
        return ctx as unknown as CanvasRenderingContext2D;
      });
    }

    it('quando o teto cai abaixo do tamanho gravado, o badge e o preview mostram o valor efetivo', () => {
      stubLinearCanvasMeasure();

      const d = withBaseImage();
      d.templateLogo.layout = {
        ...d.templateLogo.layout,
        destaque: { ...d.templateLogo.layout.destaque, sizePx: 160 },
      };
      renderStep(d);
      goTo(/Template global/);
      openCard('Imagem');
      activateDestaque();

      const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
      expect(Number(slider.max)).toBe(80);

      // O badge tem que mostrar o valor EFETIVO (80), não o cru (160) — se o
      // clamp fosse só de exibição no slider, o badge continuaria em 160px,
      // exatamente como o revisor reproduziu no round 1.
      const row = slider.closest('div')!;
      expect(within(row).getByText('80px')).toBeInTheDocument();
      expect(within(row).queryByText('160px')).not.toBeInTheDocument();

      // O preview mede com a mesma função (`effectiveLayout` recebe as
      // larguras medidas) — se divergisse, o preview continuaria
      // renderizando 160px e o texto vazaria do canvas, que é exatamente o
      // que o teto existe para impedir.
      expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ fontSize: '80px' });
    });

    // Regressão do round 2: a versão que GRAVAVA o clamp (via `useEffect`)
    // escrevia em `layout.destaque.sizePx` assim que uma empresa herdava um
    // layout de template já acima do teto — sem NENHUMA ação do usuário além
    // de abrir a empresa. Isso criava um override permanente (a empresa
    // parava de herdar edições futuras do template) e ressuscitava "Voltar
    // ao template" como um botão que nunca conseguia limpar o próprio
    // override que ele mesmo recriava a cada render.
    it('abrir uma empresa com o layout do template acima do teto não cria override nenhum', () => {
      stubLinearCanvasMeasure();

      const d = withBaseImage();
      d.templateLogo.layout = {
        ...d.templateLogo.layout,
        destaque: { ...d.templateLogo.layout.destaque, sizePx: 160 },
      };
      renderStep(d);

      // Só abre a empresa e ATIVA a camada (foco é seleção de UI pura — não
      // escreve nada). Nenhuma outra interação.
      goTo(/Nubank/);
      openCard('Imagem');
      activateDestaque();

      // A empresa deriva o mesmo teto (herda o layout cru do template, sem
      // override) — prova que a ausência de override não é por acidente de
      // não ter clampado nada.
      const slider = screen.getByLabelText(/Tamanho do texto destaque/) as HTMLInputElement;
      expect(Number(slider.max)).toBe(80);
      expect(within(slider.closest('div')!).getByText('80px')).toBeInTheDocument();

      // E nenhum override foi criado: "Voltar ao template" não existe.
      expect(screen.queryByRole('button', { name: /Voltar ao template/ })).not.toBeInTheDocument();
    });
  });

  it('trocar o fundo para Nenhum tira a caixa do preview', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    activateDestaque();
    fireEvent.click(screen.getAllByRole('button', { name: /^Nenhum$/ })[0]);
    // jsdom resolve o keyword CSS `transparent` para `rgba(0, 0, 0, 0)` no
    // computed style (é assim que o próprio jsdom normaliza a cor, igual a um
    // navegador) — `toHaveStyle` compara contra o computed style, então o
    // valor esperado precisa ser o já resolvido, não o keyword literal.
    expect(screen.getByText('WORKSHOP ABM')).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0)' });
  });
});

describe('CreativeStep — logos', () => {
  it('"Meu logo" fica desabilitado sem logo no Brand Kit', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    expect(screen.getByLabelText(/Meu logo/)).toBeDisabled();
  });

  it('"Logo da conta" começa marcado e desmarcar tira o logo do preview', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    // String exata, não regex: o logo da conta vem habilitado por padrão, e
    // com ele habilitado o Wrap picker expõe botões com aria-label "Quadrado
    // para Logo da conta" etc. — um /Logo da conta/ solto bateria neles
    // também e `getByLabelText` estouraria com múltiplos elementos.
    const check = screen.getByLabelText('Logo da conta');
    expect(check).toBeChecked();
    fireEvent.click(check);
    expect(screen.queryByAltText('Logo da conta')).not.toBeInTheDocument();
  });

  it('"Agrupar como par" liga os dois logos de uma vez', () => {
    const d = withBaseImage();
    d.brandKit = { ...d.brandKit, logo: 'data:image/png;base64,AAAA' };
    renderStep(d);
    goTo(/Template global/);
    openCard('Imagem');
    fireEvent.click(screen.getByRole('button', { name: /Agrupar como par/ }));
    expect(screen.getByAltText('Meu logo')).toBeInTheDocument();
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();
  });

  // Regressão: `effectiveLayout` costumava forçar `enabled: true` nos dois
  // logos sempre que `paired` fosse true. Desmarcar "Logo da conta" desmarcava
  // o checkbox e escondia wrap/tamanho do card, mas o logo continuava preso
  // no preview — o mesmo defeito que esta task foi encarregada de eliminar
  // no `showTargetLogo`.
  it('depois de "Agrupar como par", desmarcar "Logo da conta" tira ele do preview de verdade', () => {
    const d = withBaseImage();
    d.brandKit = { ...d.brandKit, logo: 'data:image/png;base64,AAAA' };
    renderStep(d);
    goTo(/Template global/);
    openCard('Imagem');
    fireEvent.click(screen.getByRole('button', { name: /Agrupar como par/ }));
    expect(screen.getByAltText('Logo da conta')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Logo da conta'));
    expect(screen.queryByAltText('Logo da conta')).not.toBeInTheDocument();
    // O anunciante continua no ar — desligar um não desliga o outro.
    expect(screen.getByAltText('Meu logo')).toBeInTheDocument();
  });

  // Irmão do bug acima: "Desagrupar" reusa o mesmo botão/onClick de "Agrupar
  // como par", e a versão antiga forçava `enabled: true` nos dois em QUALQUER
  // clique — inclusive o de desagrupar, religando em silêncio um logo que o
  // usuário tinha acabado de desligar.
  it('"Desagrupar" não religa um logo que o usuário desligou', () => {
    const d = withBaseImage();
    d.brandKit = { ...d.brandKit, logo: 'data:image/png;base64,AAAA' };
    renderStep(d);
    goTo(/Template global/);
    openCard('Imagem');

    const pairButton = screen.getByRole('button', { name: /Agrupar como par/ });
    fireEvent.click(pairButton); // agrupa
    fireEvent.click(screen.getByLabelText('Logo da conta')); // usuário desliga
    expect(screen.queryByAltText('Logo da conta')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Desagrupar/ })); // desagrupa
    expect(screen.queryByAltText('Logo da conta')).not.toBeInTheDocument();
  });

  // Mesma família de controle morto que o round 1 limpou no checkbox: com
  // `paired` ligado, a geometria (wrap/tamanho) do "Logo da conta" é DERIVADA
  // da do anunciante (`effectiveLayout`) — editar aqui não muda nada no
  // preview nem no PNG final. Ficar editável sem efeito nenhum é enganoso.
  it('com "Agrupar como par" ligado, Wrap e Tamanho do "Logo da conta" ficam desabilitados', () => {
    const d = withBaseImage();
    d.brandKit = { ...d.brandKit, logo: 'data:image/png;base64,AAAA' };
    renderStep(d);
    goTo(/Template global/);
    openCard('Imagem');

    fireEvent.click(screen.getByRole('button', { name: /Agrupar como par/ }));

    expect(screen.getByRole('button', { name: /Círculo para Logo da conta/ })).toBeDisabled();
    expect(screen.getByLabelText(/Tamanho do Logo da conta/)).toBeDisabled();
    // O checkbox continua funcional — só a geometria fica travada.
    expect(screen.getByLabelText('Logo da conta')).not.toBeDisabled();
  });
});

// Sem teste nenhum até esta rodada — uma regressão no wrap ou no tamanho do
// logo passava silenciosa.
describe('CreativeStep — wrap e tamanho do logo', () => {
  it('trocar o wrap do logo da conta para Círculo arredonda o cartão no preview', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    fireEvent.click(screen.getByRole('button', { name: /Círculo para Logo da conta/ }));
    const wrap = screen.getByAltText('Logo da conta').parentElement!;
    expect(wrap).toHaveStyle({ borderRadius: '9999px' });
  });

  it('mudar o tamanho do logo da conta muda a largura do cartão no preview', () => {
    renderStep(withBaseImage());
    goTo(/Template global/);
    openCard('Imagem');
    const slider = screen.getByLabelText(/Tamanho do Logo da conta/) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '300' } });
    const wrap = screen.getByAltText('Logo da conta').parentElement!;
    expect(wrap).toHaveStyle({ width: '300px' });
  });
});

// Task 8: o fluxo de composição estava morto na branch desde a Task 3 — o
// handler passou a exigir `layout` e o cliente continuava mandando o payload
// antigo (com `show_target_logo`, sem `layout`), então toda chamada voltava
// 400. Este describe tranca o payload novo.
describe('CreativeStep — payload da composição', () => {
  it('manda o layout efetivo (não o cru), formato, logo do anunciante e as larguras medidas', async () => {
    const ai = await import('@/lib/ai');
    const spy = vi.spyOn(ai, 'composeLogoOverlay').mockResolvedValue({
      success: true, url: 'https://exemplo/ad.png', filename: 'ad.png',
      logo_applied: true, advertiser_logo_applied: false,
    });

    const d = withBaseImage();
    d.templateLogo.format = 'square';
    d.brandKit = { ...d.brandKit, logo: 'data:image/png;base64,AAAA', websiteUrl: 'https://acme.com/pricing' };
    renderStep(d);
    goTo(/Nubank/);
    openCard('Imagem');
    fireEvent.click(screen.getByRole('button', { name: /^Gerar imagem$/ }));

    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    const payload = spy.mock.calls[0][0];

    expect(payload.format).toBe('square');
    // jsdom não implementa canvas.getContext('2d') — measureTextWidthPx cai no
    // fallback de largura 0, e `maxTextSizePx` devolve o teto duro quando a
    // largura medida é <= 0 (nunca clampa). Por isso este número (56, default
    // de createDefaultOverlayLayout) é IGUAL ao gravado mesmo passando por
    // `effectiveLayout` — aqui é coincidência mesmo, não prova que o payload
    // manda o efetivo e não o cru. Quem prova isso é o describe abaixo, que
    // stuba a medição para forçar um clamp de verdade.
    expect(payload.layout.destaque.sizePx).toBe(56);
    expect(payload.layout.complementar.sizePx).toBe(28);
    expect(payload.advertiser_logo_url).toBe('data:image/png;base64,AAAA');
    // "acme.com", sem protocolo nem path — é o formato que o handler espera
    // para resolver o logo a partir do domínio.
    expect(payload.advertiser_domain).toBe('acme.com');
    expect(typeof payload.destaque_width_px).toBe('number');
    expect(typeof payload.complementar_width_px).toBe('number');
    // `show_target_logo` saiu do contrato nesta task — o handler já lê
    // `layout.targetLogo.enabled`, e mandar o campo legado só engana quem lê
    // o payload.
    expect(payload).not.toHaveProperty('show_target_logo');

    spy.mockRestore();
  });

  it('sem websiteUrl no Brand Kit, advertiser_domain sai null em vez de string vazia ou lixo', async () => {
    const ai = await import('@/lib/ai');
    const spy = vi.spyOn(ai, 'composeLogoOverlay').mockResolvedValue({
      success: true, url: 'https://exemplo/ad.png', filename: 'ad.png',
      logo_applied: true, advertiser_logo_applied: false,
    });

    renderStep(withBaseImage());
    goTo(/Nubank/);
    openCard('Imagem');
    fireEvent.click(screen.getByRole('button', { name: /^Gerar imagem$/ }));

    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0].advertiser_domain).toBeNull();

    spy.mockRestore();
  });

  // Fix round 1: o teste "manda o layout efetivo..." acima NÃO distinguia
  // layout efetivo de cru — em jsdom a largura medida é sempre 0 e o teto
  // nunca clampa, então `effectiveLayout(...)` devolve os mesmos números que
  // `cfg.layout` já tinha. Uma mutação que trocasse `layout` por `cfg.layout`
  // cru em `composeOverlayFor` passaria pela suíte inteira sem ser detectada
  // — e esse acordo preview↔PNG é a razão de a feature existir. Este describe
  // stuba a medição (mesmo padrão do describe "o teto vivo deriva o valor
  // efetivo" mais acima) para forçar um clamp de verdade.
  describe('com um clamp de verdade (canvas stubado)', () => {
    let getContextSpy: ReturnType<typeof vi.spyOn> | undefined;

    afterEach(() => {
      getContextSpy?.mockRestore();
      getContextSpy = undefined;
    });

    // A largura escala com o `px` do `ctx.font` — 14.45px de largura por px
    // de fonte dá teto de 80 (1156px úteis do canvas / 14.45), igual ao
    // describe do teto vivo mais acima.
    function stubLinearCanvasMeasure() {
      getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
        const ctx = {
          font: '',
          measureText(_text: string) {
            const sizePx = parseFloat(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? '0');
            return { width: sizePx * 14.45 };
          },
        };
        return ctx as unknown as CanvasRenderingContext2D;
      });
    }

    it('o layout mandado é o CLAMPADO (não o gravado), e a largura da caixa é medida no tamanho EFETIVO', async () => {
      stubLinearCanvasMeasure();

      const ai = await import('@/lib/ai');
      const spy = vi.spyOn(ai, 'composeLogoOverlay').mockResolvedValue({
        success: true, url: 'https://exemplo/ad.png', filename: 'ad.png',
        logo_applied: true, advertiser_logo_applied: false,
      });

      const d = withBaseImage();
      // Gravado em 160 (acima do teto de 80 com este stub) — de propósito,
      // para o clamp disparar de verdade.
      d.templateLogo.layout = {
        ...d.templateLogo.layout,
        destaque: { ...d.templateLogo.layout.destaque, sizePx: 160 },
      };
      renderStep(d);
      goTo(/Nubank/);
      openCard('Imagem');
      fireEvent.click(screen.getByRole('button', { name: /^Gerar imagem$/ }));

      await vi.waitFor(() => expect(spy).toHaveBeenCalled());
      const payload = spy.mock.calls[0][0];

      // Clampado (80), não o gravado (160). Se `composeOverlayFor` mandasse
      // `cfg.layout` cru em vez do resultado de `effectiveLayout`, este
      // número seria 160 — foi exatamente essa mutação que motivou o achado.
      expect(payload.layout.destaque.sizePx).toBe(80);
      expect(payload.layout.destaque.sizePx).not.toBe(160);

      // A largura da caixa tem que ser medida NO TAMANHO EFETIVO (80): com o
      // stub linear, largura(80px) = 80 × 14.45 = 1156. Se a segunda medição
      // caísse de volta pro tamanho gravado (160px), sairia 2312 — bem
      // diferente, o que prova que a remedição usa `layout.destaque.sizePx`
      // (efetivo) e não `cfg.layout.destaque.sizePx` (gravado).
      expect(payload.destaque_width_px).toBe(1156);
      expect(payload.destaque_width_px).not.toBe(Math.ceil(160 * 14.45));

      spy.mockRestore();
    });
  });

  // Fix round 1, achado 2: a única via de UI para logo próprio (`LogoGallery.pick()`
  // em BriefPane.tsx) grava um `blob:` em `brandKit.logo` — um esquema que só
  // resolve dentro desta aba. O servidor busca a URL com `fetch()` puro e
  // nunca alcança um `blob:`; sem este guard a composição degradava pro
  // fallback por domínio em silêncio (ou pior, sem fallback nenhum se não
  // houver `websiteUrl`), fazendo "Meu logo" sumir do PNG sem aviso algum.
  it('logo do anunciante em blob: não é mandado — o servidor não alcança um blob: da aba', async () => {
    const ai = await import('@/lib/ai');
    const spy = vi.spyOn(ai, 'composeLogoOverlay').mockResolvedValue({
      success: true, url: 'https://exemplo/ad.png', filename: 'ad.png',
      logo_applied: true, advertiser_logo_applied: false,
    });

    const d = withBaseImage();
    d.brandKit = { ...d.brandKit, logo: 'blob:https://exemplo.com/1234-5678-90ab' };
    renderStep(d);
    goTo(/Nubank/);
    openCard('Imagem');
    fireEvent.click(screen.getByRole('button', { name: /^Gerar imagem$/ }));

    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy.mock.calls[0][0].advertiser_logo_url).toBeNull();

    spy.mockRestore();
  });
});
