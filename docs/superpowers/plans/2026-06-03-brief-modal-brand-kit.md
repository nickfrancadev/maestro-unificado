# Brief Modal — Brand Kit & dois cenários · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o modal de "Brief" das campanhas em torno de um Brand Kit coeso (assets visuais + texto), com dois cenários de exibição (marca já definida vs. definir agora) e dois formatos de extração mock (upload de PDF do brand book + website).

**Architecture:** A marca vira o tipo `BrandKit` em `brandKit.ts`. O modal sai inline de `CreativeStep.tsx` para um componente próprio `BriefModal.tsx`. `CreativeData` passa a conter `brandKit` e os call-sites do step de ads leem de `brandKit.*`. Tudo front-only: uploads viram object URLs locais, extração preenche a partir de uma fixture.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind CSS 4, lucide-react. **Sem runner de testes** no projeto (só `build`/`dev`/`preview`) → verificação manual no navegador + `npx tsc --noEmit` para checagem de tipos.

**Spec:** [docs/superpowers/specs/2026-06-03-brief-modal-brand-kit-design.md](../specs/2026-06-03-brief-modal-brand-kit-design.md)

---

## File Structure

- **Create** `src/app/campaigns/wizard/brandKit.ts` — tipo `BrandKit`, `LogoVariant`, `createDefaultBrandKit()`, mocks (`MOCK_PRODUCTS`/`MOCK_AUDIENCES`/`MOCK_PERSONAS`), fixture `MOCK_BRAND_FIXTURE`.
- **Create** `src/app/campaigns/wizard/BriefModal.tsx` — componente do modal (cabeçalho + toggle, seção Marca nos 2 cenários, galerias, seção Aplicação na campanha, rodapé). Exporta `BriefModal`.
- **Modify** `src/app/campaigns/wizard/types.ts` — `CreativeData` reorganizado (`brandKit` substitui campos soltos), `createDefaultCreativeData()` atualizado, `fontFamily` removido de `TemplateLogoConfig`.
- **Modify** `src/app/campaigns/wizard/CreativeStep.tsx` — remove modal inline + `FontPicker` do step de ads; renderiza `<BriefModal/>`; call-sites leem de `brandKit.*`; exporta `FontPicker` para reuso.

> **Nota de verificação:** como não há `test` script, cada tarefa usa `npx tsc --noEmit` (checagem de tipos) como gate automático no lugar de testes unitários, e a Task 6 concentra a verificação manual no navegador (`npm run dev`).

---

## Task 1: Tipo `BrandKit`, mocks e fixture

**Files:**
- Create: `src/app/campaigns/wizard/brandKit.ts`

- [ ] **Step 1: Criar `brandKit.ts` com o tipo, default, mocks e fixture**

```ts
// Brand Kit — a marca do anunciante como unidade coesa e reutilizável.
// Agrupa assets de texto (voz/contexto/paleta/fonte) e assets visuais
// (logos/ícones/grafismos). Hoje vive dentro de CreativeData; será movido
// para uma tela de Configurações global no futuro.

export type LogoVariant = 'lightFull' | 'lightMark' | 'darkFull' | 'darkMark';

export interface BrandKit {
  status: 'defined' | 'empty';                                   // dirige Cenário 1 vs 2
  voice: string;                                                 // tom de voz
  context: string;                                               // contexto da empresa
  websiteUrl: string;                                            // usado na extração via site
  colors: { primary: string; secondary: string; accent: string };  // hex
  fontFamily: string;                                            // Google Font (movida do step de ads)
  logos: Record<LogoVariant, string | null>;                     // cada slot = object URL | null
  icons: string[];                                               // galeria de object URLs
  graphics: string[];                                            // grafismos/padrões — galeria de object URLs
  source?: 'brandbook' | 'website';                              // como foi extraído (informativo)
}

export const LOGO_VARIANTS: { key: LogoVariant; label: string; dark: boolean }[] = [
  { key: 'lightFull', label: 'Claro · completo', dark: false },
  { key: 'lightMark', label: 'Claro · símbolo', dark: false },
  { key: 'darkFull', label: 'Escuro · completo', dark: true },
  { key: 'darkMark', label: 'Escuro · símbolo', dark: true },
];

export function createDefaultBrandKit(): BrandKit {
  return {
    status: 'empty',
    voice: '',
    context: '',
    websiteUrl: '',
    colors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
    icons: [],
    graphics: [],
  };
}

// Mock options para a seção "Aplicação na campanha" (movidos de CreativeStep).
// Substituir por fontes reais (catálogo de produtos / segmentos / personas) depois.
export const MOCK_PRODUCTS = ['Produto A', 'Produto B', 'Produto C'];
export const MOCK_AUDIENCES = ['Pequenas empresas', 'Médias empresas', 'Enterprise'];
export const MOCK_PERSONAS = ['CMO', 'Head de Marketing', 'Demand Gen Manager'];

// Fixture usada para SIMULAR a extração (PDF ou site) enquanto o backend
// real não existe. Preenche os campos de texto e a paleta; as galerias de
// logos/ícones/grafismos começam vazias (o usuário sobe via tile "+").
export const MOCK_BRAND_FIXTURE: Pick<BrandKit, 'voice' | 'context' | 'colors' | 'fontFamily'> = {
  voice: 'Técnico e didático, focado em definir o produto e sua aplicação. Usa jargões do setor (SaaS, ABM, ABX, GTM, B2B) para se comunicar de forma precisa com um público familiarizado com marketing e vendas complexas.',
  context: 'Software SaaS especializado em Account-Based Marketing (ABM e ABX) para empresas B2B com vendas complexas, otimizando estratégias de Go To Market.',
  colors: { primary: '#FF5F39', secondary: '#0F172A', accent: '#6366F1' },
  fontFamily: 'Inter',
};
```

