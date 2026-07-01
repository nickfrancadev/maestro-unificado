import type { Block } from '../schema/blockTypes';
import type { BrandKit } from '../../campaigns/wizard/brandKit';

export interface FormConfig {
  fields: { name: string; mapTo: string }[];
  postSubmit: { type: 'message' | 'redirect'; value: string };
}

export interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  templateOrigin: string | null;
  brandKit: BrandKit;
  seo: { title: string; description: string; ogImage: string | null; noIndex: boolean };
  blocks: Block[];
  accountOverrides: Record<string, Record<string, Partial<Block>>>;
  formConfig: FormConfig;
  links: { campaignIds: string[]; accountIds: string[] };
  createdAt: string;
  updatedAt: string;
}

export function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let counter = 0;
function id(): string { counter += 1; return `lp_${Date.now().toString(36)}_${counter}`; }

export function newLandingPage(partial: {
  name: string; templateOrigin?: string | null; blocks?: Block[]; brandKit: BrandKit;
}): LandingPage {
  const now = new Date().toISOString();
  return {
    id: id(),
    name: partial.name,
    slug: slugify(partial.name),
    status: 'draft',
    templateOrigin: partial.templateOrigin ?? 'blank',
    brandKit: partial.brandKit,
    seo: { title: partial.name, description: '', ogImage: null, noIndex: false },
    blocks: partial.blocks ?? [],
    accountOverrides: {},
    formConfig: { fields: [], postSubmit: { type: 'message', value: 'Obrigado!' } },
    links: { campaignIds: [], accountIds: [] },
    createdAt: now,
    updatedAt: now,
  };
}
