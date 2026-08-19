import { describe, it, expect } from 'vitest';
import {
  AD_FORMAT_SIZE,
  createDefaultOverlayLayout,
  createDefaultBackdrop,
  withLayoutDefaults,
  textLayerRect,
  logoLayerRect,
  clampCenter,
  effectiveLayout,
  effectiveTextSize,
  maxTextSizePx,
  OVERLAY_STYLE,
  LOGO_WRAP_ASPECT,
} from './overlayLayout';

describe('createDefaultOverlayLayout', () => {
  it('nasce com o logo do anunciante DESLIGADO — brandKit.logo é null por default, e ligá-lo mostraria um buraco', () => {
    expect(createDefaultOverlayLayout().advertiserLogo.enabled).toBe(false);
  });

  it('herda o "leva logo da conta?" do showTargetLogo legado', () => {
    expect(createDefaultOverlayLayout(true).targetLogo.enabled).toBe(true);
    expect(createDefaultOverlayLayout(false).targetLogo.enabled).toBe(false);
  });

  it('põe destaque e complementar no mesmo x, para empilharem alinhados', () => {
    const l = createDefaultOverlayLayout();
    expect(l.destaque.x).toBe(l.complementar.x);
    expect(l.destaque.y).toBeLessThan(l.complementar.y);
  });
});

describe('withLayoutDefaults', () => {
  it('devolve o layout salvo quando existe', () => {
    const saved = createDefaultOverlayLayout();
    saved.destaque.sizePx = 99;
    expect(withLayoutDefaults(saved, true).destaque.sizePx).toBe(99);
  });

  // Campanhas salvas antes do editor não têm `layout`; `showTargetLogo` era a
  // única expressão de "leva logo da conta?" e não pode ser perdida.
  it('migra showTargetLogo=false de campanha antiga', () => {
    expect(withLayoutDefaults(undefined, false).targetLogo.enabled).toBe(false);
  });

  it('assume que leva logo quando nem layout nem showTargetLogo existem', () => {
    expect(withLayoutDefaults(undefined, undefined).targetLogo.enabled).toBe(true);
  });
});

describe('textLayerRect', () => {
  it('centraliza a caixa no ponto da camada, com o padding dos dois lados', () => {
    const layer = { x: 0.5, y: 0.5, sizePx: 50, color: '#FFF', align: 'center' as const, backdrop: createDefaultBackdrop() };
    const r = textLayerRect(layer, 200, 'banner');
    expect(r.w).toBe(200 + OVERLAY_STYLE.boxPadX * 2);
    expect(r.h).toBe(50 + OVERLAY_STYLE.boxPadY * 2);
    expect(r.x).toBe(600 - r.w / 2);
    expect(r.y).toBe(314 - r.h / 2);
  });
});

describe('logoLayerRect', () => {
  it('wrap quadrado e circular são 1:1', () => {
    const base = { enabled: true, x: 0.5, y: 0.5, sizePx: 140 };
    expect(logoLayerRect({ ...base, wrap: 'square' }, 'square').h).toBe(140);
    expect(logoLayerRect({ ...base, wrap: 'circle' }, 'square').h).toBe(140);
  });

  it('wrap retangular usa sizePx como LARGURA e deriva a altura', () => {
    const r = logoLayerRect({ enabled: true, x: 0.5, y: 0.5, sizePx: 250, wrap: 'rect' }, 'square');
    expect(r.w).toBe(250);
    expect(r.h).toBe(100); // 250 / 2.5
  });
});

describe('clampCenter', () => {
  it('trava a caixa dentro do canvas nas quatro bordas', () => {
    // Caixa de 200×100 no banner (1200×628): meio-lado = 100/1200 e 50/628.
    expect(clampCenter(-1, 0.5, 200, 100, 'banner').x).toBeCloseTo(100 / 1200);
    expect(clampCenter(2, 0.5, 200, 100, 'banner').x).toBeCloseTo(1 - 100 / 1200);
    expect(clampCenter(0.5, -1, 200, 100, 'banner').y).toBeCloseTo(50 / 628);
    expect(clampCenter(0.5, 2, 200, 100, 'banner').y).toBeCloseTo(1 - 50 / 628);
  });

  it('não mexe em quem já está dentro', () => {
    expect(clampCenter(0.5, 0.5, 200, 100, 'banner')).toEqual({ x: 0.5, y: 0.5 });
  });

  // Sem esta guarda o clamp produziria min > max e devolveria NaN/valor invertido.
  it('centraliza quando a caixa é maior que o canvas', () => {
    expect(clampCenter(0.1, 0.5, 2000, 100, 'banner').x).toBe(0.5);
  });
});


