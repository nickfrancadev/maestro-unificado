import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { linkedInTypeahead } from '@/lib/linkedin';
import { useLinkedInTypeahead } from './useLinkedInTypeahead';

vi.mock('@/lib/linkedin', () => ({
  linkedInTypeahead: vi.fn(),
}));

const mocked = vi.mocked(linkedInTypeahead);

beforeEach(() => {
  vi.useFakeTimers();
  mocked.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function search(q: string) {
  const hook = renderHook(() => useLinkedInTypeahead('companies'));
  act(() => hook.result.current.setQuery(q));
  // Passa o debounce de 300ms e deixa a promise da API resolver.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(350);
  });
  return hook;
}

describe('useLinkedInTypeahead', () => {
  it('começa em idle', () => {
    const { result } = renderHook(() => useLinkedInTypeahead('companies'));
    expect(result.current.status).toBe('idle');
  });

  it('marca "empty" e mantém o dropdown aberto quando a API não acha nada', async () => {
    mocked.mockResolvedValue([] as never);
    const { result } = await search('xyzabc');
    expect(result.current.status).toBe('empty');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.results).toEqual([]);
  });

  it('marca "error" quando a API falha', async () => {
    mocked.mockRejectedValue(new Error('offline'));
    const { result } = await search('itau');
    expect(result.current.status).toBe('error');
    expect(result.current.isOpen).toBe(true);
  });

  it('marca "results" quando há empresas', async () => {
    mocked.mockResolvedValue([{ urn: 'urn:li:organization:1', name: 'Itaú' }] as never);
    const { result } = await search('itau');
    expect(result.current.status).toBe('results');
    expect(result.current.results[0].label).toBe('Itaú');
  });
});
