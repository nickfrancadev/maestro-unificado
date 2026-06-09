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

// Pequeno helper para SVG inline como data URI (sem rede) — usado só nos exemplos mock.
function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const MOCK_LOGO_FULL_LIGHT = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="none"/><rect x="6" y="12" width="16" height="16" rx="3" fill="#FF5F39"/><text x="30" y="26" font-family="Inter,sans-serif" font-size="16" font-weight="700" fill="#0F172A">maestro</text></svg>');
const MOCK_LOGO_FULL_DARK = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#0F172A"/><rect x="6" y="12" width="16" height="16" rx="3" fill="#FF5F39"/><text x="30" y="26" font-family="Inter,sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">maestro</text></svg>');
const MOCK_LOGO_MARK = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect x="8" y="8" width="24" height="24" rx="5" fill="#FF5F39"/></svg>');
const MOCK_LOGO_MARK_DARK = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#0F172A"/><rect x="8" y="8" width="24" height="24" rx="5" fill="#FF5F39"/></svg>');
const MOCK_ICON_1 = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="12" fill="none" stroke="#6366F1" stroke-width="3"/></svg>');
const MOCK_ICON_2 = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><polygon points="20,6 33,28 7,28" fill="#FF5F39"/></svg>');
const MOCK_ICON_3 = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path d="M8 20 L32 20 M24 12 L32 20 L24 28" fill="none" stroke="#0F172A" stroke-width="3"/></svg>');
const MOCK_GRAPHIC_1 = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><defs><pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="#FF5F39"/></pattern></defs><rect width="60" height="60" fill="url(#p)"/></svg>');
const MOCK_GRAPHIC_2 = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#EEF2FF"/><circle cx="15" cy="15" r="3" fill="#6366F1"/><circle cx="35" cy="15" r="3" fill="#6366F1"/><circle cx="15" cy="35" r="3" fill="#6366F1"/><circle cx="35" cy="35" r="3" fill="#6366F1"/></svg>');

// Fixture usada para SIMULAR a extração (PDF ou site) enquanto o backend real não
// existe. Preenche texto/paleta/fonte E exemplos visuais (logos/ícones/grafismos)
// para que o resultado da extração mock seja visível.
export const MOCK_BRAND_FIXTURE: Omit<BrandKit, 'status' | 'websiteUrl' | 'source'> = {
  voice: 'Técnico e didático, focado em definir o produto e sua aplicação. Usa jargões do setor (SaaS, ABM, ABX, GTM, B2B) para se comunicar de forma precisa com um público familiarizado com marketing e vendas complexas.',
  context: 'Software SaaS especializado em Account-Based Marketing (ABM e ABX) para empresas B2B com vendas complexas, otimizando estratégias de Go To Market.',
  colors: { primary: '#FF5F39', secondary: '#0F172A', accent: '#6366F1' },
  fontFamily: 'Inter',
  logos: { lightFull: MOCK_LOGO_FULL_LIGHT, lightMark: MOCK_LOGO_MARK, darkFull: MOCK_LOGO_FULL_DARK, darkMark: MOCK_LOGO_MARK_DARK },
  icons: [MOCK_ICON_1, MOCK_ICON_2, MOCK_ICON_3],
  graphics: [MOCK_GRAPHIC_1, MOCK_GRAPHIC_2],
};
