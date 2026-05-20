import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";
import * as kv from "./kv_store.ts";

const RESVG_WASM_URL = "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

// Supabase client for Storage operations
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const CREATIVE_BUCKET = "make-a4d5bbe0-creatives";
const LOGO_DEV_KEY = Deno.env.get("LOGO_DEV_PUBLIC_KEY") ?? "pk_MnyWFrunT_GidypWnkvVJg";

const app = new Hono();

// Enable logger
app.use('*', logger((msg: string, ...rest: string[]) => { console.log(msg, ...rest); }));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-a4d5bbe0/health", (c) => {
  return c.json({ status: "ok" });
});

// ================================================
// Logo Proxy — bypasses CORS by fetching server-side
// ================================================
app.get("/make-server-a4d5bbe0/logo-proxy", async (c) => {
  const domain = c.req.query("domain") || "";
  if (!domain) {
    return c.json({ error: "domain param required" }, 400);
  }
  try {
    // Try Clearbit first
    const clearbitUrl = `https://logo.clearbit.com/${encodeURIComponent(domain)}`;
    const res = await fetch(clearbitUrl, { redirect: "follow" });
    if (res.ok && res.headers.get("content-type")?.startsWith("image")) {
      const body = await res.arrayBuffer();
      return new Response(body, {
        headers: {
          "Content-Type": res.headers.get("content-type") || "image/png",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    // Fallback: Google Favicon
    const googleUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    const gRes = await fetch(googleUrl, { redirect: "follow" });
    if (gRes.ok) {
      const body = await gRes.arrayBuffer();
      return new Response(body, {
        headers: {
          "Content-Type": gRes.headers.get("content-type") || "image/png",
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    return new Response(null, { status: 404 });
  } catch (_e) {
    return new Response(null, { status: 500 });
  }
});

// ================================================
// LinkedIn OAuth — Gera URL de autorização
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/auth-url", async (c) => {
  try {
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    if (!clientId) {
      return c.json({ error: "LINKEDIN_CLIENT_ID não configurado no servidor" }, 500);
    }

    const { redirect_uri, state } = await c.req.json();
    const scopes = "r_ads r_ads_reporting rw_ads r_organization_social";

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirect_uri || "",
      scope: scopes,
      state: state || crypto.randomUUID(),
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    return c.json({ auth_url: authUrl, state: params.get("state") });
  } catch (err: any) {
    console.log("[LinkedIn Auth URL] Erro:", err.message);
    return c.json({ error: `Erro ao gerar auth URL: ${err.message}` }, 500);
  }
});

// ================================================
// LinkedIn OAuth — Troca code por access_token
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/oauth-callback", async (c) => {
  try {
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return c.json({ error: "LinkedIn credentials não configuradas no servidor (CLIENT_ID ou CLIENT_SECRET)" }, 500);
    }

    const { code, redirect_uri } = await c.req.json();
    if (!code) {
      return c.json({ error: "Authorization code é obrigatório" }, 400);
    }

    // Exchange code for token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect_uri || "",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.log("[LinkedIn OAuth] Token exchange failed:", errText);
      return c.json({ error: `LinkedIn token exchange falhou: ${errText}` }, tokenResponse.status);
    }

    const tokenData = await tokenResponse.json();

    // Persist token in KV
    const integrationData = {
      provider: "linkedin",
      status: "connected",
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      scopes: tokenData.scope?.split(",") || [],
      connected_at: new Date().toISOString(),
    };
    await kv.set("linkedin:integration", integrationData);

    return c.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_in: tokenData.expires_in,
    });
  } catch (err: any) {
    console.log("[LinkedIn OAuth Callback] Erro:", err.message);
    return c.json({ error: `Erro no OAuth callback: ${err.message}` }, 500);
  }
});

// ================================================
// LinkedIn — Status da integração
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/status", async (c) => {
  try {
    const data = await kv.get("linkedin:integration");
    if (!data) {
      return c.json({ status: "disconnected", provider: "linkedin" });
    }
    // Don't leak tokens to frontend
    return c.json({
      status: data.status,
      provider: "linkedin",
      connected_at: data.connected_at,
      expires_at: data.expires_at,
      scopes: data.scopes,
      account_name: data.account_name || null,
      account_id: data.account_id || null,
      selected_ad_account_id: data.selected_ad_account_id || null,
      selected_ad_account_name: data.selected_ad_account_name || null,
      selected_ad_account_currency: data.selected_ad_account_currency || null,
    });
  } catch (err: any) {
    console.log("[LinkedIn Status] Erro:", err.message);
    return c.json({ status: "error", error: err.message });
  }
});

// ================================================
// LinkedIn — Desconectar
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/disconnect", async (c) => {
  try {
    await kv.del("linkedin:integration");
    await kv.del("linkedin:ad_accounts");
    return c.json({ success: true });
  } catch (err: any) {
    console.log("[LinkedIn Disconnect] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ================================================
// LinkedIn — Selecionar Ad Account
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/select-ad-account", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const { ad_account_id, ad_account_name, ad_account_currency } = await c.req.json();
    if (!ad_account_id || !ad_account_name) {
      return c.json({ error: "ad_account_id e ad_account_name são obrigatórios" }, 400);
    }

    // Update integration data with selected account
    const updatedIntegration = {
      ...integration,
      selected_ad_account_id: ad_account_id,
      selected_ad_account_name: ad_account_name,
      selected_ad_account_currency: ad_account_currency || null,
    };
    await kv.set("linkedin:integration", updatedIntegration);

    return c.json({ success: true });
  } catch (err: any) {
    console.log("[LinkedIn Select Ad Account] Erro:", err.message);
    return c.json({ error: `Erro ao selecionar ad account: ${err.message}` }, 500);
  }
});

// ================================================
// LinkedIn — Listar Ad Accounts
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/ad-accounts", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    // Try cached first
    const cached = await kv.get("linkedin:ad_accounts");
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return c.json({ accounts: cached });
    }

    // Fetch from LinkedIn API
    const response = await fetch(
      "https://api.linkedin.com/v2/adAccountsV2?q=search&search=(type:(values:List(BUSINESS)))&count=50",
      {
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202602",
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.log("[LinkedIn Ad Accounts] API error:", errText);
      return c.json({ error: `LinkedIn API error: ${response.status}`, details: errText }, response.status);
    }

    const data = await response.json();
    const accounts = (data.elements || []).map((el: any) => ({
      id: el.id || el["*"]?.split(":").pop(),
      name: el.name,
      currency: el.currency,
      status: el.status,
      type: el.type,
    }));

    // Cache accounts
    await kv.set("linkedin:ad_accounts", accounts);

    return c.json({ accounts });
  } catch (err: any) {
    console.log("[LinkedIn Ad Accounts] Erro:", err.message);
    return c.json({ error: `Erro ao buscar ad accounts: ${err.message}` }, 500);
  }
});

// ================================================
// LinkedIn — Typeahead Search via adTargetingEntities (v202504)
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/typeahead", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado", results: [] }, 401);
    }

    const { query, facet_type } = await c.req.json();
    if (!query || !facet_type) {
      return c.json({ error: "query e facet_type são obrigatórios", results: [] }, 400);
    }

    const accessToken = integration.access_token;
    const apiHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202602",
    };

    let results: any[] = [];

    if (facet_type === "companies") {
      // adTargetingEntities — typeahead for employers
      const facetUrn = encodeURIComponent("urn:li:adTargetingFacet:employers");
      const endpoint = `https://api.linkedin.com/rest/adTargetingEntities?q=typeahead&facet=${facetUrn}&query=${encodeURIComponent(query)}&queryVersion=QUERY_USES_URNS&entityType=(value:COMPANY)&locale=(language:pt,country:BR)`;
      console.log(`[LinkedIn Typeahead companies] Calling adTargetingEntities: ${endpoint}`);

      const response = await fetch(endpoint, { headers: apiHeaders });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`[LinkedIn Typeahead companies] API error ${response.status}:`, errText);
        return c.json({ results: [], error: `LinkedIn API: ${response.status} — ${errText}` });
      }

      const data = await response.json();
      console.log(`[LinkedIn Typeahead companies] Got ${(data.elements || []).length} results`);
      results = (data.elements || []).map((el: any) => ({
        urn: el.urn || "",
        name: el.name || "",
        facetUrn: el.facetUrn || "",
      }));

    } else if (facet_type === "locations") {
      const facetUrn = encodeURIComponent("urn:li:adTargetingFacet:locations");
      const endpoint = `https://api.linkedin.com/rest/adTargetingEntities?q=typeahead&facet=${facetUrn}&query=${encodeURIComponent(query)}&queryVersion=QUERY_USES_URNS&locale=(language:pt,country:BR)`;
      console.log(`[LinkedIn Typeahead locations] Calling: ${endpoint}`);

      const response = await fetch(endpoint, { headers: apiHeaders });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`[LinkedIn Typeahead locations] API error ${response.status}:`, errText);
        return c.json({ results: [], error: `LinkedIn API: ${response.status}` });
      }

      const data = await response.json();
      console.log(`[LinkedIn Typeahead locations] Got ${(data.elements || []).length} results`);
      results = (data.elements || []).map((el: any) => ({
        urn: el.urn || "",
        name: el.name || "",
      }));

    } else if (facet_type === "titles") {
      const facetUrn = encodeURIComponent("urn:li:adTargetingFacet:titles");
      const endpoint = `https://api.linkedin.com/rest/adTargetingEntities?q=typeahead&facet=${facetUrn}&query=${encodeURIComponent(query)}&queryVersion=QUERY_USES_URNS&locale=(language:pt,country:BR)`;
      console.log(`[LinkedIn Typeahead titles] Calling: ${endpoint}`);

      const response = await fetch(endpoint, { headers: apiHeaders });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`[LinkedIn Typeahead titles] API error ${response.status}:`, errText);
        return c.json({ results: [], error: `LinkedIn API: ${response.status}` });
      }

      const data = await response.json();
      console.log(`[LinkedIn Typeahead titles] Got ${(data.elements || []).length} results`);
      results = (data.elements || []).map((el: any) => ({
        urn: el.urn || "",
        name: el.name || "",
      }));

    } else if (facet_type === "industries") {
      const facetUrn = encodeURIComponent("urn:li:adTargetingFacet:industries");
      const endpoint = `https://api.linkedin.com/rest/adTargetingEntities?q=typeahead&facet=${facetUrn}&query=${encodeURIComponent(query)}&queryVersion=QUERY_USES_URNS&locale=(language:pt,country:BR)`;
      console.log(`[LinkedIn Typeahead industries] Calling: ${endpoint}`);

      const response = await fetch(endpoint, { headers: apiHeaders });

      if (!response.ok) {
        const errText = await response.text();
        console.log(`[LinkedIn Typeahead industries] API error ${response.status}:`, errText);
        return c.json({ results: [], error: `LinkedIn API: ${response.status}` });
      }

      const data = await response.json();
      console.log(`[LinkedIn Typeahead industries] Got ${(data.elements || []).length} results`);
      results = (data.elements || []).map((el: any) => ({
        urn: el.urn || "",
        name: el.name || "",
      }));

    } else {
      return c.json({ error: `facet_type '${facet_type}' não suportado`, results: [] }, 400);
    }

    return c.json({ results });
  } catch (err: any) {
    console.log("[LinkedIn Typeahead] Erro:", err.message);
    return c.json({ results: [], error: err.message });
  }
});

// ================================================
// LinkedIn — Similar Entities (empresas similares)
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/similar-entities", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado", results: [] }, 401);
    }

    const { entity_urns } = await c.req.json();
    if (!entity_urns || !Array.isArray(entity_urns) || entity_urns.length === 0) {
      return c.json({ error: "entity_urns (array) é obrigatório", results: [] }, 400);
    }

    const accessToken = integration.access_token;
    const apiHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202602",
    };

    const facetUrn = encodeURIComponent("urn:li:adTargetingFacet:employers");
    const entitiesList = entity_urns.map((u: string) => encodeURIComponent(u)).join(",");
    const endpoint = `https://api.linkedin.com/rest/adTargetingEntities?q=similarEntities&facet=${facetUrn}&queryVersion=QUERY_USES_URNS&entities=List(${entitiesList})&locale=(language:pt,country:BR)`;
    console.log(`[LinkedIn Similar Entities] Calling: ${endpoint}`);

    const response = await fetch(endpoint, { headers: apiHeaders });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`[LinkedIn Similar Entities] API error ${response.status}:`, errText);
      return c.json({ results: [], error: `LinkedIn API: ${response.status} — ${errText}` });
    }

    const data = await response.json();
    console.log(`[LinkedIn Similar Entities] Got ${(data.elements || []).length} results`);
    const results = (data.elements || []).map((el: any) => ({
      urn: el.urn || "",
      name: el.name || "",
      facetUrn: el.facetUrn || "",
    }));

    return c.json({ results });
  } catch (err: any) {
    console.log("[LinkedIn Similar Entities] Erro:", err.message);
    return c.json({ results: [], error: err.message });
  }
});

// ================================================
// LinkedIn — Organization Logos (batch: organizationsLookup + images)
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/org-logos", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ logos: {}, error: "LinkedIn não conectado" }, 401);
    }

    const { org_ids } = await c.req.json();
    if (!org_ids || !Array.isArray(org_ids) || org_ids.length === 0) {
      return c.json({ logos: {} });
    }

    const accessToken = integration.access_token;
    const apiHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202602",
    };

    // Batch lookup via organizationsLookup to get domains for favicon URLs
    const idsList = org_ids.join(",");
    const lookupUrl = `https://api.linkedin.com/rest/organizationsLookup?ids=List(${idsList})`;
    console.log(`[LinkedIn Org Logos] organizationsLookup batch: ${idsList}`);

    const logos: Record<string, string | null> = {};
    org_ids.forEach((id: string) => { logos[`urn:li:organization:${id}`] = null; });

    const lookupResponse = await fetch(lookupUrl, { headers: apiHeaders });
    if (!lookupResponse.ok) {
      console.log(`[LinkedIn Org Logos] lookup error ${lookupResponse.status}`);
      return c.json({ logos });
    }

    const lookupData = await lookupResponse.json();
    const orgResults = lookupData.results || {};

    for (const [orgId, orgData] of Object.entries(orgResults) as [string, any][]) {
      const website: string | null = orgData?.localizedWebsite || orgData?.website?.localized?.["en_US"] || null;
      const vanity: string | null = orgData?.vanityName || null;
      let domain: string | null = null;

      if (website) {
        try {
          domain = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
        } catch { /* ignore malformed */ }
      }
      if (!domain && vanity) {
        domain = `${vanity}.com`;
      }

      if (domain) {
        logos[`urn:li:organization:${orgId}`] = `https://img.logo.dev/${domain}?token=${LOGO_DEV_KEY}`;
      }
    }

    console.log(`[LinkedIn Org Logos] Resolved ${Object.values(logos).filter(Boolean).length}/${org_ids.length} logos`);
    return c.json({ logos });
  } catch (err: any) {
    console.log("[LinkedIn Org Logos] Erro:", err.message);
    return c.json({ logos: {}, error: err.message });
  }
});

