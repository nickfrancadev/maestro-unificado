import { useState } from 'react';
import { Search, X, ChevronDown, ChevronRight, Mail, Phone, Users, Target, Heart, Sparkles, TrendingUp, FileText, CheckSquare, MessageCircle } from 'lucide-react';

interface TouchpointCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTouchpoint: (touchpoint: {
    type: string;
    title: string;
    category: string;
    weight?: string;
    insertPosition?: number;
    itemType?: 'touchpoint' | 'task';
  }) => void;
  insertPosition?: number | null;
}

const TOUCHPOINT_CATEGORIES = [
  {
    name: 'Relacionamento',
    icon: Users,
    color: '#FF9B83',
    items: [
      'Conectar no LinkedIn',
      'Seguir no LinkedIn',
      'Curtir publicações',
      'Comentar em publicações',
      'Compartilhar publicações',
      'Enviar mensagem de conexão personalizada',
      'Enviar mensagem direta no LinkedIn',
      'Participar de grupos em comum',
      'Recomendar habilidades',
      'Enviar convite para evento',
      'Fazer introdução a contato relevante'
    ]
  },
  {
    name: 'Autoridade',
    icon: Target,
    color: '#C8E6C9',
    items: [
      'Compartilhar case de sucesso',
      'Enviar artigo relevante',
      'Compartilhar white paper',
      'Enviar pesquisa de mercado',
      'Compartilhar webinar gravado',
      'Enviar newsletter',
      'Compartilhar infográfico',
      'Enviar ebook',
      'Compartilhar vídeo educativo',
      'Enviar convite para webinar ao vivo',
      'Compartilhar certificação/prêmio',
      'Enviar depoimento de cliente'
    ]
  },
  {
    name: 'Encantamento',
    icon: Heart,
    color: '#FF6B9D',
    items: [
      'Enviar presente personalizado',
      'Enviar cartão de aniversário',
      'Enviar mensagem de parabéns por conquista',
      'Fazer convite para almoço/café',
      'Enviar lembrança de evento',
      'Enviar voucher/desconto exclusivo',
      'Fazer surprise & delight',
      'Enviar agradecimento personalizado',
      'Compartilhar algo de interesse pessoal',
      'Enviar convite VIP'
    ]
  },
  {
    name: 'Descoberta',
    icon: Sparkles,
    color: '#FFD93D',
    items: [
      'Pesquisar sobre a empresa',
      'Identificar dores e necessidades',
      'Mapear stakeholders',
      'Analisar concorrência',
      'Pesquisar histórico de compras',
      'Identificar projetos em andamento',
      'Pesquisar notícias recentes',
      'Analisar presença digital',
      'Identificar budget disponível',
      'Mapear processo de compra',
      'Pesquisar tecnologias utilizadas'
    ]
  },
  {
    name: 'Engajamento',
    icon: TrendingUp,
    color: '#6BCF7F',
    items: [
      'Enviar vídeo personalizado',
      'Fazer ligação telefônica',
      'Agendar reunião de descoberta',
      'Enviar email personalizado',
      'Fazer follow-up de interação',
      'Enviar pesquisa/questionário',
      'Compartilhar demo personalizada',
      'Fazer apresentação de solução',
      'Enviar proposta de valor',
      'Realizar diagnóstico gratuito',
      'Fazer consultoria gratuita'
    ]
  },
  {
    name: 'Negociação',
    icon: FileText,
    color: '#4A90E2',
    items: [
      'Enviar proposta comercial',
      'Negociar condições',
      'Enviar contrato',
      'Fazer apresentação de pricing',
      'Enviar ROI personalizado',
      'Negociar prazo de pagamento',
      'Fazer trial/piloto',
      'Enviar referências',
      'Negociar escopo',
      'Fazer reunião de fechamento',
      'Enviar garantias',
      'Resolver objeções'
    ]
  },
  {
    name: 'Outros',
    icon: Mail,
    color: '#9E9E9E',
    items: [
      'Ação personalizada',
      'Follow-up genérico',
      'Email informativo',
      'Ligação de check-in',
      'Enviar documentação',
      'Fazer update de status',
      'Enviar lembrete',
      'Compartilhar novidade'
    ]
  }
];

