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
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
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
  Settings2,
  RotateCcw,
} from "lucide-react";
import {
  fetchSimilarEntities,
  fetchOrgLogos,
  enrichOrganization,
  logoDevUrl,
} from "@/lib/linkedin";
import type { EnrichedOrganization } from "@/lib/linkedin";
import {
  SENIORITY_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  EXPERIENCE_OPTIONS,
} from "./segmentation/linkedinFacets";
import {
  emptySelection,
  countSelections,
  buildTargetingCriteria,
  createEmptyTargeting,
  resolveTargetingForAccount,
  PERSON_FACET_KEYS,
  FACET_URN_MAP,
  setAccountFacet,
} from "./segmentation/targeting";
import { smallAdSets, audienceScale, MIN_AUDIENCE } from "./segmentation/useAudienceCount";
import type { AudienceState, AdSetAudience } from "./segmentation/useAudienceCount";
import { plural } from "../labels";
import { useLinkedInTypeahead } from "./segmentation/useLinkedInTypeahead";
import type { LinkedInFacetType } from "./segmentation/useLinkedInTypeahead";
import type {
  FacetItem,
  FacetSelection,
  PersonTargeting,
  TargetingData,
} from "./segmentation/types";
import { projectId } from "@/utils/supabase/info";

const LOGO_PROXY_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0/logo-proxy`;

// Re-export so existing importers (CampaignWizard, CreativeStep, OrchestrationStep)
// don't break — the public surface of this module stays the same.
export type { FacetItem, FacetSelection, PersonTargeting, TargetingData };
export {
  buildTargetingCriteria,
  createEmptyTargeting,
  resolveTargetingForAccount,
  FACET_URN_MAP,
};

/** Resultado da checagem de público por conjunto, para o wizard travar o avanço. */
export interface AudienceCheck {
  /** Ids das empresas cujo conjunto fica abaixo do mínimo do LinkedIn. */
  small: string[];
  /** A estimativa ainda está sendo calculada. */
  pending: boolean;
}

interface SegmentationStepProps {
  data: TargetingData;
  onChange: (data: TargetingData) => void;
  /**
   * Público por conjunto, calculado no wizard (useAudienceCount). Vive lá, e
   * não aqui, porque a Revisão e o rascunho reaberto direto no passo 5 também
   * precisam saber quem está abaixo de 300 sem passar por esta tela.
   */
  audience: AudienceState;
  /** Empresa aberta ao chegar, vinda do link "Ir para Segmentação · Inter" da Revisão. */
  initialActiveId?: string;
}

/** "Inter", "Inter e Nubank", "Inter, Nubank e Itaú". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

/** Frase que nomeia as empresas abaixo do mínimo: "Inter está abaixo de 300 pessoas". */
export function smallAudienceSentence(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length > 3) return `${names.length} empresas estão abaixo de ${MIN_AUDIENCE} pessoas`;
  return `${joinNames(names)} ${names.length === 1 ? "está" : "estão"} abaixo de ${MIN_AUDIENCE} pessoas`;
}

/** Número curto do público de um conjunto, para a lista e o badge. */
function audienceLabel(a: AdSetAudience): string {
  return a.isPrivacyFloor ? `< ${MIN_AUDIENCE}` : a.count.toLocaleString("pt-BR");
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
      className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-[#E54A26] to-[#FF5F39] flex items-center justify-center text-white font-bold border border-[#FFD0C2]`}
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
  // Mostra 3 sugestões; o resto fica atrás do "Ver mais" para a lista não
  // empurrar os conjuntos de anúncio para fora da tela.
  const [showAllSimilar, setShowAllSimilar] = useState(false);
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
          // O logo depende da chave do logo.dev estar no build; a hidratação
          // do domínio abaixo, não. Guardas separadas para que a falta da
          // chave não impeça o domínio real de chegar nos próximos passos.
          const logoUrl = logoDevUrl(result.domain);
          if (logoUrl) {
            logoCache.current.set(urn, logoUrl);
            setLogos((prev) => ({ ...prev, [urn]: logoUrl }));
          }

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
              logoUrl: logoDevUrl(`${nameLower}.com`),
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
    <div className="bg-gradient-to-br from-slate-50 via-white to-[#FFF1ED] rounded-2xl border-2 border-[#FFD0C2] shadow-md overflow-visible">
      {/* Hero Header */}
      <div className="px-6 py-5 border-b border-[#FFE3DA]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E54A26] to-[#FF5F39] flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-800">
                  Empresas-alvo
                </h3>
                <span className="text-[10px] font-bold bg-gradient-to-r from-[#E54A26] to-[#FF5F39] text-white px-2.5 py-0.5 rounded-full shadow-sm">
                  ABM
                </span>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Cada empresa vira um conjunto de anúncio, com
                segmentação e orçamento próprios
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inc > 0 && (
              <span className="text-xs font-bold bg-[#FF5F39] text-white px-2.5 py-1 rounded-full shadow-sm">
                {plural(inc, "empresa")}
              </span>
            )}
            {exc > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                {plural(exc, "excluída")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search + Controls */}
      <div className="px-6 py-4 space-y-4">
        {/* Typeahead Search */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            {typeahead.isLoading ? (
              <Loader2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#FF5F39] animate-spin" />
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
              placeholder="Buscar empresa por nome ou domínio"
              className="w-full pl-12 pr-4 py-3.5 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5F39] focus:border-[#FF5F39] bg-white shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* Loading indicator */}
          {typeahead.isLoading &&
            typeahead.query.length >= 2 && (
              <div className="absolute z-50 top-full mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF5F39]" />
                Buscando organizações no LinkedIn...
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
                      className={`w-full text-left px-4 py-3 hover:bg-[#FFF1ED] flex items-center gap-3 border-b border-slate-100 last:border-0 transition-colors ${
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
                            <span className="text-[10px] font-bold text-[#E54A26] bg-[#FFE3DA] px-2 py-0.5 rounded-full shrink-0">
                              incluído
                            </span>
                          )}
                          {status === "excluded" && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full shrink-0">
                              excluído
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

          {/* Busca sem resultado ou com erro: mensagem explícita no lugar do dropdown */}
          {typeahead.isOpen &&
            !typeahead.isLoading &&
            (typeahead.status === "empty" ||
              typeahead.status === "error") && (
              <div
                role="status"
                className={`absolute z-50 top-full mt-2 w-full bg-white rounded-xl border shadow-lg p-4 flex items-start gap-2 text-sm ${
                  typeahead.status === "error"
                    ? "border-red-200 text-red-700"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                {typeahead.status === "error" ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                ) : (
                  <Search className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                )}
                <span>
                  {typeahead.status === "error"
                    ? "Não foi possível buscar no LinkedIn agora. Verifique a conexão em Integrações."
                    : `Nenhuma empresa encontrada para “${typeahead.query}”. Confira a grafia ou busque pelo domínio.`}
                </span>
              </div>
            )}
        </div>

        {/* Selected Companies - Rich Cards */}
        {selection.included.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E54A26]" />
              <p className="text-xs font-bold text-[#E54A26] uppercase tracking-wider">
                Empresas Incluídas ({selection.included.length})
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
                    className="group flex items-center gap-3 bg-white rounded-xl border-2 border-[#FFD0C2] p-3.5 shadow-sm hover:shadow-md hover:border-[#FF5F39] transition-all"
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
                            className="text-[11px] text-[#FF5F39] flex items-center gap-1 hover:text-[#E54A26] hover:underline truncate max-w-[160px]"
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
                            className="text-[11px] text-[#FF5F39] flex items-center gap-1 hover:text-[#E54A26] hover:underline"
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
                Empresas Excluídas ({selection.excluded.length})
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
            <div className="bg-gradient-to-r from-slate-50 to-[#FFF1ED] rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() =>
                  setSimilarExpanded(!similarExpanded)
                }
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF5F39]" />
                  <span className="text-sm font-semibold text-slate-800">
                    Empresas similares sugeridas
                  </span>
                  {!loadingSimilar &&
                    similarCompanies.length > 0 && (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                        {similarCompanies.length}
                      </span>
                    )}
                  {loadingSimilar && (
                    <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                  )}
                </div>
                {similarExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {similarExpanded && (
                <div className="px-4 pb-4">
                  {loadingSimilar ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Buscando empresas similares...
                    </div>
                  ) : similarCompanies.length > 0 ? (
                    <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(showAllSimilar ? similarCompanies : similarCompanies.slice(0, 3)).map((item) => {
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
                                ? "bg-[#FFF1ED] border-[#FFD0C2] opacity-60"
                                : "bg-white border-slate-200 hover:border-[#FF5F39] hover:shadow-sm"
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
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5F39] shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {similarCompanies.length > 3 && (
                      <button
                        onClick={() => setShowAllSimilar((v) => !v)}
                        className="mt-2 text-xs font-medium text-[#E54A26] hover:text-[#FF5F39] hover:underline cursor-pointer"
                      >
                        {showAllSimilar ? "Ver menos" : `Ver mais (${similarCompanies.length - 3})`}
                      </button>
                    )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-2">
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
            <div className="text-center py-6 bg-white/60 rounded-xl border border-dashed border-[#FFD0C2]">
              <div className="w-14 h-14 rounded-2xl bg-[#FFE3DA] flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-7 h-7 text-[#FF5F39]" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Nenhuma empresa selecionada
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Comece digitando o nome da empresa no campo de
                busca acima para segmentar profissionais de
                empresas específicas
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
  id: string;
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

  // Buscar um item deste facet sempre INCLUI. O ramo de excluir só era
  // alcançável pelos botões Incluir/Excluir, que saíram — a lista de
  // excluídos continua existindo no modelo (e o chip de remover continua
  // funcionando para o que já estiver lá), só não se alimenta mais daqui.
  const addItem = useCallback(
    (item: FacetItem) => {
      const newSel = { ...selection };
      newSel.excluded = newSel.excluded.filter((i) => i.id !== item.id);
      if (!newSel.included.find((i) => i.id === item.id)) {
        newSel.included = [...newSel.included, item];
      }
      onSelectionChange(newSel);
    },
    [selection, onSelectionChange],
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

  // Clicar numa opção fixa alterna inclusão. Antes o comportamento dependia do
  // modo Incluir/Excluir; sem os botões, sobra o caso que sempre valeu — e
  // clicar de novo num item já excluído continua tirando ele de lá, para um
  // estado herdado não virar armadilha sem saída.
  const toggleFixedItem = useCallback(
    (item: FacetItem) => {
      const status = isSelected(item.id);
      if (status === "included") removeItem(item, "included");
      else if (status === "excluded") removeItem(item, "excluded");
      else addItem(item);
    },
    [isSelected, addItem, removeItem],
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
                <span className="text-[10px] font-bold bg-[#FFE3DA] text-[#E54A26] px-1.5 py-0.5 rounded">
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
            <span className="text-xs font-semibold bg-[#FFF1ED] text-[#E54A26] px-2 py-0.5 rounded-full border border-[#FFD0C2]">
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
          {/* Typeahead Input */}
          {type === "typeahead" && (
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                {typeahead.isLoading ? (
                  <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#FF5F39] animate-spin" />
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
                  placeholder={`Buscar ${label.replace(/\s*\*$/, "").toLowerCase()}...`}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F39] focus:border-transparent bg-white"
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
                            <span className="text-[10px] font-semibold text-[#E54A26] bg-[#FFF1ED] px-1.5 py-0.5 rounded">
                              incluído
                            </span>
                          )}
                          {status === "excluded" && (
                            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              excluído
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
                    placeholder="Filtrar opções..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5F39] focus:border-transparent"
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
                          ? "bg-[#FF5F39] text-white border-[#FF5F39] shadow-sm"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFF1ED] text-[#E54A26] border border-[#FFD0C2]"
                  >
                    {item.label}
                    <button
                      onClick={() =>
                        removeItem(item, "included")
                      }
                      className="hover:bg-[#FFD0C2] rounded-full p-0.5"
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

function AudienceSummary({
  data,
  audience,
}: {
  data: TargetingData;
  audience: AudienceState;
}) {
  const {
    count: estimatedSize,
    perAdSet,
    isLoading,
    isFromApi,
    hasAnySelection,
  } = audience;

  // O LinkedIn exige no mínimo 300 membros POR conjunto de anúncio. O privacy
  // floor (API devolve 0) significa justamente "menos de 300". A conta vale
  // para cada empresa, personalizada ou não: useAudienceCount consulta uma vez
  // por conjunto, com o override da empresa ou o padrão.
  const small = smallAdSets(perAdSet);
  const smallNames = small.map((a) => a.label);

  const getStatus = () => {
    if (!hasAnySelection || estimatedSize === null) return null;
    // Nunca sugerir "adicione empresas": cada empresa é um conjunto novo e não
    // aumenta o público das que já estão abaixo do mínimo.
    if (small.length > 0)
      return {
        color: "red",
        icon: <AlertTriangle className="w-4 h-4" />,
        label: `${smallAudienceSentence(smallNames)}, e o LinkedIn não aceita. Amplie a localização ou tire filtros de senioridade e função ${small.length === 1 ? "dessa empresa" : "dessas empresas"}.`,
      };
    if (perAdSet.length === 0 && estimatedSize < MIN_AUDIENCE)
      return {
        color: "red",
        icon: <AlertTriangle className="w-4 h-4" />,
        label: `Público abaixo de ${MIN_AUDIENCE} pessoas: o LinkedIn não aceita. Amplie a localização ou tire filtros de senioridade e função.`,
      };
    if (perAdSet.length > 0 && perAdSet.every((a) => a.count >= 1000))
      return {
        color: "green",
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: "Todas as empresas com público suficiente",
      };
    return {
      color: "amber",
      icon: <Zap className="w-4 h-4" />,
      label: "Público pequeno em alguma empresa: a entrega pode ficar limitada",
    };
  };

  const status = getStatus();

  const facetLabels: Record<keyof PersonTargeting, string> = {
    locations: "Localização",
    seniorities: "Senioridade",
    jobFunctions: "Função / Área",
    jobTitles: "Cargo",
    yearsOfExperience: "Anos de experiência",
  };

  // O painel resume as facetas do PADRÃO. As empresas personalizadas aparecem
  // na lista por conjunto, com o próprio público.
  const def = data.defaultTargeting;
  const customCount = Object.keys(data.overrides).length;
  const includedFacets = PERSON_FACET_KEYS.filter(
    (k) => def[k].included.length > 0,
  );
  const excludedFacets = PERSON_FACET_KEYS.filter(
    (k) => def[k].excluded.length > 0,
  );

  return (
    <div className="space-y-4">
      {/* Público por conjunto, numa régua de restrito a amplo (referência:
          painel de público por grupo do Pinterest). O número somado sozinho
          escondia a empresa que o LinkedIn ia recusar. */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Público estimado
        </p>
        {hasAnySelection && estimatedSize !== null ? (
          <>
            <div className="flex items-center gap-2">
              <p className="text-4xl font-bold text-slate-800">
                {estimatedSize.toLocaleString("pt-BR")}
              </p>
              {isLoading && (
                <Loader2 className="w-5 h-5 text-[#FF5F39] animate-spin" />
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              {isFromApi ? "profissionais" : "profissionais (estimativa)"}
              {perAdSet.length > 1 ? ` somando ${perAdSet.length} empresas` : ""}
              {isFromApi && (
                <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  dado do LinkedIn
                </span>
              )}
            </p>
            {status && (
              <div
                role={status.color === "red" ? "alert" : undefined}
                className={`mt-3 flex items-start gap-2 text-sm font-medium rounded-lg px-3 py-2 [&>svg]:shrink-0 [&>svg]:mt-0.5 ${
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
            {perAdSet.length > 0 && (
              <ul className="mt-4 space-y-3">
                {perAdSet.map((a) => {
                  const isSmall = small.some((x) => x.id === a.id);
                  const pos = a.isPrivacyFloor ? 0 : audienceScale(a.count);
                  return (
                    <li key={a.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className={`truncate ${isSmall ? "text-red-700 font-medium" : "text-slate-600"}`}>
                          {a.label}
                          {data.overrides[a.id] ? <span className="text-slate-400 font-normal"> · personalizada</span> : null}
                        </span>
                        <span className={`shrink-0 tabular-nums ${isSmall ? "text-red-700 font-semibold" : "text-slate-500"}`}>
                          {a.isPrivacyFloor ? `menos de ${MIN_AUDIENCE}` : a.count.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="relative h-1.5 rounded-full bg-gradient-to-r from-red-100 via-amber-100 to-green-100" aria-hidden>
                        <span
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow ${isSmall ? "bg-red-500" : "bg-[#FF5F39]"}`}
                          style={{ left: `${Math.max(4, Math.min(96, pos * 100))}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
                <li className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                  <span>Restrito</span>
                  <span>Amplo</span>
                </li>
              </ul>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <Target className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-400">
              Escolha empresas e localização para estimar o público
            </p>
          </div>
        )}
      </div>

      {data.companies.included.length > 0 && (
        <p className="text-[11px] text-slate-500 px-1">
          {plural(data.companies.included.length, "empresa")}
          {customCount > 0
            ? ` · ${plural(customCount, "personalizada")}`
            : " · todas usando o padrão"}
        </p>
      )}

      {/* Default Included Facets */}
      {includedFacets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-[#E54A26] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Plus className="w-3 h-3" />
            Incluindo (padrão)
          </p>
          <div className="space-y-3">
            {includedFacets.map((facetKey) => (
              <div key={facetKey}>
                <p className="text-[11px] font-medium text-slate-400 mb-1">
                  {facetLabels[facetKey]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {def[facetKey].included.map((item) => (
                    <span
                      key={item.id}
                      className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF1ED] text-[#E54A26] border border-[#FFD0C2]"
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

      {/* Excluded (default) */}
      {excludedFacets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Minus className="w-3 h-3" />
            Excluindo (padrão)
          </p>
          <div className="space-y-3">
            {excludedFacets.map((facetKey) => (
              <div key={facetKey}>
                <p className="text-[11px] font-medium text-slate-400 mb-1">
                  {facetLabels[facetKey]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {def[facetKey].excluded.map((item) => (
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
            Com o LinkedIn conectado, o número vem do próprio LinkedIn.
            Sem conexão, é uma estimativa aproximada. O público real
            pode variar depois da publicação.
          </p>
        </div>
      </div>
    </div>
  );
}

// ===============================
// Main SegmentationStep
// ===============================

// Sentinel id for the "Padrão (todas as contas)" entry in the master list.
const DEFAULT_ADSET_ID = "__default__";

// Per-facet display config for the detail panel. Order = display order.
const PERSON_FACET_CONFIG: Array<{
  key: keyof PersonTargeting;
  icon: React.ReactNode;
  label: string;
  description: string;
  type: FacetCardProps["type"];
  options?: FacetItem[];
  required?: boolean;
}> = [
  {
    key: "locations",
    icon: <MapPin className="w-4 h-4" />,
    label: "Localização",
    description: "Regiões geográficas dos profissionais",
    type: "typeahead",
    required: true,
  },
  {
    key: "seniorities",
    icon: <Target className="w-4 h-4" />,
    label: "Senioridade",
    description: "Nível hierárquico do profissional",
    type: "fixed",
    options: SENIORITY_OPTIONS,
  },
  {
    key: "jobFunctions",
    icon: <Briefcase className="w-4 h-4" />,
    label: "Função / Área",
    description: "Área funcional do profissional",
    type: "filtered-fixed",
    options: JOB_FUNCTION_OPTIONS,
  },
  {
    key: "jobTitles",
    icon: <User className="w-4 h-4" />,
    label: "Cargo",
    description: "Título específico do profissional",
    type: "typeahead",
  },
  {
    key: "yearsOfExperience",
    icon: <Clock className="w-4 h-4" />,
    label: "Anos de Experiência",
    description: "Tempo de experiência profissional",
    type: "fixed",
    options: EXPERIENCE_OPTIONS,
  },
];

export function SegmentationStep({
  data,
  onChange,
  audience,
  initialActiveId,
}: SegmentationStepProps) {
  const accounts = data.companies.included;
  const [activeId, setActiveId] = useState<string>(
    initialActiveId && accounts.some((a) => a.id === initialActiveId) ? initialActiveId : DEFAULT_ADSET_ID,
  );
  const audienceById = useMemo(
    () => new Map(audience.perAdSet.map((a) => [a.id, a])),
    [audience.perAdSet],
  );
  const smallIds = useMemo(
    () => new Set(smallAdSets(audience.perAdSet).map((a) => a.id)),
    [audience.perAdSet],
  );
  // "Aplicar o padrão a todas" apaga personalizações: confirma na própria
  // tela, num segundo clique, em vez do window.confirm do navegador.
  const [confirmApplyAll, setConfirmApplyAll] = useState(false);

  // If the active account was removed, fall back to the default panel.
  useEffect(() => {
    if (
      activeId !== DEFAULT_ADSET_ID &&
      !accounts.some((a) => a.id === activeId)
    ) {
      setActiveId(DEFAULT_ADSET_ID);
    }
  }, [accounts, activeId]);

  // Update the accounts list. Drop overrides for accounts that no longer exist.
  const updateCompanies = useCallback(
    (sel: FacetSelection) => {
      const liveIds = new Set(sel.included.map((a) => a.id));
      const nextOverrides: Record<string, PersonTargeting> = {};
      for (const [id, pt] of Object.entries(data.overrides)) {
        if (liveIds.has(id)) nextOverrides[id] = pt;
      }
      onChange({ ...data, companies: sel, overrides: nextOverrides });
    },
    [data, onChange],
  );

  const isDefault = activeId === DEFAULT_ADSET_ID;
  const activePerson: PersonTargeting = isDefault
    ? data.defaultTargeting
    : resolveTargetingForAccount(data, activeId);

  const isOverridden = useCallback(
    (accountId: string) => !!data.overrides[accountId],
    [data.overrides],
  );

  // Edit a facet of the active ad set. On the default panel, write to
  // defaultTargeting. On an account, create/update its override (seeded from
  // the default the first time it diverges; dropped again when it matches).
  const updateActiveFacet = useCallback(
    (facetKey: keyof PersonTargeting, sel: FacetSelection) => {
      if (isDefault) {
        onChange({
          ...data,
          defaultTargeting: { ...data.defaultTargeting, [facetKey]: sel },
        });
        return;
      }
      // Override igual ao padrão é descartado (ver setAccountFacet).
      onChange(setAccountFacet(data, activeId, facetKey, sel));
    },
    [activeId, isDefault, data, onChange],
  );

  // "Aplicar a todas": clear every override so all accounts inherit the default.
  const applyDefaultToAll = useCallback(() => {
    if (Object.keys(data.overrides).length === 0) return;
    setConfirmApplyAll(false);
    onChange({ ...data, overrides: {} });
  }, [data, onChange]);

  // "Voltar ao padrão": remove the active account's override.
  const resetActiveToDefault = useCallback(() => {
    if (isDefault) return;
    const next = { ...data.overrides };
    delete next[activeId];
    onChange({ ...data, overrides: next });
  }, [activeId, isDefault, data, onChange]);

  const activeAccount = accounts.find((a) => a.id === activeId);
  const overrideCount = Object.keys(data.overrides).length;

  return (
    <div className="space-y-4">
      {/* Discrimination Notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          Ferramentas do LinkedIn não podem ser usadas para
          discriminar com base em características pessoais como
          gênero, idade, raça ou etnia.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="flex gap-6">
        {/* Left - Accounts + per-account targeting */}
        <div
          className="flex-1 min-w-0 space-y-3"
          style={{ flex: "0 0 65%" }}
        >
          {/* Hero Company Card — the accounts (one ad set each) */}
          <CompanyHeroCard
            selection={data.companies}
            onSelectionChange={updateCompanies}
          />

          {accounts.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-sm text-slate-500">
              Adicione uma empresa-alvo acima para configurar os conjuntos de anúncio.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                Conjuntos de anúncio ({accounts.length})
              </div>
              <div className="flex flex-col md:flex-row">
                {/* Master list */}
                <div className="md:w-[230px] md:flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-100 p-2 space-y-1">
                  <button
                    onClick={() => setActiveId(DEFAULT_ADSET_ID)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isDefault
                        ? "bg-[#FFF1ED] ring-1 ring-[#FFD0C2]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Settings2 className="w-4 h-4 text-slate-400" />
                      Padrão (todas as empresas)
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                  {accounts.map((acc) => {
                    const aud = audienceById.get(acc.id);
                    const isSmall = smallIds.has(acc.id);
                    return (
                    <button
                      key={acc.id}
                      onClick={() => setActiveId(acc.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                        activeId === acc.id
                          ? "bg-[#FFF1ED] ring-1 ring-[#FFD0C2]"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <CompanyLogo item={acc} size="sm" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-700 truncate">
                            {acc.label}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {isOverridden(acc.id) ? "personalizada" : "segue o padrão"}
                          </span>
                        </span>
                      </span>
                      {/* Público do conjunto ao lado do nome: a empresa que o
                          LinkedIn vai recusar aparece aqui, não só no total. */}
                      <span
                        title={isSmall ? `Abaixo de ${MIN_AUDIENCE} pessoas: o LinkedIn não aceita` : "Público estimado deste conjunto"}
                        className={`text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isSmall
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {aud ? audienceLabel(aud) : "…"}
                      </span>
                    </button>
                    );
                  })}
                </div>

                {/* Detail panel */}
                <div className="flex-1 min-w-0 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-700 truncate">
                      {isDefault
                        ? "Padrão: vale para todas as empresas"
                        : `Conjunto: ${activeAccount?.label ?? ""}`}
                    </h4>
                    {isDefault ? (
                      confirmApplyAll && overrideCount > 0 ? (
                        <span className="flex items-center gap-2 text-xs shrink-0">
                          <span className="text-slate-600">
                            Apagar a segmentação própria de {plural(overrideCount, "empresa")}?
                          </span>
                          <button
                            onClick={applyDefaultToAll}
                            className="font-semibold text-white bg-[#FF5F39] hover:bg-[#E54A26] px-2.5 py-1 rounded-md cursor-pointer"
                          >
                            Aplicar
                          </button>
                          <button
                            onClick={() => setConfirmApplyAll(false)}
                            className="font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                      <button
                        onClick={() => setConfirmApplyAll(true)}
                        disabled={overrideCount === 0}
                        title={
                          overrideCount === 0
                            ? "Todas as empresas já usam o padrão"
                            : `Remove a segmentação própria de ${plural(overrideCount, "empresa")} e aplica o padrão a todas`
                        }
                        className="flex items-center gap-1.5 text-xs font-medium text-[#E54A26] hover:text-[#FF5F39] disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {overrideCount === 0
                          ? "Todas usam o padrão"
                          : `Aplicar o padrão ${overrideCount === 1 ? "à personalizada" : `às ${overrideCount} personalizadas`}`}
                      </button>
                      )
                    ) : (
                      <button
                        onClick={resetActiveToDefault}
                        disabled={!isOverridden(activeId)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Voltar ao padrão
                      </button>
                    )}
                  </div>

                  {!isDefault && !isOverridden(activeId) && (
                    <p className="text-[11px] text-slate-400">
                      Esta empresa segue o padrão. Editar abaixo cria uma segmentação só dela.
                    </p>
                  )}

                  {PERSON_FACET_CONFIG.map((f) => (
                    <FacetCard
                      key={f.key}
                      id={f.key}
                      icon={f.icon}
                      label={f.required ? `${f.label} *` : f.label}
                      description={f.description}
                      type={f.type}
                      options={f.options}
                      selection={activePerson[f.key]}
                      onSelectionChange={(sel) =>
                        updateActiveFacet(f.key, sel)
                      }
                      defaultOpen={f.key === "locations"}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right - Summary Panel (sticky) */}
        <div className="w-[35%] shrink-0">
          <div className="sticky top-0">
            <AudienceSummary data={data} audience={audience} />
          </div>
        </div>
      </div>
    </div>
  );
}