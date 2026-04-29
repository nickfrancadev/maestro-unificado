import { useState } from 'react';
import { X, Users, Target, Heart, Sparkles, TrendingUp, FileText } from 'lucide-react';

interface CustomTouchpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTouchpoint: (touchpoint: {
    type: string;
    title: string;
    category: string;
    weight: string;
  }) => void;
}

const CATEGORIES = [
  { name: 'Relacionamento', icon: Users, color: '#FF9B83' },
  { name: 'Autoridade', icon: Target, color: '#C8E6C9' },
  { name: 'Encantamento', icon: Heart, color: '#FF6B9D' },
  { name: 'Descoberta', icon: Sparkles, color: '#FFD93D' },
  { name: 'Engajamento', icon: TrendingUp, color: '#6BCF7F' },
  { name: 'Negociação', icon: FileText, color: '#4A90E2' }
];

const WEIGHTS = [
  'Muito Baixo',
  'Baixo',
  'Médio',
  'Acima da média',
  'Alto',
  'Muito Alto'
];

export function CustomTouchpointModal({ isOpen, onClose, onCreateTouchpoint }: CustomTouchpointModalProps) {
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<string>('Muito Baixo');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim() || !selectedCategory) {
      return;
    }

    // Determinar o tipo baseado na categoria selecionada
    let type = 'ATENÇÃO';
    if (selectedCategory === 'Autoridade') {
      type = 'AUTORIDADE';
    } else if (selectedCategory === 'Encantamento') {
      type = 'ENCANTAMENTO';
    } else if (selectedCategory === 'Descoberta') {
      type = 'DESCOBERTA';
    } else if (selectedCategory === 'Engajamento') {
      type = 'ATENÇÃO';
    } else if (selectedCategory === 'Negociação') {
      type = 'NEGOCIAÇÃO';
    } else if (selectedCategory === 'Relacionamento') {
      type = 'RELACIONAMENTO';
    }

    onCreateTouchpoint({
      type,
      title: title.trim(),
      category: selectedCategory,
      weight: selectedWeight
    });

    // Reset form
    setTitle('');
    setSelectedCategory('');
    setSelectedWeight('Muito Baixo');
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#212a46]">Outros</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-semibold text-[#212a46] mb-2">
              Título do touchpoint
            </label>
            <input
              type="text"
              placeholder="Nome do touchpoint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#212a46] mb-3">
              Selecione uma categoria
            </label>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.name;

                return (
                  <button
                    key={category.name}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[#4a90e2] bg-[#4a90e2]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: category.color }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weight Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#212a46] mb-3">
              Defina um peso para o Touch
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Você pode alterar o peso dos touchpoints conforme a relevância e impacto que eles tem na sua estratégia.
            </p>
            <div className="relative">
              <select
                value={selectedWeight}
                onChange={(e) => setSelectedWeight(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent bg-white cursor-pointer"
              >
                {WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !selectedCategory}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
              title.trim() && selectedCategory
                ? 'bg-[#4a90e2] text-white hover:bg-[#357abd]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Concluir
          </button>
        </div>
      </div>
    </>
  );
}
