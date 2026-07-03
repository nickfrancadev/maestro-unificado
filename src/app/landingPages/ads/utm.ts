/**
 * Builds the effective ad-destination link for a landing page: appends the
 * Maestro account id (`a=`) and any UTM params to the page's base URL,
 * preserving existing query params if the base already has some.
 */
export function buildAdLink(baseSlugUrl: string, accountId: string, utms: Record<string, string>): string {
  const [base, existingQuery = ''] = baseSlugUrl.split('?');
  const params = new URLSearchParams(existingQuery);
  params.set('a', accountId);
  for (const [key, value] of Object.entries(utms)) {
    params.set(key, value);
  }
  return `${base}?${params.toString()}`;
}
