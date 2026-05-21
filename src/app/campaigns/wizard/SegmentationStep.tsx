import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  Building2,
  MapPin,
  Target,
  Briefcase,
  User,
  Factory,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Info,
  ExternalLink,
  Globe,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  fetchSimilarEntities,
  fetchOrgLogos,
  enrichOrganization,
} from "@/lib/linkedin";
import type { EnrichedOrganization } from "@/lib/linkedin";
import {
  SENIORITY_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  EXPERIENCE_OPTIONS,
} from "./segmentation/linkedinFacets";
import {
  emptySelection,
  countSelections,
  buildTargetingCriteria,
  createEmptyTargeting,
  FACET_URN_MAP,
} from "./segmentation/targeting";
import { useAudienceCount } from "./segmentation/useAudienceCount";
import { useLinkedInTypeahead } from "./segmentation/useLinkedInTypeahead";
import type { LinkedInFacetType } from "./segmentation/useLinkedInTypeahead";
import type { FacetItem, FacetSelection, TargetingData } from "./segmentation/types";
import { projectId } from "@/utils/supabase/info";

const LOGO_PROXY_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0/logo-proxy`;

// Re-export so existing importers (CampaignWizard, CreativeStep, OrchestrationStep)
// don't break — the public surface of this module stays the same.
export type { FacetItem, FacetSelection, TargetingData };
export { buildTargetingCriteria, createEmptyTargeting, FACET_URN_MAP };

interface SegmentationStepProps {
  data: TargetingData;
  onChange: (data: TargetingData) => void;
}

// ===============================
// Company Logo Fallback
// ===============================

function CompanyLogo({
  item,
  size = "md",
  resolvedUrl,
  skeleton,
}: {
  item: FacetItem;
  size?: "sm" | "md" | "lg";
  resolvedUrl?: string | null;
  skeleton?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const prevSrcRef = useRef<string>("");

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  // Best source: resolvedUrl from LinkedIn API > item.logoUrl fallback
  const logoSrc = resolvedUrl || item.logoUrl || "";

  // Reset error state when the URL changes (critical: allows LinkedIn logo to show after Clearbit fails)
  if (logoSrc && logoSrc !== prevSrcRef.current) {
    prevSrcRef.current = logoSrc;
    if (imgError) setImgError(false);
  }

  if (skeleton) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-xl bg-gray-200 animate-pulse border border-slate-200`}
      />
    );
  }

  if (logoSrc && !imgError) {
    return (
      <img
        key={logoSrc}
        src={logoSrc}
        alt={item.label}
        className={`${sizeClasses[size]} rounded-xl object-contain bg-white border border-slate-200 p-0.5`}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold border border-blue-300`}
    >
      {item.label.charAt(0).toUpperCase()}
    </div>
  );
}


// ===============================
// Company Hero Card (prominent)
// ===============================

interface CompanyHeroCardProps {
  selection: FacetSelection;
  onSelectionChange: (sel: FacetSelection) => void;
}

function CompanyHeroCard({
  selection,
  onSelectionChange,
}: CompanyHeroCardProps) {
  const [mode, setMode] = useState<"include" | "exclude">(
    "include",
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typeahead = useLinkedInTypeahead("companies");

  // Similar Entities state
  const [similarCompanies, setSimilarCompanies] = useState<
    FacetItem[]
  >([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarExpanded, setSimilarExpanded] = useState(false);
  const prevUrnsRef = useRef<string>("");

  // ---- Logo lazy loading with cache ----
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const logoCache = useRef<Map<string, string | null>>(new Map());

  // Also fetch logos for selected companies that don't have cached logos
  useEffect(() => {
    const allSelected = [
      ...selection.included,
      ...selection.excluded,
    ];
    const uncachedIds: string[] = [];
    for (const item of allSelected) {
      const urn = item.urn || "";
      if (urn && !logoCache.current.has(urn)) {
        const orgId = urn.replace("urn:li:organization:", "");
        if (orgId && orgId !== urn) uncachedIds.push(orgId);
      }
    }
    if (uncachedIds.length === 0) return;
    fetchOrgLogos(uncachedIds)
      .then((fetchedLogos) => {
        Object.entries(fetchedLogos).forEach(([urn, url]) => {
          logoCache.current.set(urn, url);
        });
        const merged: Record<string, string | null> = {};
        logoCache.current.forEach((url, urn) => {
          merged[urn] = url;
        });
        setLogos((prev) => ({ ...prev, ...merged }));
      })
      .catch(() => {});
  }, [selection.included.length, selection.excluded.length]);

  // ---- Enrichment state ----
  // Map: urn → EnrichedOrganization | 'loading'
  const [enrichedOrgs, setEnrichedOrgs] = useState<
    Record<string, EnrichedOrganization | "loading">
  >({});
  const enrichCache = useRef<Map<string, EnrichedOrganization>>(
    new Map(),
  );

  // Refs so triggerEnrichment can read the latest selection/handler without
  // invalidating its identity (which would re-fire pre-warm/mount effects).
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  const triggerEnrichment = useCallback(
    async (item: FacetItem) => {
      const urn = item.urn || "";
      if (!urn || !urn.startsWith("urn:li:organization:"))
        return;

      // Check local cache
      if (enrichCache.current.has(urn)) {
        const cached = enrichCache.current.get(urn)!;
        setEnrichedOrgs((prev) => ({ ...prev, [urn]: cached }));
        // Hydrate selection if a cached enrichment exists but the item was
        // selected before its domain landed.
        if (cached.domain) {
          const currentSel = selectionRef.current;
          const needsPatch =
            currentSel.included.some((i) => i.urn === urn && !i.domain) ||
            currentSel.excluded.some((i) => i.urn === urn && !i.domain);
          if (needsPatch) {
            const proxyLogoUrl = `${LOGO_PROXY_BASE}?domain=${encodeURIComponent(cached.domain)}`;
            const patch = (list: FacetItem[]) =>
              list.map((i) =>
                i.urn === urn
                  ? { ...i, domain: cached.domain || i.domain, logoUrl: proxyLogoUrl }
                  : i,
              );
            onSelectionChangeRef.current({
              included: patch(currentSel.included),
              excluded: patch(currentSel.excluded),
            });
          }
        }
        return;
      }

      // Mark as loading
      setEnrichedOrgs((prev) => ({
        ...prev,
        [urn]: "loading",
      }));

      const orgId = urn.replace("urn:li:organization:", "");
      const result = await enrichOrganization(orgId);

      if (result) {
        enrichCache.current.set(urn, result);
        setEnrichedOrgs((prev) => ({ ...prev, [urn]: result }));

        if (result.domain) {
          const logoUrl = `https://img.logo.dev/${result.domain}?token=${import.meta.env.VITE_LOGO_DEV_KEY}`;
          logoCache.current.set(urn, logoUrl);
          setLogos((prev) => ({ ...prev, [urn]: logoUrl }));

          // Hydrate the FacetItem inside the user's selection so downstream
          // steps (CreativeStep → compose-logo-overlay) get the real domain
          // instead of a name-based guess that often misses (e.g. "Itaú
          // Unibanco" → itau.com.br, not itauunibanco.com). Also refresh
          // logoUrl so the CreativeStep list shows the right logo.
          const currentSel = selectionRef.current;
          const hasItem =
            currentSel.included.some((i) => i.urn === urn) ||
            currentSel.excluded.some((i) => i.urn === urn);
          if (hasItem) {
            const proxyLogoUrl = `${LOGO_PROXY_BASE}?domain=${encodeURIComponent(result.domain)}`;
            const patch = (list: FacetItem[]) =>
              list.map((i) =>
                i.urn === urn
                  ? { ...i, domain: result.domain || i.domain, logoUrl: proxyLogoUrl }
                  : i,
              );
            onSelectionChangeRef.current({
              included: patch(currentSel.included),
              excluded: patch(currentSel.excluded),
            });
          }
        }
      } else {
        // Remove loading state on failure
        setEnrichedOrgs((prev) => {
          const next = { ...prev };
          delete next[urn];
          return next;
        });
      }
    },
    [],
  );

  // Pre-warm enrichment for the first 3 results as soon as the dropdown opens.
  // The rest are enriched on hover via onMouseEnter → triggerEnrichment().
  useEffect(() => {
    if (!typeahead.isOpen || typeahead.results.length === 0) return;
    const top3 = typeahead.results.slice(0, 3);
    for (const item of top3) {
      if (item.urn && !enrichCache.current.has(item.urn)) {
        triggerEnrichment(item);
      }
    }
  }, [typeahead.results, typeahead.isOpen, triggerEnrichment]);

  // Enrich any already-selected companies on mount
  useEffect(() => {
    const allSelected = [
      ...selection.included,
      ...selection.excluded,
    ];
    for (const item of allSelected) {
      if (
        item.urn &&
        item.urn.startsWith("urn:li:organization:") &&
        !enrichCache.current.has(item.urn)
      ) {
        triggerEnrichment(item);
      }
    }
  }, []); // Only on mount

  // Fetch similar entities when included companies change
  useEffect(() => {
    const urns = selection.included
      .map((i) => i.urn)
      .filter(Boolean)
      .sort()
      .join(",");

    if (urns === prevUrnsRef.current) return;
    prevUrnsRef.current = urns;

    if (selection.included.length === 0) {
      setSimilarCompanies([]);
      return;
    }

    const entityUrns = selection.included
      .map((i) => i.urn)
      .filter(Boolean) as string[];
    if (entityUrns.length === 0) return;

    setLoadingSimilar(true);
    fetchSimilarEntities(entityUrns)
      .then((results) => {
        // Filter out already selected companies
        const selectedIds = new Set(
          selection.included.map((i) => i.id),
        );
        const selectedUrns = new Set(
          selection.included.map((i) => i.urn),
        );
        const mapped: FacetItem[] = results
          .filter((r) => !selectedUrns.has(r.urn))
          .map((r) => {
            const orgId = r.urn.split(":").pop() || "";
            const nameLower = r.name
              .toLowerCase()
              .replace(/\s+/g, "");
            return {
              id: orgId || r.urn,
              label: r.name,
              urn: r.urn,
              logoUrl: `https://img.logo.dev/${nameLower}.com?token=${import.meta.env.VITE_LOGO_DEV_KEY}`,
            };
          })
          .filter((item) => !selectedIds.has(item.id));
        setSimilarCompanies(mapped.slice(0, 12));
        if (mapped.length > 0) setSimilarExpanded(true);
      })
      .catch(() => setSimilarCompanies([]))
      .finally(() => setLoadingSimilar(false));
  }, [selection.included]);

  const addItem = useCallback(
    (item: FacetItem) => {
      const newSel = { ...selection };
      if (mode === "include") {
        newSel.excluded = newSel.excluded.filter(
          (i) => i.id !== item.id,
        );
        if (!newSel.included.find((i) => i.id === item.id)) {
          newSel.included = [...newSel.included, item];
        }
      } else {
        newSel.included = newSel.included.filter(
          (i) => i.id !== item.id,
        );
        if (!newSel.excluded.find((i) => i.id === item.id)) {
          newSel.excluded = [...newSel.excluded, item];
        }
      }
      onSelectionChange(newSel);
      // Fire enrichment in background (non-blocking)
      triggerEnrichment(item);
    },
    [mode, selection, onSelectionChange, triggerEnrichment],
  );

  const removeItem = useCallback(
    (item: FacetItem, from: "included" | "excluded") => {
      const newSel = { ...selection };
      if (from === "included") {
        newSel.included = newSel.included.filter(
          (i) => i.id !== item.id,
        );
      } else {
        newSel.excluded = newSel.excluded.filter(
          (i) => i.id !== item.id,
        );
      }
      onSelectionChange(newSel);
    },
    [selection, onSelectionChange],
  );

  const isSelected = useCallback(
    (itemId: string): "included" | "excluded" | null => {
      if (selection.included.find((i) => i.id === itemId))
        return "included";
      if (selection.excluded.find((i) => i.id === itemId))
        return "excluded";
      return null;
    },
    [selection],
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        typeahead.setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () =>
      document.removeEventListener("mousedown", handleClick);
  }, []);

  const { inc, exc } = countSelections(selection);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-md overflow-visible">
      {/* Hero Header */}
      <div className="px-6 py-5 border-b border-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-800">
                  Empresas-alvo
                </h3>
                <span className="text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">
                  ABM
                </span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Selecione as empresas que deseja atingir com sua
                campanha ABM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inc > 0 && (
              <span className="text-xs font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full shadow-sm">
                {inc} empresa{inc !== 1 ? "s" : ""}
              </span>
            )}
            {exc > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                {exc} excluida{exc !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search + Controls */}
      <div className="px-6 py-4 space-y-4">
        {/* Include / Exclude toggle */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("include")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === "include"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Incluir
            </button>
            <button
              onClick={() => setMode("exclude")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === "exclude"
                  ? "bg-red-600 text-white shadow-md shadow-red-200"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Typeahead com dados da LinkedIn API</span>
          </div>
        </div>

        {/* Typeahead Search */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            {typeahead.isLoading ? (
              <Loader2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
            ) : (
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
            <input
              type="text"
              value={typeahead.query}
              onChange={(e) =>
                typeahead.setQuery(e.target.value)
              }
              onFocus={() =>
                typeahead.query.length >= 2 &&
                typeahead.setIsOpen(true)
              }
              placeholder="Buscar empresa por nome ou dominio..."
              className="w-full pl-12 pr-4 py-3.5 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* Loading indicator */}
          {typeahead.isLoading &&
            typeahead.query.length >= 2 && (
              <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                Buscando organizacoes no LinkedIn...
              </div>
            )}

          {/* Dropdown with company logos */}
          {typeahead.isOpen &&
            !typeahead.isLoading &&
            typeahead.results.length > 0 && (
              <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-2xl max-h-80 overflow-y-auto">
                {typeahead.results.map((item) => {
                  const status = isSelected(item.id);
                  const enriched = enrichedOrgs[item.urn || ""];
                  const isEnrichingRow = enriched === "loading";
                  const enrichData = typeof enriched === "object" ? enriched : null;
                  const displayDomain = enrichData?.domain || item.domain;
                  const displayLocation = enrichData?.location;
                  const resolvedLogoUrl = logos[item.urn || ""] || (enrichData?.logo_url ?? null);
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => triggerEnrichment(item)}
                      onClick={() => {
                        addItem(item);
                        typeahead.setQuery("");
                        typeahead.setIsOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors ${
                        status ? "bg-slate-50" : ""
                      }`}
                    >
                      <CompanyLogo
                        item={item}
                        size="sm"
                        resolvedUrl={resolvedLogoUrl}
                        skeleton={
                          isEnrichingRow && !resolvedLogoUrl && !item.logoUrl
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm truncate">
                            {item.label}
                          </span>
                          {status === "included" && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                              incluido
                            </span>
                          )}
                          {status === "excluded" && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                              excluido
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          {isEnrichingRow && !displayDomain && (
                            <Loader2 className="w-3 h-3 animate-spin text-slate-300" />
                          )}
                          {displayDomain && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate">{displayDomain}</span>
                            </span>
                          )}
                          {displayLocation && (
                            <>
                              {displayDomain && <span className="text-slate-200">·</span>}
                              <span className="flex items-center gap-1 text-slate-400 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {displayLocation}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {!status && (
                        <Plus className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
        </div>

        {/* Selected Companies - Rich Cards */}
        {selection.included.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                Empresas Incluidas ({selection.included.length})
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selection.included.map((item) => {
                const enriched = enrichedOrgs[item.urn || ""];
                const isEnriching = enriched === "loading";
                const enrichData =
                  typeof enriched === "object"
                    ? enriched
                    : null;
                const displayDomain =
                  enrichData?.domain || item.domain;
                const displayWebsite = enrichData?.website;
                const displayLinkedinUrl =
                  enrichData?.linkedin_url;

                return (
                  <div
                    key={`inc-${item.id}`}
                    className="group flex items-center gap-3 bg-white rounded-xl border-2 border-blue-200 p-3.5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    {isEnriching ? (
                      <div className="w-11 h-11 rounded-xl bg-slate-200 animate-pulse shrink-0" />
                    ) : (
                      <CompanyLogo
                        item={item}
                        size="lg"
                        resolvedUrl={logos[item.urn || ""] || (enrichData?.logo_url ?? null)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">
                        {enrichData?.name || item.label}
                      </h4>
                      {item.industry && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.industry}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {item.employeeCount && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {item.employeeCount}
                          </span>
                        )}
                        {displayDomain && (
                          <a
                            href={
                              displayWebsite ||
                              `https://${displayDomain}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-500 flex items-center gap-1 hover:text-blue-700 hover:underline truncate max-w-[160px]"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            {displayDomain}
                          </a>
                        )}
                        {displayLinkedinUrl && (
                          <a
                            href={displayLinkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-500 flex items-center gap-1 hover:text-blue-700 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            LinkedIn
                          </a>
                        )}
                        {isEnriching && (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            enriquecendo...
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        removeItem(item, "included")
                      }
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Excluded Companies */}
        {selection.excluded.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-red-500" />
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
                Empresas Excluidas ({selection.excluded.length})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selection.excluded.map((item) => (
                <div
                  key={`exc-${item.id}`}
                  className="group flex items-center gap-2 bg-red-50 rounded-lg border border-red-200 pl-1.5 pr-2 py-1.5"
                >
                  <CompanyLogo
                    item={item}
                    size="sm"
                    resolvedUrl={logos[item.urn || ""]}
                  />
                  <span className="text-xs font-medium text-red-700">
                    {item.label}
                  </span>
                  <button
                    onClick={() => removeItem(item, "excluded")}
                    className="p-0.5 rounded hover:bg-red-200 text-red-400 hover:text-red-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Entities Section */}
        {selection.included.length > 0 &&
          (similarCompanies.length > 0 || loadingSimilar) && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden">
              <button
                onClick={() =>
                  setSimilarExpanded(!similarExpanded)
                }
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-800">
                    Empresas similares sugeridas
                  </span>
                  {!loadingSimilar &&
                    similarCompanies.length > 0 && (
                      <span className="text-[10px] font-bold bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
                        {similarCompanies.length}
                      </span>
                    )}
                  {loadingSimilar && (
                    <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                  )}
                </div>
                {similarExpanded ? (
                  <ChevronUp className="w-4 h-4 text-purple-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-purple-400" />
                )}
              </button>

              {similarExpanded && (
                <div className="px-4 pb-4">
                  {loadingSimilar ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-purple-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Buscando empresas similares...
                    </div>
                  ) : similarCompanies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {similarCompanies.map((item) => {
                        const alreadySelected = isSelected(
                          item.id,
                        );
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (!alreadySelected) {
                                addItem(item);
                                setSimilarCompanies((prev) =>
                                  prev.filter(
                                    (c) => c.id !== item.id,
                                  ),
                                );
                              }
                            }}
                            disabled={!!alreadySelected}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${
                              alreadySelected
                                ? "bg-blue-50 border-blue-200 opacity-60"
                                : "bg-white border-purple-200 hover:border-purple-400 hover:shadow-sm"
                            }`}
                          >
                            <CompanyLogo
                              item={item}
                              size="sm"
                              resolvedUrl={
                                logos[item.urn || ""]
                              }
                            />
                            <span className="text-xs font-medium text-slate-700 truncate flex-1">
                              {item.label}
                            </span>
                            {alreadySelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-purple-500 text-center py-2">
                      Nenhuma empresa similar encontrada
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Empty state */}
        {selection.included.length === 0 &&
          selection.excluded.length === 0 && (
            <div className="text-center py-6 bg-white/60 rounded-xl border border-dashed border-blue-200">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-7 h-7 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Nenhuma empresa selecionada
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Comece digitando o nome da empresa no campo de
                busca acima para segmentar profissionais de
                empresas especificas
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

// ===============================
// FacetCard Component (regular)
// ===============================

interface FacetCardProps {
  id: keyof TargetingData;
  icon: React.ReactNode;
  label: string;
  description: string;
  badgeText?: string;
  type: "typeahead" | "fixed" | "filtered-fixed";
  options?: FacetItem[];
  selection: FacetSelection;
  onSelectionChange: (sel: FacetSelection) => void;
  defaultOpen?: boolean;
}

function FacetCard({
  id,
  icon,
  label,
  description,
  badgeText,
  type,
  options,
  selection,
  onSelectionChange,
  defaultOpen = false,
}: FacetCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);
  const [mode, setMode] = useState<"include" | "exclude">(
    "include",
  );
  const [filterText, setFilterText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const facetTypeMap: Record<string, LinkedInFacetType> = {
    locations: "locations",
    jobTitles: "titles",
    industries: "industries",
  };
  const typeahead = useLinkedInTypeahead(
    type === "typeahead"
      ? facetTypeMap[id] || "companies"
      : "companies",
  );

  const { inc, exc } = countSelections(selection);

  const addItem = useCallback(
    (item: FacetItem) => {
      const newSel = { ...selection };
      if (mode === "include") {
        newSel.excluded = newSel.excluded.filter(
          (i) => i.id !== item.id,
        );
        if (!newSel.included.find((i) => i.id === item.id)) {
          newSel.included = [...newSel.included, item];
        }
      } else {
        newSel.included = newSel.included.filter(
          (i) => i.id !== item.id,
        );
        if (!newSel.excluded.find((i) => i.id === item.id)) {
          newSel.excluded = [...newSel.excluded, item];
        }
      }
      onSelectionChange(newSel);
    },
    [mode, selection, onSelectionChange],
  );

  const removeItem = useCallback(
    (item: FacetItem, from: "included" | "excluded") => {
      const newSel = { ...selection };
      if (from === "included") {
        newSel.included = newSel.included.filter(
          (i) => i.id !== item.id,
        );
      } else {
        newSel.excluded = newSel.excluded.filter(
          (i) => i.id !== item.id,
        );
      }
      onSelectionChange(newSel);
    },
    [selection, onSelectionChange],
  );

  const isSelected = useCallback(
    (itemId: string): "included" | "excluded" | null => {
      if (selection.included.find((i) => i.id === itemId))
        return "included";
      if (selection.excluded.find((i) => i.id === itemId))
        return "excluded";
      return null;
    },
    [selection],
  );

  const toggleFixedItem = useCallback(
    (item: FacetItem) => {
      const status = isSelected(item.id);
      if (mode === "include") {
        if (status === "included") {
          removeItem(item, "included");
        } else {
          addItem(item);
        }
      } else {
        if (status === "excluded") {
          removeItem(item, "excluded");
        } else {
          addItem(item);
        }
      }
    },
    [mode, isSelected, addItem, removeItem],
  );

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    if (!filterText) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(filterText.toLowerCase()),
    );
  }, [options, filterText]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        typeahead.setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () =>
      document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible transition-all duration-200 hover:border-slate-300">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">
                {label}
              </span>
              {badgeText && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {badgeText}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inc > 0 && (
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
              +{inc}
            </span>
          )}
          {exc > 0 && (
            <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
              -{exc}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {/* Include / Exclude toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("include")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === "include"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Plus className="w-3 h-3" />
              Incluir
            </button>
            <button
              onClick={() => setMode("exclude")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === "exclude"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Minus className="w-3 h-3" />
              Excluir
            </button>
          </div>

          {/* Typeahead Input */}
          {type === "typeahead" && (
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                {typeahead.isLoading ? (
                  <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                )}
                <input
                  type="text"
                  value={typeahead.query}
                  onChange={(e) =>
                    typeahead.setQuery(e.target.value)
                  }
                  onFocus={() =>
                    typeahead.query.length >= 2 &&
                    typeahead.setIsOpen(true)
                  }
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
              {typeahead.isOpen &&
                typeahead.results.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-xl max-h-60 overflow-y-auto">
                    {typeahead.results.map((item) => {
                      const status = isSelected(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            addItem(item);
                            typeahead.setQuery("");
                            typeahead.setIsOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 ${
                            status ? "bg-slate-50" : ""
                          }`}
                        >
                          <div>
                            <span className="font-medium text-slate-700">
                              {item.label}
                            </span>
                            {item.subtitle && (
                              <span className="text-slate-400 ml-2 text-xs">
                                {item.subtitle}
                              </span>
                            )}
                          </div>
                          {status === "included" && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              incluido
                            </span>
                          )}
                          {status === "excluded" && (
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              excluido
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* Fixed list with optional filter */}
          {(type === "fixed" || type === "filtered-fixed") && (
            <>
              {type === "filtered-fixed" && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) =>
                      setFilterText(e.target.value)
                    }
                    placeholder="Filtrar opcoes..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {filteredOptions.map((opt) => {
                  const status = isSelected(opt.id);
                  const isInc = status === "included";
                  const isExc = status === "excluded";

                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleFixedItem(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                        isInc
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : isExc
                            ? "bg-red-600 text-white border-red-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Selected items */}
          {(selection.included.length > 0 ||
            selection.excluded.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Selecionados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selection.included.map((item) => (
                  <span
                    key={`inc-${item.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {item.label}
                    <button
                      onClick={() =>
                        removeItem(item, "included")
                      }
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {selection.excluded.map((item) => (
                  <span
                    key={`exc-${item.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200"
                  >
                    {item.label}
                    <button
                      onClick={() =>
                        removeItem(item, "excluded")
                      }
                      className="hover:bg-red-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===============================
// Audience Summary Panel
// ===============================

function AudienceSummary({ data }: { data: TargetingData }) {
  const {
    count: estimatedSize,
    isLoading,
    isFromApi,
    isPrivacyFloor,
    hasAnySelection,
  } = useAudienceCount(data);

  const getStatus = () => {
    if (!hasAnySelection || estimatedSize === null) return null;
    if (isPrivacyFloor)
      return {
        color: "amber",
        icon: <Info className="w-4 h-4" />,
        label: "Abaixo do limite de privacidade do LinkedIn",
      };
    if (estimatedSize >= 5000)
      return {
        color: "green",
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: "Publico saudavel",
      };
    if (estimatedSize >= 1000)
      return {
        color: "amber",
        icon: <Zap className="w-4 h-4" />,
        label: "Segmentacao precisa",
      };
    return {
      color: "red",
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "Publico pequeno",
    };
  };

  const status = getStatus();

  const facetLabels: Record<keyof TargetingData, string> = {
    companies: "Empresas-alvo",
    locations: "Localizacao",
    seniorities: "Senioridade",
    jobFunctions: "Funcao / Area",
    jobTitles: "Cargo",
    industries: "Setor / Industria",
    companySizes: "Porte da Empresa",
    yearsOfExperience: "Anos de Experiencia",
  };

  const includedFacets = (
    Object.keys(data) as Array<keyof TargetingData>
  ).filter((k) => data[k].included.length > 0);
  const excludedFacets = (
    Object.keys(data) as Array<keyof TargetingData>
  ).filter((k) => data[k].excluded.length > 0);

  return (
    <div className="space-y-4">
      {/* Estimated Audience */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Audiencia Estimada
        </p>
        {hasAnySelection && estimatedSize !== null ? (
          <>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold text-slate-800">
                {estimatedSize.toLocaleString("pt-BR")}
              </p>
              {isLoading && (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              profissionais {isFromApi ? "" : "estimados"}
              {isFromApi && (
                <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  LinkedIn API
                </span>
              )}
            </p>
            {status && (
              <div
                className={`mt-3 flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 ${
                  status.color === "green"
                    ? "bg-green-50 text-green-700"
                    : status.color === "amber"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {status.icon}
                {status.label}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <Target className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-400">
              Selecione facets para estimar o publico
            </p>
          </div>
        )}
      </div>

      {/* Company logos summary */}
      {data.companies.included.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="w-3 h-3" />
            Empresas-alvo
          </p>
          <div className="flex flex-wrap gap-2">
            {data.companies.included.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2 py-1.5 border border-blue-200"
              >
                <CompanyLogo item={item} size="sm" />
                <span className="text-xs font-medium text-blue-700">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Included Facets */}
      {includedFacets.filter((k) => k !== "companies")
        .length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Plus className="w-3 h-3" />
            Incluindo
          </p>
          <div className="space-y-3">
            {includedFacets
              .filter((k) => k !== "companies")
              .map((facetKey) => (
                <div key={facetKey}>
                  <p className="text-[11px] font-medium text-slate-400 mb-1">
                    {facetLabels[facetKey]}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {data[facetKey].included.map((item) => (
                      <span
                        key={item.id}
                        className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Excluded */}
      {excludedFacets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Minus className="w-3 h-3" />
            Excluindo
          </p>
          <div className="space-y-3">
            {excludedFacets.map((facetKey) => (
              <div key={facetKey}>
                <p className="text-[11px] font-medium text-slate-400 mb-1">
                  {facetLabels[facetKey]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {data[facetKey].excluded.map((item) => (
                    <span
                      key={item.id}
                      className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-600 border border-red-200"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            A estimativa usa a API de Audience Count do LinkedIn
            quando conectado. Quando offline, exibe uma
            estimativa local aproximada. O numero final pode
            variar apos a publicacao.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===============================
// Main SegmentationStep
// ===============================

export function SegmentationStep({
  data,
  onChange,
}: SegmentationStepProps) {
  const updateFacet = useCallback(
    (facetKey: keyof TargetingData, sel: FacetSelection) => {
      onChange({ ...data, [facetKey]: sel });
    },
    [data, onChange],
  );

  const facets: FacetCardProps[] = [
    {
      id: "locations",
      icon: <MapPin className="w-4 h-4" />,
      label: "Localizacao",
      description: "Regioes geograficas dos profissionais",
      type: "typeahead",
      selection: data.locations,
      onSelectionChange: (sel) =>
        updateFacet("locations", sel),
      defaultOpen: true,
    },
    {
      id: "seniorities",
      icon: <Target className="w-4 h-4" />,
      label: "Senioridade",
      description: "Nivel hierarquico do profissional",
      type: "fixed",
      options: SENIORITY_OPTIONS,
      selection: data.seniorities,
      onSelectionChange: (sel) =>
        updateFacet("seniorities", sel),
      defaultOpen: true,
    },
    {
      id: "jobFunctions",
      icon: <Briefcase className="w-4 h-4" />,
      label: "Funcao / Area",
      description: "Area funcional do jobTitles",
      type: "filtered-fixed",
      options: JOB_FUNCTION_OPTIONS,
      selection: data.jobFunctions,
      onSelectionChange: (sel) =>
        updateFacet("jobFunctions", sel),
      defaultOpen: false,
    },
    {
      id: "jobTitles",
      icon: <User className="w-4 h-4" />,
      label: "Cargo (Job Title)",
      description: "Titulo especifico do profissional",
      type: "typeahead",
      selection: data.jobTitles,
      onSelectionChange: (sel) => updateFacet("jobTitles", sel),
      defaultOpen: false,
    },
    {
      id: "industries",
      icon: <Factory className="w-4 h-4" />,
      label: "Setor / Industria",
      description: "Segmento de mercado da empresa",
      type: "typeahead",
      selection: data.industries,
      onSelectionChange: (sel) =>
        updateFacet("industries", sel),
      defaultOpen: false,
    },
    {
      id: "companySizes",
      icon: <BarChart3 className="w-4 h-4" />,
      label: "Porte da Empresa",
      description: "Quantidade de funcionarios",
      type: "fixed",
      options: COMPANY_SIZE_OPTIONS,
      selection: data.companySizes,
      onSelectionChange: (sel) =>
        updateFacet("companySizes", sel),
      defaultOpen: false,
    },
    {
      id: "yearsOfExperience",
      icon: <Clock className="w-4 h-4" />,
      label: "Anos de Experiencia",
      description: "Tempo de experiencia profissional",
      type: "fixed",
      options: EXPERIENCE_OPTIONS,
      selection: data.yearsOfExperience,
      onSelectionChange: (sel) =>
        updateFacet("yearsOfExperience", sel),
      defaultOpen: false,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Discrimination Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Ferramentas do LinkedIn nao podem ser usadas para
          discriminar com base em caracteristicas pessoais como
          genero, idade, raca ou etnia.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="flex gap-6">
        {/* Left - Cards */}
        <div
          className="flex-1 min-w-0 space-y-3"
          style={{ flex: "0 0 65%" }}
        >
          {/* Hero Company Card */}
          <CompanyHeroCard
            selection={data.companies}
            onSelectionChange={(sel) =>
              updateFacet("companies", sel)
            }
          />

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Refinar Audiencia
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Regular Facet Cards */}
          {facets.map((facet) => (
            <FacetCard key={facet.id} {...facet} />
          ))}
        </div>

        {/* Right - Summary Panel (sticky) */}
        <div className="w-[35%] shrink-0">
          <div className="sticky top-0">
            <AudienceSummary data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}