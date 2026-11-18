import { describe, it, expect } from 'vitest';
import { checkRateLimit, rateLimitMessage, rateLimitKey, rateLimitConfigFrom, DEFAULT_AI_RATE_LIMIT } from './aiRateLimit';

const MIN = 60 * 1000;
const now = Date.UTC(2026, 10, 18, 17, 0, 0); // 14:00 em São Paulo

describe('limite de uso da IA por empresa e usuário (F085)', () => {
  it('libera até 30 chamadas em 15 minutos', () => {
    let ts: number[] = [];
    for (let i = 0; i < 30; i++) {
      const d = checkRateLimit(ts, now + i * 1000);
      expect(d.allowed).toBe(true);
      ts = d.timestamps;
    }
    expect(checkRateLimit(ts, now + 31 * 1000).allowed).toBe(false);
  });

  it('a 31ª recusa e diz em quanto tempo libera (quando a mais antiga sai da janela)', () => {
    const ts = Array.from({ length: 30 }, (_, i) => now - 8 * MIN + i * 1000);
    const d = checkRateLimit(ts, now);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterSeconds).toBe(7 * 60);
  });

  it('chamadas fora da janela não contam', () => {
    const old = Array.from({ length: 30 }, () => now - 16 * MIN);
    const d = checkRateLimit(old, now);
    expect(d.allowed).toBe(true);
    expect(d.timestamps).toEqual([now]);
    expect(d.remaining).toBe(29);
  });

  it('a mensagem é em português e diz quando tentar de novo', () => {
    expect(rateLimitMessage(7 * 60, now)).toBe('Você usou a IA 30 vezes em 15 minutos, o limite da sua empresa. Tente de novo em 7 minutos, às 14:07.');
    expect(rateLimitMessage(20, now)).toMatch(/em 1 minuto,/);
  });

  it('conta por empresa e usuário; cabeçalho ausente vira balde comum', () => {
    expect(rateLimitKey('acme', 'u-1')).toBe('ai_rate:acme:u-1');
    expect(rateLimitKey(null, undefined)).toBe('ai_rate:anon:anon');
    expect(rateLimitKey('a:b', 'x y')).toBe('ai_rate:ab:xy');
  });

  it('limite configurável por ambiente', () => {
    expect(rateLimitConfigFrom({ max: '5', windowMin: '1' })).toEqual({ max: 5, windowMs: MIN });
    expect(rateLimitConfigFrom({})).toEqual(DEFAULT_AI_RATE_LIMIT);
  });
});