- [ ] **Step 2: Checar tipos**

Run: `npx tsc --noEmit`
Expected: PASS (sem erros novos relacionados a `brandKit.ts`). O arquivo ainda não é importado em lugar nenhum, então só valida a sintaxe/tipos do próprio arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/app/campaigns/wizard/brandKit.ts
git commit -m "feat(brief): adicionar tipo BrandKit, mocks e fixture de extracao"
```

---

## Task 2: Reorganizar `CreativeData` e os call-sites

Substitui os campos soltos de marca em `CreativeData` por `brandKit`, remove `fontFamily` de `TemplateLogoConfig`, e atualiza todos os consumidores em `CreativeStep.tsx` para lerem de `brandKit.*`. O modal inline ainda fica de pé nesta tarefa (será trocado na Task 3) — aqui o objetivo é só migrar a fonte do dado e manter o app compilando.

**Files:**
- Modify: `src/app/campaigns/wizard/types.ts:132-160` (TemplateLogoConfig + CreativeData + createDefaultCreativeData)
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx` (call-sites: ~110-116, 184-190, 311-312, 340, 374, 442-465, 459-465, 896-897)

- [ ] **Step 1: Atualizar `types.ts` — import, `TemplateLogoConfig`, `CreativeData`, default**

No topo de `types.ts`, adicionar o import e remover `fontFamily` de `TemplateLogoConfig`:

```ts
import type { BrandKit } from './brandKit';
import { createDefaultBrandKit } from './brandKit';
```

Em `TemplateLogoConfig`, **remover** a linha:

```ts
  fontFamily?: string;           // Google Font name (e.g. "Inter") — sent to the IA composer
```

Em `CreativeData`, **remover** as 6 linhas de marca soltas:

```ts
  clientVoice: string;
  clientBrandContext: string;
  clientWebsiteUrl: string;
  clientBrandColors: { primary: string; secondary: string; accent: string };
```

(manter `clientProductService`, `clientAudienceMarket`, `clientPersona`) e **adicionar**:

```ts
  brandKit: BrandKit;            // marca do anunciante (voz/contexto/paleta/fonte/logos/ícones/grafismos)
```

- [ ] **Step 2: Atualizar `createDefaultCreativeData()` em `types.ts`**

Dentro do objeto retornado, remover `fontFamily: 'Inter'` de `templateLogo`, remover `clientVoice`/`clientBrandContext`/`clientWebsiteUrl`/`clientBrandColors`, e adicionar `brandKit`:

```ts
    templateLogo: {
      baseImageUrl: null,
      baseImageSource: undefined,
      textoDestaque: 'WORKSHOP ABM',
      textoComplementar: 'Convite exclusivo VIP',
      showTargetLogo: true,
    },
    overrides: {},
    brandKit: createDefaultBrandKit(),
    clientProductService: '',
    clientAudienceMarket: '',
    clientPersona: '',
```

- [ ] **Step 3: Atualizar os derived values no topo de `CreativeStep.tsx` (~110-116)**

Substituir o bloco:

```ts
  const clientVoice = creativeData?.clientVoice || '';
  const clientBrandContext = creativeData?.clientBrandContext || '';
  const clientWebsiteUrl = creativeData?.clientWebsiteUrl || '';
  const clientProductService = creativeData?.clientProductService || '';
  const clientAudienceMarket = creativeData?.clientAudienceMarket || '';
  const clientPersona = creativeData?.clientPersona || '';
  const clientBrandColors = creativeData?.clientBrandColors || { primary: '', secondary: '', accent: '' };
```

por (lendo de `brandKit`, mantendo os nomes locais para minimizar mudanças nos consumidores):

