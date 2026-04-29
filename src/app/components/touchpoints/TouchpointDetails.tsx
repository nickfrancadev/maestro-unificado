import { useState, useEffect, useRef } from 'react';
import { Archive, Copy, Edit3, Plus, FileText, ClipboardCheck, MessageCircle, CheckSquare, Users, Target, Heart, Sparkles, TrendingUp, Mail, Search, Activity, BarChart2, BookOpen, ChevronDown, X } from 'lucide-react';
import type { Touchpoint } from './TouchpointTimeline';

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

const CHANNELS = ['LinkedIn', 'Email', 'WhatsApp', 'Telefone', 'Reunião Presencial', 'Videoconferência', 'Instagram', 'Twitter / X', 'Outro'];
const TEAM_MEMBERS = ['João Silva', 'Maria Santos', 'Carlos Mendes', 'Pedro Costa', 'Ana Lima', 'Rafael Oliveira', 'Fernanda Souza'];

function categoryToType(category: string): Touchpoint['type'] {
  const map: Record<string, Touchpoint['type']> = {
    'Autoridade': 'AUTORIDADE',
    'Encantamento': 'ATENÇÃO',
    'Descoberta': 'INTERESSE',
    'Engajamento': 'ATENÇÃO',
    'Negociação': 'AÇÃO',
    'Relacionamento': 'ATENÇÃO',
    'Outros': 'ATENÇÃO',
  };
  return map[category] || 'ATENÇÃO';
}

interface TouchpointDetailsProps {
  touchpoint: Touchpoint;
  onUpdate: (touchpoint: Touchpoint) => void;
  layoutOrientation: 'vertical' | 'horizontal';
  onConfirmDraft?: (touchpoint: Touchpoint) => void;
  onCancelDraft?: () => void;
}

