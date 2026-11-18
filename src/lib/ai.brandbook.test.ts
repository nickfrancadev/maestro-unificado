import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractBrandBook, AiRequestError } from './ai';

afterEach(() => vi.unstubAllGlobals());

function pdf(): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'manual.pdf', { type: 'application/pdf' });
}

describe('extractBrandBook — upload real do PDF e extração', () => {
  it('sobe o PDF ao Storage e pede a extração pelo caminho devolvido', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, url: 'https://s/x', path: 'uuid-manual.pdf', filename: 'manual.pdf' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ voice: 'V', brand_context: 'C', brand_colors: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const out = await extractBrandBook(pdf());
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/creative-upload$/);
    const uploadBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(uploadBody).toMatchObject({ filename: 'manual.pdf', content_type: 'application/pdf' });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/ai\/extract-brand-book$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ brandbook_path: 'uuid-manual.pdf', filename: 'manual.pdf' });
    expect(out.voice).toBe('V');
  });

  it('422 do servidor vira AiRequestError com a mensagem pronta para a tela', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, path: 'p' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Não conseguimos extrair a marca de manual.pdf.', missing: ['cores'] }), { status: 422 })));
    await expect(extractBrandBook(pdf())).rejects.toMatchObject({ status: 422, message: 'Não conseguimos extrair a marca de manual.pdf.' });
  });

  it('falha no envio não chama a extração', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Storage upload failed' }), { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(extractBrandBook(pdf())).rejects.toBeInstanceOf(AiRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
