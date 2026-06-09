# Refatoração do fluxo de campanha — conta = conjunto de anúncio

**Data:** 2026-06-09
**Branch:** feat/port-mastro2026-gtm-plays

## Contexto

O wizard de "Nova Campanha" tem 4 steps: Configuração (1), Segmentação (2),
Criativo (3), Revisão & Lançamento (4). O estado vive em `useState` no
componente pai `CampaignWizard.tsx` (sem store global) e é passado para cada
step por props/callbacks.

Dois problemas de modelagem:

1. **Step 1** expõe "Grupo de Campanha" e uma lista de múltiplas campanhas que
   herdam objetivo/orçamento. Para o fluxo ABM atual, o usuário deve criar
   **uma única campanha**, sem grupo.

2. **Step 2** trata as facetas de segmentação como **globais** para a campanha
   inteira. No LinkedIn Ads, cada empresa-alvo (conta) deve virar um
   **conjunto de anúncio separado**, e as facetas de pessoa são, na prática,
   por conta. Além disso, "porte da empresa" e "setor/indústria" não fazem
   sentido quando a empresa específica já está fixada.

## Objetivo

- Step 1: uma campanha só, sem grupo de campanha exposto.
- Step 2: cada empresa-alvo = um conjunto de anúncio; facetas de pessoa com
  modelo "padrão global + override por conta"; remover porte e indústria.
- Lançamento: criar 1 campaign group implícito + 1 campanha/conjunto por conta.

Fora de escopo: mudanças no Step 3 (Criativo) e na UI do Step 4 além de iterar
sobre contas. Não mexer no Brand Kit.

---

## Step 1 — Configuração

### Mudanças de UI
- Remover a seção/input **"Grupo de Campanha"**.
- Remover a **lista de campanhas** e o botão "Adicionar Campanha"/duplicar/remover.
- Adicionar um único campo **"Nome da Campanha"** no lugar.
- Remover o contador de footer "0/1 campanha nomeadas".
- Manter Objetivo, Orçamento & Agenda, Otimização & Bidding, Auto-ativar.

### Mudanças de dados (`CampaignConfig`)
- Remover `campaignGroupName: string`.
- Remover `campaigns: CampaignEntry[]`.
- Adicionar `campaignName: string`.
- Remover o tipo `CampaignEntry` se não for usado em outro lugar (verificar antes).

### Validação (`canProceed` do Step 1)
- `campaignName` não vazio.
- Manter as regras existentes de objetivo/orçamento.

---

## Step 2 — Segmentação (conta = conjunto de anúncio)

### Modelo de dados

`companies` (empresas-alvo) **continua global** — é a lista de contas, e cada
item É um conjunto de anúncio. As facetas de pessoa saem do nível global e
passam a viver em `defaultTargeting` + `overrides` por conta. `industries` e
`companySizes` são **removidos**.

```ts
interface PersonTargeting {
  locations: FacetSelection;        // obrigatória: ≥1 no valor efetivo de cada conta
  seniorities: FacetSelection;
  jobFunctions: FacetSelection;
  jobTitles: FacetSelection;
  yearsOfExperience: FacetSelection;
}

interface TargetingData {
  companies: FacetSelection;                    // lista de contas / conjuntos de anúncio
  defaultTargeting: PersonTargeting;            // "Padrão (todas as contas)"
  overrides: Record<string, PersonTargeting>;   // chave = FacetItem.id da conta
}
```

**Targeting efetivo de uma conta:** se existe `overrides[accountId]`, usa ele;
senão usa `defaultTargeting`.

### Layout — master-detail

