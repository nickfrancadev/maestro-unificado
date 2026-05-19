import { useState } from 'react';
import { X, MessageCircle, CheckSquare, Users, Target, Heart, Sparkles, TrendingUp, FileText, Mail, ChevronDown, Search, Activity, BarChart2, ClipboardCheck, BookOpen } from 'lucide-react';

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
    channel?: string;
    date?: string;
    responsibles?: string[];
  }) => void;
  insertPosition?: number | null;
}

const TOUCHPOINT_CATEGORIES = [
  { name: 'Relacionamento', icon: Users, color: '#FF9B83' },
  { name: 'Autoridade', icon: Target, color: '#C8E6C9' },
  { name: 'Encantamento', icon: Heart, color: '#FF6B9D' },
  { name: 'Descoberta', icon: Sparkles, color: '#FFD93D' },
  { name: 'Engajamento', icon: TrendingUp, color: '#6BCF7F' },
  { name: 'Negociação', icon: FileText, color: '#4A90E2' },
  { name: 'Outros', icon: Mail, color: '#9E9E9E' },
];

const TASK_CATEGORIES = [
  { name: 'Pesquisa', icon: Search, color: '#4A90E2' },
  { name: 'Atividade', icon: Activity, color: '#6BCF7F' },
  { name: 'Análise', icon: BarChart2, color: '#FFD93D' },
  { name: 'Documentação', icon: BookOpen, color: '#FF9B83' },
  { name: 'Reunião Interna', icon: Users, color: '#BA68C8' },
  { name: 'Revisão', icon: ClipboardCheck, color: '#FF6B9D' },
];

const CHANNELS = [
  'LinkedIn', 'Email', 'WhatsApp', 'Telefone', 'Reunião Presencial',
  'Videoconferência', 'Instagram', 'Twitter / X', 'Outro',
];

const TEAM_MEMBERS = [
  'João Silva', 'Maria Santos', 'Carlos Mendes', 'Pedro Costa',
  'Ana Lima', 'Rafael Oliveira', 'Fernanda Souza',
];

function categoryToType(category: string): string {
  const map: Record<string, string> = {
    'Autoridade': 'AUTORIDADE',
    'Encantamento': 'ENCANTAMENTO',
    'Descoberta': 'DESCOBERTA',
    'Engajamento': 'ATENÇÃO',
    'Negociação': 'NEGOCIAÇÃO',
    'Relacionamento': 'RELACIONAMENTO',
    'Outros': 'OUTROS',
  };
  return map[category] || 'OUTROS';
}