export function TouchpointDetails({ touchpoint, onUpdate, layoutOrientation, onConfirmDraft, onCancelDraft }: TouchpointDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionedContacts, setMentionedContacts] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Draft-mode state
  const [draftItemType, setDraftItemType] = useState<'touchpoint' | 'task'>('touchpoint');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState('Engajamento');
  const [draftTaskCategory, setDraftTaskCategory] = useState('Atividade');
  const [draftChannel, setDraftChannel] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftWeight, setDraftWeight] = useState<Touchpoint['weight']>('Médio');
  const [draftResponsibles, setDraftResponsibles] = useState<string[]>([]);
  const [draftResponsibleInput, setDraftResponsibleInput] = useState('');
  const [showResponsibleDropdown, setShowResponsibleDropdown] = useState(false);
  const [draftDescription, setDraftDescription] = useState('');
  const [draftSubtasks, setDraftSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [draftSubtaskInput, setDraftSubtaskInput] = useState('');
  const [draftExecutionDate, setDraftExecutionDate] = useState('');
  const [draftCompletionDate, setDraftCompletionDate] = useState('');
  const [draftBudget, setDraftBudget] = useState('');
  const [draftContactIds, setDraftContactIds] = useState<string[]>([]);
  const [draftContactSearch, setDraftContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const draftTitleRef = useRef<HTMLInputElement>(null);

  const isDraft = !!touchpoint.isDraft;
  const isTask = isDraft ? draftItemType === 'task' : touchpoint.itemType === 'task';

  // Reset draft state whenever a new draft touchpoint is selected
  useEffect(() => {
    if (isDraft) {
      setDraftItemType('touchpoint');
      setDraftTitle('');
      setDraftCategory('Engajamento');
      setDraftTaskCategory('Atividade');
      setDraftChannel('');
      setDraftDate('');
      setDraftWeight('Médio');
      setDraftResponsibles([]);
      setDraftResponsibleInput('');
      setDraftDescription('');
      setDraftSubtasks([]);
      setDraftSubtaskInput('');
      setDraftExecutionDate('');
      setDraftCompletionDate('');
      setDraftBudget('');
      setDraftContactIds([]);
      setDraftContactSearch('');
      setIsExpanded(true);
      setTimeout(() => draftTitleRef.current?.focus(), 50);
    }
  }, [touchpoint.id, isDraft]);

  const toggleDraftResponsible = (member: string) => {
    setDraftResponsibles(prev =>
      prev.includes(member) ? prev.filter(r => r !== member) : [...prev, member]
    );
  };

  const filteredDraftMembers = TEAM_MEMBERS.filter(m =>
    m.toLowerCase().includes(draftResponsibleInput.toLowerCase()) && !draftResponsibles.includes(m)
  );

  const handleDraftSubmit = () => {
    if (!draftTitle.trim()) { draftTitleRef.current?.focus(); return; }
    const type = draftItemType === 'task' ? 'TAREFA' : categoryToType(draftCategory);
    let formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    if (draftDate) {
      const d = new Date(draftDate + 'T12:00:00');
      formattedDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    }
    onConfirmDraft?.({
      ...touchpoint,
      itemType: draftItemType,
      type,
      title: draftTitle.trim(),
      category: draftItemType === 'task' ? draftTaskCategory : draftCategory,
      channel: draftItemType === 'task' ? '-' : (draftChannel || 'LinkedIn'),
      date: formattedDate,
      weight: draftWeight,
      responsibles: draftResponsibles,
      isDraft: false,
      description: draftDescription,
      subtasks: draftSubtasks,
      executionDate: draftExecutionDate,
      completionDate: draftCompletionDate,
      budget: draftBudget ? parseFloat(draftBudget) : undefined,
      contactIds: draftContactIds,
    });
  };

  // ── Non-draft helpers ──────────────────────────────────────────────────────
  const availableContacts = [
    { id: '1', name: 'João Silva', initials: 'JS', color: '#4a90e2' },
    { id: '2', name: 'Maria Santos', initials: 'MS', color: '#ff9b83' },
    { id: '3', name: 'Pedro Oliveira', initials: 'PO', color: '#81c784' },
    { id: '4', name: 'Ana Costa', initials: 'AC', color: '#ba68c8' },
    { id: '5', name: 'Carlos Mendes', initials: 'CM', color: '#ff7043' },
  ];

  const filteredContacts = availableContacts.filter(contact =>
    contact.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNoteText(text);
    setCursorPosition(cursorPos);
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  };

  const handleSelectContact = (contact: typeof availableContacts[0]) => {
    const textBeforeCursor = noteText.slice(0, cursorPosition);
    const textAfterCursor = noteText.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = noteText.slice(0, lastAtIndex) + `@${contact.name} ` + textAfterCursor;
    setNoteText(newText);
    setShowMentionDropdown(false);
    setMentionSearch('');
    if (!mentionedContacts.includes(contact.id)) {
      setMentionedContacts([...mentionedContacts, contact.id]);
    }
  };

  const getTypeStyle = (type: string, itemType?: string) => {
    if (itemType === 'task') return { bg: 'bg-[#e8f5e9]', text: 'text-[#2e7d32]', iconBg: 'bg-[#81c784]' };
    switch (type) {
      case 'AUTORIDADE': return { bg: 'bg-[#c8e6c9]', text: 'text-[#2e7d32]', iconBg: 'bg-[#81c784]' };
      case 'ATENÇÃO': return { bg: 'bg-[#ff9b83]', text: 'text-white', iconBg: 'bg-[#ff9b83]' };
      default: return { bg: 'bg-gray-300', text: 'text-gray-700', iconBg: 'bg-gray-400' };
    }
  };

  const handleToggleInteraction = (index: number) => {
    const updatedInteractions = [...touchpoint.interactions];
    updatedInteractions[index].selected = !updatedInteractions[index].selected;
    onUpdate({ ...touchpoint, interactions: updatedInteractions });
  };

  const typeStyle = getTypeStyle(touchpoint.type, touchpoint.itemType);

  const getIcon = () => {
    if (isDraft ? draftItemType === 'task' : touchpoint.itemType === 'task') {
      return <ClipboardCheck className="w-8 h-8 text-white" strokeWidth={2} />;
    }
    return <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />;
  };

  const draftCats = draftItemType === 'task' ? TASK_CATEGORIES : TOUCHPOINT_CATEGORIES;
  const draftSelectedCat = draftItemType === 'task' ? draftTaskCategory : draftCategory;
  const setDraftSelectedCat = draftItemType === 'task' ? setDraftTaskCategory : setDraftCategory;
  const draftIconBg = draftItemType === 'task' ? 'bg-[#81c784]' : 'bg-[#4a90e2]';

  return (
    <div className="flex-1 overflow-y-auto bg-[#edf2f5]">
      <div className="bg-[#212a46] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDraft ? (
            <h2 className="text-white text-base font-bold">Novo Item</h2>
          ) : (
            <>
              <h2 className="text-white text-base font-bold">Em andamento</h2>
              {!isExpanded && <span className="text-xs text-white/60 font-normal">(colapsado)</span>}
            </>
          )}
        </div>
        {isDraft ? (
          <button
            onClick={() => onCancelDraft?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-white/40 rounded text-white/70 text-xs hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        ) : (
          <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-white rounded text-white text-xs hover:bg-white/10 transition-colors">
            <Archive className="w-3.5 h-3.5" />
            <span className="font-bold">Arquivar</span>
          </button>
        )}
      </div>

      <div className="p-4 max-w-6xl mx-auto overflow-y-auto max-h-[calc(100vh-180px)]">
        {/* Main card */}
        <div className="bg-white rounded-lg p-4 mb-3">
          {/* Header */}
          <div className={`flex items-center gap-3 mb-6 ${isExpanded ? 'pb-6 border-b border-gray-200' : ''}`}>
            {!isDraft && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0 group"
                title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
              >
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform duration-300 group-hover:text-gray-900 ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            )}

            <div className={`w-[60px] h-[60px] ${isDraft ? draftIconBg : typeStyle.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
              {isDraft ? (
                /* Draft: toggle Touchpoint / Tarefa */
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 mb-2 w-fit">
                  <button
                    onClick={() => setDraftItemType('touchpoint')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${draftItemType === 'touchpoint' ? 'bg-white text-[#4a90e2] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Touchpoint
                  </button>
                  <button
                    onClick={() => setDraftItemType('task')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${draftItemType === 'task' ? 'bg-white text-[#6BCF7F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Taskpoint
                  </button>
                </div>
              ) : (
                /* Read: type badge */
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold mb-1.5 ${typeStyle.bg} ${typeStyle.text}`}>
                  {touchpoint.itemType === 'task' ? (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <path d="M9 14l2 2 4-4"/>
                      </svg>
                      TAREFA INTERNA
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {touchpoint.type}
                    </>
                  )}
                </div>
              )}

              {/* Title */}
              {isDraft ? (
                <input
                  ref={draftTitleRef}
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleDraftSubmit()}
                  placeholder={draftItemType === 'touchpoint' ? 'Ex: Enviar proposta personalizada...' : 'Ex: Pesquisar sobre a empresa...'}
                  className="w-full text-lg font-bold text-[#212a46] border-b-2 border-[#4a90e2] outline-none bg-transparent pb-1 placeholder:text-gray-300 placeholder:font-normal"
                />
              ) : (
                <h3 className="text-lg font-bold text-[#212a46]">{touchpoint.title}</h3>
              )}
            </div>

            {isDraft ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onCancelDraft?.()}
                  className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDraftSubmit}
                  disabled={!draftTitle.trim()}
                  className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${draftItemType === 'touchpoint' ? 'bg-[#4a90e2] hover:bg-[#3a79c0]' : 'bg-[#6BCF7F] hover:bg-[#57be6d]'}`}
                >
                  {draftItemType === 'touchpoint' ? 'Criar Touchpoint' : 'Criar Tarefa'}
                </button>
              </div>
            ) : (
              <>
                <button className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0">
                  <Edit3 className="w-4 h-4 text-gray-600" />
                </button>
                {touchpoint.itemType !== 'task' && (
                  <div className="text-center flex-shrink-0 ml-2 px-2 py-1">
                    <div className="text-2xl font-bold text-[#212a46]">{touchpoint.score}</div>
                    <div className="text-[9px] text-gray-500">Score do Touch</div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Expandable Content */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {isDraft ? (
              /* ── Draft fields ─────────────────────────────────────────── */
              <div className="space-y-5">
                {/* Categoria */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Tipo / Categoria
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {draftCats.filter(cat => cat.name !== 'Outros').map(cat => {
                      const Icon = cat.icon;
                      const isSelected = draftSelectedCat === cat.name;
                      return (
                        <button
                          key={cat.name}
                          onClick={() => setDraftSelectedCat(cat.name)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${isSelected ? 'border-[#4a90e2] bg-[#4a90e2]/5' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '25' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                          </div>
                          <span className={`font-medium truncate text-xs ${isSelected ? 'text-[#4a90e2]' : 'text-gray-700'}`}>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Canal, Responsáveis e Peso — mesma linha */}
                <div className={`grid gap-4 ${draftItemType === 'touchpoint' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {/* Canal (só touchpoint) */}
                  {draftItemType === 'touchpoint' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Canal</label>
                      <div className="relative">
                        <select
                          value={draftChannel}
                          onChange={e => setDraftChannel(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] appearance-none bg-white"
                        >
                          <option value="">Selecione um canal</option>
                          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Responsáveis */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Responsáveis</label>
                    {draftResponsibles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {draftResponsibles.map(r => (
                          <span key={r} className="flex items-center gap-1 px-2 py-0.5 bg-[#4a90e2]/10 text-[#4a90e2] rounded-full text-xs font-medium">
                            {r}
                            <button onClick={() => toggleDraftResponsible(r)} className="hover:text-red-400 transition-colors">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        value={draftResponsibleInput}
                        onChange={e => setDraftResponsibleInput(e.target.value)}
                        onFocus={() => setShowResponsibleDropdown(true)}
                        onBlur={() => setTimeout(() => setShowResponsibleDropdown(false), 150)}
                        placeholder="Buscar membro..."
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2]"
                      />
                      {showResponsibleDropdown && filteredDraftMembers.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {filteredDraftMembers.map(member => (
                            <button
                              key={member}
                              onMouseDown={() => { toggleDraftResponsible(member); setDraftResponsibleInput(''); }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-gray-700"
                            >
                              {member}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Peso */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Peso</label>
                    <div className="relative">
                      <select
                        value={draftWeight}
                        onChange={e => setDraftWeight(e.target.value as Touchpoint['weight'])}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] appearance-none bg-white"
                      >
                        {['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'].map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Descrição</label>
                    <button className="flex items-center gap-1 px-2.5 py-1 bg-[#ffece4] text-black rounded text-[11px] font-bold hover:bg-[#ffd7c4] transition-colors">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Pedir para A.I escrever
                    </button>
                  </div>
                  <textarea
                    value={draftDescription}
                    onChange={e => setDraftDescription(e.target.value)}
                    placeholder="Descreva o objetivo e contexto deste item..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2] resize-none"
                  />
                </div>

                {/* Subtarefas */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Subtarefas</label>
                  {draftSubtasks.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {draftSubtasks.map(st => (
                        <div key={st.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => setDraftSubtasks(prev => prev.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s))}
                            className="w-3.5 h-3.5 rounded border-gray-300 accent-[#4a90e2]"
                          />
                          <span className={`flex-1 text-sm ${st.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{st.title}</span>
                          <button
                            onClick={() => setDraftSubtasks(prev => prev.filter(s => s.id !== st.id))}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draftSubtaskInput}
                      onChange={e => setDraftSubtaskInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && draftSubtaskInput.trim()) {
                          setDraftSubtasks(prev => [...prev, { id: Date.now().toString(), title: draftSubtaskInput.trim(), completed: false }]);
                          setDraftSubtaskInput('');
                        }
                      }}
                      placeholder="Adicionar subtarefa e pressionar Enter..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2]"
                    />
                    <button
                      onClick={() => {
                        if (draftSubtaskInput.trim()) {
                          setDraftSubtasks(prev => [...prev, { id: Date.now().toString(), title: draftSubtaskInput.trim(), completed: false }]);
                          setDraftSubtaskInput('');
                        }
                      }}
                      className="px-3 py-2 bg-[#4a90e2] text-white rounded-lg hover:bg-[#3a79c0] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Data de Execução e Conclusão */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Data de Execução</label>
                    <input
                      type="date"
                      value={draftExecutionDate}
                      onChange={e => setDraftExecutionDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Data de Conclusão</label>
                    <input
                      type="date"
                      value={draftCompletionDate}
                      onChange={e => setDraftCompletionDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2]"
                    />
                  </div>
                </div>

                {/* Contatos (só touchpoint) */}
                {draftItemType === 'touchpoint' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Contatos Envolvidos</label>
                    {draftContactIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {draftContactIds.map(cid => {
                          const c = availableContacts.find(x => x.id === cid);
                          if (!c) return null;
                          return (
                            <span key={cid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: c.color }}>
                              <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px] font-bold">{c.initials}</div>
                              {c.name}
                              <button onClick={() => setDraftContactIds(prev => prev.filter(id => id !== cid))} className="hover:opacity-70 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        value={draftContactSearch}
                        onChange={e => setDraftContactSearch(e.target.value)}
                        onFocus={() => setShowContactDropdown(true)}
                        onBlur={() => setTimeout(() => setShowContactDropdown(false), 150)}
                        placeholder="Buscar contato..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2]"
                      />
                      {showContactDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {availableContacts
                            .filter(c => c.name.toLowerCase().includes(draftContactSearch.toLowerCase()) && !draftContactIds.includes(c.id))
                            .map(c => (
                              <button
                                key={c.id}
                                onMouseDown={() => { setDraftContactIds(prev => [...prev, c.id]); setDraftContactSearch(''); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left"
                              >
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0" style={{ backgroundColor: c.color }}>{c.initials}</div>
                                <span className="text-gray-800">{c.name}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Orçamento */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">💰 Orçamento</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftBudget}
                      onChange={e => setDraftBudget(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4a90e2]"
                    />
                  </div>
                </div>

                {/* Botões de confirmação */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => onCancelDraft?.()}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDraftSubmit}
                    disabled={!draftTitle.trim()}
                    className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${draftItemType === 'touchpoint' ? 'bg-[#4a90e2] hover:bg-[#3a79c0]' : 'bg-[#6BCF7F] hover:bg-[#57be6d]'}`}
                  >
                    {draftItemType === 'touchpoint' ? 'Criar Touchpoint' : 'Criar Tarefa'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── Read-only fields ─────────────────────────────────────── */
              <>
                {/* Descrição */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-[#212a46]">Descrição</h4>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffece4] text-black rounded text-xs font-bold hover:bg-[#ffd7c4] transition-colors">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Pedir para A.I escrever
                    </button>
                  </div>
                  <div className="bg-[#f8faff] rounded-lg p-3 border-2 border-[#ebf0fc]">
                    <p className="text-sm text-gray-800 leading-relaxed">{touchpoint.description}</p>
                  </div>
                </div>

                {/* Subtarefas */}
                {touchpoint.subtasks && touchpoint.subtasks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-[#212a46] mb-3">Subtarefas</h4>
                    {touchpoint.subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={subtask.completed} className="w-3.5 h-3.5 rounded border-gray-300" readOnly />
                        <span className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>{subtask.title}</span>
                      </div>
                    ))}
                    <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Nova subtarefa
                    </button>
                  </div>
                )}

                {/* Anexos */}
                {touchpoint.attachments && touchpoint.attachments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-[#212a46] mb-3">📎 Anexos</h4>
                    {touchpoint.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg mb-2">
                        <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-xs text-gray-900">{attachment.name}</div>
                          <div className="text-[10px] text-gray-500">{attachment.addedAt}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">Evoluir</button>
                          <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">Download</button>
                        </div>
                      </div>
                    ))}
                    <button className="text-xs text-gray-600 hover:text-gray-900 transition-colors">Adicionar um anexo</button>
                  </div>
                )}

                {/* Notas e Histórico */}
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-[#212a46] mb-3">📝 Notas e Histórico</h4>
                  <div className="space-y-2 mb-3">
                    <div className="bg-[#f8faff] rounded-lg p-3 border border-[#e3ecf7]">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#4a90e2] flex items-center justify-center text-[9px] text-white font-bold">JD</div>
                          <span className="text-xs font-bold text-[#212a46]">João Silva</span>
                        </div>
                        <span className="text-[10px] text-gray-500">Hoje às 14:30</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">Cliente demonstrou interesse no produto premium. Agendada reunião de apresentação para próxima semana.</p>
                    </div>
                    <div className="bg-[#f8faff] rounded-lg p-3 border border-[#e3ecf7]">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#ff9b83] flex items-center justify-center text-[9px] text-white font-bold">MS</div>
                          <span className="text-xs font-bold text-[#212a46]">Maria Santos</span>
                        </div>
                        <span className="text-[10px] text-gray-500">Ontem às 16:45</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">Primeiro contato realizado via LinkedIn. Prospect abriu a mensagem mas ainda não respondeu.</p>
                    </div>
                  </div>
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-[#4a90e2] transition-colors">
                    <textarea
                      placeholder="Adicionar uma nova nota sobre esta ação... (use @ para mencionar contatos)"
                      className="w-full text-xs text-gray-800 bg-transparent border-none outline-none resize-none"
                      rows={3}
                      value={noteText}
                      onChange={handleNoteChange}
                    />
                    {showMentionDropdown && filteredContacts.length > 0 && (
                      <div className="absolute left-3 right-3 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {filteredContacts.map((contact) => (
                          <button key={contact.id} onClick={() => handleSelectContact(contact)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#f0f7ff] transition-colors text-left">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0" style={{ backgroundColor: contact.color }}>{contact.initials}</div>
                            <span className="text-xs text-gray-800">{contact.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {mentionedContacts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200">
                        <span className="text-[10px] text-gray-500 font-bold">MENCIONADOS:</span>
                        {mentionedContacts.map((contactId) => {
                          const contact = availableContacts.find(c => c.id === contactId);
                          if (!contact) return null;
                          return (
                            <div key={contactId} className="flex items-center gap-1 px-2 py-0.5 bg-[#e3f2fd] rounded-full">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold" style={{ backgroundColor: contact.color }}>{contact.initials}</div>
                              <span className="text-[10px] text-[#212a46] font-medium">{contact.name}</span>
                              <button onClick={() => setMentionedContacts(mentionedContacts.filter(id => id !== contactId))} className="text-gray-500 hover:text-gray-700 text-xs">×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                      <span className="text-[10px] text-gray-500">💡 Use @ para mencionar contatos</span>
                      <button className="px-3 py-1.5 bg-[#4a90e2] text-white rounded text-xs font-bold hover:bg-[#3571de] transition-colors">Adicionar Nota</button>
                    </div>
                  </div>
                </div>

                {/* Orçamento */}
                <div className="mb-0">
                  <h4 className="text-sm font-bold text-[#212a46] mb-3">💰 Orçamento</h4>
                  <div className="bg-[#fff8e1] rounded-lg p-3 border border-[#f5e8c8]">
                    <div className="text-[9px] text-gray-600 font-bold mb-1">ORÇAMENTO TOUCH</div>
                    <div className="text-xl font-bold text-[#212a46]">R$ {(touchpoint.budget ?? 0).toFixed(2)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons Section - Only in read mode */}
        {!isDraft && (
          <div className="bg-white rounded-lg p-4 mb-3">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">DATA DE EXECUÇÃO</div>
                <input
                  type="date"
                  value={touchpoint.executionDate || ''}
                  onChange={(e) => onUpdate({ ...touchpoint, executionDate: e.target.value })}
                  className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button className="w-full py-2 bg-[#5cb85c] text-white rounded font-bold text-[11px] hover:bg-[#4cae4c] transition-colors">
                  {isTask ? 'TAREFA EXECUTADA' : 'TOUCHPOINT EXECUTADO'}
                </button>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">DATA DE FINALIZAÇÃO</div>
                <input
                  type="date"
                  value={touchpoint.completionDate || ''}
                  onChange={(e) => onUpdate({ ...touchpoint, completionDate: e.target.value })}
                  className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button className="w-full py-2 bg-[#3571de] text-white rounded font-bold text-[11px] hover:bg-[#2557b8] transition-colors">
                  {isTask ? 'CONCLUIR TAREFA' : 'CONCLUIR TOUCHPOINT'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {!isTask ? (
                <div>
                  <div className="text-[9px] text-gray-500 font-bold mb-2">CANAL</div>
                  <select
                    value={touchpoint.channel}
                    onChange={(e) => onUpdate({ ...touchpoint, channel: e.target.value })}
                    className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Email">Email</option>
                    <option value="Telefone">Telefone</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </div>
              ) : (
                <div>
                  <div className="text-[9px] text-gray-500 font-bold mb-2">DEPENDÊNCIAS</div>
                  <select className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>1 de 3 selecionadas</option>
                  </select>
                </div>
              )}
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">RESPONSÁVEIS</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#ff9b83] flex items-center justify-center text-[10px] text-white font-bold">JS</div>
                  <button className="p-1 hover:bg-gray-100 rounded"><Plus className="w-4 h-4 text-gray-600" /></button>
                </div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-2">PESO</div>
                <select
                  value={touchpoint.weight}
                  onChange={(e) => onUpdate({ ...touchpoint, weight: e.target.value as any })}
                  className="w-full text-xs font-medium text-[#212a46] border border-gray-300 rounded px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Muito Baixo">Muito Baixo</option>
                  <option value="Baixo">Baixo</option>
                  <option value="Médio">Médio</option>
                  <option value="Acima da média">Acima da média</option>
                  <option value="Alto">Alto</option>
                  <option value="Muito Alto">Muito Alto</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Interações Block - Only for Touchpoints in read mode */}
        {!isDraft && !isTask && touchpoint.interactions && touchpoint.interactions.length > 0 && (
          <div className="bg-white rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-[#212a46]">Interações dos Contatos</h4>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4a90e2] border border-[#4a90e2] rounded hover:bg-[#4a90e2] hover:text-white transition-colors font-medium">
                <Edit3 className="w-3 h-3" />
                Editar contatos
              </button>
            </div>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left pb-2 pr-3 text-[9px] text-gray-500 font-bold w-8">INTEGRAÇÃO</th>
                    <th className="text-left pb-2 px-3 text-[9px] text-gray-500 font-bold">NOME</th>
                    <th className="text-left pb-2 px-3 text-[9px] text-gray-500 font-bold">CARGO</th>
                    <th className="text-left pb-2 px-3 text-[9px] text-gray-500 font-bold">FUNÇÃO DE COMPRA</th>
                    <th className="text-left pb-2 pl-3 text-[9px] text-gray-500 font-bold">TIMING</th>
                  </tr>
                </thead>
                <tbody>
                  {touchpoint.interactions.map((interaction, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <input type="checkbox" checked={interaction.selected} onChange={() => handleToggleInteraction(index)} className="w-3.5 h-3.5 rounded border-gray-300" />
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">{interaction.name}</td>
                      <td className="py-2 px-3 text-gray-700">{interaction.role}</td>
                      <td className="py-2 px-3">
                        <select className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option>Influenciador</option>
                          <option>Decisor</option>
                          <option>Patrocinador</option>
                        </select>
                      </td>
                      <td className="py-2 pl-3">
                        <select className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option>Aguardando</option>
                          <option>Em andamento</option>
                          <option>Concluído</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="w-full py-2.5 bg-[#5cb85c] text-white rounded-lg font-bold text-sm hover:bg-[#4cae4c] transition-colors">
              Salvar alterações
            </button>
          </div>
        )}
      </div>
    </div>
  );
}