// ================================================
// LinkedIn — Enrich Organization (website, domain, vanityName, logo)
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/enrich-organization", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const { org_id, force_refresh } = await c.req.json();
    if (!org_id) {
      return c.json({ error: "org_id é obrigatório" }, 400);
    }

    const urn = `urn:li:organization:${org_id}`;
    const cacheKey = `enriched_org:${org_id}`;

    // Cache only entries that produced meaningful data — don't pin nulls.
    if (!force_refresh) {
      const cached = await kv.get(cacheKey);
      if (cached?.enriched_at && (cached.name || cached.domain || cached.logo_url)) {
        console.log(`[Enrich Org] Cache hit for org ${org_id}`);
        return c.json(cached);
      }
    }

    const accessToken = integration.access_token;
    const apiHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202602",
    };

    // organizationsLookup (with capital L) is the public endpoint that works
    // for any organization without admin role. The plain /organizations/{id}
    // endpoint requires the caller to be an Admin of that page.
    const lookupUrl = `https://api.linkedin.com/rest/organizationsLookup?ids=List(${org_id})`;
    console.log(`[Enrich Org] GET ${lookupUrl}`);
    const lookupRes = await fetch(lookupUrl, { headers: apiHeaders });

    const result: any = {
      urn,
      org_id,
      name: null,
      website: null,
      domain: null,
      vanity_name: null,
      logo_url: null,
      linkedin_url: null,
      location: null,
      enriched_at: new Date().toISOString(),
    };

    if (!lookupRes.ok) {
      const errText = await lookupRes.text();
      console.log(`[Enrich Org] organizationsLookup error ${lookupRes.status}: ${errText}`);
      result.error = `LinkedIn API ${lookupRes.status}`;
      return c.json(result);
    }

    const lookupData = await lookupRes.json();
    const orgData = lookupData?.results?.[String(org_id)];
    if (!orgData) {
      console.log(`[Enrich Org] No data for ${org_id}; statuses=${JSON.stringify(lookupData?.statuses)}`);
      result.error = "Organization not found in lookup response";
      return c.json(result);
    }

    result.name = orgData.localizedName || null;

    if (orgData.vanityName) {
      result.vanity_name = orgData.vanityName;
      result.linkedin_url = `https://www.linkedin.com/company/${orgData.vanityName}`;
    }

    if (orgData.localizedWebsite) {
      result.website = orgData.localizedWebsite;
      try {
        const websiteStr: string = orgData.localizedWebsite;
        const urlObj = new URL(websiteStr.startsWith("http") ? websiteStr : `https://${websiteStr}`);
        result.domain = urlObj.hostname.replace(/^www\./, "");
      } catch (_e) {
        result.domain = orgData.localizedWebsite
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .split("/")[0];
      }
    }

    // Prefer HEADQUARTERS location, fall back to first available.
    if (Array.isArray(orgData.locations) && orgData.locations.length > 0) {
      const hq = orgData.locations.find((l: any) => l?.locationType === "HEADQUARTERS");
      const chosen = hq || orgData.locations[0];
      const city = chosen?.address?.city || null;
      const country = chosen?.address?.country || null;
      if (city || country) {
        result.location = [city, country].filter(Boolean).join(", ");
      }
    }

    if (result.domain) {
      result.logo_url = `https://img.logo.dev/${result.domain}?token=${LOGO_DEV_KEY}`;
    }

    await kv.set(cacheKey, result);
    console.log(`[Enrich Org] Cached enriched data for ${result.name || org_id}`);

    return c.json(result);
  } catch (err: any) {
    console.log("[Enrich Org] Erro:", err.message);
    return c.json({
      error: err.message,
      name: null,
      website: null,
      domain: null,
      vanity_name: null,
      logo_url: null,
      linkedin_url: null,
      location: null,
      enriched_at: new Date().toISOString(),
    });
  }
});

// ================================================
// LinkedIn — Audience Count Estimate
// ================================================
// Serialize a JSON targeting criteria into LinkedIn's Rest.li 2.0.0 Pegasus
// query string format, e.g.:
//   { include: { and: [ { or: { "urn:li:adTargetingFacet:locations": ["urn:li:geo:106057199"] } } ] } }
// becomes:
//   (include:(and:List((or:(urn%3Ali%3AadTargetingFacet%3Alocations:List(urn%3Ali%3Ageo%3A106057199))))))
// URNs are URL-encoded as required by the docs.
function serializeTargetingCriteriaV2(criteria: any): string {
  const enc = (s: string) => encodeURIComponent(s);

  const renderOrClause = (orObj: Record<string, string[]>): string => {
    // "or" is an object: { <facetUrn>: [urn, urn, ...], <facetUrn2>: [...] }
    const facetEntries = Object.entries(orObj).map(([facetUrn, urns]) => {
      const urnList = urns.map(enc).join(",");
      return `${enc(facetUrn)}:List(${urnList})`;
    });
    return `(or:(${facetEntries.join(",")}))`;
  };

  const renderInclude = (include: any): string => {
    const andList = (include.and || []).map((clause: any) => renderOrClause(clause.or || {}));
    return `include:(and:List(${andList.join(",")}))`;
  };

  const renderExclude = (exclude: any): string => {
    // exclude.or is { facetUrn: [urns] } (flat, no List wrapper around ors)
    return `exclude:${renderOrClause(exclude.or || {})}`;
  };

  const parts: string[] = [];
  if (criteria.include) parts.push(renderInclude(criteria.include));
  if (criteria.exclude) parts.push(renderExclude(criteria.exclude));
  return `(${parts.join(",")})`;
}

