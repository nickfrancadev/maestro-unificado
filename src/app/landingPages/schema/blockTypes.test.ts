import { describe, it, expect } from 'vitest';
import { TOKEN_FALLBACKS } from './blockTypes';

describe('TOKEN_FALLBACKS', () => {
  it('has a non-token fallback for account.name', () => {
    expect(TOKEN_FALLBACKS['account.name']).toBe('sua empresa');
  });
  it('covers all account.* tokens used by blocks', () => {
    for (const k of ['account.name', 'account.industry', 'account.domain', 'contact.firstName']) {
      expect(typeof TOKEN_FALLBACKS[k]).toBe('string');
    }
  });
});
