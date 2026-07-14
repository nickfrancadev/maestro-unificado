import { describe, it, expect } from 'vitest';
import { resolveTokens } from './resolveTokens';

describe('resolveTokens', () => {
  it('substitutes real account values', () => {
    expect(resolveTokens('Olá {{account.name}}', { name: 'Acme' })).toBe('Olá Acme');
  });
  it('falls back when ctx is null', () => {
    expect(resolveTokens('Olá {{account.name}}', null)).toBe('Olá sua empresa');
  });
  it('falls back when field missing', () => {
    expect(resolveTokens('{{account.industry}}', { name: 'Acme' })).toBe('seu setor');
  });
  it('never emits raw token', () => {
    expect(resolveTokens('{{account.name}}', null)).not.toContain('{{');
  });
  it('strips angle brackets from injected values (no HTML injection)', () => {
    expect(resolveTokens('{{account.name}}', { name: '<script>x' })).toBe('scriptx');
  });
  it('unknown token → empty string', () => {
    expect(resolveTokens('a{{account.zzz}}b', { name: 'Acme' })).toBe('ab');
  });
});
