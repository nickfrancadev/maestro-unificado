export type BlockType =
  | 'navbar' | 'hero' | 'logos' | 'features' | 'richtext' | 'media'
  | 'testimonial' | 'stats' | 'cta' | 'form' | 'faq' | 'footer'
  | 'spacer' | 'embed';

export interface ShowIf { field: string; op: '==' | '!='; value: string; }

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  showIf?: ShowIf;
}

export const TOKEN_FALLBACKS: Record<string, string> = {
  'account.name': 'sua empresa',
  'account.industry': 'seu setor',
  'account.domain': 'seusite.com',
  'account.logo': '',
  'contact.firstName': 'você',
};