app.post("/make-server-a4d5bbe0/linkedin/audience-count", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const { targeting_criteria } = await c.req.json();
    if (!targeting_criteria) {
      return c.json({ count: null, error: "targeting_criteria é obrigatório" }, 400);
    }

    // LinkedIn audienceCounts is a Rest.li 2.0.0 FINDER: GET with the criteria
    // serialized into the query string (not a POST body). Finder name is
    // targetingCriteriaV2 for the current include/exclude schema.
    const serialized = serializeTargetingCriteriaV2(targeting_criteria);
    const url = `https://api.linkedin.com/rest/audienceCounts?q=targetingCriteriaV2&targetingCriteria=${serialized}`;

    console.log(`[LinkedIn Audience Count] GET ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${integration.access_token}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202602",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`[LinkedIn Audience Count] API error ${response.status}: ${errText}`);
      return c.json({ count: null, error: `LinkedIn API ${response.status}: ${errText}` });
    }

    // Response shape: { elements: [{ active: N, total: M }], paging: {...} }
    // total is 0 when audience size < 300 (LinkedIn privacy floor).
    const data = await response.json();
    const element = data.elements?.[0] || {};
    console.log(`[LinkedIn Audience Count] Response: total=${element.total} active=${element.active} raw=${JSON.stringify(data).slice(0, 500)}`);
    return c.json({
      count: element.total ?? null,
      active_count: element.active ?? null,
    });
  } catch (err: any) {
    console.log("[LinkedIn Audience Count] Erro:", err.message);
    return c.json({ count: null, error: err.message });
  }
});

// ================================================
// LinkedIn — Campaign Lifecycle (4 discrete actions)
// ================================================
// Each action is idempotent (KV dedup), has retry with
// exponential backoff, and persists audit trail in KV.
// ================================================

// Retry helper (1 retry for 5xx, exponential backoff)
async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  label: string,
  maxRetries = 1
): Promise<Response> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, opts);
      if (res.status >= 500 && attempt < maxRetries) {
        const wait = Math.pow(2, attempt) * 500;
        console.log(`[${label}] 5xx (${res.status}), retry #${attempt + 1} in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (err: any) {
      lastErr = err;
      if (attempt < maxRetries) {
        const wait = Math.pow(2, attempt) * 500;
        console.log(`[${label}] Network error, retry #${attempt + 1} in ${wait}ms: ${err.message}`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr || new Error(`[${label}] All retries exhausted`);
}

// LinkedIn REST API headers (consistent v202602)
function linkedInHeaders(accessToken: string, extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202602",
    ...(extra || {}),
  };
}

// Validate integration, return access token or throw
async function requireLinkedIn(): Promise<{ accessToken: string; integration: any }> {
  const integration = await kv.get("linkedin:integration");
  if (!integration || integration.status !== "connected") {
    throw new Error("UNAUTHORIZED");
  }
  return { accessToken: integration.access_token, integration };
}

// Persist audit entry in KV
async function auditLog(campaignId: string, action: string, result: any) {
  const key = `audit:${campaignId}:${action}:${Date.now()}`;
  await kv.set(key, { campaign_id: campaignId, action, result, timestamp: new Date().toISOString() });
}

// ---- Main Campaign Actions Router ----
app.post("/make-server-a4d5bbe0/linkedin/campaigns", async (c) => {
  try {
    const body = await c.req.json();
    const { action } = body;

    if (!action) {
      return c.json({ error: "action é obrigatório (create-campaign-group | create-campaign | upload-image | create-creative | activate | pause | archive)" }, 400);
    }

    switch (action) {
      case "create-campaign-group":
        return await handleCreateCampaignGroup(c, body);
      case "create-campaign":
        return await handleCreateCampaign(c, body);
      case "upload-image":
        return await handleUploadImage(c, body);
      case "create-creative":
        return await handleCreateCreative(c, body);
      case "activate":
        return await handleActivate(c, body);
      case "pause":
        return await handlePause(c, body);
      case "archive":
        return await handleArchive(c, body);
      default:
        return c.json({ error: `Action '${action}' não suportada` }, 400);
    }
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }
    console.log("[LinkedIn Campaigns] Erro não tratado:", err.message);
    return c.json({ success: false, error: `Erro interno: ${err.message}` }, 500);
  }
});

// ACTION 1: Create Campaign Group
async function handleCreateCampaignGroup(c: any, body: any) {
  const { campaign_id, ad_account_id, name, budget_type, budget_amount, currency, start_date } = body;
  if (!campaign_id || !ad_account_id || !name) {
    return c.json({ error: "campaign_id, ad_account_id e name são obrigatórios" }, 400);
  }

  const existing = await kv.get(`campaign_group:${campaign_id}`);
  if (existing?.linkedin_id) {
    console.log(`[Create CG] Idempotent hit: ${existing.linkedin_id}`);
    return c.json({ success: true, campaign_group_id: existing.linkedin_id, idempotent: true });
  }

  const { accessToken } = await requireLinkedIn();
  const adAccStr = String(ad_account_id);
  const accountUrn = adAccStr.startsWith("urn:") ? adAccStr : `urn:li:sponsoredAccount:${adAccStr}`;
  const curr = currency || "BRL";
  // LinkedIn expects amount in currency units as string (e.g. "500.00"), NOT cents
  const budgetStr = String(budget_amount || 0);

  // Minimal payload — only include optional fields when explicitly provided
  const cgBody: any = {
    account: accountUrn,
    name,
    status: "PAUSED",
  };
  // Only add runSchedule if start_date is explicit (LinkedIn can default otherwise)
  if (start_date) {
    cgBody.runSchedule = { start: new Date(start_date).getTime() };
  }
  if (budget_type === "total" && budget_amount > 0) cgBody.totalBudget = { amount: budgetStr, currencyCode: curr };
  if (budget_type === "daily" && budget_amount > 0) cgBody.dailyBudget = { amount: budgetStr, currencyCode: curr };

  console.log(`[Create CG] POST /rest/adCampaignGroups "${name}" body=`, JSON.stringify(cgBody));
  const response = await fetchWithRetry(
    "https://api.linkedin.com/rest/adCampaignGroups",
    { method: "POST", headers: linkedInHeaders(accessToken), body: JSON.stringify(cgBody) },
    "Create CG"
  );

  if (!response.ok) {
    const errText = await response.text();
    console.log(`[Create CG] Error ${response.status}: ${errText}`);
    await auditLog(campaign_id, "create-campaign-group", { status: "error", http: response.status, error: errText });
    return c.json({ success: false, error: `LinkedIn API ${response.status}: ${errText}` }, response.status >= 500 ? 502 : 400);
  }

  const campaignGroupId = response.headers.get("x-restli-id") || null;
  if (!campaignGroupId) {
    console.log("[Create CG] WARNING: LinkedIn não retornou x-restli-id no header de resposta");
    await auditLog(campaign_id, "create-campaign-group", { status: "error", error: "x-restli-id ausente no header" });
    return c.json({ success: false, error: "LinkedIn não retornou ID do Campaign Group (x-restli-id ausente)" }, 500);
  }
  console.log(`[Create CG] Created: ${campaignGroupId}`);

  await kv.set(`campaign_group:${campaign_id}`, { campaign_id, linkedin_id: campaignGroupId, name, ad_account_id, budget_type, budget_amount, currency: curr, created_at: new Date().toISOString() });
  await auditLog(campaign_id, "create-campaign-group", { status: "success", campaign_group_id: campaignGroupId });

  return c.json({ success: true, campaign_group_id: campaignGroupId });
}

// ---- Objective → LinkedIn API fields mapping ----
const CAMPAIGN_OBJECTIVE_MAP: Record<string, {
  objectiveType: string;
  type: string;
  format: string;
  costType: string;
  optimizationTargetType: string;
}> = {
  brand_awareness: {
    objectiveType: "BRAND_AWARENESS",
    type: "SPONSORED_UPDATES",
    format: "STANDARD_UPDATE",
    costType: "CPM",
    optimizationTargetType: "MAX_REACH",
  },
  website_visits: {
    objectiveType: "WEBSITE_VISITS",
    type: "SPONSORED_UPDATES",
    format: "STANDARD_UPDATE",
    costType: "CPC",
    optimizationTargetType: "MAX_CLICK",
  },
  engagement: {
    objectiveType: "ENGAGEMENT",
    type: "SPONSORED_UPDATES",
    format: "STANDARD_UPDATE",
    costType: "CPC",
    optimizationTargetType: "MAX_CLICK",
  },
  lead_generation: {
    objectiveType: "LEAD_GENERATION",
    type: "SPONSORED_UPDATES",
    format: "LEAD_GENERATION_FORM_SPONSORED_CONTENT",
    costType: "CPM",
    optimizationTargetType: "MAX_LEAD",
  },
  video_views: {
    objectiveType: "VIDEO_VIEWS",
    type: "SPONSORED_UPDATES",
    format: "SINGLE_VIDEO",
    costType: "CPV",
    optimizationTargetType: "MAX_VIDEO_VIEW",
  },
};

// ACTION 2: Create Campaign (with full targeting criteria from frontend)
async function handleCreateCampaign(c: any, body: any) {
  const {
    campaign_id, campaign_group_id, ad_account_id, name, objective,
    targeting_criteria, budget_type, budget_amount, currency,
    cost_type, bid_amount, unit_cost, start_date, end_date,
    auto_activate, bidding_strategy,
  } = body;

  if (!campaign_id || !campaign_group_id || !ad_account_id || !name || !targeting_criteria) {
    return c.json({ error: "campaign_id, campaign_group_id, ad_account_id, name e targeting_criteria são obrigatórios" }, 400);
  }

  // Idempotency check
  const existing = await kv.get(`campaign:${campaign_id}`);
  if (existing?.linkedin_id) {
    console.log(`[Create Campaign] Idempotent hit: ${existing.linkedin_id}`);
    return c.json({ success: true, linkedin_campaign_id: existing.linkedin_id, idempotent: true });
  }

  const { accessToken } = await requireLinkedIn();
  const adAccStr2 = String(ad_account_id);
  const accountUrn = adAccStr2.startsWith("urn:") ? adAccStr2 : `urn:li:sponsoredAccount:${adAccStr2}`;
  const cgStr = String(campaign_group_id);
  const groupUrn = cgStr.startsWith("urn:") ? cgStr : `urn:li:sponsoredCampaignGroup:${cgStr}`;

  // Map objective to all required LinkedIn API fields
  const mapped = CAMPAIGN_OBJECTIVE_MAP[objective?.toLowerCase()] ?? CAMPAIGN_OBJECTIVE_MAP["brand_awareness"];
  const curr = currency || "BRL";

  // Determine costType: frontend override (manual bidding) takes precedence
  const resolvedCostType = cost_type || mapped.costType;

  // Build unitCost — required even for automated bidding (send "0" for automatic)
  let unitCostObj: { amount: string; currencyCode: string };
  if (unit_cost?.amount && parseFloat(unit_cost.amount) > 0) {
    // Manual bid from frontend (already in currency units, e.g. "5.00")
    unitCostObj = { amount: unit_cost.amount, currencyCode: unit_cost.currency_code || curr };
  } else if (bid_amount && bid_amount > 0) {
    // Legacy: bid_amount in currency units
    unitCostObj = { amount: String(bid_amount), currencyCode: curr };
  } else {
    // Automated bidding
    unitCostObj = { amount: "0", currencyCode: curr };
  }

  // Build budget — dailyBudget or totalBudget, never both
  // LinkedIn expects amount as string in currency units (e.g. "500.00"), NOT cents
  const budgetStr = String(budget_amount || 0);
  const budgetObj = budget_type === "total"
    ? { totalBudget: { amount: budgetStr, currencyCode: curr } }
    : { dailyBudget: { amount: budgetStr, currencyCode: curr } };

  // Build runSchedule
  const runSchedule: any = {
    start: start_date ? new Date(start_date).getTime() : (Date.now() + 5 * 60 * 1000),
  };
  if (end_date) {
    runSchedule.end = new Date(end_date).getTime();
  }

  // Build the complete campaign payload with ALL required fields
  // Always create as PAUSED — the activate step handles PAUSED→ACTIVE
  const campaignBody: any = {
    // Required identifiers
    account: accountUrn,
    campaignGroup: groupUrn,
    name,
    status: "PAUSED",

    // Required type/objective fields (derived from CAMPAIGN_OBJECTIVE_MAP)
    type: mapped.type,
    objectiveType: mapped.objectiveType,
    format: mapped.format,
    costType: resolvedCostType,
    optimizationTargetType: mapped.optimizationTargetType,

    // Required cost
    unitCost: unitCostObj,

    // Budget (one of daily/total)
    ...budgetObj,

    // Schedule
    runSchedule,

    // Targeting from segmentation step
    targetingCriteria: targeting_criteria,

    // Locale — derived from currency, defaults to BR
    locale: {
      country: curr === "BRL" ? "BR" : "US",
      language: curr === "BRL" ? "pt" : "en",
    },

    // Required additional fields (API v202504+)
    offsiteDeliveryEnabled: false,
    politicalIntent: "NOT_POLITICAL",
    audienceExpansionEnabled: false,
  };

  // Add bidding strategy if provided
  if (bidding_strategy) {
    campaignBody.biddingStrategy = bidding_strategy;
  }

  console.log(`[Create Campaign] POST /rest/adCampaigns "${name}" objective=${mapped.objectiveType} costType=${resolvedCostType} format=${mapped.format}`);
  console.log(`[Create Campaign] Full payload:`, JSON.stringify(campaignBody));

  const response = await fetchWithRetry(
    "https://api.linkedin.com/rest/adCampaigns",
    { method: "POST", headers: linkedInHeaders(accessToken), body: JSON.stringify(campaignBody) },
    "Create Campaign"
  );

  if (!response.ok) {
    const errText = await response.text();
    console.log(`[Create Campaign] Error ${response.status}: ${errText}`);
    await auditLog(campaign_id, "create-campaign", { status: "error", http: response.status, error: errText, payload_sent: campaignBody });
    return c.json({ success: false, error: `LinkedIn API ${response.status}: ${errText}` }, response.status >= 500 ? 502 : 400);
  }

  const linkedInCampaignId = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id") || null;

  if (!linkedInCampaignId) {
    console.log("[Create Campaign] WARNING: LinkedIn não retornou x-restli-id no header");
    try {
      const respBody = await response.json();
      if (respBody.id) {
        console.log(`[Create Campaign] Fallback: got ID from body: ${respBody.id}`);
      }
    } catch (_) { /* empty body is ok for 201 */ }
  }

  console.log(`[Create Campaign] Created: ${linkedInCampaignId}`);

  await kv.set(`campaign:${campaign_id}`, {
    campaign_id,
    linkedin_id: linkedInCampaignId,
    campaign_group_id,
    name,
    objective: mapped.objectiveType,
    format: mapped.format,
    costType: resolvedCostType,
    status: auto_activate ? "ACTIVE" : "PAUSED",
    created_at: new Date().toISOString(),
  });
  await auditLog(campaign_id, "create-campaign", { status: "success", linkedin_campaign_id: linkedInCampaignId });

  return c.json({ success: true, linkedin_campaign_id: linkedInCampaignId });
}

// ACTION 3a: Upload Image (initializeUpload + PUT binary)
async function handleUploadImage(c: any, body: any) {
  const { campaign_id, image_url, ad_account_id } = body;
  if (!campaign_id || !image_url || !ad_account_id) {
    return c.json({ error: "campaign_id, image_url e ad_account_id são obrigatórios" }, 400);
  }

  const existing = await kv.get(`image:${campaign_id}`);
  if (existing?.asset_urn) {
    console.log(`[Upload Image] Idempotent hit: ${existing.asset_urn}`);
    return c.json({ success: true, asset_urn: existing.asset_urn, idempotent: true });
  }

  const { accessToken } = await requireLinkedIn();
  const adAccStr3 = String(ad_account_id);
  const accountUrn = adAccStr3.startsWith("urn:") ? adAccStr3 : `urn:li:sponsoredAccount:${adAccStr3}`;

  // Step 1: initializeUpload
  console.log(`[Upload Image] Step 1: initializeUpload`);
  const initResponse = await fetchWithRetry(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    { method: "POST", headers: linkedInHeaders(accessToken), body: JSON.stringify({ initializeUploadRequest: { owner: accountUrn } }) },
    "Init Upload"
  );
  if (!initResponse.ok) {
    const errText = await initResponse.text();
    await auditLog(campaign_id, "upload-image", { status: "error", step: "initialize", error: errText });
    return c.json({ success: false, error: `initializeUpload failed: ${errText}` }, 400);
  }
  const initData = await initResponse.json();
  const uploadUrl = initData.value?.uploadUrl;
  const imageUrn = initData.value?.image;
  if (!uploadUrl || !imageUrn) {
    return c.json({ success: false, error: "LinkedIn não retornou uploadUrl ou image URN" }, 500);
  }

  // Step 2: Download image
  console.log(`[Upload Image] Step 2: downloading ${image_url}`);
  const imageResponse = await fetch(image_url);
  if (!imageResponse.ok) {
    await auditLog(campaign_id, "upload-image", { status: "error", step: "download", error: `HTTP ${imageResponse.status}` });
    return c.json({ success: false, error: `Não foi possível baixar a imagem: HTTP ${imageResponse.status}` }, 400);
  }
  const imageBytes = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get("content-type") || "image/png";

  // Step 3: PUT binary to LinkedIn
  console.log(`[Upload Image] Step 3: PUT binary (${imageBytes.byteLength} bytes)`);
  const uploadResponse = await fetchWithRetry(
    uploadUrl,
    { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": contentType }, body: imageBytes },
    "PUT Image"
  );
  if (!uploadResponse.ok && uploadResponse.status !== 201) {
    const errText = await uploadResponse.text();
    await auditLog(campaign_id, "upload-image", { status: "error", step: "upload", error: errText });
    return c.json({ success: false, error: `Upload failed: ${errText}` }, 400);
  }

  console.log(`[Upload Image] Success: ${imageUrn}`);
  await kv.set(`image:${campaign_id}`, { asset_urn: imageUrn, campaign_id, uploaded_at: new Date().toISOString() });
  await auditLog(campaign_id, "upload-image", { status: "success", asset_urn: imageUrn });
  return c.json({ success: true, asset_urn: imageUrn });
}

// ACTION 3b: Create Creative (adCreatives)
async function handleCreateCreative(c: any, body: any) {
  const { campaign_id, linkedin_campaign_id, ad_account_id, asset_urn, headline, description, cta, landing_page_url } = body;
  if (!campaign_id || !linkedin_campaign_id || !ad_account_id) {
    return c.json({ error: "campaign_id, linkedin_campaign_id e ad_account_id são obrigatórios" }, 400);
  }

  const existing = await kv.get(`creative:${campaign_id}`);
  if (existing?.linkedin_id) {
    console.log(`[Create Creative] Idempotent hit: ${existing.linkedin_id}`);
    return c.json({ success: true, creative_id: existing.linkedin_id, idempotent: true });
  }

  const { accessToken } = await requireLinkedIn();
  const liCampStr = String(linkedin_campaign_id);
  const campaignUrn = liCampStr.startsWith("urn:") ? liCampStr : `urn:li:sponsoredCampaign:${liCampStr}`;

  const creativeBody: any = {
    campaign: campaignUrn,
    content: {
      singleImage: {
        images: asset_urn ? [{ id: asset_urn }] : [],
        headline: headline || "",
        description: description || "",
      },
    },
    intendedStatus: "ACTIVE",
  };
  if (cta && landing_page_url) {
    creativeBody.content.singleImage.callToAction = { type: cta, url: landing_page_url };
  } else if (landing_page_url) {
    creativeBody.content.singleImage.callToAction = { type: "LEARN_MORE", url: landing_page_url };
  }

  console.log(`[Create Creative] POST /rest/adCreatives`);
  const response = await fetchWithRetry(
    "https://api.linkedin.com/rest/adCreatives",
    { method: "POST", headers: linkedInHeaders(accessToken), body: JSON.stringify(creativeBody) },
    "Create Creative"
  );

  if (!response.ok) {
    const errText = await response.text();
    await auditLog(campaign_id, "create-creative", { status: "error", http: response.status, error: errText });
    return c.json({ success: false, error: `LinkedIn API ${response.status}: ${errText}` }, response.status >= 500 ? 502 : 400);
  }

  const creativeId = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id") || null;
  console.log(`[Create Creative] Created: ${creativeId}`);

  await kv.set(`creative:${campaign_id}`, { linkedin_id: creativeId, campaign_id, created_at: new Date().toISOString() });
  await auditLog(campaign_id, "create-creative", { status: "success", creative_id: creativeId });
  return c.json({ success: true, creative_id: creativeId });
}

// ACTION 4: Activate Campaign + Campaign Group (PAUSED → ACTIVE)
async function handleActivate(c: any, body: any) {
  const { campaign_id, linkedin_campaign_id } = body;
  if (!campaign_id || !linkedin_campaign_id) {
    return c.json({ error: "campaign_id e linkedin_campaign_id são obrigatórios" }, 400);
  }

  const { accessToken } = await requireLinkedIn();
  const liCampStr2 = String(linkedin_campaign_id);
  const campaignUrn = liCampStr2.startsWith("urn:") ? liCampStr2 : `urn:li:sponsoredCampaign:${liCampStr2}`;

  // Also activate the campaign group
  const cgRecord = await kv.get(`campaign_group:${campaign_id}`);
  if (cgRecord?.linkedin_id) {
    const cgId = String(cgRecord.linkedin_id);
    const cgUrn = cgId.startsWith("urn:") ? cgId : `urn:li:sponsoredCampaignGroup:${cgId}`;
    console.log(`[Activate] Activating Campaign Group ${cgUrn}`);
    const cgResp = await fetchWithRetry(
      `https://api.linkedin.com/rest/adCampaignGroups/${encodeURIComponent(cgUrn)}`,
      {
        method: "POST",
        headers: linkedInHeaders(accessToken, { "X-RestLi-Method": "PARTIAL_UPDATE" }),
        body: JSON.stringify({ patch: { $set: { status: "ACTIVE" } } }),
      },
      "Activate CG"
    );
    if (!cgResp.ok) {
      const errText = await cgResp.text();
      console.log(`[Activate] Campaign Group activation failed: ${errText}`);
      // Non-fatal — continue to activate the campaign itself
    } else {
      console.log(`[Activate] Campaign Group ${cgId} activated`);
    }
  }

  console.log(`[Activate] POST /rest/adCampaigns/${encodeURIComponent(campaignUrn)} (PARTIAL_UPDATE)`);
  const response = await fetchWithRetry(
    `https://api.linkedin.com/rest/adCampaigns/${encodeURIComponent(campaignUrn)}`,
    {
      method: "POST",
      headers: linkedInHeaders(accessToken, { "X-RestLi-Method": "PARTIAL_UPDATE" }),
      body: JSON.stringify({ patch: { $set: { status: "ACTIVE" } } }),
    },
    "Activate"
  );

  if (!response.ok) {
    const errText = await response.text();
    await auditLog(campaign_id, "activate", { status: "error", http: response.status, error: errText });
    return c.json({ success: false, error: `LinkedIn API ${response.status}: ${errText}` }, response.status >= 500 ? 502 : 400);
  }

  console.log(`[Activate] Campaign ${linkedin_campaign_id} activated`);
  const record = await kv.get(`campaign:${campaign_id}`);
  if (record) {
    record.status = "ACTIVE";
    record.activated_at = new Date().toISOString();
    await kv.set(`campaign:${campaign_id}`, record);
  }
  await auditLog(campaign_id, "activate", { status: "success", linkedin_campaign_id });
  return c.json({ success: true });
}

// ACTION 5: Pause Campaign (ACTIVE → PAUSED)
async function handlePause(c: any, body: any) {
  const { campaign_id, linkedin_campaign_id } = body;
  if (!campaign_id || !linkedin_campaign_id) {
    return c.json({ error: "campaign_id e linkedin_campaign_id são obrigatórios" }, 400);
  }

  const { accessToken } = await requireLinkedIn();
  const liCampStr = String(linkedin_campaign_id);
  const campaignUrn = liCampStr.startsWith("urn:") ? liCampStr : `urn:li:sponsoredCampaign:${liCampStr}`;

  console.log(`[Pause] POST /rest/adCampaigns/${encodeURIComponent(campaignUrn)} (PARTIAL_UPDATE → PAUSED)`);
  const response = await fetchWithRetry(
    `https://api.linkedin.com/rest/adCampaigns/${encodeURIComponent(campaignUrn)}`,
    {
      method: "POST",
      headers: linkedInHeaders(accessToken, { "X-RestLi-Method": "PARTIAL_UPDATE" }),
      body: JSON.stringify({ patch: { $set: { status: "PAUSED" } } }),
    },
    "Pause"
  );

  if (!response.ok) {
    const errText = await response.text();
    await auditLog(campaign_id, "pause", { status: "error", http: response.status, error: errText });
    return c.json({ success: false, error: `LinkedIn API ${response.status}: ${errText}` }, response.status >= 500 ? 502 : 400);
  }

  console.log(`[Pause] Campaign ${linkedin_campaign_id} paused`);
  const record = await kv.get(`campaign:${campaign_id}`);
  if (record) {
    record.status = "PAUSED";
    record.paused_at = new Date().toISOString();
    await kv.set(`campaign:${campaign_id}`, record);
  }
  await auditLog(campaign_id, "pause", { status: "success", linkedin_campaign_id });
  return c.json({ success: true });
}

// ACTION 6: Archive Campaign (any status → ARCHIVED)
async function handleArchive(c: any, body: any) {
  const { campaign_id, linkedin_campaign_id } = body;
  if (!campaign_id || !linkedin_campaign_id) {
    return c.json({ error: "campaign_id e linkedin_campaign_id são obrigatórios" }, 400);
  }

  const { accessToken } = await requireLinkedIn();
  const liCampStr = String(linkedin_campaign_id);
  const campaignUrn = liCampStr.startsWith("urn:") ? liCampStr : `urn:li:sponsoredCampaign:${liCampStr}`;

  console.log(`[Archive] POST /rest/adCampaigns/${encodeURIComponent(campaignUrn)} (PARTIAL_UPDATE → ARCHIVED)`);
  const response = await fetchWithRetry(
    `https://api.linkedin.com/rest/adCampaigns/${encodeURIComponent(campaignUrn)}`,
    {
      method: "POST",
      headers: linkedInHeaders(accessToken, { "X-RestLi-Method": "PARTIAL_UPDATE" }),
      body: JSON.stringify({ patch: { $set: { status: "ARCHIVED" } } }),
    },
    "Archive"
  );

  if (!response.ok) {
    const errText = await response.text();
    await auditLog(campaign_id, "archive", { status: "error", http: response.status, error: errText });
    return c.json({ success: false, error: `LinkedIn API ${response.status}: ${errText}` }, response.status >= 500 ? 502 : 400);
  }

  console.log(`[Archive] Campaign ${linkedin_campaign_id} archived`);
  const record = await kv.get(`campaign:${campaign_id}`);
  if (record) {
    record.status = "ARCHIVED";
    record.archived_at = new Date().toISOString();
    await kv.set(`campaign:${campaign_id}`, record);
  }
  await auditLog(campaign_id, "archive", { status: "success", linkedin_campaign_id });
  return c.json({ success: true });
}

// Legacy route — returns HTTP 410 Gone
app.post("/make-server-a4d5bbe0/linkedin/create-campaigns", async (c) => {
  return c.json({
    success: false,
    error: "Rota descontinuada. Use POST /linkedin/campaigns com action=create-campaign-group | create-campaign | upload-image | create-creative | activate",
    migration: "v2→v3",
  }, 410);
});

// ================================================
// LinkedIn — Sync Performance Metrics
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/sync-performance", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const { campaign_id } = await c.req.json();
    const campaignData = await kv.get(`campaign:${campaign_id}`);

    if (!campaignData?.campaign_results) {
      return c.json({ error: "Campanha não encontrada" }, 404);
    }

    const linkedInIds = campaignData.campaign_results
      .filter((r: any) => r.linkedin_campaign_id && r.status === "live")
      .map((r: any) => r.linkedin_campaign_id);

    if (linkedInIds.length === 0) {
      return c.json({ metrics: [] });
    }

    // Fetch analytics from LinkedIn
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const metricsResults = [];
    for (const liId of linkedInIds) {
      try {
        const analyticsUrl = `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&campaigns=List(${encodeURIComponent(liId)})&dateRange=(start:(year:${thirtyDaysAgo.split("-")[0]},month:${parseInt(thirtyDaysAgo.split("-")[1])},day:${parseInt(thirtyDaysAgo.split("-")[2])}),end:(year:${today.split("-")[0]},month:${parseInt(today.split("-")[1])},day:${parseInt(today.split("-")[2])}))&fields=impressions,clicks,costInLocalCurrency`;

        const analyticsResponse = await fetch(analyticsUrl, {
          headers: {
            Authorization: `Bearer ${integration.access_token}`,
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202602",
          },
        });

        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json();
          const el = analyticsData.elements?.[0];
          if (el) {
            metricsResults.push({
              linkedin_campaign_id: liId,
              impressions: el.impressions || 0,
              clicks: el.clicks || 0,
              spend: (el.costInLocalCurrency || 0) / 100,
              ctr: el.impressions > 0 ? ((el.clicks || 0) / el.impressions * 100) : 0,
              cpm: el.impressions > 0 ? ((el.costInLocalCurrency || 0) / el.impressions * 1000 / 100) : 0,
              date_range: { start: thirtyDaysAgo, end: today },
            });
          }
        }
      } catch (metricErr: any) {
        console.log(`[LinkedIn Metrics] Erro para ${liId}:`, metricErr.message);
      }
    }

    return c.json({ metrics: metricsResults });
  } catch (err: any) {
    console.log("[LinkedIn Sync Performance] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ================================================
// Campaigns CRUD via KV
// ================================================
app.get("/make-server-a4d5bbe0/campaigns", async (c) => {
  try {
    const campaigns = await kv.getByPrefix("maestro_campaign:");
    return c.json({ campaigns: campaigns || [] });
  } catch (err: any) {
    console.log("[Campaigns List] Erro:", err.message);
    return c.json({ campaigns: [], error: err.message });
  }
});

app.post("/make-server-a4d5bbe0/campaigns", async (c) => {
  try {
    const campaign = await c.req.json();
    const id = campaign.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const record = {
      ...campaign,
      id,
      created_at: campaign.created_at || now,
      updated_at: now,
    };
    await kv.set(`maestro_campaign:${id}`, record);
    return c.json({ success: true, id, campaign: record });
  } catch (err: any) {
    console.log("[Campaigns Create] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

app.put("/make-server-a4d5bbe0/campaigns/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`maestro_campaign:${id}`);
    if (!existing) {
      return c.json({ error: "Campanha não encontrada" }, 404);
    }
    const updated = { ...existing, ...updates, id, updated_at: new Date().toISOString() };
    await kv.set(`maestro_campaign:${id}`, updated);
    return c.json({ success: true, campaign: updated });
  } catch (err: any) {
    console.log("[Campaigns Update] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

app.delete("/make-server-a4d5bbe0/campaigns/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`maestro_campaign:${id}`);
    return c.json({ success: true });
  } catch (err: any) {
    console.log("[Campaigns Delete] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ================================================
// Integrations status via KV
// ================================================
app.get("/make-server-a4d5bbe0/integrations", async (c) => {
  try {
    const linkedin = await kv.get("linkedin:integration");
    const integrations = [
      {
        provider: "linkedin",
        status: linkedin?.status || "disconnected",
        connected_at: linkedin?.connected_at || null,
        account_name: linkedin?.account_name || null,
      },
    ];
    return c.json({ integrations });
  } catch (err: any) {
    console.log("[Integrations] Erro:", err.message);
    return c.json({ integrations: [], error: err.message });
  }
});

// ================================================
// LinkedIn — Ad Account Billing / Payment Status
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/ad-account-billing", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const adAccountId = integration.selected_ad_account_id;
    if (!adAccountId) {
      return c.json({ error: "Nenhuma Ad Account selecionada", has_billing: false }, 400);
    }

    // Always fetch from LinkedIn API: only servingStatuses tells us whether a
    // payment method is actually configured. account.status === "ACTIVE" only
    // means the account is operational, not that it can run campaigns.
    const accessToken = integration.access_token;
    const adAccStr = String(adAccountId);
    // adAccounts endpoint takes the numeric ID directly, not the URN
    const accountIdPath = adAccStr.startsWith("urn:")
      ? adAccStr.split(":").pop()
      : adAccStr;

    const url = `https://api.linkedin.com/rest/adAccounts/${accountIdPath}?fields=id,name,status,currency,servingStatuses`;
    console.log(`[Billing Check] GET ${url}`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202602",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`[Billing Check] Error ${response.status}: ${errText}`);
      return c.json({
        has_billing: false,
        account_status: "UNKNOWN",
        serving_statuses: [],
        error: `LinkedIn API ${response.status}: ${errText}`,
      });
    }

    const data = await response.json();
    const status = data.status || "UNKNOWN";
    const servingStatuses: string[] = Array.isArray(data.servingStatuses) ? data.servingStatuses : [];

    // BILLING_HOLD is the explicit signal of "no valid payment method".
    // RUNNABLE means LinkedIn will actually serve ads from this account.
    // An account can be ACTIVE but in BILLING_HOLD if the card was removed/expired.
    const isRunnable = servingStatuses.includes("RUNNABLE");
    const onBillingHold = servingStatuses.includes("BILLING_HOLD");
    const hasBilling = isRunnable && !onBillingHold;

    console.log(
      `[Billing Check] Account ${adAccountId} status=${status} serving=[${servingStatuses.join(",")}] has_billing=${hasBilling}`
    );

    return c.json({
      has_billing: hasBilling,
      account_status: status,
      serving_statuses: servingStatuses,
      account_name: data.name || integration.selected_ad_account_name || null,
      account_id: adAccountId,
      currency: data.currency || null,
    });
  } catch (err: any) {
    console.log("[Billing Check] Erro:", err.message);
    return c.json({ has_billing: false, error: err.message }, 500);
  }
});

// ================================================
// LinkedIn — Create Ad Account
// ================================================
app.post("/make-server-a4d5bbe0/linkedin/create-ad-account", async (c) => {
  try {
    const { accessToken } = await requireLinkedIn();
    const { name, currency, reference } = await c.req.json();

    if (!name) {
      return c.json({ error: "Nome da Ad Account é obrigatório" }, 400);
    }

    const payload: Record<string, any> = {
      name,
      type: "BUSINESS",
      test: true,
      currency: currency || "USD",
      notifiedOnCampaignOptimization: true,
      notifiedOnCreativeApproval: true,
      notifiedOnCreativeRejection: true,
      notifiedOnEndOfCampaign: true,
    };

    if (reference) {
      payload.reference = reference;
    }

    console.log(`[Create Ad Account] POST /rest/adAccounts name="${name}" currency=${currency}`);

    const response = await fetchWithRetry(
      "https://api.linkedin.com/rest/adAccounts",
      {
        method: "POST",
        headers: linkedInHeaders(accessToken),
        body: JSON.stringify(payload),
      },
      "Create Ad Account"
    );

    if (!response.ok) {
      const errText = await response.text();
      console.log(`[Create Ad Account] Error ${response.status}: ${errText}`);
      return c.json({ success: false, error: `LinkedIn API ${response.status}: ${errText}` }, response.status >= 500 ? 502 : 400);
    }

    const newAccountId = response.headers.get("x-restli-id") || response.headers.get("x-linkedin-id") || null;
    console.log(`[Create Ad Account] Created: ${newAccountId}`);

    // Invalidate cached accounts so the list refreshes
    await kv.del("linkedin:ad_accounts");

    return c.json({
      success: true,
      ad_account_id: newAccountId,
      name,
      currency: currency || "USD",
    }, 201);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }
    console.log("[Create Ad Account] Erro:", err.message);
    return c.json({ error: `Erro ao criar Ad Account: ${err.message}` }, 500);
  }
});

// ================================================
// Creative Image Upload — Supabase Storage
// ================================================
app.post("/make-server-a4d5bbe0/creative-upload", async (c) => {
  try {
    const { image_base64, filename, content_type } = await c.req.json();
    if (!image_base64) {
      return c.json({ error: "image_base64 é obrigatório" }, 400);
    }

    // Ensure bucket exists (idempotent)
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === CREATIVE_BUCKET);
    if (!bucketExists) {
      console.log(`[Creative Upload] Creating bucket: ${CREATIVE_BUCKET}`);
      await supabaseAdmin.storage.createBucket(CREATIVE_BUCKET, { public: false });
    }

    // Decode base64 to binary
    const binaryStr = atob(image_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const safeName = (filename || "image.png").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const mime = content_type || "image/png";

    console.log(`[Creative Upload] Uploading ${path} (${bytes.byteLength} bytes, ${mime})`);
    const { error: uploadError } = await supabaseAdmin.storage
      .from(CREATIVE_BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (uploadError) {
      console.log(`[Creative Upload] Storage error: ${uploadError.message}`);
      return c.json({ error: `Storage upload failed: ${uploadError.message}` }, 500);
    }

    // Create signed URL valid for 2 hours (enough for pipeline to download)
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(CREATIVE_BUCKET)
      .createSignedUrl(path, 7200);

    if (signedError || !signedData?.signedUrl) {
      console.log(`[Creative Upload] Signed URL error: ${signedError?.message}`);
      return c.json({ error: `Signed URL failed: ${signedError?.message}` }, 500);
    }

    console.log(`[Creative Upload] Success: ${path}`);
    return c.json({ success: true, url: signedData.signedUrl, path, filename: safeName });
  } catch (err: any) {
    console.log("[Creative Upload] Erro:", err.message);
    return c.json({ error: `Erro no upload: ${err.message}` }, 500);
  }
});

// ================================================
// LinkedIn — List Real Campaigns from Ad Account
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/campaigns-list", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado", campaigns: [] }, 401);
    }

    const adAccountId = integration.selected_ad_account_id;
    if (!adAccountId) {
      return c.json({ error: "Nenhuma Ad Account selecionada", campaigns: [] }, 400);
    }

    const accessToken = integration.access_token;
    const adAccStr = String(adAccountId);
    // The ad account goes in the URL path for this endpoint — not inside the
    // search expression. Using POST /rest/adCampaigns with account in search
    // returns FIELD_INVALID on /account.
    const accountIdPath = adAccStr.startsWith("urn:") ? adAccStr.split(":").pop() : adAccStr;

    // Rest.li 2.0 search filter: outer grammar literal, only URNs encoded.
    // For status, the values are plain enum strings, so nothing to encode.
    const searchExpr = `(status:(values:List(ACTIVE,PAUSED,DRAFT,ARCHIVED,CANCELED)))`;
    const endpoint = `https://api.linkedin.com/rest/adAccounts/${accountIdPath}/adCampaigns?q=search&search=${searchExpr}&fields=id,name,status,type,totalBudget,dailyBudget,runSchedule,costType&count=100`;

    console.log(`[LinkedIn Campaigns List] GET ${endpoint}`);
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202602",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`[LinkedIn Campaigns List] API error ${response.status}: ${errText}`);
      return c.json({ campaigns: [], error: `LinkedIn API ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const statusMap: Record<string, string> = {
      ACTIVE: "Active",
      PAUSED: "Paused",
      DRAFT: "Draft",
      ARCHIVED: "Completed",
      CANCELED: "Canceled",
    };

    const campaigns = (data.elements || []).map((el: any) => ({
      id: String(el.id),
      name: el.name || "Sem nome",
      status: statusMap[el.status] || el.status,
      rawStatus: el.status,
      type: el.type || "SPONSORED_UPDATES",
      costType: el.costType || "CPM",
      totalBudget: el.totalBudget
        ? { amount: el.totalBudget.amount, currency: el.totalBudget.currencyCode }
        : null,
      dailyBudget: el.dailyBudget
        ? { amount: el.dailyBudget.amount, currency: el.dailyBudget.currencyCode }
        : null,
      runSchedule: el.runSchedule
        ? { start: el.runSchedule.start || null, end: el.runSchedule.end || null }
        : null,
    }));

    console.log(`[LinkedIn Campaigns List] Returned ${campaigns.length} campaigns`);
    return c.json({ campaigns, currency: integration.selected_ad_account_currency || "USD" });
  } catch (err: any) {
    console.log("[LinkedIn Campaigns List] Erro:", err.message);
    return c.json({ campaigns: [], error: err.message });
  }
});

// ================================================
// LinkedIn — Campaign Analytics Summary (for list)
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/campaign-analytics-summary", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const campaignId = c.req.query("campaignId");
    if (!campaignId) {
      return c.json({ error: "campaignId é obrigatório" }, 400);
    }

    const accessToken = integration.access_token;
    const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;

    const now = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const dateRangeParam = `(start:(year:${start.getFullYear()},month:${start.getMonth() + 1},day:${start.getDate()}),end:(year:${now.getFullYear()},month:${now.getMonth() + 1},day:${now.getDate()}))`;

    const endpoint = `https://api.linkedin.com/rest/adAnalytics?q=statistics&pivots=List(CAMPAIGN)&timeGranularity=ALL&dateRange=${dateRangeParam}&campaigns=List(${encodeURIComponent(campaignUrn)})&fields=impressions,clicks,costInLocalCurrency`;

    console.log(`[Campaign Analytics Summary] GET for campaign ${campaignId}`);
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202602",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`[Campaign Analytics Summary] API error ${response.status}: ${errText}`);
      return c.json({ impressions: 0, clicks: 0, ctr: "0", cost: 0, currency: integration.selected_ad_account_currency || "USD" });
    }

    const data = await response.json();
    const el = (data.elements || [])[0];
    if (!el) {
      return c.json({ impressions: 0, clicks: 0, ctr: "0", cost: 0, currency: integration.selected_ad_account_currency || "USD" });
    }

    const impressions = el.impressions || 0;
    const clicks = el.clicks || 0;
    const cost = parseFloat(el.costInLocalCurrency || "0");
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0";

    return c.json({ impressions, clicks, ctr, cost, currency: integration.selected_ad_account_currency || "USD" });
  } catch (err: any) {
    console.log("[Campaign Analytics Summary] Erro:", err.message);
    return c.json({ impressions: 0, clicks: 0, ctr: "0", cost: 0, error: err.message });
  }
});

// ================================================
// LinkedIn — Campaign Analytics (detailed + time series)
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/campaign-analytics", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const campaignId = c.req.query("campaignId");
    const dateRange = c.req.query("dateRange") || "30d";
    if (!campaignId) {
      return c.json({ error: "campaignId é obrigatório" }, 400);
    }

    const accessToken = integration.access_token;
    const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;
    const currency = integration.selected_ad_account_currency || "USD";

    const now = new Date();
    let daysBack = 30;
    if (dateRange === "7d") daysBack = 7;
    else if (dateRange === "90d") daysBack = 90;
    else if (dateRange === "all") daysBack = 365;
    const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const dateRangeParam = `(start:(year:${start.getFullYear()},month:${start.getMonth() + 1},day:${start.getDate()}),end:(year:${now.getFullYear()},month:${now.getMonth() + 1},day:${now.getDate()}))`;

    const liHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": "202602",
      "X-Restli-Protocol-Version": "2.0.0",
    };

    const totalEndpoint = `https://api.linkedin.com/rest/adAnalytics?q=statistics&pivots=List(CAMPAIGN)&timeGranularity=ALL&dateRange=${dateRangeParam}&campaigns=List(${encodeURIComponent(campaignUrn)})&fields=impressions,clicks,costInLocalCurrency,externalWebsiteConversions,landingPageClicks,dateRange`;
    const dailyEndpoint = `https://api.linkedin.com/rest/adAnalytics?q=statistics&pivots=List(CAMPAIGN)&timeGranularity=DAILY&dateRange=${dateRangeParam}&campaigns=List(${encodeURIComponent(campaignUrn)})&fields=impressions,clicks,costInLocalCurrency,dateRange`;

    const prevStart = new Date(start.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const prevDateRangeParam = `(start:(year:${prevStart.getFullYear()},month:${prevStart.getMonth() + 1},day:${prevStart.getDate()}),end:(year:${start.getFullYear()},month:${start.getMonth() + 1},day:${start.getDate()}))`;
    const prevEndpoint = `https://api.linkedin.com/rest/adAnalytics?q=statistics&pivots=List(CAMPAIGN)&timeGranularity=ALL&dateRange=${prevDateRangeParam}&campaigns=List(${encodeURIComponent(campaignUrn)})&fields=impressions,clicks,costInLocalCurrency,externalWebsiteConversions`;

    console.log(`[Campaign Analytics] Fetching totals+daily+prev for campaign ${campaignId} range=${dateRange}`);

    const [totalRes, dailyRes, prevRes] = await Promise.all([
      fetch(totalEndpoint, { headers: liHeaders }),
      fetch(dailyEndpoint, { headers: liHeaders }),
      fetch(prevEndpoint, { headers: liHeaders }),
    ]);

    let impressions = 0, clicks = 0, cost = 0, conversions = 0;
    if (totalRes.ok) {
      const totalData = await totalRes.json();
      const el = (totalData.elements || [])[0];
      if (el) {
        impressions = el.impressions || 0;
        clicks = el.clicks || 0;
        cost = parseFloat(el.costInLocalCurrency || "0");
        conversions = el.externalWebsiteConversions || 0;
      }
    } else {
      const errText = await totalRes.text();
      console.log(`[Campaign Analytics] Total endpoint error: ${errText}`);
    }

    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + "%" : "0%";
    const cpc = clicks > 0 ? (cost / clicks).toFixed(2) : "0";

    let timeSeries: any[] = [];
    if (dailyRes.ok) {
      const dailyData = await dailyRes.json();
      timeSeries = (dailyData.elements || []).map((el: any) => {
        const dr = el.dateRange?.start;
        const dateStr = dr
          ? `${dr.year}-${String(dr.month).padStart(2, "0")}-${String(dr.day).padStart(2, "0")}`
          : "";
        return { date: dateStr, impressions: el.impressions || 0, clicks: el.clicks || 0 };
      }).sort((a: any, b: any) => a.date.localeCompare(b.date));
    } else {
      const errText = await dailyRes.text();
      console.log(`[Campaign Analytics] Daily endpoint error: ${errText}`);
    }

    let prevImpressions = 0, prevClicks = 0, prevCost = 0, prevConversions = 0;
    let hasPrevData = false;
    if (prevRes.ok) {
      const prevData = await prevRes.json();
      const el = (prevData.elements || [])[0];
      if (el) {
        hasPrevData = true;
        prevImpressions = el.impressions || 0;
        prevClicks = el.clicks || 0;
        prevCost = parseFloat(el.costInLocalCurrency || "0");
        prevConversions = el.externalWebsiteConversions || 0;
      }
    }

    const calcChange = (curr: number, prev: number) => {
      if (!hasPrevData || prev === 0) return null;
      return (((curr - prev) / prev) * 100).toFixed(1);
    };

    return c.json({
      impressions, clicks, cost, ctr, cpc, conversions, currency, timeSeries,
      changes: {
        impressions: calcChange(impressions, prevImpressions),
        clicks: calcChange(clicks, prevClicks),
        cost: calcChange(cost, prevCost),
        conversions: calcChange(conversions, prevConversions),
      },
    });
  } catch (err: any) {
    console.log("[Campaign Analytics] Erro:", err.message);
    return c.json({
      impressions: 0, clicks: 0, cost: 0, ctr: "0%", cpc: "0",
      conversions: 0, currency: "USD", timeSeries: [], changes: {},
      error: err.message,
    });
  }
});

