# Conta = Conjunto de Anúncio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step 1 cria uma campanha única (sem grupo); Step 2 trata cada empresa-alvo como um conjunto de anúncio, com facetas de pessoa em modelo "padrão + override por conta", removendo porte e indústria.

**Architecture:** Estado local no `CampaignWizard` (sem store). `TargetingData` muda de facetas globais para `companies` + `defaultTargeting` + `overrides` por conta. UI do Step 2 vira master-detail (lista de contas à esquerda, painel de facetas à direita). Reaproveita os sub-componentes existentes `CompanyHeroCard`, `FacetCard`, `AudienceSummary`.

**Tech Stack:** React + TypeScript + Vite + Tailwind + lucide-react + Radix.

**Verification gate (sem test harness no projeto):** cada task fecha com `npx tsc --noEmit` (PASS, sem erros) e, nas tasks de UI, `npm run build` (PASS). O TypeScript é a rede de segurança para as mudanças de shape. Smoke manual no fim.

---

## File Structure

- `src/app/campaigns/wizard/types.ts` — `CampaignConfig` (remove grupo/campaigns, add `campaignName`), remove `CampaignEntry`/`createCampaignEntry`.
- `src/app/campaigns/wizard/segmentation/types.ts` — add `PersonTargeting`; reescreve `TargetingData`.
- `src/app/campaigns/wizard/segmentation/targeting.ts` — `createEmptyTargeting`, `createEmptyPersonTargeting`, `resolveTargetingForAccount`, remove URNs industries/companySizes, ajusta `buildTargetingCriteria` + `totalIncludes`.
- `src/app/campaigns/wizard/ConfigStep.tsx` — UI Step 1.
- `src/app/campaigns/wizard/SegmentationStep.tsx` — UI Step 2 master-detail.
- `src/app/campaigns/CampaignWizard.tsx` — defaults, `canProceed`, `getStepSummary`, `handleLaunch`.
- `src/app/campaigns/wizard/OrchestrationStep.tsx` — iterar contas (verificar usos).

---

## Task 1: Tipos de targeting por-conta

**Files:**
- Modify: `src/app/campaigns/wizard/segmentation/types.ts`

- [ ] **Step 1: Reescrever `TargetingData` e adicionar `PersonTargeting`**

Substituir o bloco `export interface TargetingData { ... }` (linhas 19-30) por:

```ts
// Facetas de pessoa — aplicadas por conjunto de anúncio (conta).
// "locations" é obrigatória: cada conta efetiva precisa de >=1.
export interface PersonTargeting {
  locations: FacetSelection;
  seniorities: FacetSelection;
  jobFunctions: FacetSelection;
  jobTitles: FacetSelection;
  yearsOfExperience: FacetSelection;
}

// Estado da segmentação. `companies` é a lista de contas; cada conta
// É um conjunto de anúncio. As facetas de pessoa vivem em `defaultTargeting`
// ("Padrão — todas as contas") e podem ser sobrescritas por conta em
// `overrides` (chave = FacetItem.id da conta).
export interface TargetingData {
  companies: FacetSelection;
  defaultTargeting: PersonTargeting;
  overrides: Record<string, PersonTargeting>;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: FAIL — vários erros em `targeting.ts`, `SegmentationStep.tsx`, etc. referenciando `data.locations`/`industries`/`companySizes`. Isso é esperado; as próximas tasks resolvem. (Anote os arquivos com erro para guiar as tasks seguintes.)

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/wizard/segmentation/types.ts
git commit -m "feat(targeting): tipos PersonTargeting + TargetingData por conta"
```

---

## Task 2: Helpers de targeting (factory, resolução, payload)

**Files:**
- Modify: `src/app/campaigns/wizard/segmentation/targeting.ts`

- [ ] **Step 1: Reescrever o arquivo inteiro**

Substituir todo o conteúdo de `targeting.ts` por:

