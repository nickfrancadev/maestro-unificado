# Merge Play-Fluxograma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer todas as features do repo externo `Play-Fluxograma` para `maestro-unificado`, preservando intactos o módulo de Campanhas, a integração LinkedIn e o dashboard (abas Estratégico/Funil/Interno).

**Architecture:** Branch nova a partir de `main`. Os arquivos do diff são classificados em baldes: PROTEGER (mantém versão local), TRAZER (copia da branch `other/Play-Fluxograma`), MERGE MANUAL (`App.tsx`, `Home.tsx`, `TouchpointDetails.tsx`). Verificação por `npm run build` + smoke test das rotas protegidas.

**Tech Stack:** React + TypeScript + Vite, react-router-dom, `@xyflow/react` (nova dep do fluxograma).

## Global Constraints

- **Nunca alterar** (versão local prevalece): `src/app/campaigns/**`, `src/lib/linkedin/**`, `src/lib/linkedin.ts`, `src/lib/useCampaigns.ts`, `src/lib/mockCampaignData.ts`, `src/lib/useIntegrations.ts`, `src/lib/linkedin/analytics.ts`, `src/app/integrations/**`, `src/app/components/touchpoints/LinkedInAdDrawer.tsx`, `src/app/pages/dashboard/**`, `docs/superpowers/**`.
- **Não trazer (lixo):** `temp_block.txt`, `.claude/settings.local.json`, deleção de `.vscode/settings.json`.
- O remote `other` → `https://github.com/fmamutedelucca/maestro-unificado-main.git` já está adicionado e com fetch feito (branch `other/Play-Fluxograma`). Remover ao final.
- Verificação de cada task: `npm run build` deve passar (vite faz type-check no build). Não há script `tsc` ou suíte de testes neste repo.
- Branch de trabalho: `feat/merge-play-fluxograma`. **Não** mesclar em `main` — entrega para revisão.

---

### Task 1: Criar branch e instalar dependência nova

**Files:**
- Modify: `package.json` (adicionar `@xyflow/react`)

**Interfaces:**
- Produces: branch `feat/merge-play-fluxograma`; `@xyflow/react@^12.11.0` em `node_modules` (necessária por `PlayFlowPrototype.tsx`).

- [ ] **Step 1: Criar a branch a partir de main**

```bash
git switch -c feat/merge-play-fluxograma
```

- [ ] **Step 2: Adicionar a dependência `@xyflow/react`**

Editar `package.json`, na seção `"dependencies"`, adicionar a linha (ordem alfabética, antes de outras `@`):

```json
"@xyflow/react": "^12.11.0",
```

- [ ] **Step 3: Instalar**

Run: `npm install`
Expected: instala `@xyflow/react` sem erros; `package-lock.json` atualizado.

- [ ] **Step 4: Verificar build base ainda passa (sem mudanças de código ainda)**