```ts
  const brandKit = creativeData?.brandKit || createDefaultBrandKit();
  const clientVoice = brandKit.voice;
  const clientBrandContext = brandKit.context;
  const clientWebsiteUrl = brandKit.websiteUrl;
  const clientProductService = creativeData?.clientProductService || '';
  const clientAudienceMarket = creativeData?.clientAudienceMarket || '';
  const clientPersona = creativeData?.clientPersona || '';
  const clientBrandColors = brandKit.colors;
```

Adicionar o import no topo de `CreativeStep.tsx` (junto aos imports de `./types`):

```ts
import { createDefaultBrandKit, MOCK_PRODUCTS, MOCK_AUDIENCES, MOCK_PERSONAS } from './brandKit';
import type { BrandKit } from './brandKit';
```

E **remover** as constantes locais `MOCK_PRODUCTS`/`MOCK_AUDIENCES`/`MOCK_PERSONAS` (linhas 70-72) — agora vêm de `brandKit.ts`.

- [ ] **Step 4: Atualizar `templateLogo` default inline (~118-124) e o on-load effect (~184-190)**

No default inline de `templateLogo` (quando `creativeData` é undefined), remover qualquer `fontFamily`.

No effect que restaura do backend (`fetchClientVoice`, ~169-196), trocar as escritas em campos soltos por uma escrita única em `brandKit`. Substituir o `updateCreative({...})` daquele bloco por:

```ts
          updateCreative({
            brandKit: {
              ...createDefaultBrandKit(),
              status: 'defined',
              voice: stored.voice,
              context: stored.brand_context,
              websiteUrl: stored.website_url,
              colors: stored.brand_colors || { primary: '', secondary: '', accent: '' },
            },
            clientProductService: stored.product_service || '',
            clientAudienceMarket: stored.audience_market || '',
            clientPersona: stored.persona || '',
          });
```

(O guard `if (clientVoice || clientBrandContext || clientWebsiteUrl) return;` continua válido porque esses derivam de `brandKit` agora.)

- [ ] **Step 5: Atualizar `composeOverlayFor` (~374) — fonte vem do brandKit**

Trocar:

```ts
        font_family: tpl.fontFamily,
```

por:

```ts
        font_family: creativeDataRef.current?.brandKit.fontFamily,
```

- [ ] **Step 6: Atualizar `persistVoice` (~457-479) — escrever em brandKit**

Trocar o `updateCreative({...})` interno por:

```ts
    updateCreative({
      brandKit: {
        ...(creativeDataRef.current?.brandKit || createDefaultBrandKit()),
        status: 'defined',
        voice: voiceDraft.voice,
        context: voiceDraft.context,
        websiteUrl: voiceDraft.websiteUrl,
        colors: voiceDraft.brandColors,
      },
      clientProductService: voiceDraft.productService,
      clientAudienceMarket: voiceDraft.audienceMarket,
      clientPersona: voiceDraft.persona,
    });
```

(As chamadas `generateCopy` em ~309-316 e `generateBaseImage` em ~338-342 usam `data.clientVoice`/`data.clientBrandContext`/`data.clientBrandColors` — trocar para `data.brandKit.voice` / `data.brandKit.context` / `data.brandKit.colors`.)

- [ ] **Step 7: Remover `FontPicker` do step de ads (~895-898)**

Remover o bloco JSX:

```tsx
                  <FontPicker
                    value={templateLogo.fontFamily || 'Inter'}
                    onChange={(v) => updateCreative({ templateLogo: { ...templateLogo, fontFamily: v } })}
                  />
```

(A fonte passa a ser editada dentro do BriefModal na Task 3. O componente `FontPicker` em si permanece definido no arquivo e será exportado na Task 3.)

- [ ] **Step 8: Checar tipos**

Run: `npx tsc --noEmit`
Expected: PASS. Se aparecer erro de `clientVoice`/`fontFamily` em algum call-site não listado, corrigir para ler de `brandKit.*` no mesmo padrão.

- [ ] **Step 9: Commit**

```bash
git add src/app/campaigns/wizard/types.ts src/app/campaigns/wizard/CreativeStep.tsx
git commit -m "refactor(brief): mover campos de marca de CreativeData para brandKit"
```

---

## Task 3: Componente `BriefModal` — esqueleto, cenários e toggle de dev

Extrai todo o JSX do modal inline (CreativeStep.tsx ~1169-1350) para `BriefModal.tsx`, agora dirigido por `brandKit.status` com toggle de dev. Esta tarefa entrega: cabeçalho + toggle, Cenário 1 (read-only) e Cenário 2 (definir — com os campos de texto editáveis após "extração"), divisor, seção "Aplicação na campanha" e rodapé. Galerias e extração entram nas Tasks 4 e 5 (aqui ficam stubs visuais simples).

