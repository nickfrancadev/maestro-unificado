// Shared HTTP plumbing for the LinkedIn service layer.
// All client-side calls go through the Supabase Edge Function so
// access tokens stay server-side.

import { projectId, publicAnonKey } from '../../utils/supabase/info';

export const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0`;

// The redirect URI registered in LinkedIn Developer Portal — must match exactly.
// Derived from the current origin at runtime so OAuth lands back on whichever
// host is serving the app (production, preview, or localhost). Can be overridden
// with VITE_LINKEDIN_REDIRECT_URI when a fixed URL is required.
const CALLBACK_PATH = '/auth/linkedin/callback';

// O app é servido da raiz em dev e na Vercel, mas de um subdiretório no GitHub
// Pages (/maestro-unificado/). O redirect precisa carregar esse prefixo: sem
// ele o LinkedIn devolve o usuário para a raiz do github.io, que serve o 404
// do GitHub em vez do app — o code nunca chega no callback e a conexão falha.
// Mesma fonte usada pelo basename do BrowserRouter em App.tsx.
export function buildLinkedInRedirectUri(origin: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${origin}${base}${CALLBACK_PATH}`;
}

export const LINKEDIN_REDIRECT_URI =
  import.meta.env.VITE_LINKEDIN_REDIRECT_URI ??
  (typeof window !== 'undefined'
    ? buildLinkedInRedirectUri(window.location.origin, import.meta.env.BASE_URL ?? '/')
    : '');

export const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
});