// ================================================
// LinkedIn — Campaign Analytics Full (rich metrics)
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/campaign-analytics-full", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ error: "LinkedIn não conectado" }, 401);
    }

    const campaignId = c.req.query("campaignId");
    const dateRange = c.req.query("dateRange") || "30d";
    if (!campaignId) {
      return c.json({ error: "campaignId é obrigatório" }, 400);
    }

    const accessToken = integration.access_token;
    const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;
    const currency = integration.selected_ad_account_currency || "USD";

    const now = new Date();
    let daysBack = 30;
    if (dateRange === "7d") daysBack = 7;
    else if (dateRange === "90d") daysBack = 90;
    else if (dateRange === "all") daysBack = 365;
    const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const drParam = `(start:(year:${start.getFullYear()},month:${start.getMonth() + 1},day:${start.getDate()}),end:(year:${now.getFullYear()},month:${now.getMonth() + 1},day:${now.getDate()}))`;

    const liHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": "202602",
      "X-Restli-Protocol-Version": "2.0.0",
    };

    const allFields = "impressions,clicks,landingPageClicks,likes,shares,comments,follows,costInLocalCurrency,externalWebsiteConversions,externalWebsitePostClickConversions,externalWebsitePostViewConversions,oneClickLeads,oneClickLeadFormOpens,viralImpressions,viralClicks,viralLikes,viralShares,approximateMemberReach,cardClicks,cardImpressions";
    const dailyFields = "impressions,clicks,costInLocalCurrency,likes,shares,dateRange";

    const totalUrl = `https://api.linkedin.com/rest/adAnalytics?q=statistics&pivots=List(CAMPAIGN)&timeGranularity=ALL&dateRange=${drParam}&campaigns=List(${encodeURIComponent(campaignUrn)})&fields=${allFields}`;
    const dailyUrl = `https://api.linkedin.com/rest/adAnalytics?q=statistics&pivots=List(CAMPAIGN)&timeGranularity=DAILY&dateRange=${drParam}&campaigns=List(${encodeURIComponent(campaignUrn)})&fields=${dailyFields}`;

    const prevStart = new Date(start.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const prevDrParam = `(start:(year:${prevStart.getFullYear()},month:${prevStart.getMonth() + 1},day:${prevStart.getDate()}),end:(year:${start.getFullYear()},month:${start.getMonth() + 1},day:${start.getDate()}))`;
    const prevUrl = `https://api.linkedin.com/rest/adAnalytics?q=statistics&pivots=List(CAMPAIGN)&timeGranularity=ALL&dateRange=${prevDrParam}&campaigns=List(${encodeURIComponent(campaignUrn)})&fields=${allFields}`;

    console.log(`[Campaign Analytics Full] campaign=${campaignId} range=${dateRange}`);

    const [totalRes, dailyRes, prevRes] = await Promise.all([
      fetch(totalUrl, { headers: liHeaders }),
      fetch(dailyUrl, { headers: liHeaders }),
      fetch(prevUrl, { headers: liHeaders }),
    ]);

    const extract = (el: any) => ({
      impressions: el?.impressions || 0,
      clicks: el?.clicks || 0,
      landingPageClicks: el?.landingPageClicks || 0,
      likes: el?.likes || 0,
      shares: el?.shares || 0,
      comments: el?.comments || 0,
      follows: el?.follows || 0,
      costInLocalCurrency: parseFloat(el?.costInLocalCurrency || "0"),
      externalWebsiteConversions: el?.externalWebsiteConversions || 0,
      externalWebsitePostClickConversions: el?.externalWebsitePostClickConversions || 0,
      externalWebsitePostViewConversions: el?.externalWebsitePostViewConversions || 0,
      oneClickLeads: el?.oneClickLeads || 0,
      oneClickLeadFormOpens: el?.oneClickLeadFormOpens || 0,
      viralImpressions: el?.viralImpressions || 0,
      viralClicks: el?.viralClicks || 0,
      viralLikes: el?.viralLikes || 0,
      viralShares: el?.viralShares || 0,
      approximateMemberReach: el?.approximateMemberReach || 0,
      cardClicks: el?.cardClicks || 0,
      cardImpressions: el?.cardImpressions || 0,
    });

    let metrics = extract(null);
    if (totalRes.ok) {
      const d = await totalRes.json();
      metrics = extract((d.elements || [])[0]);
    } else {
      console.log(`[Campaign Analytics Full] Total error: ${await totalRes.text()}`);
    }

    const m = metrics;
    const ctr = m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(2) : "0";
    const cpc = m.clicks > 0 ? (m.costInLocalCurrency / m.clicks).toFixed(2) : "0";
    const cpm = m.impressions > 0 ? ((m.costInLocalCurrency / m.impressions) * 1000).toFixed(2) : "0";
    const engagementRate = m.impressions > 0 ? (((m.clicks + m.likes + m.comments + m.shares + m.follows) / m.impressions) * 100).toFixed(2) : "0";
    const cpl = m.oneClickLeads > 0 ? (m.costInLocalCurrency / m.oneClickLeads).toFixed(2) : null;
    const postClickConvRate = m.clicks > 0 ? ((m.externalWebsitePostClickConversions / m.clicks) * 100).toFixed(2) : "0";
    const viralAmplification = m.impressions > 0 ? ((m.viralImpressions / m.impressions) * 100).toFixed(2) : "0";

    let timeSeries: any[] = [];
    if (dailyRes.ok) {
      const dd = await dailyRes.json();
      timeSeries = (dd.elements || []).map((el: any) => {
        const dr = el.dateRange?.start;
        const dateStr = dr ? `${dr.year}-${String(dr.month).padStart(2, "0")}-${String(dr.day).padStart(2, "0")}` : "";
        return {
          date: dateStr,
          impressions: el.impressions || 0,
          clicks: el.clicks || 0,
          cost: parseFloat(el.costInLocalCurrency || "0"),
          likes: el.likes || 0,
          shares: el.shares || 0,
        };
      }).sort((a: any, b: any) => a.date.localeCompare(b.date));
    } else {
      console.log(`[Campaign Analytics Full] Daily error: ${await dailyRes.text()}`);
    }

    let prevMetrics = extract(null);
    let hasPrev = false;
    if (prevRes.ok) {
      const pd = await prevRes.json();
      const pe = (pd.elements || [])[0];
      if (pe) { prevMetrics = extract(pe); hasPrev = true; }
    }

    const pct = (curr: number, prev: number) => {
      if (!hasPrev || prev === 0) return null;
      return (((curr - prev) / prev) * 100).toFixed(1);
    };

    const delta: Record<string, string | null> = {
      impressions: pct(m.impressions, prevMetrics.impressions),
      clicks: pct(m.clicks, prevMetrics.clicks),
      cost: pct(m.costInLocalCurrency, prevMetrics.costInLocalCurrency),
      likes: pct(m.likes, prevMetrics.likes),
      shares: pct(m.shares, prevMetrics.shares),
      comments: pct(m.comments, prevMetrics.comments),
      follows: pct(m.follows, prevMetrics.follows),
      conversions: pct(m.externalWebsiteConversions, prevMetrics.externalWebsiteConversions),
      oneClickLeads: pct(m.oneClickLeads, prevMetrics.oneClickLeads),
      viralImpressions: pct(m.viralImpressions, prevMetrics.viralImpressions),
      reach: pct(m.approximateMemberReach, prevMetrics.approximateMemberReach),
    };

    return c.json({
      ...m,
      ctr, cpc, cpm, engagementRate, cpl, postClickConvRate, viralAmplification,
      timeSeries, delta, currency,
    });
  } catch (err: any) {
    console.log("[Campaign Analytics Full] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ================================================
// LinkedIn — Campaign Comments
// ================================================
app.get("/make-server-a4d5bbe0/linkedin/campaign-comments", async (c) => {
  try {
    const integration = await kv.get("linkedin:integration");
    if (!integration || integration.status !== "connected") {
      return c.json({ comments: [], total: 0, error: "LinkedIn não conectado" });
    }

    const campaignId = c.req.query("campaignId");
    if (!campaignId) {
      return c.json({ comments: [], total: 0, error: "campaignId é obrigatório" });
    }

    const accessToken = integration.access_token;
    const campaignUrn = `urn:li:sponsoredCampaign:${campaignId}`;
    const liHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": "202504",
      "X-Restli-Protocol-Version": "2.0.0",
    };

    console.log(`[Campaign Comments] Fetching creatives for campaign ${campaignId}`);
    const creativesUrl = `https://api.linkedin.com/rest/adCreatives?q=search&search=(campaign:(values:List(${encodeURIComponent(campaignUrn)})))`;
    const creativesRes = await fetch(creativesUrl, { headers: liHeaders });

    if (!creativesRes.ok) {
      const errText = await creativesRes.text();
      console.log(`[Campaign Comments] Creatives error: ${errText}`);
      return c.json({ comments: [], total: 0, error: `Erro ao buscar creatives: ${creativesRes.status}` });
    }

    const creativesData = await creativesRes.json();
    const creatives = creativesData.elements || [];
    if (creatives.length === 0) {
      return c.json({ comments: [], total: 0, error: "Nenhum creative encontrado para esta campanha" });
    }

    const creative = creatives[0];
    let postUrn: string | null = null;
    if (creative.content?.reference) {
      postUrn = creative.content.reference;
    } else if (creative.content?.inlineContent) {
      postUrn = creative.content.inlineContent?.share || null;
    } else if (creative.reference) {
      postUrn = creative.reference;
    }

    if (!postUrn) {
      console.log(`[Campaign Comments] Creative structure:`, JSON.stringify(creative).slice(0, 500));
      return c.json({ comments: [], total: 0, error: "Não foi possível extrair o post URN do creative" });
    }

    console.log(`[Campaign Comments] Post URN: ${postUrn}`);

    const commentsUrl = `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`;
    const commentsRes = await fetch(commentsUrl, { headers: liHeaders });

    if (!commentsRes.ok) {
      const errText = await commentsRes.text();
      console.log(`[Campaign Comments] Comments error: ${errText}`);
      return c.json({ comments: [], total: 0, post_urn: postUrn, error: `Erro ao buscar comentários: ${commentsRes.status}` });
    }

    const commentsData = await commentsRes.json();
    const rawComments = commentsData.elements || [];

    const comments = rawComments.map((comment: any) => ({
      id: comment["$URN"] || comment.id || "",
      author_name: comment.actor?.name || null,
      author_title: comment.actor?.headline || null,
      text: comment.message?.text || comment.comment || "",
      created_at: comment.created?.time ? new Date(comment.created.time).toISOString() : new Date().toISOString(),
      likes_count: comment.likesSummary?.totalLikes || 0,
      is_reply: !!comment.parentComment,
      parent_comment_id: comment.parentComment || null,
    }));

    return c.json({
      post_urn: postUrn,
      comments,
      total: comments.length,
    });
  } catch (err: any) {
    console.log("[Campaign Comments] Erro:", err.message);
    return c.json({ comments: [], total: 0, error: err.message });
  }
});

// ================================================
// AI — Gemini-powered creative generation
// ================================================
// We extract a "Brand Brief" from each target company's URL (visual cues +
// messaging themes), but the *tone of voice* always comes from the Maestro
// client (the person running the campaign). Brief feeds copy + image
// generation so the creatives reference the target while keeping the
// client's own voice.

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

async function callGeminiText(opts: {
  systemInstruction?: string;
  prompt: string;
  responseSchema?: any;
}): Promise<any> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const body: any = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: 0.7,
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  if (opts.responseSchema) {
    body.generationConfig.responseMimeType = "application/json";
    body.generationConfig.responseSchema = opts.responseSchema;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini text ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (opts.responseSchema) {
    try {
      return JSON.parse(text);
    } catch (_e) {
      throw new Error(`Gemini retornou JSON inválido: ${text.slice(0, 300)}`);
    }
  }
  return text;
}


// Quick scrape of a company homepage — title, meta description, OG tags,
// first H1/H2/H3 and a chunk of visible text. Bounded so unfriendly sites
// (Cloudflare walls, JS-only renders) degrade to "limited signals" instead
// of hanging the request.
async function scrapeCompanySignals(rawUrl: string): Promise<{
  url: string;
  title: string;
  description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  headings: string[];
  body_excerpt: string;
}> {
  let normalized = rawUrl.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(normalized, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MaestroBot/1.0; +https://maestro.abm)" },
      redirect: "follow",
    });
    const html = (await res.text()).slice(0, 80_000);
    const pick = (re: RegExp) => (html.match(re)?.[1] || "").trim();
    const title = pick(/<title[^>]*>([^<]+)<\/title>/i);
    const description = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const og_title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    const og_description = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const og_image = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi))
      .slice(0, 12)
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((s) => s.length > 0 && s.length < 200);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const body_excerpt = text.slice(0, 4000);
    return { url: normalized, title, description, og_title, og_description, og_image, headings, body_excerpt };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------- /ai/brand-brief ----------
