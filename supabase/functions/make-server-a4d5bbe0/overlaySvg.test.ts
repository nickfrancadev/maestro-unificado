import { describe, it, expect } from 'vitest';
import {
  buildOverlaySvg,
  estimateTextWidthPx,
  escapeXml,
  AD_FORMAT_SIZE,
} from './overlaySvg';

const BASE = 'data:image/png;base64,AAAA';

const svgFor = (over: Partial<Parameters<typeof buildOverlaySvg>[0]> = {}) =>
  buildOverlaySvg({
    format: 'banner',
    baseHref: BASE,
    fontFamily: 'Inter',
    texts: [],
    logos: [],
    ...over,
  });

describe('buildOverlaySvg — canvas', () => {
  it('usa 1200x628 no banner', () => {
    const svg = svgFor({ format: 'banner' });
    expect(svg).toContain('width="1200" height="628"');
    expect(svg).toContain('viewBox="0 0 1200 628"');
  });

  // A regressão que este teste tranca: CANVAS_W/H eram constantes e escolher
  // "Quadrado" devolvia um banner.
  it('usa 1200x1200 no quadrado', () => {
    const svg = svgFor({ format: 'square' });
    expect(svg).toContain('width="1200" height="1200"');
    expect(svg).toContain('viewBox="0 0 1200 1200"');
  });

  it('recorta a imagem-base em vez de esticá-la', () => {
    expect(svgFor()).toContain('preserveAspectRatio="xMidYMid slice"');
  });
});

describe('buildOverlaySvg — texto', () => {
  const texto = (over = {}) => ({
    text: 'WORKSHOP ABM', x: 0.5, y: 0.5, sizePx: 50,
    color: '#FFFFFF', backdrop: 'box' as const, weight: 700, ...over,
  });

  it('ancora o texto pelo centro', () => {
    const svg = svgFor({ texts: [texto()] });
    expect(svg).toContain('text-anchor="middle"');
    expect(svg).toContain('x="600"');
  });

  it('usa a largura medida pelo cliente quando ela vem', () => {
    const svg = svgFor({ texts: [texto({ widthPx: 300 })] });
    // 300 + 22*2 de padding = 344, centrado em 600 → x = 428.
    expect(svg).toContain('width="344"');
    expect(svg).toContain('x="428"');
  });

  // Chamadas antigas (e qualquer caminho que não meça) não podem quebrar.
  it('cai no estimador quando a largura não vem', () => {
    const svg = svgFor({ texts: [texto({ widthPx: undefined })] });
    const esperado = estimateTextWidthPx('WORKSHOP ABM', 50) + 44;
    expect(svg).toContain(`width="${esperado}"`);
  });

  it('backdrop "box" desenha o retângulo e não a sombra', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'box' })] });
    expect(svg).toContain('rgba(0,0,0,0.55)');
    expect(svg).not.toContain('filter="url(#textShadow)"');
  });

  it('backdrop "shadow" aplica o filtro e não desenha retângulo', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'shadow' })] });
    expect(svg).toContain('filter="url(#textShadow)"');
    expect(svg).not.toContain('rgba(0,0,0,0.55)');
  });

  it('backdrop "none" não desenha nem retângulo nem sombra', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'none' })] });
    expect(svg).not.toContain('rgba(0,0,0,0.55)');
    expect(svg).not.toContain('filter="url(#textShadow)"');
  });

  it('respeita a cor escolhida', () => {
    expect(svgFor({ texts: [texto({ color: '#FF5F39' })] })).toContain('fill="#FF5F39"');
  });

  it('ignora texto vazio', () => {
    expect(svgFor({ texts: [texto({ text: '' })] })).not.toContain('<text');
  });

  it('escapa XML no conteúdo do texto', () => {
    const svg = svgFor({ texts: [texto({ text: 'Fast & <Loose>' })] });
    expect(svg).toContain('Fast &amp; &lt;Loose&gt;');
  });
});

