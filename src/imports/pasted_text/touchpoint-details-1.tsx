import { useState } from 'react';
import { Archive, Copy, Edit3, Plus, FileText, Download, ClipboardCheck, MessageCircle } from 'lucide-react';
import type { Touchpoint } from '@/app/App';

interface TouchpointDetailsProps {
  touchpoint: Touchpoint;
  onUpdate: (touchpoint: Touchpoint) => void;
  layoutOrientation: 'vertical' | 'horizontal';
}

export function TouchpointDetails({ touchpoint, onUpdate, layoutOrientation }: TouchpointDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionedContacts, setMentionedContacts] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const isTask = touchpoint.itemType === 'task';
  
  // Lista de contatos disponíveis para mencionar
  const availableContacts = [
    { id: '1', name: 'João Silva', initials: 'JS', color: '#4a90e2' },
    { id: '2', name: 'Maria Santos', initials: 'MS', color: '#ff9b83' },
    { id: '3', name: 'Pedro Oliveira', initials: 'PO', color: '#81c784' },
    { id: '4', name: 'Ana Costa', initials: 'AC', color: '#ba68c8' },
    { id: '5', name: 'Carlos Mendes', initials: 'CM', color: '#ff7043' },
  ];
  
  // Filtra contatos baseado na busca após @
  const filteredContacts = availableContacts.filter(contact =>
    contact.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );
  
  // Detecta quando o usuário digita @
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNoteText(text);
    setCursorPosition(cursorPos);
    
    // Procura por @ antes do cursor
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Verifica se não há espaço após o @
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
        return;
      }
    }
    
    setShowMentionDropdown(false);
  };
  
  // Adiciona menção ao contato
  const handleSelectContact = (contact: typeof availableContacts[0]) => {
    const textBeforeCursor = noteText.slice(0, cursorPosition);
    const textAfterCursor = noteText.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newText = 
      noteText.slice(0, lastAtIndex) + 
      `@${contact.name} ` + 
      textAfterCursor;
    
    setNoteText(newText);
    setShowMentionDropdown(false);
    setMentionSearch('');
    
    // Adiciona contato à lista de mencionados
    if (!mentionedContacts.includes(contact.id)) {
      setMentionedContacts([...mentionedContacts, contact.id]);
    }
  };
  
  const getTypeStyle = (type: string, itemType?: string) => {
    // Tasks têm estilo especial
    if (itemType === 'task') {
      return {
        bg: 'bg-[#e8f5e9]',
        text: 'text-[#2e7d32]',
        iconBg: 'bg-[#81c784]'
      };
    }
    
    switch (type) {
      case 'AUTORIDADE':
        return {
          bg: 'bg-[#c8e6c9]',
          text: 'text-[#2e7d32]',
          iconBg: 'bg-[#81c784]'
        };
      case 'ATENÇÃO':
        return {
          bg: 'bg-[#ff9b83]',
          text: 'text-white',
          iconBg: 'bg-[#ff9b83]'
        };
      default:
        return {
          bg: 'bg-gray-300',
          text: 'text-gray-700',
          iconBg: 'bg-gray-400'
        };
    }
  };

  const getWeightIcon = (weight: string) => {
    const bars = {
      'Muito Baixo': 1,
      'Baixo': 2,
      'Médio': 3,
      'Acima da média': 4,
      'Alto': 5,
      'Muito Alto': 6
    }[weight] || 3;

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 ${i < bars ? 'bg-orange-500' : 'bg-gray-300'}`}
            style={{ height: `${(i + 1) * 2 + 4}px` }}
          />
        ))}
      </div>
    );
  };

  const handleToggleInteraction = (index: number) => {
    const updatedInteractions = [...touchpoint.interactions];
    updatedInteractions[index].selected = !updatedInteractions[index].selected;
    onUpdate({ ...touchpoint, interactions: updatedInteractions });
  };

  const typeStyle = getTypeStyle(touchpoint.type, touchpoint.itemType);

  // Icon for task vs touchpoint
  const getIcon = () => {
    if (isTask) {
      return (
        <ClipboardCheck className="w-8 h-8 text-white" strokeWidth={2} />
      );
    }
    return (
      <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
    );
  };

  // Horizontal Layout (2 columns)
  if (layoutOrientation === 'horizontal') {
    return (
      <div className="flex-1 overflow-y-auto bg-[#edf2f5]">
        {/* Header */}
        <div className="bg-[#212a46] px-6 py-3.5 flex items-center justify-between">
          <h2 className="text-white text-base font-bold">Em andamento</h2>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-white rounded text-white text-xs hover:bg-white/10 transition-colors">
            <Archive className="w-3.5 h-3.5" />
            <span className="font-bold">Arquivar</span>
          </button>
        </div>

        {/* Content - 2 Columns */}
        <div className="p-4 grid grid-cols-[1fr_400px] gap-4">
          {/* Left Column - Main Content */}
          <div className="space-y-3">
            {/* Title Section */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-[50px] h-[50px] ${typeStyle.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  {getIcon()}
                </div>

                {/* Tag + Title */}
                <div className="flex-1">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold mb-1 ${typeStyle.bg} ${typeStyle.text}`}>
                    {isTask ? (
                      <>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                          <path d="M9 14l2 2 4-4"/>
                        </svg>
                        TAREFA INTERNA
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        {touchpoint.type}
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#212a46]">{touchpoint.title}</h3>
                </div>

                {/* Score - Only for touchpoints */}
                {!isTask && (
                  <div className="text-center flex-shrink-0">
                    <div className="text-2xl font-bold text-[#212a46]">{touchpoint.score}</div>
                    <div className="text-[9px] text-gray-500">Score do Touch</div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg p-4">
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
                <p className="text-sm text-gray-800 leading-relaxed">
                  {touchpoint.description}
                </p>
              </div>
            </div>

            {/* Subtasks */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-bold text-[#212a46] mb-3">Subtarefas</h4>
              
              {touchpoint.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    className="w-3.5 h-3.5 rounded border-gray-300"
                    readOnly
                  />
                  <span className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {subtask.title}
                  </span>
                </div>
              ))}

              <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Nova subtarefa
              </button>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-bold text-[#212a46] mb-3">📎 Anexos</h4>
              
              {touchpoint.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg mb-2">
                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-xs text-gray-900">{attachment.name}</div>
                    <div className="text-[10px] text-gray-500">{attachment.addedAt}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">
                      Evoluir
                    </button>
                    <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              ))}

              <button className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Adicionar um anexo
              </button>
            </div>

            {/* Budget */}
            <div className="bg-white rounded-lg p-4">
              <h4 className="text-sm font-bold text-[#212a46] mb-3">💰 Orçamento</h4>
              <div className="bg-[#f8faff] rounded-lg p-3 border-2 border-[#ebf0fc]">
                <div className="text-[9px] text-gray-500 font-bold mb-1">ORÇAMENTO TOUCH</div>
                <div className="text-sm font-bold text-[#212a46]">R$ {touchpoint.budget.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Right Column - Actions & Info */}
          <div className="space-y-3">
            {/* Action Cards */}
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-1">DATA DE EXECUÇÃO</div>
                <div className="text-xs font-bold text-[#212a46]">{touchpoint.executionDate || '—'}</div>
              </div>

              <button className="w-full py-2 bg-[#5cb85c] text-white rounded font-bold text-[10px] hover:bg-[#4cae4c] transition-colors">
                TOUCHPOINT EXECUTADO
              </button>

              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-1">DATA DE FINALIZAÇÃO</div>
                <div className="text-xs font-bold text-[#212a46]">{touchpoint.completionDate || '—'}</div>
              </div>

              <button className="w-full py-2 bg-[#3571de] text-white rounded font-bold text-[10px] hover:bg-[#2557b8] transition-colors">
                CONCLUIR TOUCHPOINT
              </button>
            </div>

            {/* Info Cards */}
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-1">DATA DE INÍCIO</div>
                <div className="text-xs font-bold text-[#212a46]">{touchpoint.date}</div>
              </div>

              {/* Only show CANAL for touchpoints */}
              {!isTask && (
                <div>
                  <div className="text-[9px] text-gray-500 font-bold mb-1">CANAL</div>
                  <div className="text-xs font-bold text-[#212a46]">{touchpoint.channel}</div>
                </div>
              )}

              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-1">RESPONSÁVEIS</div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full ${isTask ? 'bg-[#6BCF7F]' : 'bg-[#ff9b83]'} flex items-center justify-center text-[10px] text-white font-bold`}>
                    {touchpoint.responsibles[0]?.charAt(0) || 'U'}
                  </div>
                  <button className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#3571de] transition-colors">
                    <Plus className="w-2.5 h-2.5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[9px] text-gray-500 font-bold mb-1">PESO</div>
                <select 
                  value={touchpoint.weight}
                  onChange={(e) => onUpdate({ ...touchpoint, weight: e.target.value as any })}
                  className="w-full text-xs font-bold text-[#212a46] border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Contact Interactions - Only for touchpoints */}
            {!isTask && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#212a46]">Interações</h4>
                  <button className="text-xs text-[#4a90e2] hover:text-white hover:bg-[#4a90e2] transition-all flex items-center gap-1 px-2 py-1 rounded border border-[#4a90e2] font-medium">
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </button>
                </div>

                <div className="space-y-2">
                  {touchpoint.interactions.map((interaction, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 border border-gray-200 rounded hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={interaction.selected}
                        onChange={() => handleToggleInteraction(index)}
                        className="w-3.5 h-3.5 rounded border-gray-300 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">{interaction.name}</div>
                        <div className="text-[10px] text-gray-600">{interaction.role}</div>
                        <div className="text-[10px] text-gray-500">{interaction.buyingFunction}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-[10px] text-gray-500 font-bold mb-1">TOTAL SELECIONADAS</div>
                  <div className="text-xs font-bold text-[#212a46]">
                    {touchpoint.interactions.filter(i => i.selected).length} de {touchpoint.interactions.length}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button className="w-full py-2.5 bg-[#5cb85c] text-white rounded-lg font-bold text-sm hover:bg-[#4cae4c] transition-colors">
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vertical Layout (original)
  return (
    <div className="flex-1 overflow-y-auto bg-[#edf2f5]">
      {/* Header */}
      <div className="bg-[#212a46] px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-white text-base font-bold">Em andamento</h2>
          {!isExpanded && (
            <span className="text-xs text-white/60 font-normal">(colapsado)</span>
          )}
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-white rounded text-white text-xs hover:bg-white/10 transition-colors">
          <Archive className="w-3.5 h-3.5" />
          <span className="font-bold">Arquivar</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-w-6xl mx-auto overflow-y-auto max-h-[calc(100vh-180px)]">
        {/* Title Section - Always Visible */}
        <div className="bg-white rounded-lg p-4 mb-3">
          <div className="flex items-center gap-3">
            {/* Collapse Button */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0 group"
              title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
            >
              <svg 
                className={`w-5 h-5 text-gray-600 transition-transform duration-300 group-hover:text-gray-900 ${isExpanded ? 'rotate-180' : ''}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* Icon */}
            <div className={`w-[60px] h-[60px] ${typeStyle.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              {getIcon()}
            </div>

            {/* Tag + Title */}
            <div className="flex-1">
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold mb-1.5 ${typeStyle.bg} ${typeStyle.text}`}>
                {isTask ? (
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
              <h3 className="text-lg font-bold text-[#212a46]">{touchpoint.title}</h3>
            </div>

            {/* Action Buttons */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              title={isTask ? 'Duplicar tarefa' : 'Duplicar touchpoint'}
            >
              <Copy className="w-4 h-4 text-gray-600" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              title={isTask ? 'Editar tarefa' : 'Editar touchpoint'}
            >
              <Edit3 className="w-4 h-4 text-gray-600" />
            </button>

            {/* Score - Only for touchpoints */}
            {!isTask && (
              <div className="text-center flex-shrink-0 ml-2 px-2 py-1">
                <div className="text-2xl font-bold text-[#212a46]">{touchpoint.score}</div>
                <div className="text-[9px] text-gray-500">Score do Touch</div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Sections - Combined into Single Card */}
        <div 
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isExpanded 
              ? 'max-h-[5000px] opacity-100 mb-3' 
              : 'max-h-0 opacity-0 mb-0'
          }`}
        >
          <div className="bg-white rounded-lg p-4">
            {/* Description */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#212a46] flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="3" cy="3" r="2"/>
                    <circle cx="3" cy="12" r="2"/>
                    <circle cx="3" cy="21" r="2"/>
                    <line x1="8" y1="3" x2="21" y2="3" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
                    <line x1="8" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Descrição
                </h4>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffece4] text-black rounded text-xs font-bold hover:bg-[#ffd7c4] transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Pedir para A.I escrever
                </button>
              </div>
              <div className="bg-[#f8faff] rounded-lg p-3 border-2 border-[#ebf0fc]">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {touchpoint.description}
                </p>
              </div>
            </div>

            {/* Subtasks */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[#212a46] mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="3" cy="3" r="2"/>
                  <circle cx="3" cy="12" r="2"/>
                  <circle cx="3" cy="21" r="2"/>
                  <line x1="8" y1="3" x2="21" y2="3" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Subtarefas
              </h4>
              
              {touchpoint.subtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    className="w-3.5 h-3.5 rounded border-gray-300"
                    readOnly
                  />
                  <span className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {subtask.title}
                  </span>
                </div>
              ))}

              <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Nova subtarefa
              </button>
            </div>

            {/* Attachments */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[#212a46] mb-3 flex items-center gap-2">
                📎 Anexos
              </h4>
              
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
                    <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">
                      Evoluir
                    </button>
                    <button className="px-2.5 py-1 text-[10px] text-gray-700 hover:bg-gray-100 rounded transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              ))}

              <button className="text-xs text-gray-600 hover:text-gray-900 transition-colors">
                Adicionar um anexo
              </button>
            </div>

            {/* Notes/History */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-[#212a46] mb-3 flex items-center gap-2">
                📝 Notas e Histórico
              </h4>
              
              {/* Existing Notes */}
              <div className="space-y-2 mb-3">
                <div className="bg-[#f8faff] rounded-lg p-3 border border-[#e3ecf7]">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#4a90e2] flex items-center justify-center text-[9px] text-white font-bold">
                        JD
                      </div>
                      <span className="text-xs font-bold text-[#212a46]">João Silva</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Hoje às 14:30</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Cliente demonstrou interesse no produto premium. Agendada reunião de apresentação para próxima semana.
                  </p>
                </div>

                <div className="bg-[#f8faff] rounded-lg p-3 border border-[#e3ecf7]">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#ff9b83] flex items-center justify-center text-[9px] text-white font-bold">
                        MS
                      </div>
                      <span className="text-xs font-bold text-[#212a46]">Maria Santos</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Ontem às 16:45</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Primeiro contato realizado via LinkedIn. Prospect abriu a mensagem mas ainda não respondeu.
                  </p>
                </div>
              </div>

              {/* Add New Note */}
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-[#4a90e2] transition-colors">
                <textarea
                  placeholder="Adicionar uma nova nota sobre esta ação... (use @ para mencionar contatos)"
                  className="w-full text-xs text-gray-800 bg-transparent border-none outline-none resize-none"
                  rows={3}
                  value={noteText}
                  onChange={handleNoteChange}
                />
                
                {/* Mention Dropdown */}
                {showMentionDropdown && filteredContacts.length > 0 && (
                  <div className="absolute left-3 right-3 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#f0f7ff] transition-colors text-left"
                      >
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0"
                          style={{ backgroundColor: contact.color }}
                        >
                          {contact.initials}
                        </div>
                        <span className="text-xs text-gray-800">{contact.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Mentioned Contacts */}
                {mentionedContacts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200">
                    <span className="text-[10px] text-gray-500 font-bold">MENCIONADOS:</span>
                    {mentionedContacts.map((contactId) => {
                      const contact = availableContacts.find(c => c.id === contactId);
                      if (!contact) return null;
                      return (
                        <div 
                          key={contactId}
                          className="flex items-center gap-1 px-2 py-0.5 bg-[#e3f2fd] rounded-full"
                        >
                          <div 
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold"
                            style={{ backgroundColor: contact.color }}
                          >
                            {contact.initials}
                          </div>
                          <span className="text-[10px] text-[#212a46] font-medium">{contact.name}</span>
                          <button 
                            onClick={() => setMentionedContacts(mentionedContacts.filter(id => id !== contactId))}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <span className="text-[10px] text-gray-500">
                    💡 Use @ para mencionar contatos
                  </span>
                  <button className="px-3 py-1.5 bg-[#4a90e2] text-white rounded text-xs font-bold hover:bg-[#3571de] transition-colors">
                    Adicionar Nota
                  </button>
                </div>
              </div>
            </div>

            {/* Budget */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-[#212a46] mb-3 flex items-center gap-2">
                💰 Orçamento
              </h4>
              <div className="bg-[#f8faff] rounded-lg p-3 border-2 border-[#ebf0fc]">
                <div className="text-[9px] text-gray-500 font-bold mb-1">ORÇAMENTO TOUCH</div>
                <div className="text-sm font-bold text-[#212a46]">R$ {touchpoint.budget.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards Row */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="bg-white rounded-lg p-3">
            <div className="text-[9px] text-gray-500 font-bold mb-1">DATA DE EXECUÇÃO</div>
            <div className="text-xs font-bold text-[#212a46]">{touchpoint.executionDate || '—'}</div>
          </div>

          <div className="bg-white rounded-lg p-3 flex items-center justify-center">
            <button className="w-full py-2 bg-[#5cb85c] text-white rounded font-bold text-[10px] hover:bg-[#4cae4c] transition-colors">
              TAREFA EXECUTADA
            </button>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="text-[9px] text-gray-500 font-bold mb-1">DATA DE FINALIZAÇÃO</div>
            <div className="text-xs font-bold text-[#212a46]">{touchpoint.completionDate || '—'}</div>
          </div>

          <div className="bg-white rounded-lg p-3 flex items-center justify-center">
            <button className="w-full py-2 bg-[#3571de] text-white rounded font-bold text-[10px] hover:bg-[#2557b8] transition-colors">
              CONCLUIR TAREFA
            </button>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className={`grid ${isTask ? 'grid-cols-3' : 'grid-cols-4'} gap-3 mb-3`}>
          {/* Only show CANAL for touchpoints */}
          {!isTask && (
            <div className="bg-white rounded-lg p-3">
              <div className="text-[9px] text-gray-500 font-bold mb-1">CANAL</div>
              <div className="text-xs font-bold text-[#212a46]">{touchpoint.channel}</div>
            </div>
          )}

          <div className="bg-white rounded-lg p-3">
            <div className="text-[9px] text-gray-500 font-bold mb-1">RESPONSÁVEIS</div>
            <div className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full ${isTask ? 'bg-[#6BCF7F]' : 'bg-[#ff9b83]'} flex items-center justify-center text-[10px] text-white font-bold`}>
                {touchpoint.responsibles[0]?.charAt(0) || 'U'}
              </div>
              <button className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#3571de] transition-colors">
                <Plus className="w-2.5 h-2.5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3">
            <div className="text-[9px] text-gray-500 font-bold mb-1">PESO</div>
            <select 
              value={touchpoint.weight}
              onChange={(e) => onUpdate({ ...touchpoint, weight: e.target.value as any })}
              className="w-full text-xs font-bold text-[#212a46] border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Muito Baixo">Muito Baixo</option>
              <option value="Baixo">Baixo</option>
              <option value="Médio">Médio</option>
              <option value="Acima da média">Acima da média</option>
              <option value="Alto">Alto</option>
              <option value="Muito Alto">Muito Alto</option>
            </select>
          </div>

          {/* Only show INTEGRAÇÕES for touchpoints */}
          {!isTask && (
            <div className="bg-white rounded-lg p-3">
              <div className="text-[9px] text-gray-500 font-bold mb-1">INTEGRAÇÕES</div>
              <div className="text-xs font-bold text-[#212a46]">
                {touchpoint.interactions.filter(i => i.selected).length} de {touchpoint.interactions.length} selecionadas
              </div>
            </div>
          )}
        </div>

        {/* Contact Interactions Table - Only for touchpoints */}
        {!isTask && (
          <div className="bg-white rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-[#212a46]">Interações dos Contatos</h4>
              <button className="text-xs text-[#4a90e2] hover:text-white hover:bg-[#4a90e2] transition-all flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#4a90e2] font-medium">
                <Edit3 className="w-3.5 h-3.5" />
                Editar contatos
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-[9px] font-bold text-gray-700 uppercase">Interação</th>
                  <th className="text-left py-2 px-3 text-[9px] font-bold text-gray-700 uppercase">Nome</th>
                  <th className="text-left py-2 px-3 text-[9px] font-bold text-gray-700 uppercase">Cargo</th>
                  <th className="text-left py-2 px-3 text-[9px] font-bold text-gray-700 uppercase">Função de Compra</th>
                  <th className="text-left py-2 px-3 text-[9px] font-bold text-gray-700 uppercase">Status</th>
                </tr>
            </thead>
            <tbody>
              {touchpoint.interactions.map((interaction, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={interaction.selected}
                      onChange={() => handleToggleInteraction(index)}
                      className="w-3.5 h-3.5 rounded border-gray-300"
                    />
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-900">{interaction.name}</td>
                  <td className="py-2 px-3 text-xs text-gray-700">{interaction.role}</td>
                  <td className="py-2 px-3">
                    <select className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white">
                      <option>{interaction.buyingFunction}</option>
                      <option>Decisor(a)</option>
                      <option>Comprador(a)</option>
                      <option>Usuário(a)</option>
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="aguardando">Aguardando</option>
                      <option value="em-andamento">Em andamento</option>
                      <option value="concluido">Concluído</option>
                      <option value="sem-resposta">Sem resposta</option>
                      <option value="reagendar">Reagendar</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="px-6 py-2.5 bg-[#5cb85c] text-white rounded-lg font-bold text-sm hover:bg-[#4cae4c] transition-colors">
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}