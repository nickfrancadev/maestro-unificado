import { describe, it, expect } from 'vitest';
import * as client from './ai';
import * as server from '../../supabase/functions/make-server-a4d5bbe0/aiGuards';

// A tela valida de novo o que o servidor já validou, porque é ela que grava por
// cima do texto do usuário. Os dois espelhos precisam dar o mesmo veredito.
const SAMPLES: Array<{ headline: string; bodyText: string; target: string; tpl: boolean }> = [
  { headline: 'ABM sem planilha para o Nubank', bodyText: 'Menos retrabalho. Mais contas certas.', target: 'Nubank', tpl: false },
  { headline: '', bodyText: '', target: 'Nubank', tpl: false },
  { headline: 'Não encontrado - input manual', bodyText: 'Não encontrado - input manual', target: 'Nubank', tpl: false },
  { headline: 'Maestro ABM + Nubank: uma parceria', bodyText: 'Juntos.', target: 'Nubank', tpl: false },
  { headline: 'Oi {{company.name}}', bodyText: 'Times de {{company.industry}}', target: '{{company.name}}', tpl: true },
  { headline: 'Oi {{company.name}}', bodyText: 'Texto', target: 'Nubank', tpl: false },
  { headline: 'Oi %FIRSTNAME%', bodyText: 'Texto [Empresa]', target: 'Stone', tpl: false },
  { headline: 'Se preferir, posso gerar outra', bodyText: '1. **Headline**', target: 'Stone', tpl: false },
  { headline: 'a'.repeat(201), bodyText: 'b'.repeat(601), target: 'Stone', tpl: false },
];

describe('copyProblems — paridade tela ↔ servidor', () => {
  it.each(SAMPLES)('mesmo veredito para "$headline"', ({ headline, bodyText, target, tpl }) => {
    const opts = { targetName: target, allowTemplateVars: tpl };
    expect(client.copyProblems({ headline, bodyText }, opts)).toEqual(server.copyProblems({ headline, bodyText }, opts));
  });
});

describe('sanitizeBrandBrief / sanitizeBrandExtraction — nada de lixo vai para o estado', () => {
  it('brief sem nada aproveitável vira null (a tela mantém o anterior)', () => {
    expect(client.sanitizeBrandBrief({ industry: 'Se preferir, posso pesquisar mais.' })).toBeNull();
    expect(client.sanitizeBrandBrief('texto cru do modelo')).toBeNull();
  });

  it('brief sem cores é aceito com a paleta vazia', () => {
    const b = client.sanitizeBrandBrief({ industry: 'Fintech', primary_colors: ['não encontrei'] });
    expect(b?.industry).toBe('Fintech');
    expect(b?.primary_colors).toEqual([]);
  });

  it('extração sem voz nem contexto vira null; cores inválidas viram vazio', () => {
    expect(client.sanitizeBrandExtraction({ voice: '', brand_context: '' })).toBeNull();
    const e = client.sanitizeBrandExtraction({ voice: 'Direto.', brand_context: '', brand_colors: { primary: 'azul', accent: '#abc' } });
    expect(e?.brand_colors).toEqual({ primary: '', secondary: '', accent: '#AABBCC' });
  });
});