describe('buildOverlaySvg — logos', () => {
  const logo = (over = {}) => ({
    href: 'data:image/png;base64,BBBB', x: 0.5, y: 0.5,
    sizePx: 200, wrap: 'square' as const, ...over,
  });

  it('wrap "square" desenha cartão arredondado', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'square' })] });
    expect(svg).toContain('<rect');
    expect(svg).toContain('rx="14"');
  });

  it('wrap "circle" desenha círculo com o raio igual a metade do sizePx', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'circle' })] });
    expect(svg).toContain('<circle');
    expect(svg).toContain('r="100"');
  });

  it('wrap "rect" achata o cartão em 2.5:1', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'rect', sizePx: 250 })] });
    expect(svg).toContain('width="250"');
    expect(svg).toContain('height="100"');
  });

  it('wrap "none" não desenha cartão nenhum', () => {
    const svg = svgFor({ logos: [logo({ wrap: 'none' })] });
    expect(svg).not.toContain('<rect');
    expect(svg).not.toContain('<circle');
    expect(svg).toContain('<image');
  });

  // Os dois logos são o mesmo tipo de objeto — o servidor não sabe qual é qual.
  it('desenha os dois logos quando vêm dois', () => {
    const svg = svgFor({ logos: [logo({ href: 'A' }), logo({ href: 'B', x: 0.8 })] });
    expect(svg).toContain('href="A"');
    expect(svg).toContain('href="B"');
  });

  it('encaixa o logo dentro do cartão sem distorcer', () => {
    expect(svgFor({ logos: [logo()] })).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  // URL assinada do Supabase Storage tem query com "&" — isto é o caso comum,
  // não o extremo. Sem escapar, o "&" cru quebra o XML do SVG.
  it('escapa "&" no href do logo (URL assinada com query string)', () => {
    const href = 'https://x.test/logo.png?token=abc&Expires=123&Signature=xyz';
    const svg = svgFor({ logos: [logo({ href })] });
    expect(svg).toContain('href="https://x.test/logo.png?token=abc&amp;Expires=123&amp;Signature=xyz"');
    expect(svg).not.toContain('token=abc&Expires');
  });

  // Um "\"" cru no href fecha o atributo mais cedo e deixa o resto da string
  // ser interpretado como markup novo — isto é injeção de elemento, não só
  // XML malformado.
  it('escapa aspas no href do logo — não deixa injetar elemento novo', () => {
    const href = 'x.png"/><rect id="pwned" width="9999" height="9999" fill="red"/><image href="x.png';
    const svg = svgFor({ logos: [logo({ href })] });
    expect(svg).not.toContain('<rect id="pwned"');
    expect(svg).toContain('&quot;');
  });
});

describe('buildOverlaySvg — href da imagem-base', () => {
  // Mesma classe de bug do href dos logos, só que na imagem de fundo: URL
  // assinada com "&" na query quebra o XML se o href não for escapado.
  it('escapa "&" no baseHref (URL assinada com query string)', () => {
    const baseHref = 'https://x.test/base.png?token=abc&Expires=123&Signature=xyz';
    const svg = svgFor({ baseHref });
    expect(svg).toContain('href="https://x.test/base.png?token=abc&amp;Expires=123&amp;Signature=xyz"');
    expect(svg).not.toContain('token=abc&Expires');
  });

  it('escapa aspas no baseHref — não deixa injetar elemento novo', () => {
    const baseHref = 'x.png"/><rect id="pwned" width="9999" height="9999" fill="red"/><image href="x.png';
    const svg = svgFor({ baseHref });
    expect(svg).not.toContain('<rect id="pwned"');
    expect(svg).toContain('&quot;');
  });
});

describe('escapeXml', () => {
  it('escapa os cinco caracteres perigosos', () => {
    expect(escapeXml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
  });
});

describe('AD_FORMAT_SIZE', () => {
  it('bate com o formato anunciado na UI', () => {
    expect(AD_FORMAT_SIZE).toEqual({
      square: { w: 1200, h: 1200 },
      banner: { w: 1200, h: 628 },
    });
  });
});
