import React, { useState } from 'react';
import { Sparkles, Loader2, Upload, Settings2, CheckCircle2 } from 'lucide-react';
import { FontPicker } from './CreativeStep';
import { LOGO_VARIANTS, MOCK_PRODUCTS, MOCK_AUDIENCES, MOCK_PERSONAS } from './brandKit';
import type { BrandKit, LogoVariant } from './brandKit';

const MAX_ASSET_MB = 5;
function makeImageObjectUrl(file: File, onError: (msg: string) => void): string | null {
  if (!file.type.startsWith('image/')) { onError('Use uma imagem (PNG, JPG ou SVG).'); return null; }
  if (file.size > MAX_ASSET_MB * 1024 * 1024) { onError(`Arquivo excede ${MAX_ASSET_MB}MB.`); return null; }
  return URL.createObjectURL(file);
}

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
  source: 'website' | 'brandbook' | null;   // qual método de extração foi usado (null = nenhum ainda)
  extractedRef: string;                       // referência exibida no chip: URL do site ou nome do arquivo PDF
}

export interface BriefPaneProps {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  status: BrandKit['status'];
  savingBrand: boolean;
  /** Falha do POST global (`/ai/client-voice`). Sem o modal fechando, é o único sinal de erro. */
  saveError?: string | null;
  /** Confirmação transitória de que a marca foi gravada no servidor. */
  saveSucceeded?: boolean;
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

export function BriefPane({
  draft, setDraft, status, savingBrand, saveError = null, saveSucceeded = false, onSaveBrand,
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
            draft={draft}
            setDraft={setDraft}
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

        {/* Procedência: extração desta sessão tem `source`; marca que veio do
            servidor não tem — e nesse caso o chip aponta as configurações
            salvas, em vez de simplesmente sumir. O teste de conteúdo evita
            afirmar "veio das configurações" logo depois de "Trocar ↻", que
            limpa os campos sem mexer no `status`. */}
        {draft.source ? (
          <ProvenanceChip source={draft.source} reference={draft.extractedRef} onReset={onResetExtraction} />
        ) : definida && (draft.voice.trim() || draft.context.trim()) ? (
          <SavedBrandChip />
        ) : null}
        {extractWarning && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{extractWarning}</p>
        )}
        {extractError && (
          <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">{extractError}</p>
        )}

        {/* Campos sempre visíveis e editáveis, nos dois estados */}
        <BrandFields draft={draft} setDraft={setDraft} />

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onSaveBrand}
            disabled={savingBrand}
            className="px-4 py-2 text-sm font-bold text-white bg-[#FF5F39] hover:bg-[#E54A26] disabled:bg-slate-300 rounded-lg shadow-sm"
          >
            {savingBrand ? 'Salvando…' : 'Salvar marca'}
          </button>
          {/* Sem o modal fechando, "salvou" e "o servidor recusou" eram
              visualmente idênticos: o botão piscava e nada mais acontecia. */}
          {!savingBrand && saveSucceeded && !saveError && (
            <span role="status" className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marca salva
            </span>
          )}
        </div>
        {saveError && (
          <p role="alert" className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {saveError}
          </p>
        )}
      </section>

      <div className="h-px bg-slate-200" />

      {/* ===== Seção Aplicação nesta campanha (ao vivo) ===== */}
      <section>
        <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">Aplicação nesta campanha</div>
        <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
          Específico para esta campanha — não faz parte da marca.
        </p>
        <CampaignSelect
          id="brief-product" label="Produto/Serviço" value={draft.productService} options={MOCK_PRODUCTS}
          placeholder="Selecione um produto ou serviço"
          onChange={(v) => { setDraft((d) => ({ ...d, productService: v })); onCampaignFieldChange({ productService: v }); }}
        />
        <CampaignSelect
          id="brief-audience" label="Públicos/Mercados" value={draft.audienceMarket} options={MOCK_AUDIENCES}
          placeholder="Selecione um público ou mercado"
          onChange={(v) => { setDraft((d) => ({ ...d, audienceMarket: v })); onCampaignFieldChange({ audienceMarket: v }); }}
        />
        <CampaignSelect
          id="brief-persona" label="Persona/Público" value={draft.persona} options={MOCK_PERSONAS}
          placeholder="Selecione uma persona"
          onChange={(v) => { setDraft((d) => ({ ...d, persona: v })); onCampaignFieldChange({ persona: v }); }}
        />
      </section>
    </div>
  );
}

function SecondaryExtraction({ draft, setDraft, extracting, onUploadBrandBook, onExtractWebsite }: {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  extracting: boolean;
  onUploadBrandBook: (file: File) => void;
  onExtractWebsite: () => void;
}) {
  // `websiteUrl` é campo da marca (vai pro servidor como `website_url`), então
  // precisa ser editável nos dois estados — `status` governa apresentação, não
  // editabilidade. Sem ele aqui, uma marca salva via PDF nascia com URL vazia e
  // "Extrair do site novamente" não tinha como funcionar nem como ser corrigida.
  const semUrl = !draft.websiteUrl.trim();
  // `<label>` com `input[type=file]` escondido não entra na ordem de tabulação
  // (o input tem `display:none`, logo não é focável): o caminho de PDF virava
  // exclusivo de mouse. Mesmo padrão de `BrandBookDropzone.pick()`.
  const pickPdf = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/pdf';
    input.onchange = () => { const f = input.files?.[0]; if (f) onUploadBrandBook(f); };
    input.click();
  };
  return (
    <div className="mt-2 space-y-3">
      <div>
        <label htmlFor="brief-website" className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
          Website da sua empresa
        </label>
        <input
          id="brief-website" type="url" value={draft.websiteUrl}
          onChange={(e) => setDraft((d) => ({ ...d, websiteUrl: e.target.value }))}
          placeholder="https://suaempresa.com"
          className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button" onClick={pickPdf} disabled={extracting}
          className="text-[11px] font-semibold text-[#FF5F39] hover:text-[#E54A26] disabled:text-slate-300"
        >
          Substituir a partir de PDF
        </button>
        <button
          type="button" onClick={onExtractWebsite} disabled={extracting || semUrl}
          title={semUrl ? 'Informe o website da empresa acima para extrair novamente' : undefined}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5F39] hover:text-[#E54A26] disabled:text-slate-300 disabled:cursor-not-allowed"
        >
          {extracting && <Loader2 className="w-3 h-3 animate-spin" />}
          Extrair do site novamente
        </button>
      </div>
    </div>
  );
}

