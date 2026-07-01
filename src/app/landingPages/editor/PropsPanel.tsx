// PropsPanel — right panel. When a block is selected, renders that block's
// own `REGISTRY[type].Panel` (each block type owns its typed props editor).
// When nothing is selected, shows page-level settings: SEO fields and a
// brandKit color editor (primary/secondary/accent) — changing these re-
// renders themed blocks live because BlockRenderer reads `page.brandKit`.
import * as React from 'react';
import { REGISTRY } from '../schema/registry';
import type { Block } from '../schema/blockTypes';
import type { LandingPage } from '../store/model';
import { TextField, TextAreaField } from '../schema/blocks/panelFields';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputId = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border border-slate-200 bg-white p-1"
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex h-9 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        />
      </div>
    </div>
  );
}

function PageSettingsPanel({ page, onChange }: { page: LandingPage; onChange: (patch: Partial<LandingPage>) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">SEO</h3>
        <div className="space-y-4">
          <TextField
            label="Título"
            value={page.seo.title}
            onChange={(v) => onChange({ seo: { ...page.seo, title: v } })}
          />
          <TextAreaField
            label="Descrição"
            value={page.seo.description}
            onChange={(v) => onChange({ seo: { ...page.seo, description: v } })}
          />
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
            <Label htmlFor="lp-noindex" className="text-sm text-slate-700">Ocultar de buscadores (noindex)</Label>
            <Switch
              id="lp-noindex"
              checked={page.seo.noIndex}
              onCheckedChange={(checked) => onChange({ seo: { ...page.seo, noIndex: checked } })}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Cores da marca</h3>
        <div className="space-y-4">
          <ColorField
            label="Primária"
            value={page.brandKit.colors.primary}
            onChange={(v) => onChange({ brandKit: { ...page.brandKit, colors: { ...page.brandKit.colors, primary: v } } })}
          />
          <ColorField
            label="Secundária"
            value={page.brandKit.colors.secondary}
            onChange={(v) => onChange({ brandKit: { ...page.brandKit, colors: { ...page.brandKit.colors, secondary: v } } })}
          />
          <ColorField
            label="Destaque"
            value={page.brandKit.colors.accent}
            onChange={(v) => onChange({ brandKit: { ...page.brandKit, colors: { ...page.brandKit.colors, accent: v } } })}
          />
        </div>
      </div>
    </div>
  );
}

export interface PropsPanelProps {
  page: LandingPage;
  selectedBlock: Block | null;
  onChangePage: (patch: Partial<LandingPage>) => void;
  onChangeBlock: (patch: Partial<Block>) => void;
}

export function PropsPanel({ page, selectedBlock, onChangePage, onChangeBlock }: PropsPanelProps) {
  const def = selectedBlock ? REGISTRY[selectedBlock.type] : null;

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          {selectedBlock && def ? def.label : 'Configurações da página'}
        </h2>
        <p className="text-xs text-slate-500">
          {selectedBlock ? 'Edite as propriedades deste bloco.' : 'SEO e identidade visual da página.'}
        </p>
      </div>
      <div className="flex-1 px-4 py-4">
        {selectedBlock && def ? (
          <def.Panel block={selectedBlock} onChange={onChangeBlock} />
        ) : (
          <PageSettingsPanel page={page} onChange={onChangePage} />
        )}
      </div>
    </div>
  );
}

export default PropsPanel;
