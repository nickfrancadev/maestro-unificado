# Brief inline no Step Criativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o Brief de modal escondido em painel inline aberto por padrão no Step Criativo, com os campos sempre editáveis e a extração (PDF/site) rebaixada a ação secundária.

**Architecture:** O `CreativeStep` já dirige o painel principal por um único estado `editingTarget` (`TEMPLATE_TARGET` | `company.id`). Adiciona-se um terceiro alvo, `BRIEF_TARGET`, que passa a ser o inicial. O conteúdo do `BriefModal` migra para um `BriefPane` sem casca de overlay, com os estados de leitura (`BrandSummary`) e de pré-extração fundidos num único layout editável.

**Tech Stack:** React 18, TypeScript, Tailwind, Vitest + Testing Library (jsdom para `.test.tsx`), lucide-react.

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-30-brief-inline-no-step-criativo-design.md`
- Testes de componente são `.test.tsx` e rodam em jsdom; `.test.ts` roda em node. Não colocar teste de DOM em `.test.ts`.
- Shims de `matchMedia`/`ResizeObserver` já vivem em `vitest.setup.ts` — não redeclarar.
- Rodar a suíte com `npm test` (é `vitest run`).
- Cor primária da marca do produto: `#FF5F39` (hover `#E54A26`). Reaproveitar as classes já usadas no arquivo, não inventar tokens.
- Limite de asset: 5MB (`MAX_ASSET_MB`), só imagens (`image/*`).
- Mensagens de UI em português, sem acento removido — seguir o padrão do arquivo.
- Não alterar `BrandBriefDrawer` (brief por empresa-alvo, componente distinto).
- Não alterar os endpoints de extração nem `/ai/client-voice`.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/app/campaigns/wizard/BriefPane.tsx` | **novo** — painel do Brief: seção Marca (global, salvamento explícito) + seção Aplicação nesta campanha (ao vivo). Exporta `BriefDraft`. |
| `src/app/campaigns/wizard/BriefPane.test.tsx` | **novo** — testes do painel isolado |
| `src/app/campaigns/wizard/BriefModal.tsx` | **removido** na Task 2 |
| `src/app/campaigns/wizard/CreativeStep.tsx` | `BRIEF_TARGET`, alvo inicial, ramo de render, linha do painel esquerdo; remove `voiceModalOpen` |

Task 1 cria o painel sem tocar no app em execução (nada o importa ainda). Task 2 liga e remove o modal. Cada uma é revisável isoladamente.

---

### Task 1: `BriefPane` — painel com campos sempre editáveis

**Files:**
- Create: `src/app/campaigns/wizard/BriefPane.tsx`
- Test: `src/app/campaigns/wizard/BriefPane.test.tsx`
- Read for reference: `src/app/campaigns/wizard/BriefModal.tsx` (fonte do conteúdo)

**Interfaces:**
- Consumes: `BrandKit`, `LogoVariant`, `LOGO_VARIANTS`, `MOCK_PRODUCTS`, `MOCK_AUDIENCES`, `MOCK_PERSONAS` de `./brandKit`; `FontPicker` de `./CreativeStep`
- Produces:

```ts
export interface BriefDraft {
  voice: string;
  context: string;
  websiteUrl: string;
  productService: string;
  audienceMarket: string;
  persona: string;
  brandColors: { primary: string; secondary: string; accent: string };
  fontFamily: string;
  logos: Record<LogoVariant, string | null>;
  icons: string[];
  graphics: string[];
  source: 'website' | 'brandbook' | null;
  extractedRef: string;
}

export interface BriefPaneProps {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  status: BrandKit['status'];
  savingBrand: boolean;
  onSaveBrand: () => void;
  extracting: boolean;
  extractError: string | null;
  extractWarning: string | null;
  onExtractWebsite: () => void;
  onUploadBrandBook: (file: File) => void;
  onResetExtraction: () => void;
  onCampaignFieldChange: (
    patch: Partial<Pick<BriefDraft, 'productService' | 'audienceMarket' | 'persona'>>,
  ) => void;
}

