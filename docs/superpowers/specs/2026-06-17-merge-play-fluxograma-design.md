# Merge do repo `Play-Fluxograma` no `maestro-unificado`

**Data:** 2026-06-17
**Branch de entrega:** `feat/merge-play-fluxograma` (a partir de `main`)

## Objetivo

Trazer todas as features desenvolvidas no repo externo
`github.com/fmamutedelucca/maestro-unificado-main` (branch `Play-Fluxograma`)
para este projeto, **preservando intacto** todo o módulo de **Campanhas** e a
**integração com LinkedIn** deste repo.

## Contexto / Diagnóstico

Os dois repos **não compartilham histórico git** (`no common commits`). O repo
externo começou com um "Initial commit" em **2026-05-29 14:20** copiando este
projeto naquela data. A partir daí divergiram:

- **Este repo (`main`, junho):** evoluiu `campaigns/` — analytics por empresa,
  dashboards, wizard, preview de anúncio, comentários, e a integração LinkedIn.
- **Repo externo (`Play-Fluxograma`):** evoluiu plays / GTM / touchpoints /
  settings — `PlayFlowPrototype`, `SettingsPage`, novos stores, `PlayCard`,
  `PlayStatusControl`, `@xyflow/react` (fluxograma), etc.

Diff bruto: **107 arquivos, +12.731 / −20.760**. Os "−" são em sua maioria o
módulo de campaigns que nunca existiu no repo externo — **não devem ser
aplicados**. Um merge automático seria destrutivo.

## Regra de decisão (definida pelo usuário)

> Campanhas + integração LinkedIn = **exatamente igual a este repo, sem mexer**.
> Todo o restante = trazer do repo externo. Em arquivos neutros modificados pelos
> dois lados, **a versão do repo externo prevalece**.

## Classificação dos arquivos (3 baldes)

### Balde 1 — PROTEGER (mantém versão deste repo, não tocar)
- `src/app/campaigns/**` (módulo inteiro: wizard, segmentation, analytics, preview)
- `src/lib/linkedin/**`, `src/lib/linkedin.ts`
- `src/lib/useCampaigns.ts`, `src/lib/mockCampaignData.ts`
- `src/lib/useIntegrations.ts`
- `src/app/integrations/**` (LinkedInOAuthCallback, LinkedInConnectionModal, **Integrations.tsx**)
- `src/app/components/touchpoints/LinkedInAdDrawer.tsx`
- `src/lib/linkedin/analytics.ts`
- `docs/superpowers/**` (specs/plans de campaigns deste repo)

**Crítico:** o repo externo **deleta** `Integrations.tsx` e **remove** o painel
LinkedIn Ads de `TouchpointDetails.tsx`. Essas remoções **NÃO** são aplicadas.

### Balde 2 — TRAZER do repo externo (features novas + neutros)
Novos arquivos (não existem aqui):
- `src/app/pages/PlayFlowPrototype.tsx`, `src/app/pages/SettingsPage.tsx`
- `src/app/components/`: `PlayCard.tsx`, `PlayStatusControl.tsx`, `ContactCard.tsx`,
  `AccountCard.tsx`, `accountsStore.ts`, `dossiersStore.ts`, `playDraftStore.ts`,
  `playsStore.ts`, `GtmPage.tsx`
- `src/app/components/touchpoints/`: `EmailComposerModal.tsx`,
  `PlayHistoryDrawer.tsx`, `TouchpointCard.tsx`, `TouchpointTimelineStrip.tsx`,
  `touchpointsStore.ts`
- `src/app/hooks/useEscToClose.ts`, `src/app/hooks/useResizablePanel.ts`

Arquivos neutros modificados pelos dois lados → **versão deles** (~30 arquivos:
`AccountsPage`, `Sidebar`, `OrgChart`, `HomePage`, `PlaysOverviewPage`,
`PlaysTab`, `CreatePlayWizard`, modais de touchpoint que não tocam LinkedIn, etc.)

