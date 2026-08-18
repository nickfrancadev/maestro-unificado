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
    expect(svg).not.toContain('filter="url(#ovl-textShadow)"');
  });

  it('backdrop "shadow" aplica o filtro e não desenha retângulo', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'shadow' })] });
    expect(svg).toContain('filter="url(#ovl-textShadow)"');
    expect(svg).not.toContain('rgba(0,0,0,0.55)');
  });

  it('backdrop "none" não desenha nem retângulo nem sombra', () => {
    const svg = svgFor({ texts: [texto({ backdrop: 'none' })] });
    expect(svg).not.toContain('rgba(0,0,0,0.55)');
    expect(svg).not.toContain('filter="url(#ovl-textShadow)"');
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

describe('buildOverlaySvg — logo SVG vira <svg> aninhado', () => {
  // Mesmo SVG em dois encodings, para provar que a detecção funciona nos dois
  // e que o resultado final é idêntico — só a transmissão muda, não a saída.
  const SVG_COM_VIEWBOX =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><rect x="5" y="5" width="10" height="10" fill="#FF5F39"/></svg>';

  const logo = (href: string, over = {}) => ({
    href, x: 0.5, y: 0.5, sizePx: 200, wrap: 'square' as const, ...over,
  });

  it('SVG data-URI URL-encoded vira <svg> aninhado e não deixa <image> para aquele logo', () => {
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_COM_VIEWBOX)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).not.toContain('href="data:image/svg+xml');
    // Só a imagem-base deve continuar usando <image>.
    expect((svg.match(/<image /g) || []).length).toBe(1);
    expect(svg).toContain('viewBox="0 0 50 50"');
  });

  it('SVG data-URI base64 produz o mesmo <svg> aninhado que o URL-encoded', () => {
    const hrefEncoded = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_COM_VIEWBOX)}`;
    const hrefBase64 = `data:image/svg+xml;base64,${btoa(SVG_COM_VIEWBOX)}`;
    const svgEncoded = svgFor({ logos: [logo(hrefEncoded)] });
    const svgBase64 = svgFor({ logos: [logo(hrefBase64)] });
    expect(svgBase64).not.toContain('href="data:image/svg+xml');
    expect(svgBase64).toContain('viewBox="0 0 50 50"');
    expect(svgBase64).toBe(svgEncoded);
  });

  it('preserva o viewBox próprio do SVG interno em vez de sobrescrevê-lo', () => {
    // Tem viewBox E width/height — se a derivação vencesse por engano, o
    // teste pegaria (o viewBox derivado seria "0 0 80 80", não "0 0 24 24").
    const inner = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80">' +
      '<path d="M0 0h24v24H0z" fill="#111"/></svg>';
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).not.toContain('viewBox="0 0 80 80"');
  });

  it('sem viewBox, deriva de width/height do SVG interno', () => {
    // O fixture do mock do Brand Kit: sem viewBox, com width/height.
    const href =
      'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%2240%22%3E%3Crect%20x%3D%226%22%20y%3D%2212%22%20width%3D%2216%22%20height%3D%2216%22%20rx%3D%223%22%20fill%3D%22%23FF5F39%22%2F%3E%3C%2Fsvg%3E';
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('viewBox="0 0 120 40"');
  });

  it('sem viewBox e sem width/height, cai no quadrado 0 0 100 100', () => {
    const inner = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('viewBox="0 0 100 100"');
  });

  it('não reemite width/height internos do SVG — o wrapper é quem manda no tamanho', () => {
    const inner = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="10" height="10"/></svg>';
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    // O <svg> aninhado não pode carregar seu próprio width="120"/height="40"
    // fixos — isso faria o logo ignorar o sizePx escolhido no editor.
    expect(svg).not.toMatch(/<svg[^>]*width="120"/);
    expect(svg).not.toMatch(/<svg[^>]*height="40"/);
  });

  // Não-regressão: PNG continua indo por <image>, comportamento inalterado.
  it('PNG data-URI continua usando <image>, não é afetado pela detecção de SVG', () => {
    const svg = svgFor({ logos: [logo('data:image/png;base64,BBBB')] });
    expect(svg).toContain('<image');
    expect(svg).toContain('href="data:image/png;base64,BBBB"');
  });

  // Não-regressão do fix de escaping: URL absoluta com "&" continua <image> e
  // continua escapada.
  it('URL absoluta com "&" continua usando <image> e continua escapada', () => {
    const href = 'https://x.test/logo.png?token=abc&Expires=123';
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('<image');
    expect(svg).toContain('href="https://x.test/logo.png?token=abc&amp;Expires=123"');
  });
});

// Fix round 1: a revisão achou que o parser por regex do bloco acima não
// aguentava origem NÃO CONFIÁVEL de verdade — export real de ferramenta de
// design, aspas simples, e um valor de atributo malicioso que explora o
// `$&` do `String.replace`. A resposta não é "validar SVG por regex melhor"
// — é degradar com segurança: quando o parser barato não reconhece o
// formato, cai no <image href="${escapeXml(...)}"> de sempre em vez de
// arriscar um <svg> aninhado malformado (que derruba a composição inteira
// no resvg, exatamente o que a task 3 original queria evitar).
describe('buildOverlaySvg — logo SVG aninhado: robustez contra origem não confiável (fix round 1)', () => {
  const logo = (href: string, over = {}) => ({
    href, x: 0.5, y: 0.5, sizePx: 200, wrap: 'square' as const, ...over,
  });

  // Export padrão do Illustrator/Inkscape: <?xml?> + comentário + <!DOCTYPE>
  // antes do <svg> de verdade. DOCTYPE só é legal no prólogo do documento —
  // sobrevivendo dentro do conteúdo do wrapper, invalida o XML inteiro (é
  // assim que o roxmltree do resvg aborta e devolve 500 na composição).
  it('remove <?xml?>, comentário de prólogo e <!DOCTYPE> — aninha em vez de quebrar', () => {
    const inner = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 24.0.0, SVG Export Plug-In -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="10" height="10"/></svg>`;
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).not.toContain('DOCTYPE');
    expect(svg).not.toContain('<?xml version="1.0" encoding="utf-8"');
    expect(svg).toContain('viewBox="0 0 100 50"');
    expect((svg.match(/<image /g) || []).length).toBe(1); // só a imagem-base
  });

  it('aceita atributos em aspas simples: deriva o viewBox e remove width/height internos', () => {
    const inner = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40'><rect width='10' height='10'/></svg>";
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('viewBox="0 0 120 40"');
    // Nem em aspas duplas nem em simples o <svg> aninhado pode carregar seu
    // próprio width/height fixo — isso faria o logo ignorar o sizePx do editor.
    expect(svg).not.toMatch(/<svg[^>]*width=['"]120['"]/);
    expect(svg).not.toMatch(/<svg[^>]*height=['"]40['"]/);
  });

  it('viewBox em aspas simples é preservado, não sobrescrito pelo default', () => {
    const inner = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M0 0h24v24H0z'/></svg>";
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).not.toContain('viewBox="0 0 100 100"');
  });

  // `String.prototype.replace(str, replacementStr)` trata "$&" no segundo
  // argumento como token especial ("reinsira o trecho casado") mesmo quando
  // o primeiro argumento é uma string comum, não uma regex. Sem o fix, isso
  // reinjeta a tag <svg> inteira dentro do próprio atributo.
  it('"$&" num atributo da tag raiz não duplica a tag inteira dentro do documento', () => {
    const inner = '<svg xmlns="http://www.w3.org/2000/svg" id="a$&b" width="50" height="50"><rect width="10" height="10"/></svg>';
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    const occurrences = (svg.match(/<svg\b/gi) || []).length;
    // wrapper raiz (1) + no máximo o <svg> aninhado (1) — nunca mais que isso.
    expect(occurrences).toBeLessThanOrEqual(2);
  });

  it('markup que não é SVG de verdade (ex.: página de erro HTML) cai em <image> escapado', () => {
    const inner = '<html><body>404 Not Found</body></html>';
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('<image');
    expect(svg).toContain(`href="${href}"`);
  });

  it('"&" cru dentro do SVG (não é entidade conhecida) cai em <image> em vez de invalidar o XML', () => {
    const inner = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><title>Fast & Loose</title></svg>';
    const href = `data:image/svg+xml;utf8,${encodeURIComponent(inner)}`;
    const svg = svgFor({ logos: [logo(href)] });
    expect(svg).toContain('<image');
    expect(svg).toContain(`href="${escapeXml(href)}"`);
  });

  // Colisão real verificada pelo revisor: um logo que define seu próprio
  // <filter id="cardShadow"> sobrescreveria o filtro do wrapper (ids são
  // globais no documento SVG) e mudaria a sombra de TODOS os cards, não só
  // do logo que trouxe o filtro.
  it('renomeia os ids dos filtros do wrapper para não colidir com filtros definidos pelo SVG do logo', () => {
    const svg = svgFor();
    expect(svg).toContain('id="ovl-cardShadow"');
    expect(svg).toContain('id="ovl-textShadow"');
    expect(svg).not.toContain('id="cardShadow"');
    expect(svg).not.toContain('id="textShadow"');
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