describe('effectiveLayout', () => {
  // O complementar passou a ser DERIVADO do destaque (bloco de texto), então
  // `effectiveLayout` sempre devolve objeto novo. O que continua valendo é que
  // sem par e sem medição nada além dessa derivação muda.
  it('sem par, só deriva a posição do complementar', () => {
    const l = createDefaultOverlayLayout();
    const e = effectiveLayout(l, 'banner');
    expect(e.destaque).toEqual(l.destaque);
    expect(e.advertiserLogo).toEqual(l.advertiserLogo);
    expect(e.targetLogo).toEqual(l.targetLogo);
    expect(e.complementar.x).toBe(l.destaque.x);
    expect(e.complementar.y).toBeGreaterThan(l.destaque.y);
  });

  // No modo par o logo da conta deixa de ter GEOMETRIA independente: quem
  // arrasta é o anunciante e a posição/tamanho/wrap do outro são derivados
  // dele. `enabled`, porém, continua sendo de cada camada — "Agrupar como
  // par" liga os dois no clique (pedido explícito do usuário), mas depois
  // disso um checkbox desmarcado tem que desligar o logo de verdade, mesmo
  // com paired=true. Preview e payload chamam isto, nunca o cru.
  //
  // Corrigido nesta rodada: a versão anterior forçava `enabled: true` nos
  // dois incondicionalmente, e desmarcar "Logo da conta" com paired=true não
  // tinha efeito nenhum no preview — o mesmo defeito que esta task foi
  // encarregada de eliminar no `showTargetLogo`.
  it('com par, deriva a geometria do logo da conta e preserva o enabled de cada camada', () => {
    const base = createDefaultOverlayLayout(true);
    const l = {
      ...base,
      paired: true,
      advertiserLogo: { ...base.advertiserLogo, enabled: true, wrap: 'circle' as const, sizePx: 200 },
      targetLogo: { ...base.targetLogo, enabled: false }, // desmarcado pelo usuário
    };
    const e = effectiveLayout(l, 'banner');

    // Geometria segue o anunciante.
    expect(e.targetLogo.y).toBe(e.advertiserLogo.y);
    expect(e.targetLogo.sizePx).toBe(200);
    expect(e.targetLogo.wrap).toBe('circle');

    // `paired` não força `enabled`: o anunciante mantém o que já era true, e
    // o da conta continua desligado porque o usuário desmarcou.
    expect(e.advertiserLogo.enabled).toBe(true);
    expect(e.targetLogo.enabled).toBe(false);
  });

  // Fix round 2: o clamp do teto vivo deixou de ser gravado (era um
  // `useEffect` que reescrevia `layer.sizePx` — destrutivo, e criava overrides
  // de empresa sozinho). Agora `measured` é opcional e só DERIVA o tamanho
  // efetivo; sem ele, o layout sai intacto, e o `sizePx` gravado nunca muda.
  it('sem measured, os textos saem como estão gravados — não deriva nada', () => {
    const l = createDefaultOverlayLayout();
    const e = effectiveLayout(l, 'banner');
    expect(e.destaque.sizePx).toBe(l.destaque.sizePx);
    expect(e.complementar.sizePx).toBe(l.complementar.sizePx);
  });

  it('com measured, deriva o tamanho efetivo dos dois textos sem tocar no gravado', () => {
    const l = { ...createDefaultOverlayLayout(), destaque: { ...createDefaultOverlayLayout().destaque, sizePx: 160 } };
    // 1156 (largura útil) / 2312 = 0.5 → a 160px gravados, o teto vivo é 80.
    const e = effectiveLayout(l, 'banner', { destaqueWidthPx: 2312, complementarWidthPx: 0 });
    expect(e.destaque.sizePx).toBe(80);
    // O gravado não muda — é o que garante que "encurtar o texto e recuperar
    // o tamanho pedido" funcione sem reescrita nenhuma.
    expect(l.destaque.sizePx).toBe(160);
    // Sem largura medida (0), o complementar não é limitado — cai no teto duro.
    expect(e.complementar.sizePx).toBe(l.complementar.sizePx);
  });
});