app.post("/make-server-a4d5bbe0/ai/brand-brief", async (c) => {
  try {
    const { company_url, company_name, company_domain, force_refresh } = await c.req.json();
    const lookupKey = (company_domain || company_url || company_name || "").toLowerCase();
    if (!lookupKey) {
      return c.json({ error: "company_url, company_domain ou company_name é obrigatório" }, 400);
    }
    const cacheKey = `brand_brief:${lookupKey}`;
    if (!force_refresh) {
      const cached = await kv.get(cacheKey);
      if (cached?.generated_at) {
        console.log(`[Brand Brief] Cache hit for ${lookupKey}`);
        return c.json(cached);
      }
    }

    let signals: any = null;
    let scrape_status: "ok" | "limited" = "ok";
    if (company_url || company_domain) {
      try {
        signals = await scrapeCompanySignals(company_url || company_domain);
      } catch (err: any) {
        console.log(`[Brand Brief] Scrape failed: ${err.message}`);
        scrape_status = "limited";
      }
    } else {
      scrape_status = "limited";
    }

    const briefSchema = {
      type: "object",
      properties: {
        industry: { type: "string" },
        value_proposition: { type: "string" },
        visual_style_keywords: { type: "array", items: { type: "string" } },
        primary_colors: { type: "array", items: { type: "string" } },
        key_messaging_themes: { type: "array", items: { type: "string" } },
        target_persona_hint: { type: "string" },
      },
      required: ["industry", "value_proposition", "visual_style_keywords", "primary_colors", "key_messaging_themes", "target_persona_hint"],
    };

    const promptParts = [
      `Empresa-alvo: ${company_name || "(nome não fornecido)"}`,
      company_url ? `URL: ${company_url}` : "",
      company_domain ? `Domínio: ${company_domain}` : "",
      signals ? `\nSinais coletados do site:` : "\n(Sem acesso ao site — infira a partir do nome.)",
      signals?.title ? `Título: ${signals.title}` : "",
      signals?.description ? `Meta description: ${signals.description}` : "",
      signals?.og_title ? `OG title: ${signals.og_title}` : "",
      signals?.og_description ? `OG description: ${signals.og_description}` : "",
      signals?.headings?.length ? `Headings principais: ${signals.headings.join(" | ")}` : "",
      signals?.body_excerpt ? `Trecho do conteúdo: ${signals.body_excerpt.slice(0, 1500)}` : "",
    ].filter(Boolean).join("\n");

    const systemInstruction = `Você é um analista de marca. Dado um nome de empresa e sinais do site institucional dela, devolva um JSON estruturado descrevendo a identidade visual e a mensagem da empresa.

Diretrizes:
- "industry": setor primário (ex: "Cloud Infrastructure", "Fintech B2B").
- "value_proposition": uma frase curta (até 14 palavras) com a proposta de valor da empresa.
- "visual_style_keywords": 3-6 palavras-chave para o estilo visual (ex: "minimalist", "geometric", "tech", "warm", "high-contrast"). Em inglês.
- "primary_colors": 2-4 cores em hex (#RRGGBB), as cores dominantes da marca. Se não souber, infira pelo setor (mas marque uma estimativa coerente).
- "key_messaging_themes": 3-5 temas centrais da comunicação (ex: "developer productivity", "compliance-first", "real-time data"). Em inglês.
- "target_persona_hint": 1 frase descrevendo o tipo de pessoa-alvo da empresa (ex: "Engineering leaders at Series B+ startups").

NÃO inclua "tone_of_voice" — o tom de voz não é da empresa-alvo. Você está analisando a empresa-alvo apenas para entender o contexto da mensagem.`;

    const generated = await callGeminiText({
      systemInstruction,
      prompt: promptParts,
      responseSchema: briefSchema,
    });

    const result = {
      ...generated,
      scrape_status,
      source_url: signals?.url || company_url || null,
      og_image: signals?.og_image || null,
      generated_at: new Date().toISOString(),
    };

    await kv.set(cacheKey, result);
    console.log(`[Brand Brief] Generated for ${company_name || lookupKey}`);
    return c.json(result);
  } catch (err: any) {
    console.log("[Brand Brief] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ---------- /ai/extract-brand-voice ----------
// Extracts the calling client's tone of voice, 1-2 sentence brand context,
// 2-3 verbatim voice examples, and the brand color palette (primary, secondary,
// accent) from their website. Color hints come from frequency-counted hex/rgb
// occurrences in the HTML/CSS, with neutrals filtered — that's what makes the
// palette match the actual brand instead of generic SaaS blues.
async function fetchHtmlBounded(url: string, timeoutMs = 6000): Promise<string> {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MaestroBot/1.0; +https://maestro.abm)" },
      redirect: "follow",
    });
    return (await res.text()).slice(0, 200_000);
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractColorHints(html: string): { hex: string; count: number }[] {
  const counts = new Map<string, number>();
  const bump = (hex: string) => counts.set(hex, (counts.get(hex) || 0) + 1);
  const hexRe = /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(html))) {
    let h = m[1].toLowerCase();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    bump("#" + h);
  }
  const rgbRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi;
  while ((m = rgbRe.exec(html))) {
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    if ([r, g, b].some((v) => v > 255)) continue;
    bump("#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join(""));
  }
  const isNeutral = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return Math.max(r, g, b) - Math.min(r, g, b) < 15;
  };
  return [...counts.entries()]
    .filter(([h]) => !isNeutral(h))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([hex, count]) => ({ hex, count }));
}