```ts
// Pure helpers for the targeting state shape and the LinkedIn API
// payload it serializes to. No state, no I/O.

import type {
  FacetItem,
  FacetSelection,
  PersonTargeting,
  TargetingData,
} from './types';

export const EMPTY_ITEMS: FacetItem[] = [];

export function emptySelection(): FacetSelection {
  return { included: [], excluded: [] };
}

export function createEmptyPersonTargeting(): PersonTargeting {
  return {
    locations: emptySelection(),
    seniorities: emptySelection(),
    jobFunctions: emptySelection(),
    jobTitles: emptySelection(),
    yearsOfExperience: emptySelection(),
  };
}

export function createEmptyTargeting(): TargetingData {
  return {
    companies: emptySelection(),
    defaultTargeting: createEmptyPersonTargeting(),
    overrides: {},
  };
}

// Facetas de pessoa que compõem um PersonTargeting (ordem de exibição).
export const PERSON_FACET_KEYS: Array<keyof PersonTargeting> = [
  'locations',
  'seniorities',
  'jobFunctions',
  'jobTitles',
  'yearsOfExperience',
];

// Retorna o targeting efetivo de uma conta: override se existir, senão o padrão.
export function resolveTargetingForAccount(
  data: TargetingData,
  accountId: string,
): PersonTargeting {
  return data.overrides[accountId] ?? data.defaultTargeting;
}

export function countSelections(sel: FacetSelection) {
  return { inc: sel.included.length, exc: sel.excluded.length };
}

// Total de critérios incluídos: contas + facetas do padrão + facetas de cada override.
export function totalIncludes(data: TargetingData): number {
  const personSum = (pt: PersonTargeting) =>
    PERSON_FACET_KEYS.reduce((s, k) => s + pt[k].included.length, 0);
  return (
    data.companies.included.length +
    personSum(data.defaultTargeting) +
    Object.values(data.overrides).reduce((s, pt) => s + personSum(pt), 0)
  );
}

// Maps facet field names to the LinkedIn API facet URNs they target.
export const FACET_URN_MAP: Record<'companies' | keyof PersonTargeting, string> = {
  companies: 'urn:li:adTargetingFacet:employers',
  locations: 'urn:li:adTargetingFacet:locations',
  seniorities: 'urn:li:adTargetingFacet:seniorities',
  jobFunctions: 'urn:li:adTargetingFacet:jobFunctions',
  jobTitles: 'urn:li:adTargetingFacet:titles',
  yearsOfExperience: 'urn:li:adTargetingFacet:yearsOfExperience',
};

// Builds the targetingCriteria payload LinkedIn's adCampaigns API expects
// for a SINGLE ad set (one account + its effective person facets).
export function buildTargetingCriteria(
  account: FacetItem,
  person: PersonTargeting,
): any {
  const includeAnd: any[] = [];
  const excludeOr: Record<string, string[]> = {};

  const pushFacet = (facetUrn: string, sel: FacetSelection) => {
    if (sel.included.length > 0) {
      const urns = sel.included.map((i) => i.urn || '').filter(Boolean);
      if (urns.length > 0) includeAnd.push({ or: { [facetUrn]: urns } });
    }
    if (sel.excluded.length > 0) {
      const urns = sel.excluded.map((i) => i.urn || '').filter(Boolean);
      if (urns.length > 0) excludeOr[facetUrn] = urns;
    }
  };

  // The account itself becomes the employer facet for this ad set.
  if (account.urn) {
    includeAnd.push({ or: { [FACET_URN_MAP.companies]: [account.urn] } });
  }
  for (const key of PERSON_FACET_KEYS) {
    pushFacet(FACET_URN_MAP[key], person[key]);
  }

  const criteria: any = {};
  if (includeAnd.length > 0) criteria.include = { and: includeAnd };
  if (Object.keys(excludeOr).length > 0) criteria.exclude = { or: excludeOr };
  return criteria;
}
```

- [ ] **Step 2: Type-check este arquivo isoladamente (espera-se ainda erros em outros)**

