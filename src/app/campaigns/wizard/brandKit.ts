// Brand Kit — a marca do anunciante como unidade coesa e reutilizável.
// Agrupa voz, contexto, paleta, fonte e o logo. Hoje vive dentro de
// CreativeData; será movido para uma tela de Configurações global no futuro.

export interface BrandKit {
  status: 'defined' | 'empty';                                   // dirige Cenário 1 vs 2
  voice: string;                                                 // tom de voz
  context: string;                                               // contexto da empresa
  websiteUrl: string;                                            // usado na extração via site
  colors: { primary: string; secondary: string; accent: string };  // hex — um por papel
  // Candidatas por papel, quando a extração encontra mais de uma cor plausível.
  // Opcional de propósito: marca carregada do servidor não tem candidatas, e a
  // ausência precisa ser um estado normal, não um vazio a tratar.
  colorOptions?: { primary: string[]; secondary: string[]; accent: string[] };
  fontFamily: string;                                            // Google Font (movida do step de ads)
  logo: string | null;                                           // object URL | null
  source?: 'brandbook' | 'website';                              // como foi extraído (informativo)
}

export function createDefaultBrandKit(): BrandKit {
  return {
    status: 'empty',
    voice: '',
    context: '',
    websiteUrl: '',
    colors: { primary: '', secondary: '', accent: '' },
    fontFamily: 'Inter',
    logo: null,
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

const MOCK_LOGO = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="none"/><rect x="6" y="12" width="16" height="16" rx="3" fill="#FF5F39"/><text x="30" y="26" font-family="Inter,sans-serif" font-size="16" font-weight="700" fill="#0F172A">maestro</text></svg>');

// Fixture usada para SIMULAR a extração (PDF ou site) enquanto o backend real
// não existe. As candidatas de cor vivem só aqui por enquanto: a extração real
// devolve um hex por papel, então sem a fixture as amostras nunca apareceriam.
export const MOCK_BRAND_FIXTURE: Omit<BrandKit, 'status' | 'websiteUrl' | 'source'> = {
  voice: 'Técnico e didático, focado em definir o produto e sua aplicação. Usa jargões do setor (SaaS, ABM, ABX, GTM, B2B) para se comunicar de forma precisa com um público familiarizado com marketing e vendas complexas.',
  context: 'Software SaaS especializado em Account-Based Marketing (ABM e ABX) para empresas B2B com vendas complexas, otimizando estratégias de Go To Market.',
  colors: { primary: '#FF5F39', secondary: '#0F172A', accent: '#6366F1' },
  colorOptions: {
    primary: ['#FF5F39', '#E54A26'],
    secondary: ['#0F172A', '#212A46'],
    accent: ['#6366F1', '#3571DE'],
  },
  fontFamily: 'Inter',
  logo: MOCK_LOGO,
};
