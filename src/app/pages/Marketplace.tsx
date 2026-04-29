import { useState } from 'react';
import { 
  ShoppingCart, 
  CheckCircle, 
  Sparkles, 
  Brain, 
  Users, 
  BookOpen, 
  Target, 
  FileText,
  Briefcase,
  Plane,
  Heart,
  Gift,
  CreditCard,
  Palette,
  Megaphone,
  BarChart3,
  ExternalLink,
  TrendingUp,
  Zap,
  Star
} from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  price: string;
  icon: any;
  category: 'integration' | 'credits' | 'consulting' | 'workshop' | 'analysis';
  popular?: boolean;
  badge?: string;
}

interface Partner {
  id: string;
  name: string;
  description: string;
  benefit: string;
  icon: any;
  category: 'travel' | 'wellness' | 'gifts' | 'design' | 'marketing' | 'research';
  discount?: string;
}

const services: Service[] = [
  {
    id: 'linkedin-integration',
    title: 'Integração com LinkedIn',
    description: 'Conecte sua conta LinkedIn e automatize a coleta de dados de prospects e contas.',
    price: 'R$ 99,00/mês',
    icon: Users,
    category: 'integration',
    popular: true,
    badge: 'Mais Popular'
  },
  {
    id: 'ai-credits-basic',
    title: 'Pack de Créditos IA - Básico',
    description: '1000 créditos para geração de dossiês, análises e insights com IA generativa.',
    price: 'R$ 39,90',
    icon: Brain,
    category: 'credits'
  },
  {
    id: 'ai-credits-premium',
    title: 'Pack de Créditos IA - Premium',
    description: '15.000 créditos + 3 horas de consultoria para otimizar o uso da IA na sua estratégia ABM.',
    price: 'R$ 399,00',
    icon: Sparkles,
    category: 'credits',
    badge: 'Melhor Custo-Benefício'
  },
  {
    id: 'abm-implementation',
    title: 'Implementação ABM Completa',
    description: 'Consultoria full para estruturar sua estratégia ABM do zero: ICP, plays, dossiês e execução.',
    price: 'R$ 29.000,00',
    icon: Target,
    category: 'consulting',
    popular: true
  },
  {
    id: 'abm-workshop',
    title: 'Workshop ABM Online',
    description: 'Treinamento completo de 3 dias para sua equipe dominar ABM com casos práticos.',
    price: 'R$ 15.999,00',
    icon: BookOpen,
    category: 'workshop'
  },
  {
    id: 'consulting-hours',
    title: 'Consultoria Adicional',
    description: 'Pacote de 5 horas de consultoria estratégica com especialistas em ABM.',
    price: 'R$ 1.500,00',
    icon: Briefcase,
    category: 'consulting'
  },
  {
    id: 'dossier-construction',
    title: 'Construção de Dossiês',
    description: 'Nosso time constrói dossiês completos de até 10 contas prioritárias.',
    price: 'R$ 3.499,99',
    icon: FileText,
    category: 'analysis'
  },
  {
    id: 'play-construction',
    title: 'Construção de Play Customizado',
    description: 'Desenvolvemos um play completo com touchpoints, cadências e conteúdos personalizados.',
    price: 'R$ 10.000,00',
    icon: Target,
    category: 'consulting'
  },
  {
    id: 'icp-definition',
    title: 'Definição de ICP',
    description: 'Análise profunda do mercado e cliente ideal com dados e insights acionáveis.',
    price: 'R$ 2.599,99',
    icon: BarChart3,
    category: 'analysis'
  }
];

const partners: Partner[] = [
  {
    id: 'flapper',
    name: 'Flapper',
    description: 'Voos executivos de jatos e helicópteros para reuniões importantes.',
    benefit: 'Desconto exclusivo para clientes',
    icon: Plane,
    category: 'travel',
    discount: '15% OFF'
  },
  {
    id: 'guia-do-filme',
    name: 'Guia do Filme',
    description: 'Vale terapia e bem-estar para sua equipe ou parceiros de negócio.',
    benefit: 'Crédito de boas-vindas de R$ 100',
    icon: Heart,
    category: 'wellness'
  },
  {
    id: 'lobby',
    name: 'Lobby',
    description: 'Plataforma de envio de presentes corporativos personalizados.',
    benefit: 'Frete grátis na primeira compra',
    icon: Gift,
    category: 'gifts',
    discount: '10% OFF'
  },
  {
    id: 'hub4pay',
    name: 'hub4pay',
    description: 'Gift cards digitais para presentear prospects e clientes.',
    benefit: 'Sem taxa de setup',
    icon: CreditCard,
    category: 'gifts',
    discount: '5% OFF'
  },
  {
    id: 'faster',
    name: 'faster',
    description: 'Criação de peças de design sob demanda para suas campanhas.',
    benefit: '2 peças gratuitas no primeiro mês',
    icon: Palette,
    category: 'design'
  },
  {
    id: 'linkedin-ads',
    name: 'LinkedIn ADS',
    description: 'Créditos promocionais para campanhas de anúncios no LinkedIn.',
    benefit: 'R$ 500 em créditos grátis',
    icon: Megaphone,
    category: 'marketing',
    discount: 'R$ 500'
  },
  {
    id: 'opinion-box',
    name: 'opinion box',
    description: 'Pesquisas de mercado e feedback de clientes.',
    benefit: 'Primeira pesquisa com 50% de desconto',
    icon: BarChart3,
    category: 'research',
    discount: '50% OFF'
  }
];