function findAboutLink(html: string, baseUrl: string): string | null {
  let base: URL;
  try { base = new URL(baseUrl); } catch { return null; }
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").toLowerCase();
    if (/sobre|about|quem.somos|n[óo]s|empresa|company|institucional/i.test(text + " " + href)) {
      try {
        const abs = new URL(href, base).toString();
        if (new URL(abs).hostname === base.hostname) return abs;
      } catch { /* ignore */ }
    }
  }
  return null;
}

function signalsBlock(label: string, s: any, bodyChars = 4000): string {
  return [
    `\n===== ${label} (${s.url}) =====`,
    s.title ? `Título: ${s.title}` : "",
    s.description ? `Meta description: ${s.description}` : "",
    s.og_title ? `OG title: ${s.og_title}` : "",
    s.og_description ? `OG description: ${s.og_description}` : "",
    s.headings?.length ? `Headings: ${s.headings.join(" | ")}` : "",
    s.body_excerpt ? `Conteúdo: ${s.body_excerpt.slice(0, bodyChars)}` : "",
  ].filter(Boolean).join("\n");
}

app.post("/make-server-a4d5bbe0/ai/extract-brand-voice", async (c) => {
  try {
    const { website_url } = await c.req.json();
    if (!website_url || typeof website_url !== "string" || !website_url.trim()) {
      return c.json({ error: "website_url é obrigatório" }, 400);
    }

    let homeSignals: any = null;
    let aboutSignals: any = null;
    let colorHints: { hex: string; count: number }[] = [];
    let scrape_status: "ok" | "limited" = "ok";

    try {
      homeSignals = await scrapeCompanySignals(website_url);
      const homeHtml = await fetchHtmlBounded(homeSignals.url);
      colorHints = extractColorHints(homeHtml);
      const aboutUrl = findAboutLink(homeHtml, homeSignals.url);
      if (aboutUrl) {
        try {
          aboutSignals = await scrapeCompanySignals(aboutUrl);
        } catch (err: any) {
          console.log(`[Extract Brand Voice] About scrape failed: ${err.message}`);
        }
      }
    } catch (err: any) {
      console.log(`[Extract Brand Voice] Scrape failed: ${err.message}`);
      scrape_status = "limited";
    }

    const parts: string[] = [];
    if (homeSignals) parts.push(signalsBlock("HOME", homeSignals));
    else parts.push(`URL: ${website_url}\n(Sem acesso ao site — infira a partir da URL/domínio.)`);
    if (aboutSignals) parts.push(signalsBlock("PÁGINA SOBRE", aboutSignals));
    if (colorHints.length) {
      parts.push(
        `\n===== CORES DETECTADAS NO CSS DO SITE (ordenadas por frequência, neutros já filtrados) =====\n${colorHints
          .map((c) => `${c.hex} (${c.count}x)`)
          .join(", ")}`
      );
    }

    const systemInstruction = `Você é um estrategista de marca sênior. Analise o conteúdo institucional fornecido e devolva JSON com:

- "voice": 3-4 frases descrevendo o TOM DE VOZ — registro (formal/informal), uso de jargão, atitude (provocadora, didática, técnica, calorosa), pronome preferido (você/vocês/nós), tipo de argumento (dados, emoção, autoridade). Em português, sem genéricos como "moderno" e "inovador".
- "voice_examples": array com 2-3 FRASES REAIS extraídas do conteúdo que ilustram o tom. Copie verbatim, não parafraseie.
- "brand_context": 1-2 frases sobre o que a empresa vende, para quem, e qual a proposta de valor central. Em português.
- "brand_colors": objeto com "primary", "secondary" e "accent" em hex (ex "#5B3FFF"). Use as CORES DETECTADAS NO CSS como base — escolha as que mais provavelmente representam a identidade visual da marca (primary = cor de marca dominante, accent = cor de CTA/destaque, secondary = cor de apoio). Se as cores detectadas forem insuficientes, complemente com inferência.

Não use markdown. Seja específico e concreto.`;

    const voiceSchema = {
      type: "object",
      properties: {
        voice: { type: "string" },
        voice_examples: { type: "array", items: { type: "string" } },
        brand_context: { type: "string" },
        brand_colors: {
          type: "object",
          properties: {
            primary: { type: "string" },
            secondary: { type: "string" },
            accent: { type: "string" },
          },
          required: ["primary"],
        },
      },
      required: ["voice", "voice_examples", "brand_context", "brand_colors"],
    };

    const generated = await callGeminiText({
      systemInstruction,
      prompt: parts.join("\n"),
      responseSchema: voiceSchema,
    });

    const asStr = (v: unknown) => (typeof v === "string" ? v : "");
    const asStrArr = (v: unknown) => Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    const colors = generated?.brand_colors || {};

    return c.json({
      voice: asStr(generated?.voice),
      voice_examples: asStrArr(generated?.voice_examples),
      brand_context: asStr(generated?.brand_context),
      brand_colors: {
        primary: asStr(colors.primary),
        secondary: asStr(colors.secondary),
        accent: asStr(colors.accent),
      },
      scrape_status,
      source_url: homeSignals?.url || website_url,
      about_url: aboutSignals?.url || null,
    });
  } catch (err: any) {
    console.log("[Extract Brand Voice] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ---------- /ai/generate-copy ----------
app.post("/make-server-a4d5bbe0/ai/generate-copy", async (c) => {
  try {
    const { brand_brief, client_voice, client_brand_colors, target_company_name, objective, cta } = await c.req.json();
    if (!target_company_name) {
      return c.json({ error: "target_company_name é obrigatório" }, 400);
    }
    const colors = client_brand_colors && typeof client_brand_colors === "object" ? client_brand_colors : {};
    const colorLine = [
      colors.primary && `primária ${colors.primary}`,
      colors.secondary && `secundária ${colors.secondary}`,
      colors.accent && `destaque ${colors.accent}`,
    ].filter(Boolean).join(", ");

    const copySchema = {
      type: "object",
      properties: {
        headline: { type: "string" },
        bodyText: { type: "string" },
      },
      required: ["headline", "bodyText"],
    };

    const systemInstruction = `Você é um copywriter sênior de anúncios LinkedIn ABM. Você escreve UM par headline + body para um anúncio direcionado a uma empresa-alvo específica.

REGRAS CRÍTICAS:
- O TOM DE VOZ é do cliente Maestro (o anunciante), descrito em <client_voice>. Mantenha esse tom rigorosamente.
- A MENSAGEM é direcionada à empresa-alvo (target_company_name) e deve usar referências dos "key_messaging_themes" do brief para ressoar com ela.
- Headline: até 150 caracteres, alta conversão, mencione a empresa-alvo OU um problema específico do contexto dela.
- BodyText: até 500 caracteres, 2-3 frases curtas, primeira frase puxa atenção (pode mencionar a empresa-alvo), última frase incentiva o CTA.
- Idioma: português do Brasil, salvo se o tom de voz pedir explicitamente outro idioma.
- NÃO use emojis salvo se o client_voice pedir.
- NÃO invente dados (números, prêmios, citações). Use só o que está no brief.
- Retorne JSON estrito.`;

    const prompt = `<client_voice>
${client_voice || "(tom de voz não especificado — use tom profissional, direto e confiante)"}
</client_voice>

${colorLine ? `<client_brand_palette>\n${colorLine}\n(use como referência visual da marca anunciante — pode mencionar ou aludir à identidade, mas não force descrição literal das cores no texto)\n</client_brand_palette>\n\n` : ""}<target_company>
Nome: ${target_company_name}
Indústria: ${brand_brief?.industry || "?"}
Proposta de valor da empresa-alvo: ${brand_brief?.value_proposition || "?"}
Temas de mensagem que ressoam com ela: ${(brand_brief?.key_messaging_themes || []).join(", ") || "?"}
Persona típica: ${brand_brief?.target_persona_hint || "?"}
</target_company>

<campaign>
Objetivo da campanha: ${objective || "brand_awareness"}
CTA: ${cta || "LEARN_MORE"}
</campaign>

Gere headline e bodyText para este anúncio.`;

    const result = await callGeminiText({
      systemInstruction,
      prompt,
      responseSchema: copySchema,
    });
    return c.json(result);
  } catch (err: any) {
    console.log("[Generate Copy] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ---------- Image composition shared helpers ----------
// Both /ai/generate-base-image and /ai/compose-logo-overlay use Nano Banana 2
// (gemini-3.1-flash-image-preview). The base-image endpoint produces a single
// reusable canvas without overlays; the compose endpoint takes that canvas
// and asks the model to paint texts + the target company's logo on top.

const GEMINI_COMPOSE_MODEL = "gemini-3.1-flash-image-preview";

async function fetchAsBase64(url: string): Promise<{ base64: string; mime: string } | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || "image/png";
    const buf = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < buf.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + chunkSize)));
    }
    return { base64: btoa(binary), mime };
  } catch (_e) {
    return null;
  }
}

// Generate plausible domain variants for a single domain. Solves cases like
// itau.com.br → 404 on logo.dev but itau.com → 200. Order matters: variants
// most likely to match the brand's primary registration come first.
function domainVariants(domain: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (d: string) => {
    if (d && !seen.has(d)) { seen.add(d); out.push(d); }
  };
  push(domain);
  // Brazilian sites often have global .com counterparts in logo.dev's index
  // even when the .com.br resolves nowhere.
  if (domain.endsWith(".com.br")) {
    const stem = domain.slice(0, -".com.br".length);
    push(`${stem}.com`);
    push(`${stem}-unibanco.com`); // hand-tuned for orgs with two-word names
  } else if (domain.endsWith(".com")) {
    push(`${domain}.br`);
  }
  return out;
}

// Try multiple sources to fetch a usable raster of a company logo. logo.dev
// sometimes returns SVG; we want a bitmap so the model receives a clean
// reference image. Tries domain variants on logo.dev before falling back
// to Clearbit / Google Favicons (which have weaker BR coverage).
async function fetchCompanyLogoRaster(domain: string): Promise<{ base64: string; mime: string } | null> {
  for (const variant of domainVariants(domain)) {
    const url = `https://img.logo.dev/${encodeURIComponent(variant)}?token=${LOGO_DEV_KEY}`;
    const result = await fetchAsBase64(url);
    if (result && result.mime.startsWith("image/") && !result.mime.includes("svg")) {
      if (variant !== domain) console.log(`[Logo] logo.dev hit on variant "${variant}" for "${domain}"`);
      return result;
    }
  }
  const fallbacks = [
    `https://logo.clearbit.com/${encodeURIComponent(domain)}`,
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
  ];
  for (const url of fallbacks) {
    const result = await fetchAsBase64(url);
    if (result && result.mime.startsWith("image/") && !result.mime.includes("svg")) {
      return result;
    }
  }
  return null;
}

// When the LinkedIn typeahead-derived FacetItem has no domain (the lazy
// enrichment hasn't run, or selection happened before hover), guess from
// the company name. Tries common TLDs — first match wins.
async function resolveCompanyLogoByName(name: string): Promise<{ logo: { base64: string; mime: string }; domain: string } | null> {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
  if (!slug) return null;
  const candidates = [`${slug}.com`, `${slug}.com.br`, `${slug}.io`, `${slug}.co`, `${slug}.net`];
  for (const candidate of candidates) {
    const logo = await fetchCompanyLogoRaster(candidate);
    if (logo) return { logo, domain: candidate };
  }
  return null;
}

// Resolve a target company logo with progressive fallbacks: explicit domain,
// then best-guess from the name. Returns null if everything fails.
async function resolveTargetLogo(
  name: string,
  domain: string | null | undefined,
): Promise<{ base64: string; mime: string } | null> {
  if (domain) {
    const direct = await fetchCompanyLogoRaster(domain);
    if (direct) return direct;
  }
  const guess = await resolveCompanyLogoByName(name);
  if (guess) {
    console.log(`[Logo] Resolved "${name}" via guessed domain: ${guess.domain}`);
    return guess.logo;
  }
  console.log(`[Logo] No logo found for "${name}" (domain=${domain || "-"})`);
  return null;
}

// Save a raw image buffer to Storage and return a 2h signed URL. Shared by
// both image endpoints below.
async function saveImageToStorage(
  bytes: Uint8Array,
  mime: string,
  pathPrefix: string,
  safeLabel: string,
): Promise<{ url: string; path: string; filename: string }> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.some((b: any) => b.name === CREATIVE_BUCKET)) {
    await supabaseAdmin.storage.createBucket(CREATIVE_BUCKET, { public: false });
  }
  const ext = mime.includes("jpeg") ? "jpg" : "png";
  const path = `${pathPrefix}/${crypto.randomUUID()}-${safeLabel}.${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(CREATIVE_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from(CREATIVE_BUCKET)
    .createSignedUrl(path, 7200);
  if (signedError || !signed?.signedUrl) throw new Error(`Signed URL failed: ${signedError?.message}`);
  return { url: signed.signedUrl, path, filename: `${safeLabel}.${ext}` };
}

// Call Nano Banana 2 with text + optional reference images, return the first
// inlineData image part. Throws on API/parse errors.
async function callGeminiImageCompose(
  prompt: string,
  refImages: Array<{ base64: string; mime: string }>,
): Promise<{ base64: string; mime: string }> {
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor");
  const parts: any[] = [{ text: prompt }];
  for (const img of refImages) {
    parts.push({ inlineData: { data: img.base64, mimeType: img.mime } });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_COMPOSE_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }] }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini compose ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  for (const p of respParts) {
    if (p.inlineData?.data) {
      return { base64: p.inlineData.data, mime: p.inlineData.mimeType || "image/png" };
    }
  }
  throw new Error("Gemini não retornou imagem");
}

// ---------- /ai/generate-base-image ----------
// Generates a single reusable base image for the campaign — same canvas is
// reused across every target company. The mode controls visual style: a
// realistic editorial photograph or an abstract illustrative graphic.
app.post("/make-server-a4d5bbe0/ai/generate-base-image", async (c) => {
  try {
    const { mode, client_brand_context, prompt_brief } = await c.req.json();
    const styleMode: "photo_ai" | "graphic_ai" = mode === "photo_ai" ? "photo_ai" : "graphic_ai";

    const styleDirective = styleMode === "photo_ai"
      ? `Style: REALISTIC EDITORIAL CORPORATE PHOTOGRAPHY. Real people, natural lighting, shallow depth of field, candid yet polished. Avoid stock-photo clichés (forced handshakes, awkward thumbs-up, fake smiles, pointing at screens). No illustration. No 3D render. No abstract shapes. Pure photography.`
      : `Style: CLEAN EDITORIAL ILLUSTRATION or abstract conceptual graphic. Geometric, minimalist, vector-feel. Avoid photorealistic people. No stock-photo clichés. No UI mockups.`;

    const prompt = `Generate a single LinkedIn-style B2B advertisement BASE IMAGE for an ABM campaign.

Aspect ratio: 1.91:1, suitable for 1200x628 pixels. Landscape composition.

CRITICAL: do NOT render any text, words, letters, numbers, logos, or watermarks. The image is a clean canvas — text and logos will be added programmatically afterwards. Leave generous negative space (especially in the corners and across the top third) so overlays don't compete with subjects.

${client_brand_context ? `Advertiser brand context (the company running the ads): ${client_brand_context}` : ""}
${prompt_brief ? `Specific direction for this image: ${prompt_brief}` : ""}

${styleDirective}`;

    const generated = await callGeminiImageCompose(prompt, []);

    const binaryStr = atob(generated.base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const stored = await saveImageToStorage(bytes, generated.mime, "base", `base-${styleMode}`);

    return c.json({ success: true, url: stored.url, path: stored.path, filename: stored.filename, mode: styleMode });
  } catch (err: any) {
    console.log("[Generate Base Image] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ---------- /ai/compose-logo-overlay ----------
// Composes the headline, secondary line, and target-company logo on top of the
// base image deterministically: SVG → PNG via resvg-wasm. Same dimensions and
// styling on every call, so ads across multiple targets stay visually
// consistent. Replaced an earlier Nano Banana 2 prompt that produced varying
// text sizes between generations.

let resvgReady: Promise<void> | null = null;
async function ensureResvg(): Promise<void> {
  if (!resvgReady) {
    resvgReady = (async () => {
      const res = await fetch(RESVG_WASM_URL);
      if (!res.ok) throw new Error(`Failed to fetch resvg wasm: HTTP ${res.status}`);
      const bytes = await res.arrayBuffer();
      await initWasm(bytes);
    })();
  }
  return resvgReady;
}

// Cache of TTF bytes by `${family}|${weight}`. Lives in the edge function
// memory; warm starts avoid the ~300ms Google Fonts roundtrip.
const fontCache = new Map<string, Uint8Array>();

async function loadGoogleFont(family: string, weight: 400 | 700): Promise<Uint8Array> {
  const key = `${family}|${weight}`;
  const cached = fontCache.get(key);
  if (cached) return cached;

  // The Google Fonts CSS endpoint returns woff2 by default for modern UAs.
  // resvg-wasm only consumes TTF/OTF, so spoof an older UA to get TTF urls.
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssRes = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ttf-fetch)" },
  });
  if (!cssRes.ok) {
    throw new Error(`Google Fonts CSS error ${cssRes.status} for ${family} (${weight})`);
  }
  const css = await cssRes.text();
  const match = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
  if (!match) {
    throw new Error(`No TTF url found in Google Fonts CSS for ${family} (${weight})`);
  }
  const ttfRes = await fetch(match[1]);
  if (!ttfRes.ok) {
    throw new Error(`TTF download error ${ttfRes.status} for ${family} (${weight})`);
  }
  const bytes = new Uint8Array(await ttfRes.arrayBuffer());
  fontCache.set(key, bytes);
  return bytes;
}

const CANVAS_W = 1200;
const CANVAS_H = 628;
const HEADLINE_FONT_PX = 56;
const SECONDARY_FONT_PX = 28;
const BOX_PAD_X = 22;
const BOX_PAD_Y = 12;
const BOX_RADIUS = 14;
const BOX_FILL = "rgba(0,0,0,0.55)";
const TEXT_COLOR = "#FFFFFF";
const TEXT_X = 48;
const TEXT_TOP = 48;
const STACK_GAP = 10;
const LOGO_CARD_W = 140;
const LOGO_CARD_PAD = 14;
const LOGO_CARD_RADIUS = 14;
const LOGO_CARD_RIGHT = 48;
const LOGO_CARD_TOP = 36;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function renderOverlayPng(opts: {
  baseImageBase64: string;
  baseImageMime: string;
  fontFamily: string;
  destaque: string;
  complementar: string;
  logoBase64: string | null;
  logoMime: string | null;
}): Promise<Uint8Array> {
  await ensureResvg();

  const fontTasks: Array<Promise<Uint8Array>> = [loadGoogleFont(opts.fontFamily, 700)];
  if (opts.complementar) fontTasks.push(loadGoogleFont(opts.fontFamily, 400));
  const fontBuffers = await Promise.all(fontTasks);

  // Approximate text width — enough to size the rounded box around it. Sans
  // glyphs average ~0.55em advance in upper/lower mix; slightly generous so
  // boxes never clip the actual rendered text.
  const estimateWidth = (text: string, sizePx: number) =>
    Math.ceil(text.length * sizePx * 0.55);

  const headlineWidth = estimateWidth(opts.destaque, HEADLINE_FONT_PX);
  const secondaryWidth = estimateWidth(opts.complementar, SECONDARY_FONT_PX);
  const headlineBoxW = headlineWidth + BOX_PAD_X * 2;
  const secondaryBoxW = secondaryWidth + BOX_PAD_X * 2;
  const headlineBoxH = HEADLINE_FONT_PX + BOX_PAD_Y * 2;
  const secondaryBoxH = SECONDARY_FONT_PX + BOX_PAD_Y * 2;

  const headlineY = TEXT_TOP;
  const secondaryY = headlineY + headlineBoxH + STACK_GAP;

  const baseDataUrl = `data:${opts.baseImageMime};base64,${opts.baseImageBase64}`;

  let logoSvg = "";
  if (opts.logoBase64 && opts.logoMime) {
    const cardX = CANVAS_W - LOGO_CARD_RIGHT - LOGO_CARD_W;
    const cardY = LOGO_CARD_TOP;
    const logoX = cardX + LOGO_CARD_PAD;
    const logoY = cardY + LOGO_CARD_PAD;
    const logoSize = LOGO_CARD_W - LOGO_CARD_PAD * 2;
    logoSvg = `
    <rect x="${cardX}" y="${cardY}" width="${LOGO_CARD_W}" height="${LOGO_CARD_W}" rx="${LOGO_CARD_RADIUS}" ry="${LOGO_CARD_RADIUS}" fill="#FFFFFF" filter="url(#cardShadow)"/>
    <image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" href="data:${opts.logoMime};base64,${opts.logoBase64}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const secondarySvg = opts.complementar
    ? `
    <rect x="${TEXT_X}" y="${secondaryY}" width="${secondaryBoxW}" height="${secondaryBoxH}" rx="${BOX_RADIUS}" ry="${BOX_RADIUS}" fill="${BOX_FILL}"/>
    <text x="${TEXT_X + BOX_PAD_X}" y="${secondaryY + BOX_PAD_Y + SECONDARY_FONT_PX * 0.8}" font-family="${escapeXml(opts.fontFamily)}" font-weight="400" font-size="${SECONDARY_FONT_PX}" fill="${TEXT_COLOR}">${escapeXml(opts.complementar)}</text>`
    : "";

  const headlineSvg = opts.destaque
    ? `
    <rect x="${TEXT_X}" y="${headlineY}" width="${headlineBoxW}" height="${headlineBoxH}" rx="${BOX_RADIUS}" ry="${BOX_RADIUS}" fill="${BOX_FILL}"/>
    <text x="${TEXT_X + BOX_PAD_X}" y="${headlineY + BOX_PAD_Y + HEADLINE_FONT_PX * 0.8}" font-family="${escapeXml(opts.fontFamily)}" font-weight="700" font-size="${HEADLINE_FONT_PX}" fill="${TEXT_COLOR}">${escapeXml(opts.destaque)}</text>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.18"/>
    </filter>
  </defs>
  <image x="0" y="0" width="${CANVAS_W}" height="${CANVAS_H}" href="${baseDataUrl}" preserveAspectRatio="xMidYMid slice"/>${headlineSvg}${secondarySvg}${logoSvg}
</svg>`;

  const resvg = new Resvg(svg, {
    font: {
      fontBuffers,
      defaultFontFamily: opts.fontFamily,
      loadSystemFonts: false,
    },
    background: "rgba(255,255,255,0)",
    fitTo: { mode: "width", value: CANVAS_W },
  });
  return resvg.render().asPng();
}

