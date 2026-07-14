import { describe, it, expect } from 'vitest';
import { resolveSlotStyle, slotStyleToCss } from './slotStyle';

describe('resolveSlotStyle', () => {
  it('override wins per key, undefined does not erase default', () => {
    expect(resolveSlotStyle({ color: 'red', fontSize: 16 }, { color: 'blue', fontSize: undefined }))
      .toEqual({ color: 'blue', fontSize: 16 });
  });
  it('no override returns default copy', () => {
    expect(resolveSlotStyle({ color: 'red' })).toEqual({ color: 'red' });
  });
});

describe('slotStyleToCss', () => {
  it('text maps fontWeight token to numeric + px fontSize', () => {
    expect(slotStyleToCss('text', { color: '#111', fontSize: 24, fontWeight: 'bold', textAlign: 'center' }))
      .toEqual({ color: '#111', fontSize: '24px', fontWeight: 700, textAlign: 'center' });
  });
  it('button maps bg/text/radius', () => {
    expect(slotStyleToCss('button', { bgColor: '#f00', textColor: '#fff', radius: 8 }))
      .toEqual({ backgroundColor: '#f00', color: '#fff', borderRadius: '8px' });
  });
  it('block maps paddingY to both paddings', () => {
    expect(slotStyleToCss('block', { bgColor: '#eee', paddingY: 40, align: 'center' }))
      .toEqual({ backgroundColor: '#eee', paddingTop: '40px', paddingBottom: '40px', textAlign: 'center' });
  });
  it('omits undefined-source keys', () => {
    expect(slotStyleToCss('text', { color: '#111' })).toEqual({ color: '#111' });
  });
});