Run: `npx tsc --noEmit`
Expected: `targeting.ts` sem erros próprios; erros restantes apenas em `SegmentationStep.tsx`, `ConfigStep.tsx`, `CampaignWizard.tsx`, `OrchestrationStep.tsx` (resolvidos nas próximas tasks).

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/wizard/segmentation/targeting.ts
git commit -m "feat(targeting): helpers por conta (resolve, payload por ad set)"
```

---

## Task 3: Step 1 — campanha única

**Files:**
- Modify: `src/app/campaigns/wizard/types.ts`
- Modify: `src/app/campaigns/wizard/ConfigStep.tsx`

- [ ] **Step 1: Atualizar `CampaignConfig` e remover `CampaignEntry`**

Em `types.ts`, remover o bloco `CampaignEntry` (linhas 50-54) e a função `createCampaignEntry` (linhas 72-74). Substituir `CampaignConfig` (linhas 56-70) e `createDefaultCampaignConfig` (linhas 76-91) por:

```ts
// Campaign configuration — lifted to wizard parent level
export interface CampaignConfig {
  campaignName: string;
  objective: string;
  campaignType: string;
  costType: string;
  budgetType: 'daily' | 'total';
  budgetAmount: string;
  startDate: string;
  endDate: string;
  autoActivate: boolean;
  biddingStrategy: 'automated' | 'manual_cpm' | 'manual_cpc';
  unitCostAmount: string;
}

export function createDefaultCampaignConfig(): CampaignConfig {
  return {
    campaignName: '',
    objective: 'brand_awareness',
    campaignType: 'SPONSORED_UPDATES',
    costType: 'CPM',
    budgetType: 'daily',
    budgetAmount: '500',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    autoActivate: false,
    biddingStrategy: 'automated',
    unitCostAmount: '',
  };
}
```

- [ ] **Step 2: Localizar a UI do grupo/campanhas no ConfigStep**

Run: `grep -n "campaignGroupName\|campaigns\|createCampaignEntry\|Adicionar Campanha\|GRUPO DE CAMPANHA\|CampaignEntry" src/app/campaigns/wizard/ConfigStep.tsx`
Expected: linhas da seção "Identificação" (input do grupo ~120-134) e da lista de campanhas (~136-202), além do import de tipos.

- [ ] **Step 3: Substituir a seção "Identificação"**

Na seção "Identificação" do ConfigStep, remover: o input "GRUPO DE CAMPANHA" + seu helper text, a lista de campanhas (map de `config.campaigns`), o botão "Adicionar Campanha", e quaisquer handlers locais de add/remove/duplicate campanha. Substituir por um único campo:

```tsx
<div>
  <label className="block text-xs font-bold text-slate-500 tracking-wide mb-2">
    NOME DA CAMPANHA *
  </label>
  <input
    type="text"
    value={config.campaignName}
    onChange={(e) => onChange({ ...config, campaignName: e.target.value })}
    placeholder="Ex: Nubank — Q1 2026 Brand Awareness"
    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
  />
  <p className="text-sm text-slate-500 mt-2">
    Use variáveis como <code>{'{{company.name}}'}</code> para personalizar por conta.
  </p>
</div>
```

Remover o import de `createCampaignEntry`/`CampaignEntry` se presente no topo do arquivo.

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: erros restantes apenas em `CampaignWizard.tsx` e `OrchestrationStep.tsx` (usam `campaignConfig.campaigns`/`campaignGroupName`). ConfigStep e types.ts limpos.

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/wizard/types.ts src/app/campaigns/wizard/ConfigStep.tsx
git commit -m "feat(config): campanha única — remove grupo e lista de campanhas"
```

---

## Task 4: Step 2 — UI master-detail

**Files:**
- Modify: `src/app/campaigns/wizard/SegmentationStep.tsx`

Contexto: o arquivo já tem `CompanyHeroCard` (card de empresas-alvo, ~138-889), `FacetCard` (~894-1270), `AudienceSummary` (~1271-1481) e o container `SegmentationStep` (~1483+). Mantemos `CompanyHeroCard` e `FacetCard`; reescrevemos o container e ajustamos `AudienceSummary`.

- [ ] **Step 1: Ajustar imports e re-exports do topo**

Garantir que o topo importe de `./segmentation/targeting`:
`createEmptyTargeting`, `createEmptyPersonTargeting`, `resolveTargetingForAccount`, `PERSON_FACET_KEYS`, `buildTargetingCriteria`, `FACET_URN_MAP`.
Remover imports de `COMPANY_SIZE_OPTIONS` (porte) — não é mais usado.
Atualizar o re-export para incluir `PersonTargeting`:

