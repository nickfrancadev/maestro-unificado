import { TOKEN_FALLBACKS } from '../schema/blockTypes';

export interface AccountContext {
  name?: string; industry?: string; domain?: string; logo?: string; contactFirstName?: string;
}

const FIELD_MAP: Record<string, keyof AccountContext> = {
  'account.name': 'name',
  'account.industry': 'industry',
  'account.domain': 'domain',
  'account.logo': 'logo',
  'contact.firstName': 'contactFirstName',
};

const sanitize = (v: string) => v.replace(/[<>]/g, '');

export function resolveTokens(text: string, ctx: AccountContext | null): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token: string) => {
    const field = FIELD_MAP[token];
    if (field) {
      const val = ctx?.[field];
      if (val != null && val !== '') return sanitize(String(val));
      return TOKEN_FALLBACKS[token] ?? '';
    }
    return TOKEN_FALLBACKS[token] ?? '';
  });
}