Run: `npm run build`
Expected: PASS (build verde — estado de `main` + nova dep).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(merge): branch + dep @xyflow/react para PlayFlow"
```

---

### Task 2: Trazer arquivos NOVOS do repo externo (features de plays/touchpoints/settings)

**Files (criar a partir de `other/Play-Fluxograma`):**
- `src/app/pages/PlayFlowPrototype.tsx`
- `src/app/pages/SettingsPage.tsx`
- `src/app/components/AccountCard.tsx`
- `src/app/components/ContactCard.tsx`
- `src/app/components/PlayCard.tsx`
- `src/app/components/PlayStatusControl.tsx`
- `src/app/components/accountsStore.ts`
- `src/app/components/dossiersStore.ts`
- `src/app/components/playDraftStore.ts`
- `src/app/components/playsStore.ts`
- `src/app/components/touchpointsStore.ts`
- `src/app/components/touchpoints/EmailComposerModal.tsx`
- `src/app/components/touchpoints/PlayHistoryDrawer.tsx`
- `src/app/components/touchpoints/TouchpointCard.tsx`
- `src/app/components/touchpoints/TouchpointTimelineStrip.tsx`
- `src/app/hooks/useEscToClose.ts`
- `src/app/hooks/useResizablePanel.ts`

**Interfaces:**
- Produces: componentes/stores/hooks novos consumidos pelos arquivos neutros da Task 3 e pelas rotas da Task 5.

- [ ] **Step 1: Copiar todos os arquivos novos da branch externa**

```bash
git checkout other/Play-Fluxograma -- \
  src/app/pages/PlayFlowPrototype.tsx \
  src/app/pages/SettingsPage.tsx \
  src/app/components/AccountCard.tsx \
  src/app/components/ContactCard.tsx \
  src/app/components/PlayCard.tsx \
  src/app/components/PlayStatusControl.tsx \
  src/app/components/accountsStore.ts \
  src/app/components/dossiersStore.ts \
  src/app/components/playDraftStore.ts \
  src/app/components/playsStore.ts \
  src/app/components/touchpointsStore.ts \
  src/app/components/touchpoints/EmailComposerModal.tsx \
  src/app/components/touchpoints/PlayHistoryDrawer.tsx \
  src/app/components/touchpoints/TouchpointCard.tsx \
  src/app/components/touchpoints/TouchpointTimelineStrip.tsx \
  src/app/hooks/useEscToClose.ts \
  src/app/hooks/useResizablePanel.ts
```

- [ ] **Step 2: Conferir que nada protegido entrou**

Run: `git status --short`
Expected: apenas os 17 arquivos acima como novos (`A`). Nenhum arquivo de `campaigns/`, `lib/linkedin/`, `integrations/`, `pages/dashboard/`.

- [ ] **Step 3: Commit**

```bash
git add src/app/pages src/app/components src/app/hooks
git commit -m "feat(merge): arquivos novos de plays/touchpoints/settings do Play-Fluxograma"
```

(Build ainda pode falhar aqui se esses arquivos importarem arquivos neutros ainda não trazidos — esperado. O build verde vem na Task 4.)

---

### Task 3: Trazer arquivos NEUTROS modificados (versão deles prevalece)

**Files (sobrescrever com versão de `other/Play-Fluxograma`):**
- `src/app/components/AIAssistant.tsx`
- `src/app/components/AccountCreateModal.tsx`
- `src/app/components/AccountDetailPage.tsx`
- `src/app/components/AccountEditDrawer.tsx`
- `src/app/components/AccountsPage.tsx`
- `src/app/components/ContactEditDrawer.tsx`
- `src/app/components/CreatePlayWizard.tsx`
- `src/app/components/CreateSegmentDrawer.tsx`
- `src/app/components/DossieContatoModal.tsx`
- `src/app/components/DossieCreateModal.tsx`
- `src/app/components/ExpandableDossierCard.tsx`
- `src/app/components/OrgChart.tsx`
- `src/app/components/PlaysOverviewPage.tsx`
- `src/app/components/PlaysTab.tsx`
- `src/app/components/SegmentCreateModal.tsx`
- `src/app/components/Sidebar.tsx`
- `src/app/components/TouchpointManagerPage.tsx`
- `src/app/components/gtmStore.ts`
- `src/app/components/touchpoints/ContactDossierModal.tsx`
- `src/app/components/touchpoints/CustomTouchpointModal.tsx`
- `src/app/components/touchpoints/DossierModal.tsx`
- `src/app/components/touchpoints/GTMModal.tsx`
- `src/app/components/touchpoints/PlayActionsModal.tsx`
- `src/app/components/touchpoints/ProductModal.tsx`
- `src/app/components/touchpoints/TouchpointAIAssistant.tsx`
- `src/app/components/touchpoints/TouchpointCreationModal.tsx`
- `src/app/components/touchpoints/TouchpointHeader.tsx`
- `src/app/components/touchpoints/TouchpointTimeline.tsx`
- `index.html`, `.gitignore`

**Reorganização do `gtm/`:**
- Criar `src/app/components/GtmPage.tsx` (de `other`)
- Remover `src/app/components/gtm/` inteiro (`GestaoTab.tsx`, `GtmDrawers.tsx`, `GtmPage.tsx`, `MatrixTab.tsx`, `PitchGenerator.tsx`)

**Interfaces:**
- Consumes: stores/componentes novos da Task 2.
- Produces: superfície de plays/touchpoints/accounts na versão deles, consumida por `App.tsx` (Task 5).

- [ ] **Step 1: Sobrescrever arquivos neutros com a versão deles**

```bash
git checkout other/Play-Fluxograma -- \
  src/app/components/AIAssistant.tsx \
  src/app/components/AccountCreateModal.tsx \
  src/app/components/AccountDetailPage.tsx \
  src/app/components/AccountEditDrawer.tsx \
  src/app/components/AccountsPage.tsx \
  src/app/components/ContactEditDrawer.tsx \
  src/app/components/CreatePlayWizard.tsx \
  src/app/components/CreateSegmentDrawer.tsx \
  src/app/components/DossieContatoModal.tsx \
  src/app/components/DossieCreateModal.tsx \
  src/app/components/ExpandableDossierCard.tsx \
  src/app/components/OrgChart.tsx \
  src/app/components/PlaysOverviewPage.tsx \
  src/app/components/PlaysTab.tsx \
  src/app/components/SegmentCreateModal.tsx \
  src/app/components/Sidebar.tsx \
  src/app/components/TouchpointManagerPage.tsx \
  src/app/components/gtmStore.ts \
  src/app/components/touchpoints/ContactDossierModal.tsx \
  src/app/components/touchpoints/CustomTouchpointModal.tsx \
  src/app/components/touchpoints/DossierModal.tsx \
  src/app/components/touchpoints/GTMModal.tsx \
  src/app/components/touchpoints/PlayActionsModal.tsx \
  src/app/components/touchpoints/ProductModal.tsx \
  src/app/components/touchpoints/TouchpointAIAssistant.tsx \
  src/app/components/touchpoints/TouchpointCreationModal.tsx \
  src/app/components/touchpoints/TouchpointHeader.tsx \
  src/app/components/touchpoints/TouchpointTimeline.tsx \
  index.html .gitignore