```ts
export type { FacetItem, FacetSelection, TargetingData, PersonTargeting } from "./segmentation/types";
export { buildTargetingCriteria, createEmptyTargeting, FACET_URN_MAP } from "./segmentation/targeting";
```

- [ ] **Step 2: Reescrever o container `SegmentationStep`**

Substituir a função `export function SegmentationStep({ data, onChange }: SegmentationStepProps)` inteira (do `export function SegmentationStep` até o fim do componente) por:

```tsx
export function SegmentationStep({ data, onChange }: SegmentationStepProps) {
  const accounts = data.companies.included;

  // activeId: "__default__" para o Padrão, ou o FacetItem.id da conta.
  const DEFAULT_ID = "__default__";
  const [activeId, setActiveId] = useState<string>(DEFAULT_ID);

  // Se a conta ativa foi removida, volta ao Padrão.
  useEffect(() => {
    if (activeId !== DEFAULT_ID && !accounts.some((a) => a.id === activeId)) {
      setActiveId(DEFAULT_ID);
    }
  }, [accounts, activeId]);

  const updateCompanies = useCallback(
    (sel: FacetSelection) => {
      // Limpa overrides de contas que deixaram de existir.
      const liveIds = new Set(sel.included.map((a) => a.id));
      const nextOverrides: Record<string, PersonTargeting> = {};
      for (const [id, pt] of Object.entries(data.overrides)) {
        if (liveIds.has(id)) nextOverrides[id] = pt;
      }
      onChange({ ...data, companies: sel, overrides: nextOverrides });
    },
    [data, onChange],
  );

  // Targeting efetivo do item ativo (padrão ou override da conta).
  const activePerson: PersonTargeting =
    activeId === DEFAULT_ID
      ? data.defaultTargeting
      : resolveTargetingForAccount(data, activeId);

  const isOverridden = (accountId: string) => !!data.overrides[accountId];

  // Edita uma faceta do item ativo. No Padrão, grava em defaultTargeting.
  // Numa conta, cria/atualiza o override (clonando o padrão como base se for o 1º).
  const updateActiveFacet = useCallback(
    (facetKey: keyof PersonTargeting, sel: FacetSelection) => {
      if (activeId === DEFAULT_ID) {
        onChange({
          ...data,
          defaultTargeting: { ...data.defaultTargeting, [facetKey]: sel },
        });
        return;
      }
      const base = data.overrides[activeId] ?? data.defaultTargeting;
      onChange({
        ...data,
        overrides: {
          ...data.overrides,
          [activeId]: { ...base, [facetKey]: sel },
        },
      });
    },
    [activeId, data, onChange],
  );

  // "Aplicar a todas": remove todos os overrides (todas herdam o padrão).
  const applyDefaultToAll = useCallback(() => {
    if (Object.keys(data.overrides).length === 0) return;
    const ok = window.confirm(
      "Aplicar o padrão a todas as contas? As personalizações por conta serão removidas.",
    );
    if (!ok) return;
    onChange({ ...data, overrides: {} });
  }, [data, onChange]);

  // "Voltar ao padrão": remove o override da conta ativa.
  const resetActiveToDefault = useCallback(() => {
    if (activeId === DEFAULT_ID) return;
    const next = { ...data.overrides };
    delete next[activeId];
    onChange({ ...data, overrides: next });
  }, [activeId, data, onChange]);

  const personFacets: Array<{
    key: keyof PersonTargeting;
    title: string;
    subtitle: string;
    required?: boolean;
    options?: FacetItem[];
    mode: "typeahead" | "fixed" | "filtered-fixed";
  }> = [
    { key: "locations", title: "Localização", subtitle: "Regiões dos profissionais", required: true, mode: "typeahead" },
    { key: "seniorities", title: "Senioridade", subtitle: "Nível hierárquico", options: SENIORITY_OPTIONS, mode: "fixed" },
    { key: "jobFunctions", title: "Função / Área", subtitle: "Área de atuação", options: JOB_FUNCTION_OPTIONS, mode: "filtered-fixed" },
    { key: "jobTitles", title: "Cargo", subtitle: "Títulos específicos", mode: "typeahead" },
    { key: "yearsOfExperience", title: "Anos de experiência", subtitle: "Tempo de experiência", options: EXPERIENCE_OPTIONS, mode: "fixed" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Aviso LinkedIn (manter o bloco de aviso existente acima, se houver) */}

        {/* Empresas-alvo (contas) */}
        <CompanyHeroCard
          selection={data.companies}
          onChange={updateCompanies}
        />

        {/* Master-detail dos conjuntos de anúncio */}
        {accounts.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-500">
            Adicione uma empresa-alvo acima para configurar os conjuntos de anúncio.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-xs font-bold tracking-wide text-slate-500">
              CONJUNTOS DE ANÚNCIO ({accounts.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Master */}
              <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-100 p-2 space-y-1">
                <button
                  onClick={() => setActiveId(DEFAULT_ID)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    activeId === DEFAULT_ID ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    Padrão (todas as contas)
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => setActiveId(acc.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeId === acc.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {acc.logoUrl ? (
                        <img src={acc.logoUrl} alt="" className="w-5 h-5 rounded object-contain flex-shrink-0" />
                      ) : (
                        <span className="w-5 h-5 rounded bg-slate-200 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-slate-700 truncate">{acc.label}</span>
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        isOverridden(acc.id)
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isOverridden(acc.id) ? "personalizado" : "padrão"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Detail */}
              <div className="md:col-span-2 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700">
                    {activeId === DEFAULT_ID
                      ? "Padrão — aplicado a todas as contas"
                      : `Conjunto: ${accounts.find((a) => a.id === activeId)?.label ?? ""}`}
                  </h4>
                  {activeId === DEFAULT_ID ? (
                    <button
                      onClick={applyDefaultToAll}
                      disabled={Object.keys(data.overrides).length === 0}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                    >
                      Aplicar a todas
                    </button>
                  ) : (
                    <button
                      onClick={resetActiveToDefault}
                      disabled={!isOverridden(activeId)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                    >
                      Voltar ao padrão
                    </button>
                  )}
                </div>

                {personFacets.map((f) => (
                  <FacetCard
                    key={f.key}
                    id={f.key as keyof TargetingData}
                    title={f.required ? `${f.title} *` : f.title}
                    subtitle={f.subtitle}
                    options={f.options}
                    mode={f.mode}
                    selection={activePerson[f.key]}
                    onChange={(sel: FacetSelection) => updateActiveFacet(f.key, sel)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1">
        <AudienceSummary data={data} />
      </div>
    </div>
  );
}
```

