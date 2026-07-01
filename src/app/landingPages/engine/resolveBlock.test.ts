import { describe, it, expect } from 'vitest';
import { mergeOverride, isVisible, resolveBlocks } from './resolveBlock';

const base = { id: 'b1', type: 'hero' as const, props: { title: 'A', sub: 'S' } };

describe('mergeOverride', () => {
  it('override wins per prop key, others kept', () => {
    expect(mergeOverride(base, { props: { title: 'B' } }).props).toEqual({ title: 'B', sub: 'S' });
  });
  it('no override returns base unchanged', () => {
    expect(mergeOverride(base)).toEqual(base);
  });
});

describe('isVisible', () => {
  it('no showIf → visible', () => { expect(isVisible(undefined, null)).toBe(true); });
  it('showIf with no ctx → visible (default render)', () => {
    expect(isVisible({ field: 'account.industry', op: '==', value: 'fintech' }, null)).toBe(true);
  });
  it('== matches', () => {
    expect(isVisible({ field: 'account.industry', op: '==', value: 'fintech' }, { industry: 'fintech' })).toBe(true);
  });
  it('== not match → hidden', () => {
    expect(isVisible({ field: 'account.industry', op: '==', value: 'fintech' }, { industry: 'saude' })).toBe(false);
  });
});

describe('resolveBlocks', () => {
  it('applies override then filters hidden', () => {
    const blocks = [base, { id: 'b2', type: 'cta' as const, props: {}, showIf: { field: 'account.industry', op: '==' as const, value: 'fintech' } }];
    const out = resolveBlocks(blocks, { b1: { props: { title: 'Z' } } }, { industry: 'saude' });
    expect(out).toHaveLength(1);
    expect(out[0].props.title).toBe('Z');
  });
});