describe('effectiveTextSize', () => {
  it('sem medição confiável (0), devolve o próprio gravado', () => {
    const layer = { x: 0.3, y: 0.14, sizePx: 56, color: '#FFFFFF', align: 'center' as const, backdrop: createDefaultBackdrop() };
    expect(effectiveTextSize(layer, 0, 'banner')).toBe(56);
  });

  it('com o gravado acima do teto medido, deriva o teto — sem alterar o objeto de entrada', () => {
    const layer = { x: 0.3, y: 0.14, sizePx: 160, color: '#FFFFFF', align: 'center' as const, backdrop: createDefaultBackdrop() };
    expect(effectiveTextSize(layer, 2312, 'banner')).toBe(80);
    expect(layer.sizePx).toBe(160); // puro: não muta o argumento
  });

  it('com o gravado abaixo do teto medido, devolve o gravado — nunca ENGORDA sozinho', () => {
    // 200px medidos a 40px de fonte cabem várias vezes na largura útil
    // (1156px); o teto vem do máximo duro (160), bem acima do gravado.
    const layer = { x: 0.3, y: 0.14, sizePx: 40, color: '#FFFFFF', align: 'center' as const, backdrop: createDefaultBackdrop() };
    expect(effectiveTextSize(layer, 200, 'banner')).toBe(40);
  });
});

describe('maxTextSizePx', () => {
  it('texto curto pode ir até o teto duro', () => {
    // 40px de largura a 50px de fonte cabe muitas vezes na linha; o teto vem antes.
    expect(maxTextSizePx(40, 50, 'banner')).toBe(160);
  });

  // A regressão que este teste tranca: um destaque longo com a fonte no talo
  // vazava para fora do canvas e o PNG saía com o texto cortado.
  it('texto largo derruba o teto para caber no canvas', () => {
    // Úteis = 1200 - 22*2 = 1156. A 50px o texto mede 1000 → cabe até 57px.
    expect(maxTextSizePx(1000, 50, 'banner')).toBe(57);
  });

  it('nunca desce abaixo do mínimo, mesmo com texto absurdo', () => {
    expect(maxTextSizePx(50000, 50, 'banner')).toBe(16);
  });

  // jsdom e o primeiro render (fonte ainda carregando) devolvem 0 na medição.
  // Travar o slider nesse caso puniria o usuário por um detalhe de timing.
  it('sem medição confiável, libera o teto em vez de travar o slider', () => {
    expect(maxTextSizePx(0, 50, 'banner')).toBe(160);
  });
});

describe('AD_FORMAT_SIZE', () => {
  it('os dois formatos têm 1200 de largura — é o que faz sizePx ser absoluto', () => {
    expect(AD_FORMAT_SIZE.square.w).toBe(1200);
    expect(AD_FORMAT_SIZE.banner.w).toBe(1200);
  });
});

// O edge function roda em Deno e não pode importar de `src/`, então as
// constantes de estilo existem duas vezes. Este teste é o que impede que
// divirjam — sem ele, mudar o padding num lado só faz o preview mentir sobre o
// PNG que vai rodar no LinkedIn, e ninguém percebe até olhar o anúncio.
import {
  OVERLAY_STYLE as SERVER_STYLE,
  AD_FORMAT_SIZE as SERVER_SIZE,
  LOGO_WRAP_ASPECT as SERVER_ASPECT,
  buildOverlaySvg,
} from '../../../../supabase/functions/make-server-a4d5bbe0/overlaySvg';

