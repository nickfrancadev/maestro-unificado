// Gemini-powered creative AI helpers. All requests proxy through the
// Supabase Edge Function so GEMINI_API_KEY stays server-side.

import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0`;
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
});

export interface BrandBrief {
  industry: string;
  value_proposition: string;
  visual_style_keywords: string[];
  primary_colors: string[];
  key_messaging_themes: string[];
  target_persona_hint: string;
  scrape_status?: 'ok' | 'limited';
  source_url?: string | null;
  og_image?: string | null;
  generated_at: string;
}

export interface ClientVoice {
  voice: string;
  brand_context: string;
  website_url: string;
  product_service: string;
  audience_market: string;
  persona: string;
  brand_colors: { primary: string; secondary: string; accent: string };
  updated_at: string | null;
}

export async function fetchBrandBrief(input: {
  company_url?: string;
  company_domain?: string;
  company_name?: string;
  force_refresh?: boolean;
}): Promise<BrandBrief> {
  const res = await fetch(`${SERVER_BASE}/ai/brand-brief`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function generateCopy(input: {
  brand_brief: BrandBrief | Partial<BrandBrief>;
  client_voice: string;
  client_brand_colors?: { primary: string; secondary: string; accent: string };
  target_company_name: string;
  objective?: string;
  cta?: string;
}): Promise<{ headline: string; bodyText: string }> {
  const res = await fetch(`${SERVER_BASE}/ai/generate-copy`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Generate a single reusable base image for the campaign. The same canvas
// is reused across every target company; per-company personalisation is
// applied later via composeLogoOverlay.
export async function generateBaseImage(input: {
  mode: 'photo_ai' | 'graphic_ai';
  client_brand_context?: string;
  prompt_brief?: string;
}): Promise<{ success: boolean; url: string; filename: string; mode: 'photo_ai' | 'graphic_ai' }> {
  const res = await fetch(`${SERVER_BASE}/ai/generate-base-image`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Ask the IA composer to paint two text lines + the target company's logo
// on top of a base image. Layout decisions are made by the model.
export async function composeLogoOverlay(input: {
  base_image_url: string;
  target_company_name: string;
  target_company_domain?: string | null;
  show_target_logo: boolean;
  texto_destaque?: string;
  texto_complementar?: string;
  font_family?: string;
}): Promise<{ success: boolean; url: string; filename: string; logo_applied: boolean }> {
  const res = await fetch(`${SERVER_BASE}/ai/compose-logo-overlay`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchClientVoice(): Promise<ClientVoice> {
  const res = await fetch(`${SERVER_BASE}/ai/client-voice`, {
    headers: headers(),
  });
  if (!res.ok) {
    return {
      voice: '',
      brand_context: '',
      website_url: '',
      product_service: '',
      audience_market: '',
      persona: '',
      brand_colors: { primary: '', secondary: '', accent: '' },
      updated_at: null,
    };
  }
  return res.json();
}

export async function saveClientVoice(input: {
  voice: string;
  brand_context: string;
  website_url: string;
  product_service: string;
  audience_market: string;
  persona: string;
  brand_colors: { primary: string; secondary: string; accent: string };
}): Promise<ClientVoice> {
  const res = await fetch(`${SERVER_BASE}/ai/client-voice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function extractBrandVoice(input: {
  website_url: string;
}): Promise<{
  voice: string;
  voice_examples: string[];
  brand_context: string;
  brand_colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  scrape_status: 'ok' | 'limited';
  source_url: string | null;
  about_url: string | null;
}> {
  const res = await fetch(`${SERVER_BASE}/ai/extract-brand-voice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}