function PrimaryExtraction({ draft, setDraft, extracting, onUploadBrandBook, onExtractWebsite }: {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  extracting: boolean;
  onUploadBrandBook: (file: File) => void;
  onExtractWebsite: () => void;
}) {
  return (
    <div className="mt-2 space-y-4">
      <p className="text-[11px] text-slate-400">Extraia automaticamente a partir de um PDF ou do seu site.</p>

      <BrandBookDropzone disabled={extracting} onFile={onUploadBrandBook} />
      <div className="flex items-center gap-2 text-[10px] uppercase text-slate-400">
        <span className="flex-1 h-px bg-slate-200" /> ou <span className="flex-1 h-px bg-slate-200" />
      </div>
      <div>
        <label htmlFor="brief-website" className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Website da sua empresa</label>
        <div className="flex gap-2">
          <input id="brief-website" type="url" value={draft.websiteUrl}
            onChange={(e) => setDraft((d) => ({ ...d, websiteUrl: e.target.value }))}
            placeholder="https://suaempresa.com"
            className="flex-1 p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none" />
          <button type="button" onClick={onExtractWebsite} disabled={extracting || !draft.websiteUrl.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#FF5F39] hover:bg-[#E54A26] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg flex items-center gap-2 shrink-0">
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Extrair com IA
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Procedência da marca que já estava definida quando o painel abriu — veio das
 * configurações salvas em `/ai/client-voice`, não de uma extração desta sessão
 * (por isso não há `source` nem referência a exibir). Sem botão de "Trocar":
 * quem quiser refazer usa as ações de extração logo acima, que não apagam nada
 * antes da hora.
 */
function SavedBrandChip() {
  return (
    <div className="mt-3 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
      <div className="w-6 h-6 rounded-md bg-slate-400 text-white flex items-center justify-center shrink-0">
        <Settings2 className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-slate-700">Marca das configurações salvas</div>
        <div className="text-[10px] text-slate-500 truncate">
          Carregada da marca já salva na conta — edite e salve para atualizar.
        </div>
      </div>
    </div>
  );
}

function ProvenanceChip({ source, reference, onReset }: {
  source: 'website' | 'brandbook';
  reference: string;
  onReset: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
      <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-emerald-800">
          {source === 'website' ? 'Extraído do site' : 'Brand Book lido'}
        </div>
        <div className="text-[10px] text-emerald-700 truncate">{reference}</div>
      </div>
      <button type="button" onClick={onReset}
        className="text-[10px] font-bold text-[#FF5F39] hover:text-[#E54A26] shrink-0">Trocar ↻</button>
    </div>
  );
}

function BrandFields({ draft, setDraft }: {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <label htmlFor="brief-voice" className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
          Tom de voz <span className="text-slate-400 font-normal lowercase">(2-3 frases descrevendo como a sua marca fala)</span>
        </label>
        <textarea
          id="brief-voice" value={draft.voice} rows={4}
          onChange={(e) => setDraft((d) => ({ ...d, voice: e.target.value }))}
          placeholder="Ex: Direto e confiante, sem jargão."
          className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none leading-relaxed"
        />
      </div>
      <div>
        <label htmlFor="brief-context" className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
          Contexto da empresa <span className="text-slate-400 font-normal lowercase">(o que você vende, em 1-2 frases)</span>
        </label>
        <textarea
          id="brief-context" value={draft.context} rows={3}
          onChange={(e) => setDraft((d) => ({ ...d, context: e.target.value }))}
          placeholder="Ex: Plataforma de ABM para B2B SaaS."
          className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none leading-relaxed"
        />
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
      if (url) { setErr(null); setDraft((d) => ({ ...d, logos: { ...d.logos, [variant]: url } })); }
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
              <div className="text-[9px] uppercase tracking-wide mb-1 text-slate-400">{v.label}</div>
              {url ? (
                <div className="relative">
                  <img src={url} alt={v.label} className="w-full h-12 object-contain" />
                  <button type="button" onClick={() => setDraft((d) => ({ ...d, logos: { ...d.logos, [v.key]: null } }))}
                    className="absolute -top-1 -right-1 bg-white text-slate-500 rounded-full w-4 h-4 text-[10px] leading-none border border-slate-200">×</button>
                </div>
              ) : (
                <button type="button" onClick={() => pick(v.key)}
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
      if (url) { setErr(null); onAdd(url); }
    };
    input.click();
  };
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {items.map((u, i) => (
          <div key={u} className="relative">
            <img src={u} alt="" className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1 bg-white" />
            <button type="button" onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 bg-white text-slate-500 rounded-full w-4 h-4 text-[10px] leading-none border border-slate-200">×</button>
          </div>
        ))}
        <button type="button" onClick={pick}
          className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-[#FF5F39] border border-dashed border-slate-300 rounded-lg bg-slate-50 text-xl">+</button>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

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

function CampaignSelect({ id, label, value, options, placeholder, onChange }: {
  id: string; label: string; value: string; options: string[]; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none">
        <option value="">{placeholder}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
