// LinkedIn ad-targeting reads: typeahead, similar entities, org logos,
// org enrichment, and audience count estimates.

import { SERVER_BASE, headers } from './client';

export async function linkedInTypeahead(
  query: string,
  facetType: 'companies' | 'locations' | 'titles' | 'industries',
): Promise<any[]> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/typeahead`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ query, facet_type: facetType }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('[LinkedIn] Typeahead error:', errData);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (err: any) {
    console.error('[LinkedIn] Typeahead erro:', err);
    return [];
  }
}

export async function fetchSimilarEntities(
  entityUrns: string[],
): Promise<Array<{ urn: string; name: string }>> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/similar-entities`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ entity_urns: entityUrns }),
    });

    if (!response.ok) {
      console.warn('[LinkedIn] Similar entities fallback to empty');
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (err: any) {
    console.error('[LinkedIn] Similar entities erro:', err);
    return [];
  }
}

export async function fetchOrgLogos(
  orgIds: string[],
): Promise<Record<string, string | null>> {
  try {
    if (orgIds.length === 0) return {};

    const response = await fetch(`${SERVER_BASE}/linkedin/org-logos`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ org_ids: orgIds }),
    });

    if (!response.ok) {
      console.warn('[LinkedIn] Org logos fetch failed');
      return {};
    }

    const data = await response.json();
    return data.logos || {};
  } catch (err: any) {
    console.error('[LinkedIn] Org logos erro:', err);
    return {};
  }
}

export interface EnrichedOrganization {
  urn: string;
  org_id: string;
  name: string | null;
  website: string | null;
  domain: string | null;
  vanity_name: string | null;
  logo_url: string | null;
  linkedin_url: string | null;
  location: string | null;
  enriched_at: string;
  error?: string;
}

export async function enrichOrganization(orgId: string): Promise<EnrichedOrganization | null> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/enrich-organization`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ org_id: orgId }),
    });

    if (!response.ok) {
      console.warn('[LinkedIn] Enrich org failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (err: any) {
    console.error('[LinkedIn] Enrich org erro:', err);
    return null;
  }
}

export async function getAudienceCount(
  targetingCriteria: any,
): Promise<{ count: number | null; error?: string }> {
  try {
    const response = await fetch(`${SERVER_BASE}/linkedin/audience-count`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ targeting_criteria: targetingCriteria }),
    });

    if (!response.ok) {
      return { count: null, error: 'API error' };
    }

    return await response.json();
  } catch (err: any) {
    console.error('[LinkedIn] Audience count erro:', err);
    return { count: null, error: err.message };
  }
}