```

- [ ] **Step 2: Aplicar reorganização do gtm/**

```bash
git checkout other/Play-Fluxograma -- src/app/components/GtmPage.tsx
git rm -r src/app/components/gtm/
```

- [ ] **Step 3: Conferir que nada protegido foi tocado**

Run: `git status --short | grep -E "campaigns/|lib/linkedin|integrations/|pages/dashboard/"`
Expected: nenhuma saída (vazio). Se aparecer algo, reverter aquele arquivo com `git checkout main -- <arquivo>`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(merge): superficie de plays/touchpoints/accounts e gtm do Play-Fluxograma"
```

(Build ainda não precisa passar — falta `App.tsx`/`Home.tsx`/`TouchpointDetails.tsx`, Tasks 4-6.)

---

### Task 4: Merge manual de `App.tsx` (união de rotas)

**Files:**
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `PlayFlowPrototype`, `SettingsPage` (Task 2); `GtmPage` de `./components/GtmPage` (Task 3); `CampaignList`/`CampaignWizard`/`CampaignAnalytics`/`AdvancedCampaignCreator` (protegidos); `Integrations` (protegido).
- Produces: roteador com TODAS as rotas — campaigns + integrations (locais) **e** play-flow + configuracoes (deles).

**Contexto:** A versão deles do `App.tsx` REMOVE rotas de campaigns/integrations/docs e muda `PlaysRoute`/`ContasRoute`. Devemos partir do `App.tsx` local (atual na branch) e enxertar SÓ as adições deles.

- [ ] **Step 1: Atualizar imports — adicionar os deles, manter os locais**

No topo de `src/app/App.tsx`, adicionar:

```tsx
import { PlayFlowPrototype } from "./pages/PlayFlowPrototype";
import { SettingsPage } from "./pages/SettingsPage";
```

E trocar o import de `GtmPage` para o novo caminho:

```tsx
// de: import { GtmPage } from "./components/gtm/GtmPage";
import { GtmPage } from "./components/GtmPage";
```

**Manter** os imports locais de `Integrations`, `CampaignList`, `CampaignWizard`, `CampaignAnalytics`, `AdvancedCampaignCreator`, `LinkedInOAuthCallback`, `AdsPipelineDocs`.

- [ ] **Step 2: Atualizar `PlaysRoute` e `ContasRoute` com a lógica deles**

Substituir a função `PlaysRoute` pela versão deles (seleção por estado, `handleBack`):

```tsx
function PlaysRoute() {
  const location = useLocation();
  const incoming = (location.state as { accountId?: string; playId?: string } | null) ?? null;
  const [selectedPlay, setSelectedPlay] = useState<{ accountId: string; playId: string } | null>(
    incoming?.accountId && incoming?.playId
      ? { accountId: incoming.accountId, playId: incoming.playId }
      : null
  );
  const [newPlay, setNewPlay] = useState<NewPlayData | null>(null);

  const handleSelectPlay = (accountId: string, playId: string) =>
    setSelectedPlay({ accountId, playId });
  const handleOpenNewPlay = (play: NewPlayData) => setNewPlay(play);
  const handleBack = () => { setSelectedPlay(null); setNewPlay(null); };

  if (newPlay) return <TouchpointManagerPage newPlayData={newPlay} onBack={handleBack} />;
  if (selectedPlay)
    return (
      <TouchpointManagerPage
        accountId={selectedPlay.accountId}
        playId={selectedPlay.playId}
        onBack={handleBack}
      />
    );
  return <PlaysOverviewPage onSelectPlay={handleSelectPlay} onOpenNewPlay={handleOpenNewPlay} />;
}
```

Substituir `ContasRoute` pela versão deles (navega para `/play-flow`):

```tsx
function ContasRoute() {
  const navigate = useNavigate();
  return (
    <AccountsPage
      onOpenPlay={(accountId: string, playId: string, playName?: string, accountName?: string) =>
        navigate("/play-flow", { state: { accountId, playId, playName, accountName } })
      }
    />
  );
}
```

Remover a função `PlayDetailRoute` (deles a eliminaram; a rota `plays/:playId` sai junto no Step 3). Ajustar o import de `react-router-dom` removendo `useParams` se ficar sem uso.

- [ ] **Step 3: Mesclar as rotas — adicionar as deles SEM remover as locais**

No bloco `<Routes>`, dentro de `<Route element={<AppLayout />}>`:
- **Adicionar** (deles):
```tsx
<Route path="play-flow" element={<PlayFlowPrototype />} />
<Route path="configuracoes" element={<SettingsPage />} />
```
- **Remover** apenas a rota órfã `plays/:playId` (a `PlayDetailRoute` foi eliminada):
```tsx
// remover esta linha:
<Route path="plays/:playId" element={<PlayDetailRoute />} />
```
- **MANTER intactas** todas as rotas locais:
```tsx
<Route path="integrations" element={<Integrations />} />
<Route path="campaigns" element={<CampaignList />} />
<Route path="campaigns/new" element={<CampaignWizard />} />
<Route path="campaigns/new/advanced" element={<AdvancedCampaignCreator />} />
<Route path="campaigns/:id/edit" element={<CampaignWizard />} />
<Route path="campaigns/:id" element={<CampaignAnalytics />} />
<Route path="/docs/ads" element={<AdsPipelineDocs />} />
```

- [ ] **Step 4: Verificar rotas presentes**

