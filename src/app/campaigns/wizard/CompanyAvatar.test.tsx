import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CompanyAvatar, resolveCompanyLogoUrl } from './CompanyAvatar';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe('resolveCompanyLogoUrl', () => {
  it('prefere o logoUrl já hidratado pela Segmentação', () => {
    expect(resolveCompanyLogoUrl({ id: 'c1', label: 'Nubank', logoUrl: 'https://cdn/nu.png' }))
      .toBe('https://cdn/nu.png');
  });

  it('descarta URL com token vazio e cai no proxy pelo domínio', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', 'proj');
    const url = resolveCompanyLogoUrl({
      id: 'c1', label: 'Nubank', domain: 'nubank.com.br',
      logoUrl: 'https://img.logo.dev/nubank.com.br?token=undefined',
    });
    expect(url).toContain('/logo-proxy?domain=nubank.com.br');
  });

  it('sem domínio confirmado, não chuta pelo nome (Inter → inter.com é a Intercom)', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', 'proj');
    expect(resolveCompanyLogoUrl({ id: 'c1', label: 'Inter' })).toBeNull();
  });

  it('devolve null quando não há nada resolvível', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', '');
    vi.stubEnv('VITE_LOGO_DEV_KEY', '');
    expect(resolveCompanyLogoUrl({ id: 'c1', label: '' })).toBeNull();
  });
});

describe('CompanyAvatar', () => {
  // `alt=""` é deliberado (o nome da empresa fica ao lado, em texto), então o
  // <img> é decorativo e não expõe role="img" — daí a busca pela tag.
  const img = (c: HTMLElement) => c.querySelector('img');

  it('renderiza a imagem quando há logo resolvível', () => {
    const { container } = render(
      <CompanyAvatar company={{ id: 'c1', label: 'Nubank', logoUrl: 'https://cdn/nu.png' }} />,
    );
    expect(img(container)).toHaveAttribute('src', 'https://cdn/nu.png');
  });

  // A regressão: o `onError` antigo escondia o <img> com display:none e não
  // havia fallback nenhum — a empresa ficava sem avatar e o nome encostava
  // na borda da sidebar. Envs vazios deixam o logoUrl como único candidato.
  it('cai no avatar de letra quando a imagem falha, em vez de sumir', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', '');
    vi.stubEnv('VITE_LOGO_DEV_KEY', '');
    const { container } = render(
      <CompanyAvatar company={{ id: 'c1', label: 'Nubank', logoUrl: 'https://cdn/quebrado.png' }} />,
    );
    fireEvent.error(img(container)!);
    expect(img(container)).toBeNull();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('mostra o avatar de letra direto quando não há logo resolvível', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', '');
    vi.stubEnv('VITE_LOGO_DEV_KEY', '');
    const { container } = render(<CompanyAvatar company={{ id: 'c1', label: 'Nubank' }} />);
    expect(img(container)).toBeNull();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  // O proxy pode estar quebrado (500) com o logo.dev direto funcionando —
  // exatamente o cenário da Clearbit morta. Um erro não pode encerrar a
  // busca: cada candidato da cadeia merece sua tentativa.
  it('avança para o próximo candidato quando um falha, antes de cair na letra', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', 'proj');
    vi.stubEnv('VITE_LOGO_DEV_KEY', 'pk_test');
    const { container } = render(
      <CompanyAvatar company={{ id: 'c1', label: 'Nubank', domain: 'nubank.com.br' }} />,
    );
    // 1º candidato: proxy pelo domain real
    expect(img(container)!.src).toContain('/logo-proxy?domain=nubank.com.br');
    fireEvent.error(img(container)!);
    // 2º: logo.dev direto com a chave do cliente
    expect(img(container)!.src).toContain('img.logo.dev/nubank.com.br');
    fireEvent.error(img(container)!);
    // Esgotou: letra
    expect(img(container)).toBeNull();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('não repete candidato duplicado (proxy e logo.dev do mesmo domínio)', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', 'proj');
    vi.stubEnv('VITE_LOGO_DEV_KEY', '');
    const { container } = render(
      <CompanyAvatar company={{ id: 'c1', label: 'Nubank', domain: 'nubank.com' }} />,
    );
    // Sem chave do cliente só sobra o proxy: uma tentativa e depois a letra.
    expect(img(container)!.src).toContain('/logo-proxy?domain=nubank.com');
    fireEvent.error(img(container)!);
    expect(img(container)).toBeNull();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('tenta de novo quando a empresa (e portanto a URL) muda', () => {
    vi.stubEnv('VITE_SUPABASE_PROJECT_ID', '');
    vi.stubEnv('VITE_LOGO_DEV_KEY', '');
    const { container, rerender } = render(
      <CompanyAvatar company={{ id: 'c1', label: 'Nubank', logoUrl: 'https://cdn/quebrado.png' }} />,
    );
    fireEvent.error(img(container)!);
    expect(img(container)).toBeNull();

    rerender(<CompanyAvatar company={{ id: 'c2', label: 'Itaú', logoUrl: 'https://cdn/itau.png' }} />);
    expect(img(container)).toHaveAttribute('src', 'https://cdn/itau.png');
  });
});