export function BriefPane(props: BriefPaneProps): JSX.Element;
```

`onCampaignFieldChange` existe porque a seção "Aplicação nesta campanha" grava
ao vivo em `creativeData`, enquanto a seção Marca só grava no `onSaveBrand`.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/app/campaigns/wizard/BriefPane.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BriefPane, type BriefDraft } from './BriefPane';

afterEach(cleanup);

function draft(over: Partial<BriefDraft> = {}): BriefDraft {
  return {
    voice: '', context: '', websiteUrl: '',
    productService: '', audienceMarket: '', persona: '',
    brandColors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
    icons: [], graphics: [],
    source: null, extractedRef: '',
    ...over,
  };
}

function setup(over: Partial<BriefDraft> = {}, status: 'defined' | 'empty' = 'empty', props = {}) {
  const setDraft = vi.fn();
  const onSaveBrand = vi.fn();
  const onCampaignFieldChange = vi.fn();
  render(
    <BriefPane
      draft={draft(over)}
      setDraft={setDraft}
      status={status}
      savingBrand={false}
      onSaveBrand={onSaveBrand}
      extracting={false}
      extractError={null}
      extractWarning={null}
      onExtractWebsite={vi.fn()}
      onUploadBrandBook={vi.fn()}
      onResetExtraction={vi.fn()}
      onCampaignFieldChange={onCampaignFieldChange}
      {...props}
    />,
  );
  return { setDraft, onSaveBrand, onCampaignFieldChange };
}

describe('BriefPane — marca já definida', () => {
  // O bug central: hoje o modal renderiza BrandSummary em somente-leitura
  // quando a marca vem de /ai/client-voice, e não há como alterá-la.
  it('renderiza o tom de voz num campo editável', () => {
    const { setDraft } = setup({ voice: 'Técnico e didático' }, 'defined');
    const campo = screen.getByLabelText(/tom de voz/i) as HTMLTextAreaElement;
    expect(campo).not.toHaveAttribute('readonly');
    expect(campo.value).toBe('Técnico e didático');
    fireEvent.change(campo, { target: { value: 'Direto' } });
    expect(setDraft).toHaveBeenCalled();
  });

  it('mantém as ações de extração alcançáveis', () => {
    setup({ voice: 'Técnico' }, 'defined');
    expect(screen.getByText(/substituir a partir de pdf/i)).toBeTruthy();
    expect(screen.getByText(/extrair do site novamente/i)).toBeTruthy();
  });

  it('avisa que a marca vale para todas as campanhas', () => {
    setup({ voice: 'Técnico' }, 'defined');
    expect(screen.getByText(/todas as campanhas/i)).toBeTruthy();
  });
});

describe('BriefPane — marca vazia', () => {
  it('mostra os campos preenchíveis sem exigir extração antes', () => {
    setup({}, 'empty');
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
    expect(screen.queryByText(/aparecem após a extração/i)).toBeNull();
  });

  it('oferece os dois caminhos de extração', () => {
    setup({}, 'empty');
    expect(screen.getByText(/brand book/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /extrair com ia/i })).toBeTruthy();
  });
});

describe('BriefPane — separação de escopo', () => {
  // Campo de campanha grava ao vivo; não pode acionar o save global.
  it('campo de campanha chama onCampaignFieldChange e não onSaveBrand', () => {
    const { onCampaignFieldChange, onSaveBrand } = setup({}, 'defined');
    fireEvent.change(screen.getByLabelText(/produto\/serviço/i), {
      target: { value: 'Produto A' },
    });
    expect(onCampaignFieldChange).toHaveBeenCalledWith({ productService: 'Produto A' });
    expect(onSaveBrand).not.toHaveBeenCalled();
  });

  it('salvar marca chama onSaveBrand uma vez', () => {
    const { onSaveBrand } = setup({ voice: 'Técnico' }, 'defined');
    fireEvent.click(screen.getByRole('button', { name: /salvar marca/i }));
    expect(onSaveBrand).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
npx vitest run src/app/campaigns/wizard/BriefPane.test.tsx
```

Esperado: FAIL com `Failed to load url ./BriefPane` — o arquivo ainda não existe.

- [ ] **Step 3: Criar o `BriefPane`**