Run: `grep -nE "path=\"(campaigns|integrations|play-flow|configuracoes)" src/app/App.tsx`
Expected: aparecem as 4 famílias de rota (campaigns, integrations, play-flow, configuracoes).

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx
git commit -m "feat(merge): App.tsx une rotas de campaigns/integrations (local) + play-flow/settings (deles)"
```

---

### Task 5: Merge manual de `Home.tsx` (dashboard deles + 3 abas locais)

**Files:**
- Modify: `src/app/pages/Home.tsx`
- Referência (protegidos, não alterar): `src/app/pages/dashboard/FunilTab.tsx`, `src/app/pages/dashboard/InternoTab.tsx`

**Interfaces:**
- Consumes: `<FunilTab />`, `<InternoTab />` de `./dashboard/*` (protegidos).
- Produces: `Home` com abas `Estratégico | Funil | Interno`, onde Estratégico = dashboard do repo externo.

**Contexto:** Base = `Home.tsx` deles (dashboard rico, sem abas). Reenxertar o sistema de abas local: o conteúdo atual do dashboard deles vira a aba "Estratégico".

- [ ] **Step 1: Trazer o `Home.tsx` deles como base**

```bash
git checkout other/Play-Fluxograma -- src/app/pages/Home.tsx
```

- [ ] **Step 2: Adicionar imports das abas locais**

No topo de `src/app/pages/Home.tsx`, adicionar:

```tsx
import { InternoTab } from './dashboard/InternoTab';
import { FunilTab } from './dashboard/FunilTab';
```

- [ ] **Step 3: Adicionar tipo e definição das abas**

Acima do componente `Home`, adicionar:

```tsx
type DashboardTab = 'estrategico' | 'funil' | 'interno';

const DASHBOARD_TABS: { id: DashboardTab; label: string }[] = [
  { id: 'estrategico', label: 'Estratégico' },
  { id: 'funil', label: 'Funil' },
  { id: 'interno', label: 'Interno' },
];
```

- [ ] **Step 4: Adicionar estado e a barra de abas dentro de `Home`**

Dentro de `export function Home()`, adicionar o estado logo no início:

```tsx
const [dashboardTab, setDashboardTab] = useState<DashboardTab>('estrategico');
```

(Garantir `import { useState } from 'react';` no topo — adicionar se ausente.)

No JSX, logo abaixo do `<h1 ...>Dashboard</h1>`, inserir a barra de abas:

```tsx
<div className="flex gap-2 mt-4 mb-6">
  {DASHBOARD_TABS.map((tab) => {
    const isActive = dashboardTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => setDashboardTab(tab.id)}
        className={
          "px-4 py-2 rounded-lg text-sm font-semibold transition-colors " +
          (isActive
            ? "bg-[#212a46] text-white"
            : "bg-white text-[#212a46] border border-gray-200 hover:bg-gray-50")
        }
        aria-pressed={isActive}
      >
        {tab.label}
      </button>
    );
  })}
</div>
```

- [ ] **Step 5: Envolver o dashboard deles na aba "Estratégico" e renderizar Funil/Interno**

Localizar o bloco JSX do dashboard que vinha deles (todo o conteúdo abaixo da barra de abas). Envolvê-lo numa condição e adicionar as outras duas abas:

```tsx
{dashboardTab === 'funil' && <FunilTab />}
{dashboardTab === 'interno' && <InternoTab />}
{dashboardTab === 'estrategico' && (
  <>
    {/* ...todo o conteúdo do dashboard que veio do repo externo... */}
  </>
)}
```

- [ ] **Step 6: Verificar referências às abas**

Run: `grep -nE "FunilTab|InternoTab|dashboardTab" src/app/pages/Home.tsx`
Expected: imports + estado + os 3 ramos condicionais presentes.

- [ ] **Step 7: Commit**

```bash
git add src/app/pages/Home.tsx
git commit -m "feat(merge): Home com dashboard deles na aba Estrategico + abas Funil/Interno locais"
```

---

### Task 6: Merge manual de `TouchpointDetails.tsx` (base deles + bloco LinkedIn local)

**Files:**
- Modify: `src/app/components/touchpoints/TouchpointDetails.tsx`
- Referência (protegidos): `src/lib/linkedin.ts` (`getLinkedInStatus`), `src/app/components/touchpoints/LinkedInAdDrawer.tsx`, `TouchpointTimeline.tsx` (`LinkedInAdData`)

**Interfaces:**
- Consumes: `getLinkedInStatus` de `@/lib/linkedin`; `LinkedInAdDrawer`; tipo `LinkedInAdData` de `./TouchpointTimeline`.
- Produces: `TouchpointDetails` na versão deles, com o painel LinkedIn Ads ativo quando `touchpoint.itemType === 'linkedin-ad'`.

**Contexto:** Base = versão deles (não tem o painel LinkedIn). Reenxertar o bloco LinkedIn que existe na versão local (`main`). Use `git show main:src/app/components/touchpoints/TouchpointDetails.tsx` como referência do bloco a copiar.

- [ ] **Step 1: Trazer o `TouchpointDetails.tsx` deles como base**

```bash
git checkout other/Play-Fluxograma -- src/app/components/touchpoints/TouchpointDetails.tsx
```

- [ ] **Step 2: Reenxertar os imports do bloco LinkedIn**

Adicionar no topo de `src/app/components/touchpoints/TouchpointDetails.tsx` (copiar exatamente da versão `main`):

```tsx
import { getLinkedInStatus } from '@/lib/linkedin';
import { LinkedInAdDrawer } from './LinkedInAdDrawer';
```

Garantir que o tipo `LinkedInAdData` esteja importado de `./TouchpointTimeline` (juntar ao import de tipos existente):

```tsx
import type { Touchpoint, LinkedInAdData } from './TouchpointTimeline';
```

Adicionar os ícones `Linkedin`, `AlertCircle`, `ExternalLink` ao import de `lucide-react` caso a versão deles não os tenha.

- [ ] **Step 3: Reenxertar estado, efeito e handlers do LinkedIn**

Dentro do componente, copiar da versão `main`:

```tsx
const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
const isLinkedInAd = touchpoint.itemType === 'linkedin-ad';

