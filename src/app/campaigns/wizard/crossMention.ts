// Criativo de uma empresa que cita outra empresa da mesma campanha (F076).
//
// Cada conjunto é visto só pelas pessoas da própria empresa-alvo. Um anúncio
// para o Nubank que fala "Itaú" (no título, no texto ou no texto sobre a
// imagem) entrega para o Nubank a lista de contas da campanha e quase sempre é
// erro de copiar e colar entre empresas. O passo Criativos e a Revisão
// bloqueiam, dizendo qual empresa cita qual.
import { resolveCreativeForCompany, resolveImageConfig } from './types';
import type { CreativeData } from './types';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** O nome aparece como palavra inteira (sem acento e sem caixa)? */
export function mentionsName(text: string, name: string): boolean {
  const n = normalize(name.trim());
  if (!n) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(n)}($|[^\\p{L}\\p{N}])`, 'u').test(normalize(text));
}

/** Tira o nome da própria empresa: "Itaú BBA" não cita "Itaú". */
function withoutOwnName(text: string, own: string): string {
  const n = normalize(own.trim());
  if (!n) return normalize(text);
  return normalize(text).replace(new RegExp(escape(n), 'gu'), ' ');
}

export interface CompanyTexts {
  companyId: string;
  companyName: string;
  texts: string[];
}

/**
 * Para cada empresa, os nomes das OUTRAS empresas da campanha que o criativo
 * dela cita. Só entra quem cita alguém.
 */
export function crossCompanyMentions(list: CompanyTexts[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const me of list) {
    const text = withoutOwnName(me.texts.filter(Boolean).join('\n'), me.companyName);
    const cited = list
      .filter((other) => other.companyId !== me.companyId)
      .filter((other) => normalize(other.companyName.trim()) !== normalize(me.companyName.trim()))
      .filter((other) => mentionsName(text, other.companyName))
      .map((other) => other.companyName);
    if (cited.length) out[me.companyId] = cited;
  }
  return out;
}

/** Os textos que o anúncio desta empresa leva: título, texto e os textos sobre a imagem. */
export function creativeTextsFor(data: CreativeData, company: { id: string; label: string; industry?: string }): string[] {
  const resolved = resolveCreativeForCompany(data, company);
  const fill = (t: string) => t.replace(/\{\{company\.name\}\}/g, company.label);
  const texts = [fill(resolved.headline), fill(resolved.bodyText)];
  if (data.templateLogo) {
    const cfg = resolveImageConfig(data, company.id);
    texts.push(fill(cfg.textoDestaque), fill(cfg.textoComplementar));
  }
  return texts;
}

export function crossMentionIssue(cited: string[]): string {
  const names = cited.length === 1 ? cited[0] : `${cited.slice(0, -1).join(', ')} e ${cited[cited.length - 1]}`;
  return `O anúncio cita ${names}, ${cited.length === 1 ? 'outra empresa' : 'outras empresas'} desta campanha. Cada anúncio só pode falar da própria empresa`;
}
