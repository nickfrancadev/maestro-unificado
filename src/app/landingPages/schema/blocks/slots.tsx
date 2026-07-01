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
  // Structural/layout Tailwind classes that have no SlotStyle-modeled
  // equivalent (spacing, sizing, responsive/hover variants). Kept as a plain
  // className passthrough so migrating a leaf element to a Slot helper does
  // not regress pixel-for-pixel layout. Visual *style* (color/size/weight/
  // bg/radius/etc.) still flows through defaultStyle/styleOverride.
  className?: string;
}

const SELECTED_OUTLINE: React.CSSProperties = { outline: '2px solid #FF5F39', outlineOffset: 2 };

interface SlotTextProps extends SlotCommon {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  value: string;
}

export function SlotText({ slotId, ctx, styleOverride, defaultStyle, as = 'p', value, className }: SlotTextProps) {
  const Tag = as as keyof React.JSX.IntrinsicElements;
  const style = slotStyleToCss('text', resolveSlotStyle(defaultStyle, styleOverride));

  // Hooks must run unconditionally (rules-of-hooks), so declare them before the
  // public/editor branch split even though only the editor's contentEditable
  // path uses the ref.
  const editRef = React.useRef<HTMLElement | null>(null);
  const editing = ctx.editing;
  const isEditingText = !!editing && editing.selectedSlot === slotId && editing.editingText;
  React.useEffect(() => {
    if (!isEditingText || !editRef.current) return;
    const el = editRef.current;
    el.focus();
    // Place the caret at the end of the existing text.
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [isEditingText]);

  if (!ctx.editing) {
    return <Tag className={className} style={style}>{resolveTokens(value, ctx.ctx)}</Tag>;
  }

  const selected = ctx.editing.selectedSlot === slotId;
  const finalStyle = selected ? { ...style, ...SELECTED_OUTLINE } : style;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    ctx.editing!.onSelectSlot(slotId);
  };

  if (isEditingText) {
    return (
      <Tag
        ref={editRef as React.Ref<never>}
        data-slot={slotId}
        className={className}
        style={finalStyle}
        contentEditable
        suppressContentEditableWarning
        onClick={handleClick}
        onBlur={(e: React.FocusEvent<HTMLElement>) => ctx.editing!.onEditText(slotId, e.currentTarget.textContent ?? '')}
      >
        {value}
      </Tag>
    );
  }

  return (
    <Tag data-slot={slotId} className={className} style={finalStyle} onClick={handleClick}>
      {resolveTokens(value, ctx.ctx)}
    </Tag>
  );
}

interface SlotButtonProps extends SlotCommon {
  label: string;
  href: string;
  // Public-mode-only click passthrough (e.g. analytics tracking on the real
  // anchor click). Editor mode intercepts clicks for selection instead, so
  // this is never invoked while ctx.editing is set.
  onClick?: () => void;
}

export function SlotButton({ slotId, ctx, styleOverride, defaultStyle, label, href, className, onClick }: SlotButtonProps) {
  const style = slotStyleToCss('button', resolveSlotStyle(defaultStyle, styleOverride));

  if (!ctx.editing) {
    return <a href={href} className={className} style={style} onClick={onClick}>{resolveTokens(label, ctx.ctx)}</a>;
  }

  const { editing } = ctx;
  const selected = editing.selectedSlot === slotId;
  const finalStyle = selected ? { ...style, ...SELECTED_OUTLINE } : style;

  return (
    <a
      href={href}
      data-slot={slotId}
      className={className}
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

export function SlotImage({ slotId, ctx, styleOverride, defaultStyle, url, alt, placeholder, className }: SlotImageProps) {
  const style = slotStyleToCss('image', resolveSlotStyle(defaultStyle, styleOverride));

  if (!ctx.editing) {
    return url ? (
      <img src={url} alt={alt ?? ''} className={className} style={style} />
    ) : (
      <div className={className} style={style}>{placeholder}</div>
    );
  }

  const { editing } = ctx;
  const selected = editing.selectedSlot === slotId;
  const finalStyle = selected ? { ...style, ...SELECTED_OUTLINE } : style;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    editing.onSelectSlot(slotId);
  };

  return url ? (
    <img src={url} alt={alt ?? ''} data-slot={slotId} className={className} style={finalStyle} onClick={handleClick} />
  ) : (
    <div data-slot={slotId} className={className} style={finalStyle} onClick={handleClick}>
      {placeholder}
    </div>
  );
}