useEffect(() => {
  let cancelled = false;
  if (touchpoint.itemType !== 'linkedin-ad') return;
  getLinkedInStatus()
    .then((s) => { if (!cancelled) setLinkedinConnected(s.status === 'connected'); })
    .catch(() => { if (!cancelled) setLinkedinConnected(false); });
  return () => { cancelled = true; };
}, [touchpoint.itemType]);

const handlePublishAd = (ad: LinkedInAdData) => {
  onUpdate({ ...touchpoint, linkedinAd: ad, status: 'Executado' });
};
const handleConnectLinkedIn = () => {
  window.location.href = '/integrations';
};
```

(Verificar que `onUpdate` e `touchpoint` existem nas props da versão deles; se o nome diferir, adaptar. Verificar `useEffect`/`useState` no import de `react`.)

- [ ] **Step 4: Reenxertar o JSX do painel LinkedIn Ads e o drawer**

Copiar da versão `main` o bloco JSX do painel (a partir do comentário `{/* LinkedIn Ads panel ... */}` até o fechamento, incluindo os estados `linkedinConnected === null/false/true`) e o `<LinkedInAdDrawer ... />`. Posicioná-lo num ponto coerente do layout deles (ex.: no painel de detalhes do touchpoint), dentro de `{isLinkedInAd && !isDraft && !isEditing && ( ... )}`.

Referência completa do bloco:
```bash
git show main:src/app/components/touchpoints/TouchpointDetails.tsx | sed -n '353,480p'
```

- [ ] **Step 5: Verificar que o bloco LinkedIn está presente**

Run: `grep -nE "getLinkedInStatus|LinkedInAdDrawer|isLinkedInAd|linkedinConnected" src/app/components/touchpoints/TouchpointDetails.tsx`
Expected: todas as referências presentes (import, estado, handler, JSX).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/touchpoints/TouchpointDetails.tsx
git commit -m "feat(merge): TouchpointDetails base deles + reenxerto do painel LinkedIn Ads"
```

---

### Task 7: Build verde e correção de imports órfãos

**Files:**
- Modify: qualquer arquivo com erro de type/import revelado pelo build.

**Interfaces:**
- Consumes: todo o resultado das Tasks 2-6.
- Produces: `npm run build` verde.

- [ ] **Step 1: Rodar o build e coletar erros**