NOTA de adaptação: `FacetCard` tem assinatura própria (ver `FacetCardProps`, ~894). Ajuste os nomes de prop (`title`, `subtitle`, `options`, `mode`, `selection`, `onChange`) para casar EXATAMENTE com `FacetCardProps`. Se `FacetCard` exigir props extras (ex. ícone, count), passe valores equivalentes aos que o container antigo passava no array `facets` (linhas ~1494-1562 do original). O `id` é tipado como `keyof TargetingData`; como `locations` etc. não são mais chaves de `TargetingData`, troque o tipo do campo `id` em `FacetCardProps` para `string` (é usado só como key/label interno).

- [ ] **Step 3: Garantir imports usados**

No topo do arquivo, garantir que `useState`, `useEffect`, `useCallback` venham de `react`, e `Settings2`, `ChevronRight` de `lucide-react`. Importar `SENIORITY_OPTIONS`, `JOB_FUNCTION_OPTIONS`, `EXPERIENCE_OPTIONS` de `./segmentation/linkedinFacets` (já importados; remover só `COMPANY_SIZE_OPTIONS`). Importar `PersonTargeting`, `resolveTargetingForAccount` conforme Step 1.

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: SegmentationStep limpo. Erros restantes só em `CampaignWizard.tsx` e `OrchestrationStep.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/wizard/SegmentationStep.tsx
git commit -m "feat(segmentation): master-detail por conta (conta = conjunto de anúncio)"
```

---

## Task 5: AudienceSummary sem porte/indústria

**Files:**
- Modify: `src/app/campaigns/wizard/SegmentationStep.tsx` (função `AudienceSummary`, ~1271-1481)

- [ ] **Step 1: Atualizar `facetLabels` e a leitura do `data`**

