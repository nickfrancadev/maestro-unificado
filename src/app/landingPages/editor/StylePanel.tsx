// StylePanel — right panel. Replaces the old per-block content PropsPanel.
// Renders controls for the SELECTED SLOT's visual style (SlotStyle), dynamic
// by the slot's `kind` (text/button/image/block). When nothing is selected,
// falls back to the page-level settings (SEO + brand colors) previously
// shown by PropsPanel's no-selection branch.
//
// Style vs content: SlotStyle only models purely visual properties (color,
// size, weight, align, bg, radius, objectFit...). A button's link and an
// image's URL are NOT visual style — they're content the public page reads
// directly off `block.props` (e.g. `p.ctaHref`, `p.imageUrl`). So those two
// controls write through `onChangeContent` (-> a content prop patch) instead
// of `onChangeStyle` (-> `props.styles[slotId]` patch). Getting this wrong
// would silently break navigation/images on the public page, since
// BlockRenderer/the block Render functions never read a link or image URL
// out of `styles`.
import * as React from 'react';
import { REGISTRY } from '../schema/registry';
import type { Block } from '../schema/blockTypes';
import type { LandingPage } from '../store/model';
import type { SlotStyle, SlotOrBlockKind } from './slotStyle';
import { TextField, TextAreaField } from '../schema/blocks/panelFields';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { ColorControl, NumberControl, SelectControl, TextControl } from './styleControls';

export interface StylePanelSelection {
  blockId: string;
  slotId: string;
}

export interface StylePanelProps {
  selection: StylePanelSelection | null;
  block: Block | null;
  page: LandingPage;
  onChangeStyle: (slotId: string, patch: Partial<SlotStyle>) => void;
  onChangeContent: (prop: string, value: string) => void;
  onChangePage: (patch: Partial<LandingPage>) => void;
}

/** Finds the content prop name that holds a button slot's link. Every
 * button-owning block (navbar, hero, cta) names it `<something>Href`
 * (`ctaHref`, `buttonHref`) — so look for a prop key ending in `Href` rather
 * than hard-coding a slotId -> propName map, which would silently go stale
 * if a new button block used a different slot id. */
function findHrefProp(props: Record<string, unknown>): string | null {
  const key = Object.keys(props).find((k) => k.endsWith('Href') && typeof props[k] === 'string');
  return key ?? null;
}

/** Finds the content prop name that holds an image slot's URL. Hero uses
 * `imageUrl`, media uses `url` — prefer the more specific `*Url` name (to
 * avoid colliding with an unrelated `url`-ish prop on a future block) and
 * fall back to a plain `url` prop. */
function findImageUrlProp(props: Record<string, unknown>): string | null {
  const specific = Object.keys(props).find((k) => k.endsWith('Url') && typeof props[k] === 'string');
  if (specific) return specific;
  if (typeof props.url === 'string') return 'url';
  return null;
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
          <ColorControl
            label="Primária"
            value={page.brandKit.colors.primary}
            onChange={(v) => onChange({ brandKit: { ...page.brandKit, colors: { ...page.brandKit.colors, primary: v } } })}
          />
          <ColorControl
            label="Secundária"
            value={page.brandKit.colors.secondary}
            onChange={(v) => onChange({ brandKit: { ...page.brandKit, colors: { ...page.brandKit.colors, secondary: v } } })}
          />
          <ColorControl
            label="Destaque"
            value={page.brandKit.colors.accent}
            onChange={(v) => onChange({ brandKit: { ...page.brandKit, colors: { ...page.brandKit.colors, accent: v } } })}
          />
        </div>
      </div>
    </div>
  );
}

function TextSlotControls({
  slotId,
  style,
  onChangeStyle,
}: {
  slotId: string;
  style: SlotStyle;
  onChangeStyle: (patch: Partial<SlotStyle>) => void;
}) {
  return (
    <>
      <ColorControl label="Cor" value={style.color} onChange={(v) => onChangeStyle({ color: v })} />
      <NumberControl
        label="Tamanho da fonte"
        suffix="px"
        value={style.fontSize}
        onChange={(v) => onChangeStyle({ fontSize: v })}
      />
      <SelectControl
        label="Peso da fonte"
        value={style.fontWeight}
        options={[
          { value: 'normal', label: 'Normal' },
          { value: 'medium', label: 'Médio' },
          { value: 'semibold', label: 'Semi-negrito' },
          { value: 'bold', label: 'Negrito' },
        ]}
        onChange={(v) => onChangeStyle({ fontWeight: v })}
      />
      <SelectControl
        label="Alinhamento"
        value={style.textAlign}
        options={[
          { value: 'left', label: 'Esquerda' },
          { value: 'center', label: 'Centro' },
          { value: 'right', label: 'Direita' },
        ]}
        onChange={(v) => onChangeStyle({ textAlign: v })}
      />
    </>
  );
}

