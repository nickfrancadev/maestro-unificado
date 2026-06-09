import { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Type,
  Globe,
  Layers,
  ChevronDown,
  ChevronRight,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Repeat,
} from 'lucide-react';

const NAVY = '#212A46';
const LI_BLUE = '#0a66c2';

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function Advanced({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-[#fbfbfd]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
          <Cpu className="w-3.5 h-3.5" />
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap rounded-md bg-[#0d1117] text-[#c9d1d9] text-[12px] leading-relaxed p-4 overflow-x-auto font-mono">
      {children}
    </pre>
  );
}

function Pill({ children, color = NAVY }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: `${color}14`, color }}
    >
      {children}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="text-sm text-[#212A46] font-medium break-all">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step card                                                           */
/* ------------------------------------------------------------------ */

interface StepProps {
  n: number;
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  summary: string;
  children?: React.ReactNode;
}

function Step({ n, icon, title, badge, summary, children }: StepProps) {
  return (
    <section className="relative pl-12">
      {/* number node */}
      <div
        className="absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
        style={{ background: NAVY }}
      >
        {n}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span style={{ color: LI_BLUE }}>{icon}</span>
            <h3 className="font-bold text-[#212A46] text-lg">{title}</h3>
          </div>
          {badge}
        </div>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{summary}</p>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function AdsPipelineDocs() {
  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#212A46]">
      {/* Hero */}
      <header
        className="px-6 md:px-10 py-12"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #2d3a63 100%)` }}
      >
        <div className="max-w-4xl mx-auto text-white">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" style={{ color: '#9db8ff' }} />
            <span className="text-xs font-bold uppercase tracking-widest text-[#9db8ff]">
              Maestro · Go-to-Market
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            Como o Maestro gera os criativos de anúncio com IA
          </h1>
          <p className="text-base md:text-lg text-white/80 mt-4 max-w-2xl">
            Cada campanha ABM precisa de um anúncio que fale com cada empresa-alvo. O
            Maestro escreve o texto, gera uma imagem-base e personaliza um criativo por
            conta — automaticamente. Veja o passo a passo abaixo.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Pill color="#9db8ff">Copy por empresa</Pill>
            <Pill color="#9db8ff">Imagem gerada por IA</Pill>
            <Pill color="#9db8ff">Logo + texto automáticos</Pill>
            <Pill color="#9db8ff">1 base → N criativos</Pill>
          </div>
        </div>
      </header>

      {/* The "big idea" */}
      <div className="max-w-4xl mx-auto px-6 md:px-10 -mt-6">
        <div className="rounded-xl bg-white border border-gray-200 shadow-md p-6 flex items-start gap-4">
          <div
            className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: `${LI_BLUE}14` }}
          >
            <Repeat className="w-5 h-5" style={{ color: LI_BLUE }} />
          </div>
          <div>
            <h2 className="font-bold text-lg">A ideia central</h2>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              A imagem-base é gerada <strong>uma única vez por campanha</strong> (a parte
              cara e criativa). Depois, para <strong>cada empresa-alvo</strong>, o sistema
              apenas “pinta” por cima o texto personalizado e o logo da empresa — de forma
              determinística. Resultado: dezenas de criativos visualmente consistentes,
              sem custo de IA por peça e sem variação aleatória.
            </p>
          </div>
        </div>
      </div>

      {/* Flow strip */}
      <div className="max-w-4xl mx-auto px-6 md:px-10 mt-10">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-semibold text-gray-500">
          {['Brand Brief', 'Brand Voice', 'Copy', 'Imagem-base', 'Overlay por empresa'].map(
            (s, i, arr) => (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <span className="rounded-full bg-white border border-gray-200 px-3 py-1 text-[#212A46]">
                  {s}
                </span>
                {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-300" />}
              </div>
            )
          )}
        </div>
      </div>

      {/* Steps */}
      <main className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
        {/* 1 — Brand brief */}
        <Step
          n={1}
          icon={<Globe className="w-5 h-5" />}
          title="Entender a empresa-alvo"
          badge={<Pill>Análise</Pill>}
          summary="O Maestro lê o site da empresa-alvo e monta um “brief” da marca dela: setor, proposta de valor, cores, temas de comunicação e perfil de persona. É o que faz a mensagem ressoar com aquela conta específica."
        >
          <Advanced title="Detalhe técnico — /ai/brand-brief">
            <dl className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Rota" value="POST /ai/brand-brief" />
              <Field label="Modelo" value="gemini-2.5-flash (JSON mode)" />
              <Field label="Scraping" value="title, meta, og:image, headings, ~4KB do corpo" />
              <Field label="Cache" value="KV por domínio (brand_brief:<domínio>)" />
            </dl>
            <p className="text-xs text-gray-500 mb-2">System instruction enviada ao modelo:</p>
            <Code>{`Você é um analista de marca. Dado um nome de empresa e sinais
do site institucional dela, devolva um JSON estruturado descrevendo
a identidade visual e a mensagem da empresa.

Diretrizes:
- "industry": setor primário (ex: "Cloud Infrastructure", "Fintech B2B").
- "value_proposition": uma frase curta (até 14 palavras).
- "visual_style_keywords": 3-6 palavras-chave de estilo visual (em inglês).
- "primary_colors": 2-4 cores em hex (#RRGGBB), dominantes da marca.
- "key_messaging_themes": 3-5 temas centrais da comunicação (em inglês).
- "target_persona_hint": 1 frase sobre a pessoa-alvo.

NÃO inclua "tone_of_voice" — o tom de voz não é da empresa-alvo.`}</Code>
          </Advanced>
        </Step>

        {/* 2 — Brand voice */}
        <Step
          n={2}
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Capturar a voz do anunciante"
          badge={<Pill>Análise</Pill>}
          summary="Separadamente, o Maestro analisa o site do próprio cliente (o anunciante) para extrair o tom de voz e a paleta de cores reais da marca. O tom é do anunciante; a mensagem é direcionada ao alvo — as duas coisas nunca se misturam."
        >
          <Advanced title="Detalhe técnico — /ai/extract-brand-voice">
            <dl className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Rota" value="POST /ai/extract-brand-voice" />
              <Field label="Modelo" value="gemini-2.5-flash (JSON mode)" />
              <Field label="Páginas" value="Home + página 'Sobre' (descoberta por link)" />
              <Field label="Cores" value="Extraídas do CSS, neutros filtrados, top 12 por frequência" />
            </dl>
            <p className="text-xs text-gray-500 mb-2">Trecho da system instruction:</p>
            <Code>{`Você é um estrategista de marca sênior. Analise o conteúdo
institucional fornecido e devolva JSON com:

- "voice": 3-4 frases descrevendo o TOM DE VOZ — registro,
  uso de jargão, atitude, pronome preferido, tipo de argumento.
- "voice_examples": 2-3 FRASES REAIS do conteúdo. Copie verbatim.
- "brand_context": o que a empresa vende, para quem, proposta de valor.
- "brand_colors": primary / secondary / accent em hex, usando as
  CORES DETECTADAS NO CSS como base.`}</Code>
          </Advanced>
        </Step>

        {/* 3 — Copy */}
        <Step
          n={3}
          icon={<Type className="w-5 h-5" />}
          title="Escrever o texto do anúncio"
          badge={<Pill>Geração · texto</Pill>}
          summary="Com o brief da empresa-alvo + a voz do anunciante, a IA escreve um par headline (até 150 caracteres) e corpo (até 500 caracteres) para cada conta — usando o tom do cliente e os temas que ressoam com o alvo."
        >
          <Advanced title="Detalhe técnico — /ai/generate-copy">
            <dl className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Rota" value="POST /ai/generate-copy" />
              <Field label="Modelo" value="gemini-2.5-flash · temperatura 0.7" />
              <Field label="Saída" value="{ headline ≤150, bodyText ≤500 }" />
              <Field label="Guard-rail" value="Proíbe inventar números/prêmios/citações" />
            </dl>
            <p className="text-xs text-gray-500 mb-2">Regras críticas da system instruction:</p>
            <Code>{`Você é um copywriter sênior de anúncios LinkedIn ABM.

- O TOM DE VOZ é do cliente Maestro (o anunciante), em <client_voice>.
- A MENSAGEM é direcionada à empresa-alvo (target_company_name) e usa
  os "key_messaging_themes" do brief para ressoar com ela.
- Headline: até 150 caracteres, alta conversão.
- BodyText: até 500 caracteres, 2-3 frases curtas.
- NÃO invente dados. Use só o que está no brief.`}</Code>
          </Advanced>
        </Step>

        {/* 4 — Base image */}
        <Step
          n={4}
          icon={<ImageIcon className="w-5 h-5" />}
          title="Gerar a imagem-base (1x por campanha)"
          badge={<Pill color={LI_BLUE}>Geração · imagem</Pill>}
          summary="A IA gera um “canvas” limpo no formato de anúncio do LinkedIn (1200×628). O prompt proíbe explicitamente qualquer texto ou logo na imagem — esse espaço é deixado livre de propósito, porque texto e logo entram na etapa seguinte. O usuário escolhe entre estilo fotográfico realista ou ilustração gráfica."
        >
          <Advanced title="Detalhe técnico — /ai/generate-base-image">
            <dl className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Rota" value="POST /ai/generate-base-image" />
              <Field label="Modelo" value="gemini-3.1-flash-image-preview" />
              <Field label="Modos" value="photo_ai (foto) · graphic_ai (ilustração)" />
              <Field label="Storage" value="Supabase bucket make-a4d5bbe0-creatives · signed URL 2h" />
            </dl>
            <p className="text-xs text-gray-500 mb-2">Prompt enviado ao gerador de imagem:</p>
            <Code>{`Generate a single LinkedIn-style B2B advertisement BASE IMAGE
for an ABM campaign.

Aspect ratio: 1.91:1, suitable for 1200x628 pixels. Landscape.

CRITICAL: do NOT render any text, words, letters, numbers, logos,
or watermarks. The image is a clean canvas — text and logos will be
added programmatically afterwards. Leave generous negative space
(especially in the corners and across the top third) so overlays
don't compete with subjects.

[photo_ai]  Style: REALISTIC EDITORIAL CORPORATE PHOTOGRAPHY...
[graphic_ai] Style: CLEAN EDITORIAL ILLUSTRATION or abstract
            conceptual graphic. Geometric, minimalist, vector-feel...`}</Code>
          </Advanced>
        </Step>

        {/* 5 — Overlay */}
        <Step
          n={5}
          icon={<Layers className="w-5 h-5" />}
          title="Personalizar por empresa (overlay)"
          badge={<Pill>Determinístico · sem IA</Pill>}
          summary="Para cada empresa-alvo, o sistema pega a imagem-base e desenha por cima: o headline, o texto complementar e o logo da empresa-alvo (buscado automaticamente pelo domínio). Isso NÃO usa IA — é uma composição SVG renderizada em PNG, então o resultado é idêntico e previsível para todas as contas."
        >
          <Advanced title="Detalhe técnico — /ai/compose-logo-overlay">
            <dl className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Rota" value="POST /ai/compose-logo-overlay" />
              <Field label="Engine" value="SVG → PNG via resvg-wasm (sem chamada de IA)" />
              <Field label="Logo" value="logo.dev → Clearbit → favicon, com variantes .com/.com.br" />
              <Field label="Fontes" value="Google Fonts (TTF) carregadas em runtime" />
            </dl>
            <p className="text-xs text-gray-500 mb-2">Layout fixo do criativo (1200×628):</p>
            <Code>{`Fundo .... imagem-base (cover)
Headline . caixa rgba(0,0,0,0.55), texto branco 56px peso 700  (canto sup. esq.)
Subtexto . caixa rgba(0,0,0,0.55), texto branco 28px peso 400  (abaixo)
Logo ..... card branco 140×140 com sombra                      (canto sup. dir.)`}</Code>
            <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
              O fallback de logo tenta variantes de domínio automaticamente (ex.:{' '}
              <code>.com.br</code> ↔ <code>.com</code>) e, se não houver domínio, adivinha
              a partir do nome da empresa.
            </p>
          </Advanced>
        </Step>

        {/* Closing note */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
          <p className="font-semibold text-[#212A46] mb-1">Por que essa arquitetura?</p>
          As partes criativas e custosas (entender a marca, escrever o texto, gerar a
          imagem) usam IA generativa (Gemini). A montagem final é determinística, o que
          garante <strong>consistência visual</strong> entre todas as peças e mantém o
          custo previsível mesmo gerando dezenas de criativos por campanha.
        </div>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        Maestro · Pipeline de criativos ABM · documento interno
      </footer>
    </div>
  );
}