`AudienceSummary` lê `data` como `TargetingData` plano. Reescrever para:
1. Listar contas via `data.companies.included` (mantém os logos).
2. Para as facetas de pessoa, iterar `PERSON_FACET_KEYS` sobre `data.defaultTargeting` (resumo do padrão) — rotular com:

```ts
const facetLabels: Record<keyof PersonTargeting, string> = {
  locations: "Localização",
  seniorities: "Senioridade",
  jobFunctions: "Função / Área",
  jobTitles: "Cargo",
  yearsOfExperience: "Anos de experiência",
};
```

3. Adicionar uma linha-resumo: `N contas · M personalizadas` usando `Object.keys(data.overrides).length`.
4. Remover toda referência a `industries` e `companySizes`.

Manter a estimativa de audiência existente, mas alimentá-la a partir de `data.companies` + `data.defaultTargeting` (não mais do objeto plano). Se a estimativa antiga somava `Object.values(data)`, trocar por `totalIncludes(data)` importado de `./segmentation/targeting`.

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: SegmentationStep totalmente limpo (inclui AudienceSummary).

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/wizard/SegmentationStep.tsx
git commit -m "feat(segmentation): resumo de audiência sem porte/indústria"
```

---

## Task 6: CampaignWizard — defaults, validação, summary, launch

**Files:**
- Modify: `src/app/campaigns/CampaignWizard.tsx`

- [ ] **Step 1: Reescrever `canProceed` para Steps 1 e 2**

Substituir os blocos `if (currentStep === 1)` (linhas 85-91) e `if (currentStep === 2)` (linhas 92-95) por:

```ts
    if (currentStep === 1) {
      // Config step: nome da campanha obrigatório.
      return !!campaignConfig.campaignName.trim();
    }
    if (currentStep === 2) {
      // Segmentação: >=1 empresa-alvo E cada conjunto efetivo com >=1 localização.
      const accounts = targetingData.companies.included;
      if (accounts.length === 0) return false;
      return accounts.every((acc) => {
        const person = resolveTargetingForAccount(targetingData, acc.id);
        return person.locations.included.length > 0;
      });
    }
```

Adicionar ao import de helpers no topo: `import { createEmptyTargeting, resolveTargetingForAccount } from './wizard/SegmentationStep';` — verificar se `SegmentationStep` re-exporta `resolveTargetingForAccount`; se não, importar de `./wizard/segmentation/targeting`.

- [ ] **Step 2: Atualizar `canProceed` do Step 3**

A linha `const companies = targetingData.companies?.included || [];` (107) continua válida (companies não mudou). Nenhuma outra mudança no bloco do Step 3.

- [ ] **Step 3: Atualizar `getStepSummary`**

Substituir o bloco do Step 1 (linhas 120-124) e Step 2 (125-128) por:

```ts
    if (currentStep === 1) {
      return campaignConfig.campaignName.trim() ? "Campanha nomeada" : "Nomeie a campanha";
    }
    if (currentStep === 2) {
      const n = targetingData.companies.included.length;
      const custom = Object.keys(targetingData.overrides).length;
      if (n === 0) return "Selecione ao menos 1 conta";
      return `${n} conjunto${n !== 1 ? "s" : ""} de anúncio${custom > 0 ? ` · ${custom} personalizado${custom !== 1 ? "s" : ""}` : ""}`;
    }
```

- [ ] **Step 4: Atualizar `handleLaunch`**

Substituir o corpo de `handleLaunch` (linhas 72-82) por:

```ts
  const handleLaunch = () => {
    const accountCount = targetingData.companies.included.length;
    toast.success(
      `${accountCount} conjunto${accountCount !== 1 ? "s" : ""} de anúncio criado${accountCount !== 1 ? "s" : ""} no LinkedIn!`,
      {
        description: `Campanha "${campaignConfig.campaignName}" sincronizada com o LinkedIn Ads.`,
      }
    );
    setTimeout(() => onCancel(), 1500);
  };