export function TouchpointCreationModal({ isOpen, onClose, onCreateTouchpoint, insertPosition }: TouchpointCreationModalProps) {
  const [step, setStep] = useState<'select-type' | 'create-item'>('select-type');
  const [selectedItemType, setSelectedItemType] = useState<'touchpoint' | 'task'>('touchpoint');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // Estados para o formulário customizado
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('Outros');
  const [customWeight, setCustomWeight] = useState('');

  if (!isOpen) return null;

  const handleCloseModal = () => {
    setStep('select-type');
    setSelectedItemType('touchpoint');
    setSearchQuery('');
    setShowCustomForm(false);
    setSelectedFilters([]);
    setCustomTitle('');
    setCustomCategory('Outros');
    setCustomWeight('');
    onClose();
  };

  const toggleFilter = (categoryName: string) => {
    // Se for "Outros", mostrar o formulário customizado
    if (categoryName === 'Outros') {
      setShowCustomForm(true);
      setSelectedFilters(['Outros']);
      return;
    }

    // Permite apenas um filtro selecionado por vez
    setSelectedFilters(prev =>
      prev.includes(categoryName)
        ? [] // Se já está selecionado, desmarcar
        : [categoryName] // Substitui qualquer seleção anterior por apenas este
    );
    setShowCustomForm(false);
  };

  const handleCreateCustomTouchpoint = () => {
    if (!customTitle.trim()) return;

    // Determinar o tipo baseado na categoria selecionada e itemType
    let type = 'OUTROS';
    
    if (selectedItemType === 'task') {
      type = 'TASKPOINT';
    } else {
      if (customCategory === 'Autoridade') {
        type = 'AUTORIDADE';
      } else if (customCategory === 'Encantamento') {
        type = 'ENCANTAMENTO';
      } else if (customCategory === 'Descoberta') {
        type = 'DESCOBERTA';
      } else if (customCategory === 'Engajamento') {
        type = 'ATENÇÃO';
      } else if (customCategory === 'Negociação') {
        type = 'NEGOCIAÇÃO';
      } else if (customCategory === 'Relacionamento') {
        type = 'RELACIONAMENTO';
      }
    }

    onCreateTouchpoint({
      type,
      title: customTitle,
      category: customCategory,
      weight: customWeight || undefined,
      insertPosition: insertPosition || undefined,
      itemType: selectedItemType
    });

    // Reset form
    setCustomTitle('');
    setCustomCategory('Outros');
    setCustomWeight('');
    setShowCustomForm(false);
    handleCloseModal();
  };

  const toggleCategory = (categoryName: string) => {
    // Se for "Outros", abrir o modal customizado diretamente
    if (categoryName === 'Outros') {
      setShowCustomForm(true);
      setSelectedFilters(['Outros']);
      return;
    }
    
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleSelectTouchpoint = (category: string, item: string) => {
    // Não fazer nada se for categoria "Outros" (o modal será aberto pelo toggleCategory)
    if (category === 'Outros') {
      return;
    }

    // Determinar o tipo baseado na categoria
    let type = 'ATENÇÃO';
    if (category === 'Autoridade') {
      type = 'AUTORIDADE';
    } else if (category === 'Encantamento') {
      type = 'ENCANTAMENTO';
    } else if (category === 'Descoberta') {
      type = 'DESCOBERTA';
    } else if (category === 'Engajamento') {
      type = 'ATENÇÃO';
    } else if (category === 'Negociação') {
      type = 'NEGOCIAÇÃO';
    } else if (category === 'Relacionamento') {
      type = 'RELACIONAMENTO';
    }

    onCreateTouchpoint({
      type,
      title: item,
      category,
      insertPosition: insertPosition || undefined,
      itemType: selectedItemType
    });
    handleCloseModal();
  };

  // Flatten all items with category info
  const allTouchpoints = TOUCHPOINT_CATEGORIES.flatMap(category =>
    category.items.map(item => ({
      name: item,
      category: category.name,
      icon: category.icon,
      color: category.color
    }))
  );

  // Filter touchpoints based on search and selected filters
  const filteredTouchpoints = allTouchpoints.filter(touchpoint => {
    const matchesSearch = 
      touchpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      touchpoint.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      selectedFilters.length === 0 || 
      selectedFilters.includes(touchpoint.category);

    return matchesSearch && matchesFilter;
  });

  // Step 1: Select Type (touchpoint or task)
  if (step === 'select-type') {
    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleCloseModal}
        />

        {/* Modal */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[600px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-[#212a46]">Criar Novo Item</h2>
            <button
              onClick={handleCloseModal}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Type Selection */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 mb-6">Escolha o tipo de item que deseja criar:</p>
            
            {/* Touchpoint Option */}
            <button
              onClick={() => {
                setSelectedItemType('touchpoint');
                setStep('create-item');
              }}
              className="w-full flex items-start gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-[#4a90e2] hover:bg-[#f0f7ff] transition-all group"
            >
              <div className="w-14 h-14 bg-[#4a90e2]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#4a90e2]/20 transition-colors">
                <MessageCircle className="w-7 h-7 text-[#4a90e2]" strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-bold text-[#212a46] mb-1">Touchpoint</h3>
                <p className="text-sm text-gray-600">
                  Interações com o cliente, como emails, ligações, reuniões e outros contatos diretos.
                </p>
              </div>
            </button>

            {/* Task Option */}
            <button
              onClick={() => {
                setSelectedItemType('task');
                setStep('create-item');
              }}
              className="w-full flex items-start gap-4 p-5 border-2 border-gray-200 rounded-xl hover:border-[#6BCF7F] hover:bg-[#f0fff4] transition-all group"
            >
              <div className="w-14 h-14 bg-[#6BCF7F]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#6BCF7F]/20 transition-colors">
                <CheckSquare className="w-7 h-7 text-[#6BCF7F]" strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base font-bold text-[#212a46] mb-1">Taskpoint Interna</h3>
                <p className="text-sm text-gray-600">
                  Ações internas da equipe que não envolvem contato direto com o cliente, como pesquisas, preparações e análises.
                </p>
              </div>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Step 2: Create Item
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={handleCloseModal}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[600px] max-h-[700px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('select-type')}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-gray-500 rotate-90" />
            </button>
            <h2 className="text-lg font-bold text-[#212a46]">
              {selectedItemType === 'touchpoint' ? 'Criar Touchpoint' : 'Criar Taskpoint Interna'}
            </h2>
          </div>
          <button
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={selectedItemType === 'touchpoint' ? 'Buscar touchpoint...' : 'Buscar taskpoint...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
            />
          </div>

          {/* Category Filters - Only for touchpoints */}
          {selectedItemType === 'touchpoint' && (
            <div className="flex flex-wrap gap-2">
              {TOUCHPOINT_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedFilters.includes(category.name);

                return (
                  <button
                    key={category.name}
                    onClick={() => toggleFilter(category.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: isSelected ? category.color : undefined,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {selectedItemType === 'task' || showCustomForm ? (
            /* Custom Form (for tasks or custom touchpoints) */
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedItemType === 'touchpoint' ? 'Título do Touchpoint' : 'Título da Taskpoint'}
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={selectedItemType === 'touchpoint' ? 'Ex: Enviar proposta personalizada' : 'Ex: Pesquisar sobre a empresa'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                />
              </div>

              {selectedItemType === 'touchpoint' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Categoria</label>
                    <div className="grid grid-cols-2 gap-3">
                      {TOUCHPOINT_CATEGORIES.filter(cat => cat.name !== 'Outros').map((category) => {
                        const Icon = category.icon;
                        const isSelected = customCategory === category.name;

                        return (
                          <button
                            key={category.name}
                            onClick={() => setCustomCategory(category.name)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-[#4a90e2] bg-[#4a90e2]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: category.color + '20' }}
                            >
                              <Icon
                                className="w-4 h-4"
                                style={{ color: category.color }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{category.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Peso (opcional)</label>
                    <select
                      value={customWeight}
                      onChange={(e) => setCustomWeight(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
                    >
                      <option value="">Selecione um peso</option>
                      <option value="Muito Baixo">Muito Baixo</option>
                      <option value="Baixo">Baixo</option>
                      <option value="Médio">Médio</option>
                      <option value="Alto">Alto</option>
                      <option value="Muito Alto">Muito Alto</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={handleCreateCustomTouchpoint}
                disabled={!customTitle.trim()}
                className="w-full bg-[#4a90e2] text-white py-3 px-4 rounded-lg hover:bg-[#3a79c0] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {selectedItemType === 'touchpoint' ? 'Criar Touchpoint' : 'Criar Taskpoint'}
              </button>
            </div>
          ) : (
            /* Touchpoints List */
            <>
              <div className="space-y-1">
                {filteredTouchpoints.map((touchpoint, index) => {
                  const Icon = touchpoint.icon;

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectTouchpoint(touchpoint.category, touchpoint.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: touchpoint.color + '20' }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: touchpoint.color }}
                        />
                      </div>
                      <span className="flex-1 text-left text-sm text-gray-700 group-hover:text-[#4a90e2]">{touchpoint.name}</span>
                      <span 
                        className="text-xs font-medium px-2 py-1 rounded"
                        style={{ 
                          backgroundColor: touchpoint.color + '15',
                          color: touchpoint.color
                        }}
                      >
                        {touchpoint.category}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredTouchpoints.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum touchpoint encontrado</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}