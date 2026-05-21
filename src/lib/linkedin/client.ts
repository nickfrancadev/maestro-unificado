// Shared HTTP plumbing for the LinkedIn service layer.
// All client-side calls go through the Supabase Edge Function so
// access tokens stay server-side.

import { projectId, publicAnonKey } from '../../utils/supabase/info';

export const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0`;

// The redirect URI registered in LinkedIn Developer Portal — must match exactly.
export const LINKEDIN_REDIRECT_URI = 'https://maestroadslinkedin.figma.site/auth/linkedin/callback';

export const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
});
