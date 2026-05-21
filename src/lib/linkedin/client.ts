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

export const LINKEDIN_REDIRECT_URI =
  import.meta.env.VITE_LINKEDIN_REDIRECT_URI ??
  (typeof window !== 'undefined'
    ? `${window.location.origin}${CALLBACK_PATH}`
    : '');

export const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
});
