import * as React from 'react';
import type { RenderContext } from '../registryTypes';
import type { SlotStyle } from '../../editor/slotStyle';
import { resolveSlotStyle, slotStyleToCss } from '../../editor/slotStyle';
import { resolveTokens } from '../../engine/resolveTokens';

interface SlotCommon {
  slotId: string;
  ctx: RenderContext;
  styleOverride?: SlotStyle;
  defaultStyle: SlotStyle;
}

const SELECTED_OUTLINE: React.CSSProperties = { outline: '2px solid #FF5F39', outlineOffset: 2 };

interface SlotTextProps extends SlotCommon {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  value: string;
}

export function SlotText({ slotId, ctx, styleOverride, defaultStyle, as = 'p', value }: SlotTextProps) {
  const Tag = as as keyof React.JSX.IntrinsicElements;
  const style = slotStyleToCss('text', resolveSlotStyle(defaultStyle, styleOverride));

  if (!ctx.editing) {
    return <Tag style={style}>{resolveTokens(value, ctx.ctx)}</Tag>;
  }

  const { editing } = ctx;
  const selected = editing.selectedSlot === slotId;
  const isEditingText = selected && editing.editingText;
  const finalStyle = selected ? { ...style, ...SELECTED_OUTLINE } : style;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editing.onSelectSlot(slotId);
  };

  if (isEditingText) {
    return (
      <Tag
        data-slot={slotId}
        style={finalStyle}
        contentEditable
        suppressContentEditableWarning
        onClick={handleClick}
        onBlur={(e: React.FocusEvent<HTMLElement>) => editing.onEditText(slotId, e.currentTarget.textContent ?? '')}
      >
        {value}
      </Tag>
    );
  }

  return (
    <Tag data-slot={slotId} style={finalStyle} onClick={handleClick}>
      {resolveTokens(value, ctx.ctx)}
    </Tag>
  );
}

interface SlotButtonProps extends SlotCommon {
  label: string;
  href: string;
}

export function SlotButton({ slotId, ctx, styleOverride, defaultStyle, label, href }: SlotButtonProps) {
  const style = slotStyleToCss('button', resolveSlotStyle(defaultStyle, styleOverride));

  if (!ctx.editing) {
    return <a href={href} style={style}>{resolveTokens(label, ctx.ctx)}</a>;
  }

  const { editing } = ctx;
  const selected = editing.selectedSlot === slotId;
  const finalStyle = selected ? { ...style, ...SELECTED_OUTLINE } : style;

  return (
    <a
      href={href}
      data-slot={slotId}
      style={finalStyle}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        editing.onSelectSlot(slotId);
      }}
    >
      {resolveTokens(label, ctx.ctx)}
    </a>
  );
}

interface SlotImageProps extends SlotCommon {
  url: string;
  alt?: string;
  placeholder?: string;
}

export function SlotImage({ slotId, ctx, styleOverride, defaultStyle, url, alt, placeholder }: SlotImageProps) {
  const style = slotStyleToCss('image', resolveSlotStyle(defaultStyle, styleOverride));

  if (!ctx.editing) {
    return url ? <img src={url} alt={alt ?? ''} style={style} /> : <div style={style}>{placeholder}</div>;
  }

  const { editing } = ctx;
  const selected = editing.selectedSlot === slotId;
  const finalStyle = selected ? { ...style, ...SELECTED_OUTLINE } : style;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editing.onSelectSlot(slotId);
  };

  return url ? (
    <img src={url} alt={alt ?? ''} data-slot={slotId} style={finalStyle} onClick={handleClick} />
  ) : (
    <div data-slot={slotId} style={finalStyle} onClick={handleClick}>
      {placeholder}
    </div>
  );
}
