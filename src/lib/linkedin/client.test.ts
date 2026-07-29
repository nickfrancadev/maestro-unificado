import { describe, it, expect } from 'vitest';
import { buildLinkedInRedirectUri } from './client';

describe('buildLinkedInRedirectUri', () => {
  // O caso que quebrava: no GitHub Pages o app mora em /maestro-unificado/.
  // Sem o prefixo, o LinkedIn devolve o usuário para a raiz do github.io,
  // que serve o 404 do GitHub e não o app — o code nunca é trocado.
  it('inclui o subdiretório quando o app não está na raiz', () => {
    expect(
      buildLinkedInRedirectUri('https://nickfrancadev.github.io', '/maestro-unificado/'),
    ).toBe('https://nickfrancadev.github.io/maestro-unificado/auth/linkedin/callback');
  });

  it('não duplica barra quando servido da raiz', () => {
    expect(buildLinkedInRedirectUri('http://localhost:5173', '/')).toBe(
      'http://localhost:5173/auth/linkedin/callback',
    );
  });

  it('funciona em domínio próprio na raiz', () => {
    expect(buildLinkedInRedirectUri('https://app.exemplo.com', '/')).toBe(
      'https://app.exemplo.com/auth/linkedin/callback',
    );
  });

  it('tolera base sem barra final', () => {
    expect(buildLinkedInRedirectUri('https://exemplo.com', '/sub')).toBe(
      'https://exemplo.com/sub/auth/linkedin/callback',
    );
  });

  it('trata base vazia como raiz', () => {
    expect(buildLinkedInRedirectUri('https://exemplo.com', '')).toBe(
      'https://exemplo.com/auth/linkedin/callback',
    );
  });
});
