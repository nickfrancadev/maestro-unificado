import { describe, it, expect } from 'vitest';
import { fmtCurrency, fmtNum, fmtPct, fmtOptional } from './format';

describe('format (pt-BR)', () => {
  it('moeda com vírgula decimal e símbolo da conta', () => {
    expect(fmtCurrency(113.19, 'BRL')).toBe('R$ 113,19');
    expect(fmtCurrency(14.15, 'USD')).toBe('US$ 14,15');
    expect(fmtCurrency(1234.5, 'BRL')).toBe('R$ 1.234,50');
    expect(fmtCurrency(12345, 'BRL')).toBe('R$ 12,3 mil');
  });

  it('números com separador de milhar', () => {
    expect(fmtNum(128)).toBe('128');
    expect(fmtNum(9876)).toBe('9.876');
    expect(fmtNum(18000000)).toBe('18 mi');
  });

  it('porcentagem recebe o valor já multiplicado por 100', () => {
    // 8 cliques em 128 impressões
    expect(fmtPct((8 / 128) * 100)).toBe('6,25%');
  });

  it('métrica ausente vira travessão, não zero', () => {
    expect(fmtOptional(undefined)).toBe('—');
    expect(fmtOptional(null)).toBe('—');
    expect(fmtOptional(0)).toBe('0');
  });
});