app.post("/make-server-a4d5bbe0/ai/compose-logo-overlay", async (c) => {
  try {
    const body = await c.req.json();
    const {
      base_image_url,
      target_company_name,
      target_company_domain,
      show_target_logo = true,
      texto_destaque = "",
      texto_complementar = "",
      font_family = "Inter",
    } = body;
    if (!base_image_url) return c.json({ error: "base_image_url é obrigatório" }, 400);
    if (!target_company_name) return c.json({ error: "target_company_name é obrigatório" }, 400);

    const baseImg = await fetchAsBase64(base_image_url);
    if (!baseImg) return c.json({ error: "Não foi possível baixar a imagem base" }, 500);

    let logoImg: { base64: string; mime: string } | null = null;
    if (show_target_logo) {
      logoImg = await resolveTargetLogo(target_company_name, target_company_domain || null);
    }

    const png = await renderOverlayPng({
      baseImageBase64: baseImg.base64,
      baseImageMime: baseImg.mime,
      fontFamily: font_family,
      destaque: (texto_destaque || "").trim(),
      complementar: (texto_complementar || "").trim(),
      logoBase64: logoImg?.base64 ?? null,
      logoMime: logoImg?.mime ?? null,
    });

    const safeTarget = target_company_name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
    const stored = await saveImageToStorage(png, "image/png", "overlay", `overlay-${safeTarget}`);

    return c.json({
      success: true,
      url: stored.url,
      path: stored.path,
      filename: stored.filename,
      logo_applied: !!logoImg,
    });
  } catch (err: any) {
    console.log("[Compose Overlay] Erro:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

// ---------- /ai/client-voice (GET/POST) ----------
// Persists the calling client's tone-of-voice description. Single-tenant for
// now; revisit if/when workspaces are introduced.
app.get("/make-server-a4d5bbe0/ai/client-voice", async (c) => {
  const stored = await kv.get("ai:client_voice");
  return c.json({
    voice: stored?.voice ?? "",
    brand_context: stored?.brand_context ?? "",
    website_url: stored?.website_url ?? "",
    product_service: stored?.product_service ?? "",
    audience_market: stored?.audience_market ?? "",
    persona: stored?.persona ?? "",
    brand_colors: stored?.brand_colors ?? { primary: "", secondary: "", accent: "" },
    updated_at: stored?.updated_at ?? null,
  });
});

app.post("/make-server-a4d5bbe0/ai/client-voice", async (c) => {
  try {
    const { voice, brand_context, website_url, product_service, audience_market, persona, brand_colors } = await c.req.json();
    const asStr = (v: unknown) => (typeof v === "string" ? v : "");
    const colors = brand_colors && typeof brand_colors === "object" ? brand_colors : {};
    const record = {
      voice: asStr(voice),
      brand_context: asStr(brand_context),
      website_url: asStr(website_url),
      product_service: asStr(product_service),
      audience_market: asStr(audience_market),
      persona: asStr(persona),
      brand_colors: {
        primary: asStr(colors.primary),
        secondary: asStr(colors.secondary),
        accent: asStr(colors.accent),
      },
      updated_at: new Date().toISOString(),
    };
    await kv.set("ai:client_voice", record);
    return c.json(record);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

Deno.serve(app.fetch);