Estrutura `gtm/` reorganizada: o repo externo move `components/gtm/GtmPage.tsx` →
`components/GtmPage.tsx` e remove `components/gtm/*` (GestaoTab, MatrixTab,
PitchGenerator, GtmDrawers). Adotar a estrutura nova deles (não toca campaigns/LinkedIn).

`package.json`: adicionar apenas `"@xyflow/react": "^12.11.0"` (única dep nova;
nenhuma dep exclusiva deste repo se perde).

**Ignorar (lixo, não trazer):** `temp_block.txt`, `.claude/settings.local.json`,
`.vscode/settings.json` (deleção).

### Balde 3 — MERGE MANUAL (cruzam os dois mundos)
- **`src/app/App.tsx`** — base = versão deste repo. Enxertar **apenas** as adições
  deles: imports e rotas de `PlayFlowPrototype` (`/play-flow`) e `SettingsPage`
  (`/configuracoes`), a nova lógica de `PlaysRoute`/`ContasRoute` (navegação para
  `/play-flow`), e o novo import de `GtmPage` (`./components/GtmPage`).
  **Não remover:** rotas `campaigns/*`, rota `integrations`, import de `Integrations`,
  rota `/docs/ads` (se aplicável). Resultado = união, não substituição.
- **`src/app/components/touchpoints/TouchpointDetails.tsx`** — base = **versão do
  repo externo** (traz 100% das melhorias de plays/UI deles). Enxertar de volta
  **apenas o bloco de integração LinkedIn Ads** deste repo, que só se ativa quando
  o touchpoint é do canal LinkedIn (`itemType === 'linkedin-ad'`):
  - imports: `getLinkedInStatus` (`@/lib/linkedin`), `LinkedInAdDrawer`,
    tipo `LinkedInAdData`
  - estado `linkedinConnected` + `useEffect` que chama `getLinkedInStatus()`
  - handlers `handlePublishAd` e `handleConnectLinkedIn`, flag `isLinkedInAd`
  - o JSX do painel "LinkedIn Ads" (estados conectado/desconectado/publicado) e o
    `<LinkedInAdDrawer />`
  Tudo o mais (layout, plays, demais canais) vem da versão deles.

## Plano de execução (alto nível)

1. Criar branch `feat/merge-play-fluxograma` a partir de `main`.
2. Balde 2 — `git checkout other/Play-Fluxograma -- <arquivo>` para cada arquivo
   novo e cada neutro; aplicar a reorganização do `gtm/`.
3. Balde 2 — adicionar `@xyflow/react` ao `package.json` e rodar `npm install`.
4. Balde 3 — merge manual de `App.tsx` e `TouchpointDetails.tsx`.
5. Balde 1 — verificar que nada protegido foi alterado (diff contra `main`
   restrito a `campaigns/`, `lib/linkedin`, `integrations/`).
6. Limpar imports órfãos / referências quebradas decorrentes da fusão.

## Verificação

- `npm run build` (ou `tsc --noEmit`) passa sem erros.
- Rotas presentes e compiláveis: `campaigns`, `campaigns/new`,
  `campaigns/:id`, `integrations`, **e** as novas `play-flow`, `configuracoes`.
- `getLinkedInStatus` / `LinkedInAdDrawer` continuam referenciados em
  `TouchpointDetails.tsx`.
- App sobe (`npm run dev`) e a tela de Campanhas + conexão LinkedIn abrem.

## Entrega

Branch `feat/merge-play-fluxograma` para revisão do usuário. **Não** mesclar em
`main` automaticamente. Remover o remote temporário `other` ao final.

## Riscos

- **R1 (aceito):** trazer 100% das features/arquivos deles. Erros de tipo
  decorrentes são resolvidos na etapa 6, guiados pelo build.
- **R2 (resolvido):** `TouchpointDetails.tsx` usa a versão **deles** como base e
  reenxerta só o bloco LinkedIn Ads (ativo quando canal = LinkedIn). Ver Balde 3.
- **R3 (aceito):** sem ressalvas nos arquivos neutros. Build + smoke test das
  rotas protegidas garantem que campaigns/LinkedIn seguem funcionando.
