// Brand Kit — a marca do anunciante como unidade coesa e reutilizável.
// Agrupa assets de texto (voz/contexto/paleta/fonte) e assets visuais
// (logos/ícones/grafismos). Hoje vive dentro de CreativeData; será movido
// para uma tela de Configurações global no futuro.

export type LogoVariant = 'lightFull' | 'lightMark' | 'darkFull' | 'darkMark';

export interface BrandKit {
  status: 'defined' | 'empty';                                   // dirige Cenário 1 vs 2
  voice: string;                                                 // tom de voz
  context: string;                                               // contexto da empresa
  websiteUrl: string;                                            // usado na extração via site
  colors: { primary: string; secondary: string; accent: string };  // hex
  fontFamily: string;                                            // Google Font (movida do step de ads)
  logos: Record<LogoVariant, string | null>;                     // cada slot = object URL | null
  icons: string[];                                               // galeria de object URLs
  graphics: string[];                                            // grafismos/padrões — galeria de object URLs
  source?: 'brandbook' | 'website';                              // como foi extraído (informativo)
}

export const LOGO_VARIANTS: { key: LogoVariant; label: string; dark: boolean }[] = [
  { key: 'lightFull', label: 'Claro · completo', dark: false },
  { key: 'lightMark', label: 'Claro · símbolo', dark: false },
  { key: 'darkFull', label: 'Escuro · completo', dark: true },
  { key: 'darkMark', label: 'Escuro · símbolo', dark: true },
];

export function createDefaultBrandKit(): BrandKit {
  return {
    status: 'empty',
    voice: '',
    context: '',
    websiteUrl: '',
    colors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logos: { lightFull: null, lightMark: null, darkFull: null, darkMark: null },
    icons: [],
    graphics: [],
  };
}

// Mock options para a seção "Aplicação na campanha" (movidos de CreativeStep).
// Substituir por fontes reais (catálogo de produtos / segmentos / personas) depois.
export const MOCK_PRODUCTS = ['Produto A', 'Produto B', 'Produto C'];
export const MOCK_AUDIENCES = ['Pequenas empresas', 'Médias empresas', 'Enterprise'];
export const MOCK_PERSONAS = ['CMO', 'Head de Marketing', 'Demand Gen Manager'];

// Fixture usada para SIMULAR a extração (PDF ou site) enquanto o backend
// real não existe. Preenche os campos de texto e a paleta; as galerias de
// logos/ícones/grafismos começam vazias (o usuário sobe via tile "+").
export const MOCK_BRAND_FIXTURE: Pick<BrandKit, 'voice' | 'context' | 'colors' | 'fontFamily'> = {
  voice: 'Técnico e didático, focado em definir o produto e sua aplicação. Usa jargões do setor (SaaS, ABM, ABX, GTM, B2B) para se comunicar de forma precisa com um público familiarizado com marketing e vendas complexas.',
  context: 'Software SaaS especializado em Account-Based Marketing (ABM e ABX) para empresas B2B com vendas complexas, otimizando estratégias de Go To Market.',
  colors: { primary: '#FF5F39', secondary: '#0F172A', accent: '#6366F1' },
  fontFamily: 'Inter',
};