function ButtonSlotControls({
  style,
  onChangeStyle,
  hrefProp,
  hrefValue,
  onChangeContent,
}: {
  style: SlotStyle;
  onChangeStyle: (patch: Partial<SlotStyle>) => void;
  hrefProp: string | null;
  hrefValue: string;
  onChangeContent: (prop: string, value: string) => void;
}) {
  return (
    <>
      <ColorControl label="Cor de fundo" value={style.bgColor} onChange={(v) => onChangeStyle({ bgColor: v })} />
      <ColorControl label="Cor do texto" value={style.textColor} onChange={(v) => onChangeStyle({ textColor: v })} />
      <NumberControl
        label="Raio da borda"
        suffix="px"
        value={style.radius}
        onChange={(v) => onChangeStyle({ radius: v })}
      />
      {/* Link is content, not style — writes to the block's `*Href` prop so
          the public page (which reads e.g. `p.ctaHref` directly) actually
          navigates to the new destination. */}
      <TextControl
        label="Link"
        value={hrefValue}
        placeholder="https://... ou #ancora"
        onChange={(v) => {
          if (hrefProp) onChangeContent(hrefProp, v);
        }}
      />
    </>
  );
}

function ImageSlotControls({
  style,
  onChangeStyle,
  urlProp,
  urlValue,
  onChangeContent,
}: {
  style: SlotStyle;
  onChangeStyle: (patch: Partial<SlotStyle>) => void;
  urlProp: string | null;
  urlValue: string;
  onChangeContent: (prop: string, value: string) => void;
}) {
  return (
    <>
      {/* URL is content, not style — writes to the block's image URL prop
          (e.g. `imageUrl`/`url`) so the public page actually shows the new
          image. */}
      <TextControl
        label="URL da imagem"
        value={urlValue}
        placeholder="https://..."
        onChange={(v) => {
          if (urlProp) onChangeContent(urlProp, v);
        }}
      />
      <SelectControl
        label="Ajuste"
        value={style.objectFit}
        options={[
          { value: 'cover', label: 'Cobrir (cover)' },
          { value: 'contain', label: 'Conter (contain)' },
        ]}
        onChange={(v) => onChangeStyle({ objectFit: v })}
      />
      <NumberControl
        label="Raio da borda"
        suffix="px"
        value={style.radius}
        onChange={(v) => onChangeStyle({ radius: v })}
      />
    </>
  );
}

function BlockSlotControls({
  style,
  onChangeStyle,
}: {
  style: SlotStyle;
  onChangeStyle: (patch: Partial<SlotStyle>) => void;
}) {
  return (
    <>
      <ColorControl label="Cor de fundo" value={style.bgColor} onChange={(v) => onChangeStyle({ bgColor: v })} />
      <NumberControl
        label="Espaçamento vertical"
        suffix="px"
        value={style.paddingY}
        onChange={(v) => onChangeStyle({ paddingY: v })}
      />
      <SelectControl
        label="Alinhamento"
        value={style.align}
        options={[
          { value: 'left', label: 'Esquerda' },
          { value: 'center', label: 'Centro' },
          { value: 'right', label: 'Direita' },
        ]}
        onChange={(v) => onChangeStyle({ align: v })}
      />
    </>
  );
}

export function StylePanel({ selection, block, page, onChangeStyle, onChangeContent, onChangePage }: StylePanelProps) {
  const slotId = selection?.slotId ?? null;
  const kind: SlotOrBlockKind | null = (() => {
    if (!slotId || !block) return null;
    if (slotId === '__block__') return 'block';
    return REGISTRY[block.type].slots.find((s) => s.id === slotId)?.kind ?? null;
  })();

  const title = (() => {
    if (!selection || !block) return 'Configurações da página';
    if (kind === 'block') return REGISTRY[block.type].label;
    const slotDef = REGISTRY[block.type].slots.find((s) => s.id === slotId);
    return slotDef?.label ?? REGISTRY[block.type].label;
  })();

  const subtitle = selection && block ? 'Edite o estilo deste elemento.' : 'SEO e identidade visual da página.';

  const styles = (block?.props.styles ?? {}) as Record<string, SlotStyle>;
  const style: SlotStyle = (slotId && styles[slotId]) ?? {};

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="flex-1 space-y-4 px-4 py-4">
        {!selection || !block || !kind ? (
          <PageSettingsPanel page={page} onChange={onChangePage} />
        ) : kind === 'text' ? (
          <TextSlotControls
            slotId={slotId!}
            style={style}
            onChangeStyle={(patch) => onChangeStyle(slotId!, patch)}
          />
        ) : kind === 'button' ? (
          <ButtonSlotControls
            style={style}
            onChangeStyle={(patch) => onChangeStyle(slotId!, patch)}
            hrefProp={findHrefProp(block.props)}
            hrefValue={(() => {
              const prop = findHrefProp(block.props);
              return prop ? String(block.props[prop] ?? '') : '';
            })()}
            onChangeContent={onChangeContent}
          />
        ) : kind === 'image' ? (
          <ImageSlotControls
            style={style}
            onChangeStyle={(patch) => onChangeStyle(slotId!, patch)}
            urlProp={findImageUrlProp(block.props)}
            urlValue={(() => {
              const prop = findImageUrlProp(block.props);
              return prop ? String(block.props[prop] ?? '') : '';
            })()}
            onChangeContent={onChangeContent}
          />
        ) : (
          <BlockSlotControls style={style} onChangeStyle={(patch) => onChangeStyle('__block__', patch)} />
        )}
      </div>
    </div>
  );
}

export default StylePanel;