Criar `src/app/campaigns/wizard/BriefPane.tsx`. Copiar de `BriefModal.tsx`:
`MAX_ASSET_MB`, `makeImageObjectUrl`, `BrandBookDropzone`, `CampaignSelect`,
`ColorField`/`LogoSlot` (o que existir) e a interface `BriefDraft`.

Descartar do original: a casca `fixed inset-0` de overlay, o cabeçalho com `X`,
o rodapé "Cancelar/Salvar", o toggle de dev (`devScenario`) e o componente
`BrandSummary` inteiro.

Estrutura do novo componente:

```tsx
export function BriefPane({
  draft, setDraft, status, savingBrand, onSaveBrand,
  extracting, extractError, extractWarning,
  onExtractWebsite, onUploadBrandBook, onResetExtraction,
  onCampaignFieldChange,
}: BriefPaneProps) {
  const definida = status === 'defined';

  return (
    <div className="space-y-6">
      {/* ===== Seção Marca (global) ===== */}
      <section>
        <div className="flex items-baseline justify-between">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">Marca</div>
          <span className="text-[10px] text-slate-400">Vale para todas as campanhas</span>
        </div>

        {/* Extração: destaque quando vazia, secundária quando definida */}
        {definida ? (
          <SecondaryExtraction
            extracting={extracting}
            onUploadBrandBook={onUploadBrandBook}
            onExtractWebsite={onExtractWebsite}
          />
        ) : (
          <PrimaryExtraction
            draft={draft}
            setDraft={setDraft}
            extracting={extracting}
            onUploadBrandBook={onUploadBrandBook}
            onExtractWebsite={onExtractWebsite}
          />
        )}

        {draft.source && (
          <ProvenanceChip source={draft.source} reference={draft.extractedRef} onReset={onResetExtraction} />
        )}
        {extractWarning && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{extractWarning}</p>
        )}
        {extractError && (
          <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">{extractError}</p>
        )}

        {/* Campos sempre visíveis e editáveis, nos dois estados */}
        <BrandFields draft={draft} setDraft={setDraft} />

        <button
          type="button"
          onClick={onSaveBrand}
          disabled={savingBrand}
          className="mt-4 px-4 py-2 text-sm font-bold text-white bg-[#FF5F39] hover:bg-[#E54A26] disabled:bg-slate-300 rounded-lg shadow-sm"
        >
          {savingBrand ? 'Salvando…' : 'Salvar marca'}
        </button>
      </section>

      <div className="h-px bg-slate-200" />

      {/* ===== Seção Aplicação nesta campanha (ao vivo) ===== */}
      <section>
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">Aplicação nesta campanha</div>
        <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
          Específico para esta campanha — não faz parte da marca.
        </p>
        <CampaignSelect
          label="Produto/Serviço" value={draft.productService} options={MOCK_PRODUCTS}
          placeholder="Selecione um produto ou serviço"
          onChange={(v) => { setDraft((d) => ({ ...d, productService: v })); onCampaignFieldChange({ productService: v }); }}
        />
        <CampaignSelect
          label="Públicos/Mercados" value={draft.audienceMarket} options={MOCK_AUDIENCES}
          placeholder="Selecione um público ou mercado"
          onChange={(v) => { setDraft((d) => ({ ...d, audienceMarket: v })); onCampaignFieldChange({ audienceMarket: v }); }}
        />
        <CampaignSelect
          label="Persona/Público" value={draft.persona} options={MOCK_PERSONAS}
          placeholder="Selecione uma persona"
          onChange={(v) => { setDraft((d) => ({ ...d, persona: v })); onCampaignFieldChange({ persona: v }); }}
        />
      </section>
    </div>
  );
}
```

`SecondaryExtraction` — dois botões discretos, sem dropzone em destaque:

```tsx
function SecondaryExtraction({ extracting, onUploadBrandBook, onExtractWebsite }: {
  extracting: boolean;
  onUploadBrandBook: (file: File) => void;
  onExtractWebsite: () => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      <label className="text-[11px] font-semibold text-[#FF5F39] hover:text-[#E54A26] cursor-pointer">
        Substituir a partir de PDF
        <input
          type="file" accept="application/pdf" className="hidden" disabled={extracting}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadBrandBook(f); }}
        />
      </label>
      <button
        type="button" onClick={onExtractWebsite} disabled={extracting}
        className="text-[11px] font-semibold text-[#FF5F39] hover:text-[#E54A26] disabled:text-slate-300"
      >
        Extrair do site novamente
      </button>
    </div>
  );
}
```

`PrimaryExtraction` — o bloco atual do estado A (dropzone + campo de site +
"Extrair com IA"), **sem** a frase "Os campos da marca aparecem após a extração".

`BrandFields` — os campos do estado B atual (tom de voz, contexto, cores, fonte,
logos, ícones, grafismos), sem nenhuma condicional de `readOnly`.

Cada campo precisa de `<label htmlFor>` + `id` casando, senão
`getByLabelText` dos testes não acha. Ex.:

```tsx
<label htmlFor="brief-voice" className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
  Tom de voz <span className="text-slate-400 font-normal lowercase">(2-3 frases descrevendo como a sua marca fala)</span>
</label>
<textarea
  id="brief-voice" value={draft.voice} rows={4}
  onChange={(e) => setDraft((d) => ({ ...d, voice: e.target.value }))}
  placeholder="Ex: Direto e confiante, sem jargão."
  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none leading-relaxed"
/>
```

O mesmo para `brief-context`, `brief-product`, `brief-audience`, `brief-persona`.

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
npx vitest run src/app/campaigns/wizard/BriefPane.test.tsx
```

Esperado: PASS, 8 testes.

- [ ] **Step 5: Rodar a suíte inteira**

```bash
npm test
```

Esperado: tudo verde. Nada consome o `BriefPane` ainda, então não pode haver regressão.

- [ ] **Step 6: Commit**

```bash
git add src/app/campaigns/wizard/BriefPane.tsx src/app/campaigns/wizard/BriefPane.test.tsx
git commit -m "feat(brief): BriefPane com campos sempre editáveis

Extrai o conteúdo do BriefModal para um painel sem casca de overlay e funde os
estados de leitura e de pré-extração num único layout editável.

O estado somente-leitura (BrandSummary) era um bug: quando /ai/client-voice
devolvia marca salva, o modal escondia o BrandEditor e com ele o upload de
brandbook e a extração do site — quem já tinha marca não tinha como alterá-la.

A seção Marca guarda salvamento explícito por escrever global; a de campanha
avisa ao vivo via onCampaignFieldChange."
```

---

### Task 2: Ligar no `CreativeStep` e remover o modal

**Files:**
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx`
- Delete: `src/app/campaigns/wizard/BriefModal.tsx`
- Test: `src/app/campaigns/wizard/CreativeStep.brief.test.tsx` (novo)

**Interfaces:**
- Consumes: `BriefPane`, `BriefDraft` de `./BriefPane` (Task 1)
- Produces: `BRIEF_TARGET` como alvo inicial de `editingTarget`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/app/campaigns/wizard/CreativeStep.brief.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreativeStep } from './CreativeStep';

afterEach(cleanup);

vi.mock('@/lib/ai', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai')>()),
  fetchClientVoice: vi.fn().mockResolvedValue({
    voice: '', brand_context: '', website_url: '',
    product_service: '', audience_market: '', persona: '',
  }),
  saveClientVoice: vi.fn().mockResolvedValue(undefined),
}));

const targeting = {
  companies: { included: [{ id: 'c1', label: 'Nubank' }], excluded: [] },
  defaultTargeting: {
    locations: { included: [], excluded: [] },
    seniorities: { included: [], excluded: [] },
    jobFunctions: { included: [], excluded: [] },
    jobTitles: { included: [], excluded: [] },
    yearsOfExperience: { included: [], excluded: [] },
  },
  overrides: {},
};

function renderStep() {
  return render(
    <MemoryRouter>
      <CreativeStep
        selectedAccounts={[]}
        targetingData={targeting as never}
        creativeData={{ overrides: {} } as never}
        onCreativeChange={vi.fn()}
        campaignId="camp-1"
      />
    </MemoryRouter>,
  );
}

