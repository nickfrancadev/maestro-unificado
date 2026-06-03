import React, { useState } from 'react';
import { PaintBucket, X, Sparkles, Loader2, Upload } from 'lucide-react';
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

interface BriefModalProps {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  status: BrandKit['status'];
  onClose: () => void;
  onSave: () => void;
  extracting: boolean;
  extractError: string | null;
  extractWarning: string | null;
  onExtractWebsite: () => void;
  onUploadBrandBook: (file: File) => void;
  onResetExtraction: () => void;
}

export function BriefModal({
  draft, setDraft, status, onClose, onSave,
  extracting, extractError, extractWarning, onExtractWebsite, onUploadBrandBook, onResetExtraction,
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
                type="button"
                onClick={() => setDevScenario(effectiveStatus === 'defined' ? 'empty' : 'defined')}
                className="px-2 py-0.5 rounded-full border border-slate-200 hover:bg-slate-50 font-semibold"
              >
                {readOnly ? 'Cenário 1' : 'Cenário 2'} ⇄
              </button>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
              onResetExtraction={onResetExtraction}
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
            <CampaignSelect label="Persona/Público" value={draft.persona} options={MOCK_PERSONAS}
              placeholder="Selecione uma persona"
              onChange={(v) => setDraft((d) => ({ ...d, persona: v }))} />
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button type="button" onClick={onSave} className="px-4 py-2 text-sm font-bold text-white bg-[#FF5F39] hover:bg-[#E54A26] rounded-lg shadow-sm">
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

function BrandEditor({ draft, setDraft, extracting, extractError, extractWarning, onExtractWebsite, onUploadBrandBook, onResetExtraction }: {
  draft: BriefDraft;
  setDraft: React.Dispatch<React.SetStateAction<BriefDraft>>;
  extracting: boolean;
  extractError: string | null;
  extractWarning: string | null;
  onExtractWebsite: () => void;
  onUploadBrandBook: (file: File) => void;
  onResetExtraction: () => void;
}) {
  // State A — no extraction done yet
  if (draft.source === null) {
    return (
      <div className="space-y-4">
        <p className="text-[11px] text-slate-400">Extraia automaticamente de um Brand Book (PDF) ou do seu site.</p>

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

        <p className="text-[10px] text-slate-400 text-center">Os campos da marca aparecem após a extração.</p>
      </div>
    );
  }

  // State B — extraction was done, show chip + brand fields
  return (
    <div className="space-y-4">
      {/* Used-method chip */}
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
        <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-emerald-800">
            {draft.source === 'website' ? 'Extraído do site' : 'Brand Book lido'}
          </div>
          <div className="text-[10px] text-emerald-700 truncate">{draft.extractedRef}</div>
        </div>
        <button type="button" onClick={onResetExtraction}
          className="text-[10px] font-bold text-[#FF5F39] hover:text-[#E54A26] shrink-0">Trocar ↻</button>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
          Tom de voz <span className="text-slate-400 font-normal lowercase">(2-3 frases descrevendo como a sua marca fala)</span>
        </label>
        <textarea value={draft.voice} onChange={(e) => setDraft((d) => ({ ...d, voice: e.target.value }))} rows={4}
          placeholder="Ex: Direto e confiante, sem jargão."
          className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#FF5F39] outline-none leading-relaxed" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
          Contexto da empresa <span className="text-slate-400 font-normal lowercase">(o que você vende, em 1-2 frases)</span>
        </label>
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
