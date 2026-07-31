# Brief — marca enxuta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enxugar a seção Marca do Brief — remover ícones e grafismos, reduzir o logo a um só, e deixar escolher a cor de cada papel entre candidatas da extração.

**Architecture:** `BrandKit` perde `icons`/`graphics`, troca `logos: Record<LogoVariant, …>` por `logo: string | null`, e ganha `colorOptions?` opcional. O formato de `brandKit.colors` não muda, então landing pages, `StylePanel` e `generateCopy` seguem intocados. Task 1 é remoção pura; Task 2 é adição pura.

**Tech Stack:** React 18, TypeScript, Tailwind, Vitest + Testing Library (jsdom para `.test.tsx`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-30-brief-marca-enxuta-design.md`
- `BrandKit.colors` mantém a forma `{ primary: string; secondary: string; accent: string }` — é o contrato consumido por `landingPages/schema/blocks/*`, `landingPages/editor/StylePanel.tsx` e `generateCopy`. **Não alterar.**
- Não alterar `/ai/client-voice` nem qualquer endpoint do edge function.
- Os campos da marca são sempre editáveis, nos dois estados de `status` — invariante do spec anterior.
- Testes de componente são `.test.tsx` (jsdom); `.test.ts` roda em node.
- Rodar a suíte com `npm test` (é `vitest run`).
- Cores da marca do produto: `#FF5F39`, hover `#E54A26`. Reaproveitar classes já presentes.
- Copy de UI em português, seguindo o estilo do arquivo.
- `BrandKit` é persistido em `localStorage` pelas landing pages; dados antigos com `logos`/`icons`/`graphics` são inertes (nenhum bloco os lê). **Não escrever migração.**

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/app/campaigns/wizard/brandKit.ts` | tipo `BrandKit`, default, fixture de extração |
| `src/app/campaigns/wizard/BriefPane.tsx` | `BriefDraft`, campos da marca, galeria de logo |
| `src/app/campaigns/wizard/BriefPane.test.tsx` | testes do painel |
| `src/app/campaigns/wizard/CreativeStep.tsx` | draft inicial, sync, persist, aplicar fixture, reset |

---

### Task 1: Remover ícones/grafismos e reduzir o logo a um

**Files:**
- Modify: `src/app/campaigns/wizard/brandKit.ts`
- Modify: `src/app/campaigns/wizard/BriefPane.tsx`
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx` (linhas 514-515, 534-536, 588-590, 629-631, 671-673)
- Test: `src/app/campaigns/wizard/BriefPane.test.tsx`

**Interfaces:**
- Produces:

```ts
// brandKit.ts
export interface BrandKit {
  status: 'defined' | 'empty';
  voice: string;
  context: string;
  websiteUrl: string;
  colors: { primary: string; secondary: string; accent: string };
  fontFamily: string;
  logo: string | null;
  source?: 'brandbook' | 'website';
}
// LogoVariant e LOGO_VARIANTS deixam de existir

// BriefPane.tsx — BriefDraft perde icons/graphics e troca logos por:
//   logo: string | null;
```

- [ ] **Step 1: Escrever os testes que falham**

Em `src/app/campaigns/wizard/BriefPane.test.tsx`, ajustar o helper `draft()` — trocar a linha `logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },` e remover `icons: [], graphics: [],`, deixando:

```tsx
    logo: null,
```

E acrescentar, ao fim do arquivo:

```tsx
describe('BriefPane — marca enxuta', () => {
  it('não renderiza mais ícones nem grafismos', () => {
    setup({}, 'defined');
    expect(screen.queryByText(/ícones da marca/i)).toBeNull();
    expect(screen.queryByText(/grafismos/i)).toBeNull();
  });

  it('mostra um único slot de logo, sem variantes', () => {
    setup({}, 'defined');
    expect(screen.getByText(/^logo$/i)).toBeTruthy();
    expect(screen.queryByText(/claro · completo/i)).toBeNull();
    expect(screen.queryByText(/escuro · símbolo/i)).toBeNull();
  });

  it('renderiza o logo já enviado', () => {
    setup({ logo: 'blob:fake-logo' }, 'defined');
    expect(screen.getByAltText(/logo da marca/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
npx vitest run src/app/campaigns/wizard/BriefPane.test.tsx
```

Esperado: erros de tipo/compilação em `logo` (a propriedade ainda não existe) e falha nos três testes novos.

- [ ] **Step 3: Enxugar o `brandKit.ts`**

Remover de `BrandKit` os campos `logos`, `icons`, `graphics`; acrescentar `logo: string | null`.
Apagar `LogoVariant` e `LOGO_VARIANTS`.

Em `createDefaultBrandKit()`, trocar as três linhas correspondentes por:

```ts
    logo: null,
```

Apagar as constantes `MOCK_ICON_1`, `MOCK_ICON_2`, `MOCK_ICON_3`, `MOCK_GRAPHIC_1`, `MOCK_GRAPHIC_2`, `MOCK_LOGO_FULL_DARK` e `MOCK_LOGO_MARK_DARK` (nenhuma sobrevive à redução).

Em `MOCK_BRAND_FIXTURE`, trocar as linhas de `logos`/`icons`/`graphics` por:

```ts
  logo: MOCK_LOGO_FULL_LIGHT,
```

Manter `MOCK_LOGO_FULL_LIGHT` e `MOCK_LOGO_MARK` só se ambos continuarem referenciados; se `MOCK_LOGO_MARK` ficar órfão, apagar também.

- [ ] **Step 4: Enxugar o `BriefPane.tsx`**

Em `BriefDraft` (linhas 23-25), trocar as três linhas por `logo: string | null;`.

No import da linha 4, remover `LOGO_VARIANTS`. Na linha 5, remover `LogoVariant` do import de tipos.

Em `BrandFields`, apagar os dois blocos `<AssetGallery …>` (linhas 348-353).

Apagar a função `AssetGallery` inteira.

Substituir `LogoGallery` por:

```tsx
function LogoGallery({ draft, setDraft }: {
  draft: BriefDraft; setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
}) {
  const [err, setErr] = useState<string | null>(null);
  const pick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const url = makeImageObjectUrl(file, setErr);
      if (url) { setErr(null); setDraft((d) => ({ ...d, logo: url })); }
    };
    input.click();
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Logo</label>
      {draft.logo ? (
        <div className="relative border border-slate-200 rounded-lg p-2 bg-white inline-block">
          <img src={draft.logo} alt="Logo da marca" className="h-12 object-contain" />
          <button type="button" onClick={() => setDraft((d) => ({ ...d, logo: null }))}
            className="absolute -top-1 -right-1 bg-white text-slate-500 rounded-full w-4 h-4 text-[10px] leading-none border border-slate-200">×</button>
        </div>
      ) : (
        <button type="button" onClick={pick}
          className="w-full h-16 flex items-center justify-center text-slate-400 hover:text-[#FF5F39] border border-dashed border-slate-300 rounded-lg">
          <Upload className="w-4 h-4" />
        </button>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Atualizar o `CreativeStep.tsx`**

Cinco pontos, todos mecânicos:

- linhas 514-515 (draft inicial) → `logo: null,`
- linhas 534-536 (sync a partir do `brandKit`) → `logo: brandKit.logo,`
- linhas 588-590 (`persistVoice`) → `logo: briefDraft.logo,`
- linhas 629-631 (aplicar fixture) → `logo: MOCK_BRAND_FIXTURE.logo,`
- linhas 671-673 (`handleResetExtraction`) → `logo: null,`

- [ ] **Step 6: Rodar os testes e o build**

```bash
npx vitest run src/app/campaigns/wizard/
npm test
npm run build
```

Esperado: tudo verde. O build cobre os consumidores em `landingPages/` — se algum lia `logos`/`icons`/`graphics`, aparece aqui (a análise diz que não lê).

- [ ] **Step 7: Commit**

```bash
git add src/app/campaigns/wizard/
git commit -m "feat(brief): remove ícones e grafismos, logo passa a ser um só

Nenhum dos três tinha consumidor: não chegam à IA nem às landing pages. A IA
que compõe logo sobre imagem-base usa o logo da empresa-alvo (via logo.dev),
não o do anunciante — por isso as quatro variantes nunca foram lidas.

Remoção, não desativação: LogoVariant e LOGO_VARIANTS deixam de existir.

Landing pages salvas em localStorage carregam os campos antigos, mas nenhum
bloco os lê — ficam inertes, sem migração."
```

---

### Task 2: Escolher a cor de cada papel entre candidatas

**Files:**
- Modify: `src/app/campaigns/wizard/brandKit.ts`
- Modify: `src/app/campaigns/wizard/BriefPane.tsx` (`BrandFields`, bloco "Paleta da marca", linhas 320-341)
- Modify: `src/app/campaigns/wizard/CreativeStep.tsx` (sync e aplicar fixture)
- Test: `src/app/campaigns/wizard/BriefPane.test.tsx`

**Interfaces:**
- Consumes: `BrandKit` e `BriefDraft` da Task 1
- Produces:

```ts
// brandKit.ts — campo aditivo e opcional em BrandKit:
colorOptions?: { primary: string[]; secondary: string[]; accent: string[] };

// BriefPane.tsx — mesmo campo em BriefDraft:
colorOptions?: { primary: string[]; secondary: string[]; accent: string[] };
```

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `BriefPane.test.tsx`:

```tsx
describe('BriefPane — candidatas de cor', () => {
  const opts = {
    primary: ['#3571de', '#2b5fc4'],
    secondary: ['#212a46'],
    accent: ['#ff5f39', '#e54a26'],
  };

  it('sem colorOptions, mostra só os campos hex', () => {
    setup({ brandColors: { primary: '#3571de', secondary: '', accent: '' } }, 'defined');
    expect(screen.queryByRole('button', { name: /usar #2b5fc4/i })).toBeNull();
  });

  it('mostra uma amostra por candidata', () => {
    setup({ colorOptions: opts }, 'defined');
    expect(screen.getByRole('button', { name: /usar #3571de/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /usar #2b5fc4/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /usar #e54a26/i })).toBeTruthy();
  });

  it('clicar numa amostra grava aquele hex no papel', () => {
    const { setDraft, draftAtual } = setup(
      { colorOptions: opts, brandColors: { primary: '#3571de', secondary: '', accent: '' } },
      'defined',
    );
    fireEvent.click(screen.getByRole('button', { name: /usar #2b5fc4/i }));
    expect(setDraft).toHaveBeenCalled();
    expect(draftAtual().brandColors.primary).toBe('#2b5fc4');
  });

  // A amostra ativa precisa refletir o valor atual, não a ordem da lista.
  it('marca como ativa a amostra que casa com o valor atual', () => {
    setup(
      { colorOptions: opts, brandColors: { primary: '#2b5fc4', secondary: '', accent: '' } },
      'defined',
    );
    expect(screen.getByRole('button', { name: /usar #2b5fc4/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /usar #3571de/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('o campo hex aceita valor fora das candidatas', () => {
    const { draftAtual } = setup({ colorOptions: opts }, 'defined');
    const campos = screen.getAllByPlaceholderText('#______');
    fireEvent.change(campos[0], { target: { value: '#123456' } });
    expect(draftAtual().brandColors.primary).toBe('#123456');
  });
});
```

Nota: o helper `setup` já expõe `draftAtual()` (aplicado pela onda de correção anterior). Se não expuser, expor.

- [ ] **Step 2: Rodar e confirmar que falham**

```bash
npx vitest run src/app/campaigns/wizard/BriefPane.test.tsx
```

Esperado: os quatro testes que dependem das amostras falham por não encontrar os botões.

- [ ] **Step 3: Adicionar `colorOptions` ao modelo**

Em `brandKit.ts`, acrescentar ao `BrandKit`, logo abaixo de `colors`:

```ts
  // Candidatas por papel, quando a extração encontra mais de uma cor plausível.
  // Opcional de propósito: marca carregada do servidor não tem candidatas, e a
  // ausência precisa ser um estado normal, não um vazio a tratar.
  colorOptions?: { primary: string[]; secondary: string[]; accent: string[] };
```

`createDefaultBrandKit()` não ganha o campo (fica `undefined`).

Em `MOCK_BRAND_FIXTURE`, logo abaixo de `colors`, acrescentar:

```ts
  colorOptions: {
    primary: ['#FF5F39', '#E54A26'],
    secondary: ['#0F172A', '#212A46'],
    accent: ['#6366F1', '#3571DE'],
  },
```

- [ ] **Step 4: Adicionar o campo ao `BriefDraft` e propagar no `CreativeStep`**

Em `BriefPane.tsx`, acrescentar ao `BriefDraft`:

```ts
  colorOptions?: { primary: string[]; secondary: string[]; accent: string[] };
```

Em `CreativeStep.tsx`, no efeito que semeia o draft a partir do `brandKit`, acrescentar junto de `brandColors`:

```ts
      colorOptions: brandKit.colorOptions,
```

e no `applyFixtureToDraft`, junto de `brandColors`:

```ts
      colorOptions: MOCK_BRAND_FIXTURE.colorOptions,
```

`persistVoice` **não** envia `colorOptions` — o `/ai/client-voice` não o guarda, por decisão do spec.

- [ ] **Step 5: Renderizar as amostras**

Em `BrandFields`, dentro do `.map((role) => …)` do bloco "Paleta da marca", depois do `<div>` que contém os dois inputs, acrescentar:

```tsx
                {draft.colorOptions?.[role]?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {draft.colorOptions[role].map((hex) => {
                      const ativa = value.toLowerCase() === hex.toLowerCase();
                      return (
                        <button
                          key={hex}
                          type="button"
                          aria-label={`Usar ${hex}`}
                          aria-pressed={ativa}
                          title={hex}
                          onClick={() => setDraft((d) => ({ ...d, brandColors: { ...d.brandColors, [role]: hex } }))}
                          className={`w-5 h-5 rounded border ${ativa ? 'border-[#FF5F39] ring-2 ring-[#FF5F39]/30' : 'border-slate-200'}`}
                          style={{ backgroundColor: hex }}
                        />
                      );
                    })}
                  </div>
                ) : null}
```

- [ ] **Step 6: Rodar os testes e o build**

```bash
npx vitest run src/app/campaigns/wizard/
npm test
npm run build
```

Esperado: tudo verde.

- [ ] **Step 7: Commit**

```bash
git add src/app/campaigns/wizard/
git commit -m "feat(brief): escolher a cor de cada papel entre as candidatas

A extração pode achar mais de uma cor plausível por papel e a tela só comportava
uma. Entra colorOptions, campo aditivo e opcional, com amostras clicáveis.

brandKit.colors não muda de formato — segue um hex por papel, que é o contrato
já consumido por landing pages, StylePanel e generateCopy.

O campo hex continua editável ao lado das amostras, então dá para usar um valor
fora da lista; nesse caso nenhuma amostra fica marcada.

Candidatas não persistem no servidor: /ai/client-voice guarda só os três hexes
escolhidos, e mudar isso exigiria deploy manual do edge function por um recurso
cuja fonte real (extração) ainda é mockada."
```

---

## Self-Review

**Cobertura do spec:**

| Requisito | Task |
|---|---|
| Remover `icons`/`graphics` do BrandKit | 1, Step 3 |
| Remover as seções do painel | 1, Step 4 |
| `logo: string \| null` | 1, Step 3 |
| Apagar `LogoVariant`/`LOGO_VARIANTS` | 1, Step 3 |
| Um slot de upload | 1, Step 4 |
| `colors` mantém o formato | 1 e 2 não o tocam (constraint global) |
| `colorOptions` aditivo e opcional | 2, Step 3 |
| Amostras clicáveis por papel | 2, Step 5 |
| Campo hex segue editável | 2, Step 5 (inputs intocados) + teste |
| Amostra ativa reflete o valor atual | 2, Step 5 (`aria-pressed`) + teste |
| Sem `colorOptions`, degrada para 3 campos | 2, Step 5 (guarda `?.length`) + teste |
| Fixture ganha candidatas | 2, Step 3 |
| Fixture perde ícones/grafismos e tem logo único | 1, Step 3 |
| Não persistir candidatas | 2, Step 4 (nota explícita) |
| Sem migração de localStorage | constraint global |

Sem lacunas.

**Placeholders:** nenhum. Todos os passos de código trazem o código.

**Consistência de tipos:** `colorOptions` tem a mesma forma em `BrandKit` e `BriefDraft`. `logo: string | null` idem. `MOCK_BRAND_FIXTURE` é `Omit<BrandKit, 'status' | 'websiteUrl' | 'source'>`, então ganhar `colorOptions` e perder `icons`/`graphics` acompanha o tipo automaticamente.

**Risco conhecido:** Step 3 da Task 1 apaga constantes mock; se alguma ficar referenciada, o build acusa. O Step 6 cobre.
