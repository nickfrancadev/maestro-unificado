// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { SlotText, SlotButton, SlotImage } from './slots';
import type { RenderContext } from '../registryTypes';

const publicCtx: RenderContext = { ctx: null, brandKit: { colors: { primary: '#000', secondary: '#000', accent: '#000' }, fontFamily: '', status: 'defined', voice: '', context: '', websiteUrl: '', logos: {} as any, icons: [], graphics: [] } };

describe('slot helpers — public mode', () => {
  it('SlotText renders resolved text with default style, no data-slot', () => {
    const { container } = render(<SlotText slotId="headline" as="h1" value="{{account.name}}" ctx={publicCtx} defaultStyle={{ fontSize: 32, fontWeight: 'bold' }} />);
    const h1 = container.querySelector('h1')!;
    expect(h1.textContent).toBe('sua empresa'); // token fallback
    expect(h1.getAttribute('data-slot')).toBeNull();
    expect(h1.style.fontSize).toBe('32px');
  });
  it('SlotButton renders an anchor', () => {
    const { container } = render(<SlotButton slotId="cta" label="Ir" href="#x" ctx={publicCtx} defaultStyle={{ bgColor: '#f00' }} />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#x');
  });
});

describe('slot helpers — editor mode', () => {
  it('SlotText adds data-slot and selecting calls onSelectSlot', () => {
    const onSelectSlot = vi.fn();
    const editing = { selectedSlot: null, editingText: false, onSelectSlot, onEditText: vi.fn() };
    const ctx: RenderContext = { ...publicCtx, editing };
    const { container } = render(<SlotText slotId="headline" as="h1" value="Oi" ctx={ctx} defaultStyle={{}} />);
    const el = container.querySelector('[data-slot="headline"]') as HTMLElement;
    expect(el).toBeTruthy();
    el.click();
    expect(onSelectSlot).toHaveBeenCalledWith('headline');
  });
});
