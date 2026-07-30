import { describe, it, expect, vi, afterEach } from 'vitest';
import { logoDevUrl } from './logo';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('logoDevUrl', () => {
  it('monta a URL do logo.dev com o token configurado', () => {
    vi.stubEnv('VITE_LOGO_DEV_KEY', 'pk_teste');
    expect(logoDevUrl('nubank.com.br')).toBe('https://img.logo.dev/nubank.com.br?token=pk_teste');
  });

  // Sem chave o código antigo montava `?token=undefined`: uma requisição
  // garantidamente recusada por item da lista, e a imagem quebrada aparecia
  // no lugar do avatar de letra. Não montar URL é o comportamento honesto.
  it('não monta URL quando a chave não está no build', () => {
    vi.stubEnv('VITE_LOGO_DEV_KEY', '');
    expect(logoDevUrl('nubank.com.br')).toBeUndefined();
  });

  it('não monta URL sem domínio', () => {
    vi.stubEnv('VITE_LOGO_DEV_KEY', 'pk_teste');
    expect(logoDevUrl('')).toBeUndefined();
  });

  // O fallback por nome gera coisas como "hyperplane(acquiredbynubank).com";
  // escapar mantém a URL válida em vez de quebrar a requisição.
  it('escapa caracteres que invalidariam a URL', () => {
    vi.stubEnv('VITE_LOGO_DEV_KEY', 'pk_teste');
    expect(logoDevUrl('hyperplane(acquired).com')).toBe(
      'https://img.logo.dev/hyperplane(acquired).com?token=pk_teste'.replace(
        'hyperplane(acquired).com',
        encodeURIComponent('hyperplane(acquired).com'),
      ),
    );
  });
});