export function Marketplace() {
  const [activeTab, setActiveTab] = useState<'services' | 'partners'>('services');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const serviceCategories = [
    { key: 'all', label: 'Todos' },
    { key: 'integration', label: 'Integrações' },
    { key: 'credits', label: 'Créditos IA' },
    { key: 'consulting', label: 'Consultoria' },
    { key: 'workshop', label: 'Treinamento' },
    { key: 'analysis', label: 'Análises' }
  ];

  const partnerCategories = [
    { key: 'all', label: 'Todos' },
    { key: 'travel', label: 'Viagens' },
    { key: 'wellness', label: 'Bem-estar' },
    { key: 'gifts', label: 'Presentes' },
    { key: 'design', label: 'Design' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'research', label: 'Pesquisa' }
  ];

  const filteredServices = selectedCategory === 'all' 
    ? services 
    : services.filter(s => s.category === selectedCategory);

  const filteredPartners = selectedCategory === 'all'
    ? partners
    : partners.filter(p => p.category === selectedCategory);

  return (
    <div className="flex-1 overflow-auto bg-[#edf2f5] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#212a46]">Marketplace</h1>
            <p className="text-sm text-gray-600">
              Expanda suas capacidades com serviços adicionais e parceiros exclusivos
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg p-2 inline-flex gap-1">
          <button
            onClick={() => {
              setActiveTab('services');
              setSelectedCategory('all');
            }}
            className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === 'services' ? '#FF5F39' : 'transparent',
              color: activeTab === 'services' ? 'white' : '#6B7280'
            }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} />
              Serviços Adicionais
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('partners');
              setSelectedCategory('all');
            }}
            className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{
              background: activeTab === 'partners' ? '#FF5F39' : 'transparent',
              color: activeTab === 'partners' ? 'white' : '#6B7280'
            }}
          >
            <div className="flex items-center gap-2">
              <Zap size={16} />
              Parceiros
            </div>
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">Categoria:</span>
          <div className="flex gap-2 flex-wrap">
            {(activeTab === 'services' ? serviceCategories : partnerCategories).map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: selectedCategory === cat.key ? '#FFF5F3' : 'white',
                  color: selectedCategory === cat.key ? '#FF5F39' : '#6B7280',
                  border: `1px solid ${selectedCategory === cat.key ? '#FF5F39' : '#e5e7eb'}`
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map(service => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all hover:border-[#FF5F39] relative"
                >
                  {service.badge && (
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-[10px] font-bold rounded shadow-md">
                      {service.badge}
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="p-3 rounded-lg shrink-0"
                      style={{ background: '#FFF5F3' }}
                    >
                      <Icon size={24} style={{ color: '#FF5F39' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[#212a46] mb-1">
                        {service.title}
                      </h3>
                      {service.popular && (
                        <div className="flex items-center gap-1 mb-2">
                          <TrendingUp size={12} className="text-green-600" />
                          <span className="text-[10px] font-bold text-green-600">POPULAR</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-6 min-h-[60px]">
                    {service.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">A partir de</div>
                      <div className="text-xl font-bold text-[#212a46]">
                        {service.price}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-[#FF5F39] text-white rounded-lg text-sm font-bold hover:bg-[#E54D29] transition-colors">
                      Contratar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Partners Grid */}
        {activeTab === 'partners' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map(partner => {
              const Icon = partner.icon;
              return (
                <div
                  key={partner.id}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all hover:border-[#FF5F39] relative"
                >
                  {partner.discount && (
                    <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded shadow-md">
                      {partner.discount}
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="p-3 rounded-lg shrink-0"
                      style={{ background: '#F0F9FF' }}
                    >
                      <Icon size={24} style={{ color: '#3B82F6' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[#212a46] mb-1">
                        {partner.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <CheckCircle size={12} className="text-green-600" />
                        <span className="text-[10px] font-bold text-green-600">PARCEIRO VERIFICADO</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 min-h-[40px]">
                    {partner.description}
                  </p>

                  <div className="p-3 bg-green-50 rounded-lg mb-4 border border-green-200">
                    <div className="flex items-start gap-2">
                      <Gift size={14} className="text-green-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] font-bold text-green-900 mb-0.5">
                          BENEFÍCIO EXCLUSIVO
                        </div>
                        <div className="text-xs text-green-800">
                          {partner.benefit}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-[#FF5F39] text-[#FF5F39] rounded-lg text-sm font-bold hover:bg-[#FFF5F3] transition-colors">
                    Acessar Parceiro
                    <ExternalLink size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {((activeTab === 'services' && filteredServices.length === 0) || 
          (activeTab === 'partners' && filteredPartners.length === 0)) && (
          <div className="bg-white rounded-lg p-12 text-center">
            <ShoppingCart size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 font-bold mb-1">Nenhum resultado encontrado</p>
            <p className="text-sm text-gray-500">Tente selecionar outra categoria</p>
          </div>
        )}

        {/* Bottom Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">Precisa de algo personalizado?</h3>
              <p className="text-sm text-purple-100 mb-4">
                Entre em contato com nosso time comercial para soluções sob medida para sua empresa
              </p>
              <button className="px-6 py-2.5 bg-white text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-50 transition-colors">
                Falar com Especialista
              </button>
            </div>
            <div className="pl-8">
              <Sparkles size={80} className="text-purple-300 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}