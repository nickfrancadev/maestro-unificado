import { describe, it, expect, beforeEach } from 'vitest';
import { handleSubmit } from './submit';

function mem(){ const m=new Map<string,string>(); return { get length(){return m.size;}, clear:()=>m.clear(), getItem:(k:string)=>m.get(k)??null, key:(i:number)=>[...m.keys()][i]??null, removeItem:(k:string)=>void m.delete(k), setItem:(k:string,v:string)=>void m.set(k,v) } as Storage; }
beforeEach(() => { (globalThis as any).localStorage = mem(); });

describe('handleSubmit', () => {
  it('creates a new contact linked to the account', () => {
    const r = handleSubmit('lp1', 'a1', { email: 'x@acme.com', firstName: 'Ana' }, []);
    expect(r.deduped).toBe(false);
    expect(r.contact.accountId).toBe('a1');
  });
  it('dedupes by email case-insensitively', () => {
    const existing = [{ email: 'x@acme.com', accountId: 'a1' }];
    const r = handleSubmit('lp1', 'a1', { email: 'X@ACME.COM', firstName: 'Ana' }, existing);
    expect(r.deduped).toBe(true);
  });
});