```
┌─ ⚠ aviso LinkedIn (discriminação) ────────────────────────────────┐
┌─ 🏢 Empresas-alvo [ABM][Recomendado] ─────────┐  ┌─ AUDIÊNCIA ────┐
│ [+ Incluir] [— Excluir]  typeahead LinkedIn    │  │ ESTIMADA       │
│ ● Nubank  ● Stone  ● iFood                     │  │ (sticky)       │
└────────────────────────────────────────────────┘  │ por conjunto + │
                                                      │ total agregado │
CONJUNTOS DE ANÚNCIO (n)            ┌─ detail: facetas │               │
┌────────────────────┐             │ da conta/padrão  └────────────────┘
│ ⚙ Padrão (todas) ▸ │ (master)    │ ativo
│ ● Nubank   padrão ▸ │             │ 📍 Localização *
│ ● Stone   custom  ▸ │             │ Senioridade
│ ● iFood    padrão ▸ │             │ Função / Cargo / Anos exp.
└────────────────────┘             │ [↺ Voltar ao padrão] [⇄ Aplicar a todas]
```

### Interação
- **Master (coluna esquerda):** item fixo **⚙ Padrão (todas as contas)** no
  topo, depois um item por conta (logo, nome, badge `padrão`/`personalizado`).
  Item ativo destacado com accent (`#0369A1`).
- **Detail (painel direito):** as 5 facetas de pessoa do item ativo.
  Localização marcada como obrigatória (asterisco).
- **Editar com Padrão ativo** → altera `defaultTargeting`.
- **Editar com conta ativa** → cria/atualiza `overrides[accountId]`; badge da
  conta vira `personalizado`.
- **"Aplicar a todas"** (visível no Padrão) → limpa todos os `overrides`
  (todas voltam a herdar o padrão). Ação destrutiva → exige confirmação.
- **"Voltar ao padrão"** (visível numa conta) → remove `overrides[accountId]`;
  badge volta a `padrão`.
- **Empty state:** sem empresas-alvo, a área de conjuntos mostra "Adicione uma
  empresa-alvo para configurar os conjuntos de anúncio".
- **Sidebar Audiência Estimada:** mantém; passa a mostrar estimativa por
  conjunto + total agregado, calculada sobre o targeting efetivo de cada conta.
- **Responsivo:** em < 1024px, o master vira lista colapsável acima do detail
  (stack vertical).

### Validação (`canProceed` do Step 2)
- **≥ 1 empresa-alvo** selecionada, **E**
- **cada conjunto efetivo tem ≥ 1 localização** (via padrão ou override).
- Se faltar localização em algum conjunto, indicar qual conta.

---

## Lançamento (bastidor — sem UI nova)

- Criar **1 Campaign Group implícito** no LinkedIn (nome derivado de
  `campaignName`). Não exposto ao usuário.
- Para cada empresa-alvo, criar **1 campanha/conjunto de anúncio** com o
  targeting efetivo daquela conta (empresa fixada + facetas resolvidas).
- `OrchestrationStep` (Step 4) e `runCampaignPipeline` passam a iterar sobre
  `targetingData.companies` em vez de `campaignConfig.campaigns`.

---

## Arquivos afetados (mapa inicial)

- `src/app/campaigns/wizard/types.ts` — `CampaignConfig`, `TargetingData`,
  `PersonTargeting`, remover `CampaignEntry`.
- `src/app/campaigns/wizard/segmentation/types.ts` — possível ajuste de tipos.
- `src/app/campaigns/wizard/ConfigStep.tsx` — UI Step 1.
- `src/app/campaigns/wizard/SegmentationStep.tsx` — UI Step 2 (master-detail).
- `src/app/campaigns/wizard/segmentation/targeting.ts` — remover URNs de
  industries/companySizes; helpers de targeting efetivo.
- `src/app/campaigns/CampaignWizard.tsx` — estado, `canProceed`, defaults.
- `src/app/campaigns/wizard/OrchestrationStep.tsx` + pipeline — iterar contas.

## Riscos / pontos de atenção
- Estado é local ao wizard; mudanças de shape exigem atualizar defaults e
  qualquer fixture/mock.
- A estimativa de audiência por conjunto pode exigir N chamadas à API
  (Audience Count) — definir batching/granularidade na implementação.
- Verificar usos remanescentes de `campaigns`, `campaignGroupName`,
  `industries`, `companySizes` antes de remover.