Run: `npm run build`
Expected (provável): erros de import/type por diferenças de assinatura entre os arquivos deles e os protegidos (ex.: `TouchpointManagerPage` recebendo props novas, tipos de `gtmStore`).

- [ ] **Step 2: Corrigir cada erro reportado**

Para cada erro:
- Import quebrado para arquivo que ficou no caminho antigo `gtm/` → atualizar para o novo caminho.
- Assinatura divergente em arquivo protegido consumido por arquivo deles → adaptar o **lado deles** (nunca o protegido) para casar com a interface protegida.
- Símbolo ausente → conferir se o arquivo de origem foi trazido na Task 2.

Repetir `npm run build` até verde. Não silenciar erros com `any` salvo último recurso documentado em comentário.

- [ ] **Step 3: Verificar build final**

Run: `npm run build`
Expected: PASS (sem erros de type/compilação).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix(merge): resolve imports e tipos pos-merge; build verde"
```

---

### Task 8: Smoke test das rotas protegidas e limpeza

**Files:** nenhuma alteração de código (salvo correção de smoke).

**Interfaces:**
- Consumes: build verde da Task 7.

- [ ] **Step 1: Subir o app**

Run: `npm run dev` (em background)
Expected: Vite sobe sem erro de runtime no console.

- [ ] **Step 2: Smoke das rotas protegidas (campaigns + LinkedIn)**

Abrir no navegador:
- `/campaigns` → lista de campanhas renderiza
- `/campaigns/:id` → analytics por empresa renderiza (dashboard de campaigns)
- `/integrations` → página de integrações abre; conexão LinkedIn presente
- Em `/plays` → abrir um touchpoint de canal LinkedIn → painel "LinkedIn Ads" aparece

Expected: todas as telas protegidas funcionam como em `main`.

- [ ] **Step 3: Smoke das rotas novas (deles)**

- `/play-flow` → fluxograma (`@xyflow/react`) renderiza
- `/configuracoes` → SettingsPage renderiza
- Dashboard (`/dashboard`) → 3 abas Estratégico/Funil/Interno alternam

Expected: telas novas funcionam.

- [ ] **Step 4: Remover o remote temporário**

```bash
git remote remove other
```

- [ ] **Step 5: Confirmar diff dos protegidos == vazio vs main**

Run: `git diff main --stat -- src/app/campaigns/ src/lib/linkedin/ src/app/integrations/ src/app/pages/dashboard/`
Expected: nenhuma saída (arquivos protegidos idênticos a `main`).

- [ ] **Step 6: Commit final (se houve ajuste de smoke)**

```bash
git add -A
git commit -m "chore(merge): smoke test ok; remove remote temporario" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- Balde 1 (PROTEGER campaigns/LinkedIn) → Global Constraints + Task 8 Step 5 (verificação).
- Balde 1b (dashboard) → Task 5 + protegido em Global Constraints.
- Balde 2 novos → Task 2; neutros → Task 3; `@xyflow/react` → Task 1; lixo ignorado → Global Constraints.
- Balde 3 (App.tsx) → Task 4; (Home.tsx) → Task 5; (TouchpointDetails) → Task 6.
- Reorganização gtm/ → Task 3 Step 2.
- Não-deletar integrations/ → Task 4 (mantém import/rota) + Task 8 Step 5.
- Verificação (build + smoke + remote cleanup) → Tasks 7-8.

**Placeholder scan:** os blocos de código de `App.tsx`/`Home.tsx` são literais; em `TouchpointDetails` (bloco grande de JSX) o plano referencia o comando exato `git show main:...` para copiar o trecho verbatim — não é placeholder, é instrução de origem precisa.

**Type consistency:** `getLinkedInStatus`, `LinkedInAdDrawer`, `LinkedInAdData`, `handlePublishAd`, `handleConnectLinkedIn`, `linkedinConnected`, `isLinkedInAd` usados de forma idêntica entre a referência (`main`) e a Task 6. Rotas `play-flow`/`configuracoes` e componentes `PlayFlowPrototype`/`SettingsPage` consistentes entre Task 2 e Task 4.
