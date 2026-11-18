import { describe, it, expect } from 'vitest';
import { accountSwitchWarning } from './accountSwitch';

describe('aviso ao trocar a conta de anúncios (F125)', () => {
  const atual = { id: '111', name: 'Conta Principal', currency: 'BRL' };

  it('primeira escolha ou a mesma conta: sem aviso', () => {
    expect(accountSwitchWarning(null, atual)).toBeNull();
    expect(accountSwitchWarning(atual, { id: '111' })).toBeNull();
  });

  it('trocar diz o que acontece com as campanhas existentes', () => {
    const w = accountSwitchWarning(atual, { id: '222', name: 'Conta Teste', currency: 'BRL' })!;
    expect(w.title).toBe('Trocar a conta afeta as campanhas existentes');
    const text = w.items.join(' ');
    expect(text).toContain('"Conta Principal" continuam no LinkedIn, no ar e gastando');
    expect(text).toContain('deixa de mostrá-las na lista e no analytics');
    expect(text).toContain('Novas publicações');
    expect(text).not.toContain('moeda');
  });

  it('moeda diferente entra no aviso', () => {
    const w = accountSwitchWarning(atual, { id: '222', currency: 'USD' })!;
    expect(w.items.join(' ')).toContain('A moeda muda de BRL para USD');
  });
});
