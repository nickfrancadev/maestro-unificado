import { describe, it, expect } from 'vitest';
import {
  copyProblems,
  impliesPartnership,
  looksLikeModelChatter,
  unsupportedMacro,
  sanitizeBrandBrief,
  sanitizeBrandVoice,
  normalizeHex,
  imageDimensions,
  needsImageNormalization,
} from './aiGuards';

const company = { targetName: 'Nubank', allowTemplateVars: false };

describe('copyProblems — o que a IA devolve só sai do servidor se puder ir ao ar', () => {
  it('aceita um par título + texto comum', () => {
    expect(copyProblems({ headline: 'ABM sem planilha para o time do Nubank', bodyText: 'Menos retrabalho. Mais contas certas.' }, company)).toEqual([]);
  });

  it('recusa título ou texto vazio', () => {
    expect(copyProblems({ headline: '', bodyText: 'x' }, company)).toContain('o título veio vazio');
    expect(copyProblems({ headline: 'x', bodyText: '' }, company)).toContain('o texto veio vazio');
  });

  it('recusa passar dos limites do LinkedIn (título 200, texto 600)', () => {
    expect(copyProblems({ headline: 'a'.repeat(201), bodyText: 'ok' }, company)).toHaveLength(1);
    expect(copyProblems({ headline: 'ok', bodyText: 'a'.repeat(601) }, company)).toHaveLength(1);
    expect(copyProblems({ headline: 'a'.repeat(200), bodyText: 'a'.repeat(600) }, company)).toEqual([]);
  });

  it('recusa a frase de falha da geração e conversa do modelo', () => {
    expect(looksLikeModelChatter('Não encontrado - input manual')).toBe(true);
    expect(looksLikeModelChatter('Se preferir, posso gerar outra versão.')).toBe(true);
    expect(looksLikeModelChatter('1. **Headline**\nTexto')).toBe(true);
    expect(looksLikeModelChatter('Claro! Aqui vai o texto')).toBe(true);
    expect(looksLikeModelChatter('Seu time de vendas perde contas certas')).toBe(false);
  });

  it('recusa parceria, parceiro, partner e co-branding com a empresa-alvo', () => {
    expect(impliesPartnership('Uma parceria para crescer')).toBe(true);
    expect(impliesPartnership('Seja nosso parceiro estratégico')).toBe(true);
    expect(impliesPartnership('Partner on Inter')).toBe(true);
    expect(impliesPartnership('Em parceria com o Nubank')).toBe(true);
    expect(impliesPartnership('Maestro ABM + Nubank', 'Nubank')).toBe(true);
    expect(impliesPartnership('Maestro x Nubank', 'Nubank')).toBe(true);
    expect(impliesPartnership('O time do Nubank pode vender mais', 'Nubank')).toBe(false);
  });

  it('só aceita {{company.name}}/{{company.industry}} e só no template', () => {
    expect(unsupportedMacro('Oi {{company.name}}', true)).toBeNull();
    expect(unsupportedMacro('Oi {{company.name}}', false)).toBe('{{company.name}}');
    expect(unsupportedMacro('Oi {{contact.first_name}}', true)).toBe('{{contact.first_name}}');
    expect(unsupportedMacro('Oi %FIRSTNAME%', true)).toBe('%FIRSTNAME%');
    expect(unsupportedMacro('Oi [Empresa]', true)).toBe('[Empresa]');
  });
});

describe('sanitizeBrandBrief / sanitizeBrandVoice — nada de lixo do modelo', () => {
  it('cores ausentes deixam a paleta vazia sem invalidar o resto', () => {
    const r = sanitizeBrandBrief({
      industry: 'Fintech', value_proposition: 'Banco digital', primary_colors: ['nenhuma encontrada'],
      key_messaging_themes: ['simplicidade'], visual_style_keywords: [], target_persona_hint: '',
    });
    expect(r.usable).toBe(true);
    expect(r.brief.primary_colors).toEqual([]);
    expect(r.missing).toContain('cores');
  });

  it('descarta campos em que o modelo está conversando', () => {
    const r = sanitizeBrandBrief({ industry: 'Se preferir, posso pesquisar mais.', value_proposition: '1. **Proposta**' });
    expect(r.brief.industry).toBe('');
    expect(r.brief.value_proposition).toBe('');
    expect(r.usable).toBe(false);
  });

  it('normaliza hex e recusa o que não é cor', () => {
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('5b3fff')).toBe('#5B3FFF');
    expect(normalizeHex('azul')).toBe('');
  });

  it('a voz sem cores continua utilizável', () => {
    const r = sanitizeBrandVoice({ voice: 'Direto e técnico.', brand_context: 'SaaS de ABM.', brand_colors: { primary: '' } });
    expect(r.usable).toBe(true);
    expect(r.brand_colors.primary).toBe('');
    expect(r.missing).toEqual(['cores']);
  });
});

describe('imageDimensions / needsImageNormalization', () => {
  const png = (w: number, h: number) => {
    const b = new Uint8Array(24);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(b.buffer).setUint32(16, w);
    new DataView(b.buffer).setUint32(20, h);
    return b;
  };
  const jpeg = (w: number, h: number) => new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03, 0, 0, 0, 0,
  ]);

  it('lê PNG e JPEG', () => {
    expect(imageDimensions(png(1024, 1024))).toEqual({ width: 1024, height: 1024 });
    expect(imageDimensions(jpeg(1344, 704))).toEqual({ width: 1344, height: 704 });
    expect(imageDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('pede normalização abaixo de 1200 px, com proporção errada ou ilegível', () => {
    expect(needsImageNormalization({ width: 1024, height: 1024 }, { w: 1200, h: 1200 })).toBe(true);
    expect(needsImageNormalization({ width: 2048, height: 2048 }, { w: 1200, h: 628 })).toBe(true);
    expect(needsImageNormalization(null, { w: 1200, h: 628 })).toBe(true);
    expect(needsImageNormalization({ width: 1200, height: 628 }, { w: 1200, h: 628 })).toBe(false);
    expect(needsImageNormalization({ width: 2048, height: 2048 }, { w: 1200, h: 1200 })).toBe(false);
  });
});