```

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: CampaignWizard limpo. Erros restantes só em `OrchestrationStep.tsx`, se houver.

- [ ] **Step 6: Commit**

```bash
git add src/app/campaigns/CampaignWizard.tsx
git commit -m "feat(wizard): validação/summary/launch para campanha única e conjuntos por conta"
```

---

## Task 7: OrchestrationStep — iterar contas

**Files:**
- Modify: `src/app/campaigns/wizard/OrchestrationStep.tsx`

- [ ] **Step 1: Localizar usos de campaigns/grupo/facetas removidas**

Run: `grep -n "campaignConfig\.campaigns\|campaignGroupName\|buildTargetingCriteria\|\.industries\|\.companySizes\|targetingData\." src/app/campaigns/wizard/OrchestrationStep.tsx`
Expected: lista de pontos a ajustar (pipeline, resumo, contagem).

- [ ] **Step 2: Ajustar a iteração do pipeline para contas**

Onde o pipeline/resumo iterava `campaignConfig.campaigns`, trocar por `targetingData.companies.included`. Para cada conta `acc`, montar o payload do ad set com:

```ts
import { resolveTargetingForAccount, buildTargetingCriteria } from './segmentation/targeting';
// ...
const adSets = targetingData.companies.included.map((acc) => ({
  account: acc,
  criteria: buildTargetingCriteria(acc, resolveTargetingForAccount(targetingData, acc.id)),
}));
```

Substituir qualquer chamada antiga `buildTargetingCriteria(targetingData)` (assinatura antiga de 1 arg) pelo loop acima. Onde o texto mostrava o nome do grupo (`campaignGroupName`), usar `campaignConfig.campaignName`. Onde contava campanhas, contar `adSets.length`.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS — projeto inteiro compila e builda sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/app/campaigns/wizard/OrchestrationStep.tsx
git commit -m "feat(orchestration): criar 1 conjunto de anúncio por conta"
```

---

## Task 8: Limpeza final e smoke manual

**Files:** vários (somente se sobrar referência)

- [ ] **Step 1: Caçar referências órfãs**

Run: `grep -rn "campaignGroupName\|\.campaigns\b\|createCampaignEntry\|CampaignEntry\|COMPANY_SIZE_OPTIONS\|companySizes\|\bindustries\b" src/app/campaigns/`
Expected: nenhum resultado em arquivos de produção (ignorar comentários intencionais). Se houver, corrigir.

- [ ] **Step 2: Type-check + build final**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS sem erros nem warnings de tipo.

- [ ] **Step 3: Smoke manual**

Run: `npm run dev` e abrir `/campaigns/new`. Verificar:
- Step 1: só "Nome da Campanha" (sem grupo, sem lista). Botão "Próximo Passo" habilita ao digitar o nome.
- Step 2: empresas-alvo no topo; ao adicionar contas, aparecem como conjuntos de anúncio; Padrão + contas no master; editar Padrão muda todas; editar conta cria badge "personalizado"; "Aplicar a todas" pede confirmação; "Voltar ao padrão" remove override; "Próximo Passo" só habilita com ≥1 conta E todas com localização.
- Step 4: lançamento mostra "N conjuntos de anúncio" e o nome da campanha.

- [ ] **Step 4: Commit (se houve correção no Step 1)**

```bash
git add -A && git commit -m "chore: remover referências órfãs ao modelo antigo de campanha"
```

---

## Self-Review (preenchido)

- **Spec coverage:** Step 1 sem grupo/única campanha → Task 3. Conta=ad set + padrão/override → Tasks 1,2,4. Remover porte/indústria → Tasks 1,2,5. Localização obrigatória + validação ≥1 conta → Task 6. Pipeline 1 ad set/conta + grupo implícito (nome derivado) → Task 7. Master-detail + empty state + responsivo → Task 4.
- **Type consistency:** `PersonTargeting`/`TargetingData`/`resolveTargetingForAccount`/`PERSON_FACET_KEYS`/`buildTargetingCriteria(account, person)` usados de forma idêntica entre Tasks 1,2,4,6,7.
- **Placeholders:** nenhum TODO/TBD; cada step de código mostra o código.
- **Nota honesta:** o projeto não tem test harness; a verificação é `tsc --noEmit` + `npm run build` + smoke manual, não TDD. As props exatas de `FacetCard`/`CompanyHeroCard` devem ser conferirindo o `FacetCardProps` real durante a Task 4 (a assinatura está marcada como ponto de adaptação).
