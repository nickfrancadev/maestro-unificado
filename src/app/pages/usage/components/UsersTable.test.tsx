// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { UsersTable, type UserRow } from './UsersTable';
import type { User } from '../data/types';

afterEach(cleanup);

// jsdom não implementa ResizeObserver; o Popover.Arrow do Radix o exige.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function u(over: Partial<User> & Pick<User, 'id' | 'name'>): User {
  return {
    email: `${over.id}@acme.com`,
    profile: 'EDITOR',
    lastAccessAt: new Date('2026-07-10T12:00:00Z'),
    lastActivityAt: new Date('2026-07-09T12:00:00Z'),
    ...over,
  } as User;
}

const ROWS: UserRow[] = [
  { user: u({ id: 'a', name: 'Ana', profile: 'ADMIN' }), plays: 5, touchpoints: 20, share: 0.5 },
  { user: u({ id: 'b', name: 'Bruno' }), plays: 3, touchpoints: 12, share: 0.3 },
  {
    // caso extremo: nunca acessou E nunca teve atividade, share 0
    user: u({
      id: 'c',
      name: 'Carla',
      profile: 'VIEWER',
      lastAccessAt: null,
      lastActivityAt: null,
    }),
    plays: 0,
    touchpoints: 0,
    share: 0,
  },
];

describe('UsersTable', () => {
  it('renderiza com zero usuários (empresa vazia) sem quebrar', () => {
    render(<UsersTable rows={[]} />);
    expect(screen.getByText('Nenhum usuário nesta empresa.')).toBeTruthy();
    expect(screen.getAllByRole('columnheader').length).toBe(7);
  });

  it('renderiza linhas, nome + email, e a barra de share', () => {
    render(<UsersTable rows={ROWS} />);
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('a@acme.com')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy(); // share: 0
  });

  it('usuário que nunca acessou ganha rótulo textual (cor não é o único sinal)', () => {
    render(<UsersTable rows={ROWS} />);
    expect(screen.getByText('nunca acessou')).toBeTruthy();
    // lastAccessAt null e lastActivityAt null -> "Nunca" nas duas colunas
    expect(screen.getAllByText('Nunca').length).toBe(2);
  });

  it('cabeçalho "Último acesso" carrega o marcador de pendente de instrumentação, teclável', () => {
    render(<UsersTable rows={ROWS} />);
    const marker = screen.getByRole('button', { name: /Pendente de instrumentação/ });
    expect(marker.tagName).toBe('BUTTON'); // foco por teclado
    expect(marker.getAttribute('aria-label')).toMatch(/não registra login/);
    fireEvent.click(marker);
    expect(screen.getByText(/Última atividade" é a métrica derivável/)).toBeTruthy();
  });

  it('aria-sort correto e ordenação por clique no cabeçalho', () => {
    render(<UsersTable rows={ROWS} />);
    const headers = screen.getAllByRole('columnheader');
    const byLabel = (l: string) =>
      headers.find((h) => h.textContent?.toLowerCase().includes(l.toLowerCase()))!;

    // padrão: Plays desc
    expect(byLabel('Plays').getAttribute('aria-sort')).toBe('descending');
    expect(byLabel('Nome').getAttribute('aria-sort')).toBe('none');

    const first = () =>
      within(screen.getAllByRole('row')[1]).getAllByText(/Ana|Bruno|Carla/)[0].textContent;
    expect(first()).toBe('Ana'); // 5 plays

    // ordena por Nome (asc) — o controle é um botão real
    fireEvent.click(within(byLabel('Nome')).getByRole('button', { name: 'Ordenar por Nome' }));
    expect(byLabel('Nome').getAttribute('aria-sort')).toBe('ascending');
    expect(byLabel('Plays').getAttribute('aria-sort')).toBe('none');
    expect(first()).toBe('Ana');

    // segundo clique inverte
    fireEvent.click(within(byLabel('Nome')).getByRole('button', { name: 'Ordenar por Nome' }));
    expect(byLabel('Nome').getAttribute('aria-sort')).toBe('descending');
    expect(first()).toBe('Carla');
  });

  it('datas nulas ordenam sempre no fim, em ambas as direções', () => {
    render(<UsersTable rows={ROWS} />);
    const headers = screen.getAllByRole('columnheader');
    const acc = headers.find((h) => h.textContent?.includes('Último acesso'))!;
    const btn = within(acc).getByRole('button', { name: 'Ordenar por Último acesso' });

    const lastName = () => {
      const rows = screen.getAllByRole('row');
      return within(rows[rows.length - 1]).getAllByText(/Ana|Bruno|Carla/)[0].textContent;
    };

    fireEvent.click(btn); // desc
    expect(lastName()).toBe('Carla');
    fireEvent.click(btn); // asc
    expect(lastName()).toBe('Carla');
  });
});
