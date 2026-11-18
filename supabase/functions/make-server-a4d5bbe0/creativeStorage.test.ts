import { describe, it, expect } from 'vitest';
import { storagePathFromUrl, isSafeStoragePath, CREATIVE_BUCKET } from './creativeStorage';

const SIGNED = `https://abc.supabase.co/storage/v1/object/sign/${CREATIVE_BUCKET}/composed/9f1c-nubank.png?token=eyJhbGciOi.vencido`;

describe('storagePathFromUrl — a imagem é o caminho, não a URL que vence', () => {
  it('tira o caminho de uma URL assinada, mesmo vencida', () => {
    expect(storagePathFromUrl(SIGNED)).toBe('composed/9f1c-nubank.png');
  });

  it('decodifica o caminho', () => {
    expect(storagePathFromUrl(`https://x.supabase.co/storage/v1/object/sign/${CREATIVE_BUCKET}/a%20b.png?token=t`)).toBe('a b.png');
  });

  it('URL de fora do bucket (blob:, site externo, outro bucket) não tem caminho', () => {
    expect(storagePathFromUrl('blob:http://localhost/123')).toBeNull();
    expect(storagePathFromUrl('https://cdn/template.png')).toBeNull();
    expect(storagePathFromUrl('https://x.supabase.co/storage/v1/object/sign/outro/a.png?token=t')).toBeNull();
    expect(storagePathFromUrl(null)).toBeNull();
  });
});

describe('isSafeStoragePath — o servidor só assina caminho relativo do bucket', () => {
  it('aceita caminho relativo', () => {
    expect(isSafeStoragePath('composed/a.png')).toBe(true);
  });
  it('recusa subir de pasta, caminho absoluto e não-string', () => {
    expect(isSafeStoragePath('../segredo')).toBe(false);
    expect(isSafeStoragePath('/etc/passwd')).toBe(false);
    expect(isSafeStoragePath(42)).toBe(false);
    expect(isSafeStoragePath('')).toBe(false);
  });
});