**Files:**
- Create: `src/app/campaigns/wizard/BriefModal.tsx`
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx` (exportar `FontPicker`; substituir modal inline por `<BriefModal/>`; mover handlers)

- [ ] **Step 1: Exportar `FontPicker` em `CreativeStep.tsx`**

Trocar a declaração (linha ~1545):

```ts
function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
```

por:

```ts
export function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
```

- [ ] **Step 2: Criar `BriefModal.tsx` com props, cabeçalho+toggle, e as duas seções**

```tsx
import React, { useState } from 'react';
import { PaintBucket, X, Sparkles, Loader2, Upload } from 'lucide-react';
import { FontPicker } from './CreativeStep';
import { LOGO_VARIANTS, MOCK_PRODUCTS, MOCK_AUDIENCES, MOCK_PERSONAS } from './brandKit';
import type { BrandKit, LogoVariant } from './brandKit';

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
}

interface BriefModalProps {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  status: BrandKit['status'];
  onClose: () => void;
  onSave: () => void;
  // extração (Task 5)
  extracting: boolean;
  extractError: string | null;
  extractWarning: string | null;
  onExtractWebsite: () => void;
  onUploadBrandBook: (file: File) => void;
}

export function BriefModal({
  draft, setDraft, status, onClose, onSave,
  extracting, extractError, extractWarning, onExtractWebsite, onUploadBrandBook,
}: BriefModalProps) {
  // Toggle de dev: sobrescreve o status só localmente para validar os 2 cenários.
  const [devScenario, setDevScenario] = useState<BrandKit['status'] | null>(null);
  const effectiveStatus = devScenario ?? status;
  const readOnly = effectiveStatus === 'defined';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Cabeçalho + toggle de dev */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PaintBucket className="w-4 h-4 text-[#FF5F39]" />
              Brief
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Usado em todas as gerações de IA. Salvo no seu workspace.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle de dev — validação com o time, não persiste */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400" title="Toggle de validação (dev)">
              <button
                onClick={() => setDevScenario(effectiveStatus === 'defined' ? 'empty' : 'defined')}
                className="px-2 py-0.5 rounded-full border border-slate-200 hover:bg-slate-50 font-semibold"
              >
                {readOnly ? 'Cenário 1' : 'Cenário 2'} ⇄
              </button>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* ===== Seção Marca ===== */}
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">Marca</div>

          {readOnly ? (
            <BrandSummary draft={draft} />
          ) : (
            <BrandEditor
              draft={draft}
              setDraft={setDraft}
              extracting={extracting}
              extractError={extractError}
              extractWarning={extractWarning}
              onExtractWebsite={onExtractWebsite}
              onUploadBrandBook={onUploadBrandBook}
            />
          )}

          <div className="h-px bg-slate-200 -mx-6 my-2" />

          {/* ===== Seção Aplicação na campanha ===== */}
          <div>
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">Aplicação nesta campanha</div>
            <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Específico para esta campanha — não faz parte da marca.</p>
            <CampaignSelect label="Produto/Serviço" value={draft.productService} options={MOCK_PRODUCTS}
              placeholder="Selecione um produto ou serviço"
              onChange={(v) => setDraft((d) => ({ ...d, productService: v }))} />
            <CampaignSelect label="Públicos/Mercados" value={draft.audienceMarket} options={MOCK_AUDIENCES}
              placeholder="Selecione um público ou mercado"
              onChange={(v) => setDraft((d) => ({ ...d, audienceMarket: v }))} />
            <CampaignSelect label="Persona" value={draft.persona} options={MOCK_PERSONAS}
              placeholder="Selecione uma persona"
              onChange={(v) => setDraft((d) => ({ ...d, persona: v }))} />
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button onClick={onSave} className="px-4 py-2 text-sm font-bold text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm">
            {readOnly ? 'Salvar' : 'Salvar modelo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CampaignSelect({ label, value, options, placeholder, onChange }: {
  label: string; value: string; options: string[]; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none">
        <option value="">{placeholder}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Adicionar `BrandSummary` (Cenário 1, read-only) ao fim de `BriefModal.tsx`**

```tsx
function BrandSummary({ draft }: { draft: BriefDraft }) {
  const allLogos = LOGO_VARIANTS.filter((v) => draft.logos[v.key]);
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Tom de voz</div>
        <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
          {draft.voice || <span className="italic text-slate-400">Não definido</span>}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Contexto</div>
        <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 leading-relaxed">
          {draft.context || <span className="italic text-slate-400">Não definido</span>}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Paleta da marca</div>
        <div className="flex gap-2">
          {(['primary', 'secondary', 'accent'] as const).map((r) => (
            <div key={r} className="w-7 h-7 rounded-md border border-black/10" style={{ background: draft.brandColors[r] || '#fff' }} />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Fonte</div>
        <div className="text-sm text-slate-700" style={{ fontFamily: `"${draft.fontFamily}", sans-serif` }}>{draft.fontFamily}</div>
      </div>
      {(allLogos.length > 0 || draft.icons.length > 0 || draft.graphics.length > 0) && (
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Assets visuais</div>
          <div className="flex gap-2 flex-wrap">
            {allLogos.map((v) => (
              <img key={v.key} src={draft.logos[v.key]!} alt={v.label} title={v.label}
                className={`w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 ${v.dark ? 'bg-slate-900' : 'bg-white'}`} />
            ))}
            {draft.icons.map((u, i) => <img key={`i${i}`} src={u} className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-white" />)}
            {draft.graphics.map((u, i) => <img key={`g${i}`} src={u} className="w-14 h-14 object-cover rounded-lg border border-slate-200" />)}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Adicionar `BrandEditor` (Cenário 2) — texto + extração; galerias entram na Task 4**

```tsx
function BrandEditor({ draft, setDraft, extracting, extractError, extractWarning, onExtractWebsite, onUploadBrandBook }: {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  extracting: boolean;
  extractError: string | null;
  extractWarning: string | null;
  onExtractWebsite: () => void;
  onUploadBrandBook: (file: File) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-400">Extraia automaticamente de um Brand Book (PDF) ou do seu site.</p>

      {/* Extração — Task 5 preenche a lógica; aqui ficam os controles */}
      <BrandBookDropzone disabled={extracting} onFile={onUploadBrandBook} />
      <div className="flex items-center gap-2 text-[10px] uppercase text-slate-400">
        <span className="flex-1 h-px bg-slate-200" /> ou <span className="flex-1 h-px bg-slate-200" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Website da sua empresa</label>
        <div className="flex gap-2">
          <input type="url" value={draft.websiteUrl}
            onChange={(e) => setDraft((d) => ({ ...d, websiteUrl: e.target.value }))}
            placeholder="https://suaempresa.com"
            className="flex-1 p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none" />
          <button type="button" onClick={onExtractWebsite} disabled={extracting || !draft.websiteUrl.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF5F39] hover:bg-[#E54A26] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 shrink-0">
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Extrair com IA
          </button>
        </div>
        {extractWarning && <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{extractWarning}</p>}
        {extractError && <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">{extractError}</p>}
      </div>

      {/* Campos editáveis (preenchidos pela extração, sempre editáveis) */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Tom de voz</label>
        <textarea value={draft.voice} onChange={(e) => setDraft((d) => ({ ...d, voice: e.target.value }))} rows={4}
          placeholder="Ex: Direto e confiante, sem jargão."
          className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none leading-relaxed" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Contexto da empresa</label>
        <textarea value={draft.context} onChange={(e) => setDraft((d) => ({ ...d, context: e.target.value }))} rows={3}
          placeholder="Ex: Plataforma de ABM para B2B SaaS."
          className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none leading-relaxed" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Paleta da marca</label>
        <div className="grid grid-cols-3 gap-3">
          {(['primary', 'secondary', 'accent'] as const).map((role) => {
            const labels = { primary: 'Primária', secondary: 'Secundária', accent: 'Destaque' };
            const value = draft.brandColors[role] || '';
            return (
              <div key={role} className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">{labels[role]}</span>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2 bg-white">
                  <input type="color" value={value || '#ffffff'}
                    onChange={(e) => setDraft((d) => ({ ...d, brandColors: { ...d.brandColors, [role]: e.target.value } }))}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
                  <input type="text" value={value} placeholder="#______"
                    onChange={(e) => setDraft((d) => ({ ...d, brandColors: { ...d.brandColors, [role]: e.target.value } }))}
                    className="flex-1 text-xs font-mono text-slate-700 bg-transparent outline-none min-w-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Fonte</label>
        <FontPicker value={draft.fontFamily} onChange={(v) => setDraft((d) => ({ ...d, fontFamily: v }))} />
      </div>

      {/* Galerias de assets visuais — implementadas na Task 4 */}
      <LogoGallery draft={draft} setDraft={setDraft} />
      <AssetGallery label="Ícones da marca" items={draft.icons}
        onAdd={(u) => setDraft((d) => ({ ...d, icons: [...d.icons, u] }))}
        onRemove={(i) => setDraft((d) => ({ ...d, icons: d.icons.filter((_, idx) => idx !== i) }))} />
      <AssetGallery label="Grafismos / padrões" items={draft.graphics}
        onAdd={(u) => setDraft((d) => ({ ...d, graphics: [...d.graphics, u] }))}
        onRemove={(i) => setDraft((d) => ({ ...d, graphics: d.graphics.filter((_, idx) => idx !== i) }))} />
    </div>
  );
}
```

> Nota: `BrandBookDropzone`, `LogoGallery` e `AssetGallery` são definidos na Task 4. Para esta tarefa compilar isoladamente, adicionar stubs temporários no fim do arquivo (serão substituídos na Task 4):
>
> ```tsx
> function BrandBookDropzone({ disabled, onFile }: { disabled: boolean; onFile: (f: File) => void }) { return null; }
> function LogoGallery({ draft, setDraft }: any) { return null; }
> function AssetGallery({ label, items, onAdd, onRemove }: any) { return null; }
> ```

- [ ] **Step 5: Em `CreativeStep.tsx`, criar o `briefDraft` com os campos novos e trocar o modal inline**

Substituir o estado `voiceDraft` (linha ~431-439) por um draft que inclui fonte + galerias, alimentado por `brandKit`:

```ts
  const [briefDraft, setBriefDraft] = useState<BriefDraft>({
    voice: '', context: '', websiteUrl: '',
    productService: '', audienceMarket: '', persona: '',
    brandColors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
    icons: [], graphics: [],
  });
```

Atualizar o `useEffect` de sincronização (~440-450) para popular a partir de `brandKit`:

```ts
  useEffect(() => {
    setBriefDraft({
      voice: brandKit.voice,
      context: brandKit.context,
      websiteUrl: brandKit.websiteUrl,
      productService: clientProductService,
      audienceMarket: clientAudienceMarket,
      persona: clientPersona,
      brandColors: brandKit.colors,
      fontFamily: brandKit.fontFamily,
      logos: brandKit.logos,
      icons: brandKit.icons,
      graphics: brandKit.graphics,
    });
  }, [brandKit, clientProductService, clientAudienceMarket, clientPersona]);
```

Importar o componente e os tipos no topo:

```ts
import { BriefModal } from './BriefModal';
import type { BriefDraft } from './BriefModal';
```

Substituir todo o JSX do modal inline (linhas ~1169-1350) por:

```tsx
      {voiceModalOpen && (
        <BriefModal
          draft={briefDraft}
          setDraft={setBriefDraft}
          status={brandKit.status}
          onClose={() => setVoiceModalOpen(false)}
          onSave={persistVoice}
          extracting={extracting}
          extractError={extractError}
          extractWarning={extractWarning}
          onExtractWebsite={handleExtract}
          onUploadBrandBook={handleBrandBookUpload}
        />
      )}
```

- [ ] **Step 6: Atualizar `persistVoice` e `handleExtract` para usar `briefDraft`**

Em `persistVoice` (Task 2 já reescreveu o corpo), trocar todas as referências `voiceDraft.*` por `briefDraft.*` e incluir os campos novos na escrita do brandKit:

```ts
      brandKit: {
        ...(creativeDataRef.current?.brandKit || createDefaultBrandKit()),
        status: 'defined',
        voice: briefDraft.voice,
        context: briefDraft.context,
        websiteUrl: briefDraft.websiteUrl,
        colors: briefDraft.brandColors,
        fontFamily: briefDraft.fontFamily,
        logos: briefDraft.logos,
        icons: briefDraft.icons,
        graphics: briefDraft.graphics,
      },
```

Em `handleExtract` (~481-510), trocar `voiceDraft`/`setVoiceDraft` por `briefDraft`/`setBriefDraft`. (A lógica de mock entra na Task 5; por ora mantém a chamada real `extractBrandVoice` funcionando com os novos nomes.) Adicionar um stub de `handleBrandBookUpload` que será completado na Task 5:

```ts
  const handleBrandBookUpload = (_file: File) => { /* Task 5 */ };
```

- [ ] **Step 7: Checar tipos**

Run: `npx tsc --noEmit`
Expected: PASS. Não deve sobrar nenhuma referência a `voiceDraft`/`setVoiceDraft`.

- [ ] **Step 8: Commit**

```bash
git add src/app/campaigns/wizard/BriefModal.tsx src/app/campaigns/wizard/CreativeStep.tsx
git commit -m "feat(brief): extrair BriefModal com cenarios e toggle de dev"
```

---

## Task 4: Galerias de assets visuais com upload mock

Implementa `BrandBookDropzone`, `LogoGallery` e `AssetGallery` (substituindo os stubs). Uploads viram `object URL` locais — nada vai pro storage.

**Files:**
- Modify: `src/app/campaigns/wizard/BriefModal.tsx` (substituir os stubs do fim do arquivo)

- [ ] **Step 1: Adicionar helper de validação de imagem no topo de `BriefModal.tsx`**

```ts
const MAX_ASSET_MB = 5;
function makeImageObjectUrl(file: File, onError: (msg: string) => void): string | null {
  if (!file.type.startsWith('image/')) { onError('Use uma imagem (PNG, JPG ou SVG).'); return null; }
  if (file.size > MAX_ASSET_MB * 1024 * 1024) { onError(`Arquivo excede ${MAX_ASSET_MB}MB.`); return null; }
  return URL.createObjectURL(file);
}
```

- [ ] **Step 2: Substituir o stub `LogoGallery` pela implementação (grade 2×2 + "+"/"×")**

```tsx
function LogoGallery({ draft, setDraft }: {
  draft: BriefDraft; setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
}) {
  const [err, setErr] = useState<string | null>(null);
  const pick = (variant: LogoVariant) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const url = makeImageObjectUrl(file, setErr);
      if (url) setDraft((d) => ({ ...d, logos: { ...d.logos, [variant]: url } }));
    };
    input.click();
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Logos (claro/escuro · completo/símbolo)</label>
      <div className="grid grid-cols-2 gap-2">
        {LOGO_VARIANTS.map((v) => {
          const url = draft.logos[v.key];
          return (
            <div key={v.key} className={`relative border border-slate-200 rounded-lg p-2 text-center ${v.dark ? 'bg-slate-900' : 'bg-white'}`}>
              <div className={`text-[9px] uppercase tracking-wide mb-1 ${v.dark ? 'text-slate-400' : 'text-slate-400'}`}>{v.label}</div>
              {url ? (
                <div className="relative">
                  <img src={url} alt={v.label} className="w-full h-12 object-contain" />
                  <button onClick={() => setDraft((d) => ({ ...d, logos: { ...d.logos, [v.key]: null } }))}
                    className="absolute -top-1 -right-1 bg-white text-slate-500 rounded-full w-4 h-4 text-[10px] leading-none border border-slate-200">×</button>
                </div>
              ) : (
                <button onClick={() => pick(v.key)}
                  className="w-full h-12 flex items-center justify-center text-slate-400 hover:text-[#FF5F39] border border-dashed border-slate-300 rounded">
                  <Upload className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Substituir o stub `AssetGallery` (galeria livre + "+"/"×")**

```tsx
function AssetGallery({ label, items, onAdd, onRemove }: {
  label: string; items: string[]; onAdd: (url: string) => void; onRemove: (index: number) => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const url = makeImageObjectUrl(file, setErr);
      if (url) onAdd(url);
    };
    input.click();
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {items.map((u, i) => (
          <div key={i} className="relative">
            <img src={u} alt="" className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-white" />
            <button onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 bg-white text-slate-500 rounded-full w-4 h-4 text-[10px] leading-none border border-slate-200">×</button>
          </div>
        ))}
        <button onClick={pick}
          className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-[#FF5F39] border border-dashed border-slate-300 rounded-lg bg-slate-50 text-xl">+</button>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Substituir o stub `BrandBookDropzone` (dropzone de PDF)**

```tsx
function BrandBookDropzone({ disabled, onFile }: { disabled: boolean; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const handle = (file?: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf') { setErr('Envie um arquivo PDF.'); return; }
    if (file.size > 20 * 1024 * 1024) { setErr('PDF excede 20MB.'); return; }
    setErr(null); onFile(file);
  };
  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/pdf';
    input.onchange = () => handle(input.files?.[0]);
    input.click();
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Upload do Brand Book (PDF)</label>
      <div
        onClick={() => !disabled && pick()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer ${drag ? 'border-[#FF5F39] bg-[#FFF1ED]' : 'border-slate-300 bg-slate-50'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
        <p className="text-xs text-slate-600">Arraste o PDF ou clique para enviar</p>
        <p className="text-[10px] text-slate-400">A IA lê o material e preenche tudo</p>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Checar tipos**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/campaigns/wizard/BriefModal.tsx
git commit -m "feat(brief): galerias de logos/icones/grafismos com upload mock"
```

---

## Task 5: Extração mock (PDF + website) a partir da fixture

Faz tanto o upload de PDF quanto o "Extrair com IA" preencherem os campos a partir de `MOCK_BRAND_FIXTURE`, com um loading curto — sem chamar o backend.

**Files:**
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx` (`handleExtract`, `handleBrandBookUpload`)

- [ ] **Step 1: Importar a fixture no topo de `CreativeStep.tsx`**

Acrescentar ao import de `./brandKit`:

```ts
import { createDefaultBrandKit, MOCK_PRODUCTS, MOCK_AUDIENCES, MOCK_PERSONAS, MOCK_BRAND_FIXTURE } from './brandKit';
```

- [ ] **Step 2: Criar um helper de simulação e reescrever `handleExtract` (mock)**

Substituir o corpo de `handleExtract` por uma simulação que usa a fixture (mantendo o gate de URL e os estados de loading/warning):

```ts
  const applyFixtureToDraft = (source: 'brandbook' | 'website') => {
    setBriefDraft((d) => ({
      ...d,
      voice: MOCK_BRAND_FIXTURE.voice,
      context: MOCK_BRAND_FIXTURE.context,
      brandColors: MOCK_BRAND_FIXTURE.colors,
      fontFamily: MOCK_BRAND_FIXTURE.fontFamily,
    }));
  };

  const handleExtract = async () => {
    const url = briefDraft.websiteUrl.trim();
    if (!url) return;
    setExtracting(true);
    setExtractError(null);
    setExtractWarning(null);
    // Mock: simula latência de rede e preenche a partir da fixture.
    await new Promise((r) => setTimeout(r, 900));
    applyFixtureToDraft('website');
    setExtractWarning('Extração simulada (mock) — revise os campos antes de salvar.');
    setExtracting(false);
  };
```

- [ ] **Step 3: Implementar `handleBrandBookUpload` (mock)**

Substituir o stub por:

```ts
  const handleBrandBookUpload = async (_file: File) => {
    setExtracting(true);
    setExtractError(null);
    setExtractWarning(null);
    await new Promise((r) => setTimeout(r, 900));
    applyFixtureToDraft('brandbook');
    setExtractWarning('Brand Book lido (mock) — revise os campos antes de salvar.');
    setExtracting(false);
  };
```

- [ ] **Step 4: Checar tipos**

Run: `npx tsc --noEmit`
Expected: PASS. Nota: `extractBrandVoice` deixa de ser usado por `handleExtract`; se o import ficar não-usado e o lint/tsc reclamar, remover `extractBrandVoice` da lista de imports de `@/lib/ai`.

- [ ] **Step 5: Commit**

```bash
git add src/app/campaigns/wizard/CreativeStep.tsx
git commit -m "feat(brief): extracao mock de PDF e website via fixture"
```

---

## Task 6: Integração final no step de ads + verificação manual

Garante que nada quebrou no step de ads (fonte agora vem do brandKit) e roda a verificação manual no navegador.

**Files:**
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx` (apenas se a build/verificação apontar resíduos)

- [ ] **Step 1: Build de produção (pega erros que o tsc não pega)**

Run: `npm run build`
Expected: build conclui sem erros. Se falhar por referência remanescente a `fontFamily` em `templateLogo` ou a `voiceDraft`, corrigir conforme o padrão das Tasks 2-3 e rebuildar.

- [ ] **Step 2: Subir o dev server**

Run: `npm run dev`
Expected: Vite sobe (geralmente em `http://localhost:5173`).

- [ ] **Step 3: Verificação manual no navegador**

Navegar até Campanhas → wizard → step de criativos → abrir o modal "Brief". Confirmar item a item:

1. Com brandKit vazio, o modal abre no **Cenário 2** (upload de PDF + "ou" + website + campos de texto + galerias).
2. O **toggle de dev** no cabeçalho alterna para **Cenário 1** (resumo read-only) e de volta, **sem perder** o que foi digitado.
3. "Extrair com IA" (com uma URL qualquer) mostra loading ~1s e **preenche** voz/contexto/paleta/fonte a partir da fixture, com aviso de mock.
4. Arrastar/selecionar um PDF na dropzone preenche os mesmos campos (aviso de mock). Selecionar um não-PDF mostra erro inline.
5. Tile "+" nas galerias de logos/ícones/grafismos adiciona miniatura; "×" remove. Não-imagem mostra erro inline.
6. "Salvar modelo" fecha o modal; reabrir mostra o **Cenário 1** (status agora `defined`), com os assets em modo resumo.
7. A seção **"Aplicação nesta campanha"** (Produto/Público/Persona) aparece em ambos os cenários e é editável.
8. No step de ads, o seletor de fonte **não** aparece mais lá; a composição (`composeLogoOverlay`) usa `brandKit.fontFamily` sem erro de runtime.

Registrar o resultado de cada item. Se algum falhar, abrir um ciclo de correção antes de prosseguir.

- [ ] **Step 4: Commit final (se houve correções)**

```bash
git add -A
git commit -m "fix(brief): ajustes da verificacao manual do BriefModal"
```

---

## Self-Review notes

- **Cobertura do spec:** modelo `BrandKit` (T1) · reorganização de `CreativeData` + call-sites + fonte movida (T2) · modal extraído com 2 cenários + toggle de dev + seção de campanha separada por divisor (T3) · galerias logos/ícones/grafismos com "+"/"×" (T4) · extração mock PDF+website via fixture (T5) · integração no step de ads + verificação manual dos 8 critérios (T6). "Fora de escopo" do spec (tela de Config, persistência real, parser de PDF, cablar assets na composição) não vira tarefa — correto.
- **Consistência de nomes:** `BriefDraft` definido em T3 e usado em T3/T4/T5; `applyFixtureToDraft` definido e usado em T5; `FontPicker` exportado em T3-Step1 e importado em `BriefModal`; `LOGO_VARIANTS`/`createDefaultBrandKit`/`MOCK_BRAND_FIXTURE` definidos em T1 e consumidos depois.
- **Verificação sem testes:** `npx tsc --noEmit` por tarefa + `npm run build` + checklist manual de 8 itens na T6 (projeto não tem runner).
