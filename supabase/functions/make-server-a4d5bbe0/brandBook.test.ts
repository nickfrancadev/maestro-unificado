import { describe, it, expect, vi } from 'vitest';
import { extractBrandFromBrandBook, geminiPdfRequestBody, BRAND_BOOK_MAX_BYTES } from './brandBook';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]); // "%PDF-1.7\n"

const good = {
  voice: 'Técnico e didático, fala com quem conhece ABM.',
  voice_examples: ['ABM sem planilha.'],
  brand_context: 'SaaS de ABM para B2B.',
  brand_colors: { primary: '#ff5f39', secondary: '#0F172A', accent: '' },
};

function deps(over: Partial<Parameters<typeof extractBrandFromBrandBook>[0]> = {}) {
  return {
    download: vi.fn(async () => PDF),
    generate: vi.fn(async () => good as unknown),
    ...over,
  };
}

describe('/ai/extract-brand-book', () => {
  it('lê o PDF do Storage pelo caminho, manda ao modelo e devolve no formato da extração pelo site', async () => {
    const d = deps();
    const r = await extractBrandFromBrandBook(d, { brandbook_path: 'abc-manual.pdf', filename: 'manual.pdf' });
    expect(d.download).toHaveBeenCalledWith('abc-manual.pdf');
    expect(d.generate.mock.calls[0][0].pdfBase64).toBe(btoa(String.fromCharCode(...PDF)));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      voice: good.voice,
      brand_context: good.brand_context,
      brand_colors: { primary: '#FF5F39', secondary: '#0F172A', accent: '' },
      color_candidates: [],
    });
  });

  it('sem caminho: 400', async () => {
    expect((await extractBrandFromBrandBook(deps(), {})).status).toBe(400);
  });

  it('arquivo não encontrado: 404 dizendo para enviar de novo', async () => {
    const r = await extractBrandFromBrandBook(deps({ download: vi.fn(async () => null) }), { brandbook_path: 'x', filename: 'manual.pdf' });
    expect(r).toEqual({ status: 404, body: { error: 'Não encontramos manual.pdf no armazenamento. Envie o PDF de novo.' } });
  });

  it('arquivo que não é PDF: 422, sem chamar o modelo', async () => {
    const d = deps({ download: vi.fn(async () => new Uint8Array([1, 2, 3, 4, 5])) });
    const r = await extractBrandFromBrandBook(d, { brandbook_path: 'x', filename: 'foto.png' });
    expect(r.status).toBe(422);
    expect(d.generate).not.toHaveBeenCalled();
  });

  it('PDF acima do teto: 422', async () => {
    const big = new Uint8Array(BRAND_BOOK_MAX_BYTES + 1);
    big.set(PDF);
    const r = await extractBrandFromBrandBook(deps({ download: vi.fn(async () => big) }), { brandbook_path: 'x' });
    expect(r.status).toBe(422);
  });

  it('modelo sem voz nem contexto: 422 com o que preencher, como na extração pelo site', async () => {
    const r = await extractBrandFromBrandBook(
      deps({ generate: vi.fn(async () => ({ voice: 'Se preferir, posso ajudar.', brand_context: '', brand_colors: {} })) }),
      { brandbook_path: 'x', filename: 'manual.pdf' },
    );
    expect(r.status).toBe(422);
    expect(r.body.error).toBe('Não conseguimos extrair a marca de manual.pdf. Preencha manualmente o tom de voz, o contexto e as cores.');
    expect(r.body.missing).toEqual(['tom de voz', 'contexto da marca', 'cores']);
  });

  it('o pedido ao Gemini anexa o PDF como documento', () => {
    const body = geminiPdfRequestBody({ systemInstruction: 's', pdfBase64: 'QUJD', responseSchema: {} });
    expect(body.contents[0].parts[0]).toEqual({ inline_data: { mime_type: 'application/pdf', data: 'QUJD' } });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });
});