describe('paridade cliente ↔ servidor', () => {
  it('OVERLAY_STYLE é idêntico nos dois módulos', () => {
    expect({ ...OVERLAY_STYLE }).toEqual({ ...SERVER_STYLE });
  });

  it('AD_FORMAT_SIZE é idêntico nos dois módulos', () => {
    expect(AD_FORMAT_SIZE).toEqual(SERVER_SIZE);
  });

  it('LOGO_WRAP_ASPECT é idêntico nos dois módulos', () => {
    expect(LOGO_WRAP_ASPECT).toEqual(SERVER_ASPECT);
  });

  // As três comparações acima só travam as CONSTANTES. A geometria de
  // verdade — `textLayerRect`/`logoLayerRect`, aqui — é reescrita à mão,
  // inline, dentro de `buildOverlaySvg` no servidor (boxW/boxH/x/y do texto e
  // do logo). Nada impedia essas duas aritméticas de divergirem mesmo com as
  // constantes idênticas — ex.: um padding extra somado só de um lado. Os
  // testes abaixo comparam o `Rect` que as funções do cliente devolvem contra
  // os atributos x/y/width/height que o servidor de fato escreve no `<rect>`
  // do SVG gerado, extraídos com uma regex simples da tag.
  function firstRectAttrs(svg: string): { x: number; y: number; w: number; h: number } {
    const tag = svg.match(/<rect\b[^>]*>/)?.[0];
    if (!tag) throw new Error('nenhum <rect> encontrado no SVG gerado pelo servidor');
    const attr = (name: string) => {
      const m = tag.match(new RegExp(`${name}="([^"]*)"`));
      if (!m) throw new Error(`atributo "${name}" ausente na tag <rect>`);
      return Number(m[1]);
    };
    return { x: attr('x'), y: attr('y'), w: attr('width'), h: attr('height') };
  }

  it.each(['square', 'banner'] as const)(
    'textLayerRect bate com o <rect> da caixa de texto que o servidor gera (%s)',
    (format) => {
      // Os TRÊS alinhamentos: `align` mudou o significado de `x`, então a
      // paridade só vale se ela se sustentar em cada âncora, não só no centro.
      for (const align of ['left', 'center', 'right'] as const) {
        const layer = { x: 0.37, y: 0.62, sizePx: 44, color: '#FFFFFF', align, backdrop: createDefaultBackdrop() };
        const widthPx = 173; // simula a medição real que o editor manda (widthPx)
        const expected = textLayerRect(layer, widthPx, format);

        const svg = buildOverlaySvg({
          format,
          baseHref: 'data:image/png;base64,',
          fontFamily: 'Arial',
          texts: [{ text: 'Rótulo', ...layer, weight: 700, widthPx }],
          logos: [],
        });
        const got = firstRectAttrs(svg);

        expect(got.x).toBeCloseTo(expected.x, 2);
        expect(got.y).toBeCloseTo(expected.y, 2);
        expect(got.w).toBeCloseTo(expected.w, 2);
        expect(got.h).toBeCloseTo(expected.h, 2);
      }
    },
  );

  // Wrap 'rect' de propósito, não 'square': é o único wrap não-1:1, então é o
  // que de fato exercita LOGO_WRAP_ASPECT na derivação da altura.
  it.each(['square', 'banner'] as const)(
    'logoLayerRect bate com o <rect> do wrap "rect" que o servidor gera (%s)',
    (format) => {
      const layer = { enabled: true, x: 0.2, y: 0.75, sizePx: 250, wrap: 'rect' as const };
      const expected = logoLayerRect(layer, format);

      const svg = buildOverlaySvg({
        format,
        baseHref: 'data:image/png;base64,',
        fontFamily: 'Arial',
        texts: [],
        logos: [{ href: 'https://example.com/logo.png', x: layer.x, y: layer.y, sizePx: layer.sizePx, wrap: layer.wrap }],
      });
      const got = firstRectAttrs(svg);

      expect(got.x).toBeCloseTo(expected.x, 2);
      expect(got.y).toBeCloseTo(expected.y, 2);
      expect(got.w).toBeCloseTo(expected.w, 2);
      expect(got.h).toBeCloseTo(expected.h, 2);
    },
  );
});