describe('CreativeStep — Brief inline', () => {
  it('abre com o Brief selecionado, não com o Template global', () => {
    renderStep();
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
  });

  it('permite trocar para o Template global', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /template global/i }));
    expect(screen.queryByLabelText(/tom de voz/i)).toBeNull();
  });

  it('permite voltar para o Brief', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: /template global/i }));
    fireEvent.click(screen.getByRole('button', { name: /^brief/i }));
    expect(screen.getByLabelText(/tom de voz/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
npx vitest run src/app/campaigns/wizard/CreativeStep.brief.test.tsx
```

Esperado: FAIL — o step abre no Template global, então `getByLabelText(/tom de voz/i)` não acha nada.

- [ ] **Step 3: Adicionar `BRIEF_TARGET` e trocar o alvo inicial**

Em `CreativeStep.tsx`, junto de onde `TEMPLATE_TARGET` é declarado:

```ts
const BRIEF_TARGET = '__brief__';
```

Trocar a inicialização (linha ~111) e remover o estado do modal (linha ~113):

```ts
const [editingTarget, setEditingTarget] = useState<string>(BRIEF_TARGET);
// remover: const [voiceModalOpen, setVoiceModalOpen] = useState(false);

const isBrief = editingTarget === BRIEF_TARGET;
const isTemplate = editingTarget === TEMPLATE_TARGET;
const editingCompany = !isTemplate && !isBrief
  ? companies.find((c) => c.id === editingTarget) || null
  : null;
```

- [ ] **Step 4: Converter a linha "Brief" em seletor**

Substituir o `onClick` e o chevron do botão do Brief (linhas ~692-706):

```tsx
<button
  onClick={() => { setEditingTarget(BRIEF_TARGET); setBriefDrawerOpen(false); }}
  className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-100 transition-colors ${
    isBrief ? 'bg-[#FFF1ED] border-l-4 border-l-[#FF5F39]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
  }`}
>
  <div className="w-8 h-8 rounded-md bg-[#FFE3DA] flex items-center justify-center shrink-0">
    <PaintBucket className="w-4 h-4 text-[#FF5F39]" />
  </div>
  <div className="flex-1 min-w-0">
    <div className={`text-sm truncate ${isBrief ? 'font-bold text-[#212A46]' : 'font-semibold text-slate-700'}`}>
      Brief
    </div>
    <div className="text-[10px] text-slate-500 truncate">
      {clientVoice || <span className="italic text-slate-400">Defina a marca</span>}
    </div>
  </div>
</button>
```

O `<ChevronRight>` sai daqui. Se ele não for usado em mais nenhum lugar do
arquivo, remover também do import de `lucide-react`.

- [ ] **Step 5: Renderizar o painel e remover o modal**

No `<main>`, antes do ramo do template/empresa, adicionar o ramo do Brief. O
cabeçalho "Editando: …" (linha ~792) passa a cobrir três casos:

```tsx
{isBrief ? (
  <BriefPane
    draft={briefDraft}
    setDraft={setBriefDraft}
    status={brandKit.status}
    savingBrand={savingBrand}
    onSaveBrand={persistVoice}
    extracting={extracting}
    extractError={extractError}
    extractWarning={extractWarning}
    onExtractWebsite={handleExtract}
    onUploadBrandBook={handleBrandBookUpload}
    onResetExtraction={handleResetExtraction}
    onCampaignFieldChange={(patch) => updateCreative({
      ...(patch.productService !== undefined && { clientProductService: patch.productService }),
      ...(patch.audienceMarket !== undefined && { clientAudienceMarket: patch.audienceMarket }),
      ...(patch.persona !== undefined && { clientPersona: patch.persona }),
    })}
  />
) : (
  /* conteúdo atual do template/empresa, inalterado */
)}
```

Adicionar o estado de salvamento junto dos outros de extração (linha ~544):

```ts
const [savingBrand, setSavingBrand] = useState(false);
```

Ajustar `persistVoice` (linha ~548): trocar `setVoiceModalOpen(false)` no fim
por controle de `savingBrand`:

```ts
const persistVoice = async () => {
  setSavingBrand(true);
  updateCreative({ /* ... inalterado ... */ });
  try {
    await saveClientVoice({ /* ... inalterado ... */ });
  } catch (_e) { /* non-fatal */ }
  setSavingBrand(false);
};
```

Remover o bloco `{voiceModalOpen && <BriefModal ... />}` (linhas ~1328-1343) e
o import do `BriefModal` (linhas 40-41). Trocar o import do tipo:

```ts
import { BriefPane, type BriefDraft } from './BriefPane';
```

- [ ] **Step 6: Apagar o `BriefModal`**

```bash
git rm src/app/campaigns/wizard/BriefModal.tsx
```

- [ ] **Step 7: Rodar os testes**

```bash
npx vitest run src/app/campaigns/wizard/
npm test
```

Esperado: tudo verde. Se algo importar `./BriefModal`, o build de teste acusa —
o único consumidor conhecido é o `CreativeStep`, já tratado.

- [ ] **Step 8: Verificar que o app compila**

```bash
npx tsc --noEmit -p tsconfig.json || true
npm run build
```

Esperado: build conclui. `FontPicker` é exportado de `CreativeStep.tsx` e
consumido pelo `BriefPane` — confirmar que o ciclo de import
(`CreativeStep` → `BriefPane` → `CreativeStep`) não quebra o build. Se quebrar,
mover `FontPicker` para um arquivo próprio (`wizard/FontPicker.tsx`) e importar
nos dois.

- [ ] **Step 9: Commit**

```bash
git add -A src/app/campaigns/wizard/
git commit -m "feat(brief): Brief vira painel inline e alvo inicial do Step Criativo

O Brief carrega a marca que alimenta copy e imagem da campanha inteira, mas era
um modal que só abria se a pessoa achasse e clicasse na linha do painel
esquerdo. Agora é um terceiro alvo de edição, irmão do Template global e das
empresas, e é o alvo inicial ao entrar no step.

Navegação segue livre: clicar em Template global ou numa empresa troca na hora.

Remove BriefModal.tsx — consumidor único era o CreativeStep."
```

---

## Self-Review

**Cobertura do spec:**

| Requisito do spec | Task |
|---|---|
| `BRIEF_TARGET` como terceiro alvo | 2, Step 3 |
| Alvo inicial no Brief | 2, Step 3 + teste Step 1 |
| Navegação livre | 2, testes Step 1 |
| Linha "Brief" sem chevron, com seleção | 2, Step 4 |
| Subtítulo reflete estado | 2, Step 4 |
| Estado definido editável | 1, Step 3 (`BrandFields` sem `readOnly`) |
| Extração secundária no estado definido | 1, `SecondaryExtraction` |
| Estado vazio com campos visíveis | 1, `PrimaryExtraction` + `BrandFields` |
| Remove "campos aparecem após a extração" | 1, Step 3 |
| `BrandSummary` removido | 1, Step 3 (descartado na cópia) |
| `BriefModal` removido | 2, Step 6 |
| Marca com salvamento explícito | 1, botão "Salvar marca" + 2, `persistVoice` |
| Campanha ao vivo | 1, `onCampaignFieldChange` + 2, Step 5 |
| Aviso de escopo global | 1, "Vale para todas as campanhas" |
| Chip de procedência | 1, `ProvenanceChip` quando há `source` |
| Erros de extração preservados | 1, `extractError`/`extractWarning` |
| `status` governa só apresentação | 1, `definida` só escolhe o bloco de extração |

Sem lacunas.

**Placeholders:** nenhum "TBD"/"TODO". Os blocos marcados como "copiar do
original" nomeiam o arquivo e os símbolos exatos.

**Consistência de tipos:** `BriefDraft` é definida uma vez na Task 1 e importada
na Task 2. `onCampaignFieldChange` recebe `Partial<Pick<BriefDraft, ...>>` nos
dois lados. `savingBrand`/`onSaveBrand` casam entre a prop e o estado do
`CreativeStep`.

**Risco conhecido:** o ciclo de import por causa do `FontPicker` exportado de
`CreativeStep.tsx`. Tratado no Step 8 da Task 2, com saída definida.