export function TouchpointCreationModal({ isOpen, onClose, onCreateTouchpoint, insertPosition }: TouchpointCreationModalProps) {
  const [itemType, setItemType] = useState<'touchpoint' | 'task'>('touchpoint');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Engajamento');
  const [taskCategory, setTaskCategory] = useState('Atividade');
  const [channel, setChannel] = useState('');
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('Médio');
  const [responsibleInput, setResponsibleInput] = useState('');
  const [responsibles, setResponsibles] = useState<string[]>([]);
  const [showResponsiblesDropdown, setShowResponsiblesDropdown] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setItemType('touchpoint');
    setTitle('');
    setCategory('Engajamento');
    setTaskCategory('Atividade');
    setChannel('');
    setDate('');
    setWeight('Médio');
    setResponsibles([]);
    setResponsibleInput('');
    onClose();
  };

  const toggleResponsible = (member: string) => {
    setResponsibles(prev =>
      prev.includes(member) ? prev.filter(r => r !== member) : [...prev, member]
    );
  };

  const handleCreate = () => {
    if (!title.trim()) return;

    const type = itemType === 'task' ? 'TASKPOINT' : categoryToType(category);
    const finalCategory = itemType === 'task' ? taskCategory : category;

    onCreateTouchpoint({
      type,
      title: title.trim(),
      category: finalCategory,
      weight: weight || undefined,
      insertPosition: insertPosition || undefined,
      itemType,
      channel: itemType === 'touchpoint' ? channel : undefined,
      date: date || undefined,
      responsibles: responsibles.length > 0 ? responsibles : undefined,
    });

    handleClose();
  };

  const filteredMembers = TEAM_MEMBERS.filter(m =>
    m.toLowerCase().includes(responsibleInput.toLowerCase())
  );

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-[560px] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-[#212a46]">Novo Item</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toggle */}
        <div className="px-6 pt-5 shrink-0">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setItemType('touchpoint')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                itemType === 'touchpoint'
                  ? 'bg-white text-[#4a90e2] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Touchpoint
            </button>
            <button
              onClick={() => setItemType('task')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                itemType === 'task'
                  ? 'bg-white text-[#6BCF7F] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Taskpoint Interna
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={itemType === 'touchpoint' ? 'Ex: Enviar proposta personalizada' : 'Ex: Pesquisar sobre a empresa'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
            />
          </div>

          {/* Categoria (só para taskpoint) - abaixo do título */}
          {itemType === 'task' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tipo / Categoria
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TASK_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = taskCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setTaskCategory(cat.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                        isSelected ? 'border-[#4a90e2] bg-[#4a90e2]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color + '25' }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      </div>
                      <span className={`font-medium truncate ${isSelected ? 'text-[#4a90e2]' : 'text-gray-700'}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Categoria (só para touchpoint) */}
          {itemType === 'touchpoint' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Tipo / Categoria
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TOUCHPOINT_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setCategory(cat.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                        isSelected ? 'border-[#4a90e2] bg-[#4a90e2]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color + '25' }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      </div>
                      <span className={`font-medium truncate ${isSelected ? 'text-[#4a90e2]' : 'text-gray-700'}`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Canal (só para touchpoint) */}
          {itemType === 'touchpoint' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Canal
              </label>
              <div className="relative">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent appearance-none bg-white"
                >
                  <option value="">Selecione um canal</option>
                  {CHANNELS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Data e Peso em linha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Data prevista
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Peso
              </label>
              <div className="relative">
                <select
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent appearance-none bg-white"
                >
                  <option value="Muito Baixo">Muito Baixo</option>
                  <option value="Baixo">Baixo</option>
                  <option value="Médio">Médio</option>
                  <option value="Alto">Alto</option>
                  <option value="Muito Alto">Muito Alto</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Responsáveis */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Responsáveis
            </label>
            {/* Selected chips */}
            {responsibles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {responsibles.map(r => (
                  <span
                    key={r}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#4a90e2]/10 text-[#4a90e2] rounded-full text-xs font-medium"
                  >
                    {r}
                    <button onClick={() => toggleResponsible(r)} className="hover:text-red-400 transition-colors ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={responsibleInput}
                onChange={(e) => setResponsibleInput(e.target.value)}
                onFocus={() => setShowResponsiblesDropdown(true)}
                onBlur={() => setTimeout(() => setShowResponsiblesDropdown(false), 150)}
                placeholder="Buscar membro da equipe..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] focus:border-transparent"
              />
              {showResponsiblesDropdown && filteredMembers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {filteredMembers.map(member => (
                    <button
                      key={member}
                      onMouseDown={() => toggleResponsible(member)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between transition-colors ${
                        responsibles.includes(member) ? 'text-[#4a90e2] bg-[#4a90e2]/5' : 'text-gray-700'
                      }`}
                    >
                      <span>{member}</span>
                      {responsibles.includes(member) && (
                        <span className="text-xs text-[#4a90e2] font-medium">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              itemType === 'touchpoint'
                ? 'bg-[#4a90e2] hover:bg-[#3a79c0]'
                : 'bg-[#6BCF7F] hover:bg-[#57be6d]'
            }`}
          >
            {itemType === 'touchpoint' ? 'Criar Touchpoint' : 'Criar Taskpoint'}
          </button>
        </div>
      </div>
    </>
  );
}