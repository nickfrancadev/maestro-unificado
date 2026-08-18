// Gemini-powered creative AI helpers. All requests proxy through the
// Supabase Edge Function so GEMINI_API_KEY stays server-side.

import { projectId, publicAnonKey } from '../utils/supabase/info';
import type { OverlayLayout } from '@/app/campaigns/wizard/overlayLayout';

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
// `prompt_brief` is what steers the look now — the UI no longer asks the user
// to pick between "photo" and "graphic". We still send `photo_ai` because the
// endpoint requires a mode and photography is the safer B2B default; the
// server's style directive is scheduled to be neutralised when a prompt is
// present (see docs/superpowers/specs/2026-08-11-criativo-texto-imagem-design.md).
// `format` define a proporção pedida no prompt (1:1 ou 1.91:1) desde 2026-08-18.
export async function generateBaseImage(input: {
  client_brand_context?: string;
  prompt_brief?: string;
  format?: 'square' | 'banner';
}): Promise<{ success: boolean; url: string; filename: string }> {
  const res = await fetch(`${SERVER_BASE}/ai/generate-base-image`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ...input, mode: 'photo_ai' }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Compõe o anúncio final: os dois textos e os logos habilitados sobre a
// imagem-base, nas posições que o usuário arrastou. NÃO usa IA — o servidor
// monta um SVG a partir do layout e rasteriza com resvg.
export async function composeLogoOverlay(input: {
  base_image_url: string;
  target_company_name: string;
  target_company_domain?: string | null;
  advertiser_logo_url?: string | null;
  // Fallback quando `advertiser_logo_url` está ausente: `brandKit.logo` é
  // `null` por padrão, então sem isto o checkbox "Meu logo" não teria de
  // onde tirar imagem nenhuma. O servidor resolve o logo a partir do domínio
  // do mesmo jeito que já faz para `target_company_domain`.
  advertiser_domain?: string | null;
  texto_destaque?: string;
  texto_complementar?: string;
  font_family?: string;
  format?: 'square' | 'banner';
  layout: OverlayLayout;
  // Larguras medidas no cliente com a fonte real, no tamanho EFETIVO (já
  // depois do teto vivo) — é nesse tamanho que o servidor desenha a caixa de
  // fundo do texto. Sem elas o servidor cai num estimador por contagem de
  // caracteres e a caixa não bate com o preview.
  destaque_width_px?: number;
  complementar_width_px?: number;
}): Promise<{
  success: boolean; url: string; filename: string;
  logo_applied: boolean; advertiser_logo_applied: boolean;
}> {
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
