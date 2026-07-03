import type * as React from 'react';

export type SlotKind = 'text' | 'button' | 'image';
export type SlotOrBlockKind = SlotKind | 'block';

export interface SlotDef { id: string; kind: SlotKind; label: string; }

export interface SlotStyle {
  color?: string; fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  bgColor?: string; textColor?: string; radius?: number; href?: string;
  url?: string; objectFit?: 'cover' | 'contain';
  paddingY?: number; align?: 'left' | 'center' | 'right';
}

export function resolveSlotStyle(def: SlotStyle, override?: SlotStyle): SlotStyle {
  const out: SlotStyle = { ...def };
  if (override) {
    for (const [k, v] of Object.entries(override)) {
      if (v !== undefined) (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

const WEIGHT: Record<NonNullable<SlotStyle['fontWeight']>, number> = {
  normal: 400, medium: 500, semibold: 600, bold: 700,
};

export function slotStyleToCss(kind: SlotOrBlockKind, style: SlotStyle): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (kind === 'text') {
    if (style.color !== undefined) css.color = style.color;
    if (style.fontSize !== undefined) css.fontSize = `${style.fontSize}px`;
    if (style.fontWeight !== undefined) css.fontWeight = WEIGHT[style.fontWeight];
    if (style.textAlign !== undefined) css.textAlign = style.textAlign;
  } else if (kind === 'button') {
    if (style.bgColor !== undefined) css.backgroundColor = style.bgColor;
    if (style.textColor !== undefined) css.color = style.textColor;
    if (style.radius !== undefined) css.borderRadius = `${style.radius}px`;
  } else if (kind === 'image') {
    if (style.objectFit !== undefined) css.objectFit = style.objectFit;
    if (style.radius !== undefined) css.borderRadius = `${style.radius}px`;
  } else { // block
    if (style.bgColor !== undefined) css.backgroundColor = style.bgColor;
    if (style.paddingY !== undefined) { css.paddingTop = `${style.paddingY}px`; css.paddingBottom = `${style.paddingY}px`; }
    if (style.align !== undefined) css.textAlign = style.align;
  }
  return css;
}
