import { Plus, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface LinkedInAdData {
  status: 'draft' | 'pending-connection' | 'published';
  objective?: 'awareness' | 'lead-gen' | 'conversions';
  audience?: { accountIds: string[]; contactIds: string[] };
  creative?: { headline: string; description: string; cta: string; imageUrl?: string };
  budget?: { daily: number; startDate: string; endDate: string };
  adId?: string;
  publishedAt?: string;
}

export interface Touchpoint {
  id: number;
  itemType: 'touchpoint' | 'task' | 'linkedin-ad';
  type: 'AUTORIDADE' | 'ATENÇÃO' | 'INTERESSE' | 'DESEJO' | 'AÇÃO' | 'TASKPOINT' | 'LINKEDIN_AD';
  title: string;
  channel: string;
  responsibles: string[];
  date: string;
  status: 'Em andamento' | 'Executado' | 'Arquivado';
  description: string;
  subtasks: Array<{ id: string; title: string; completed: boolean; assignee?: string; dueDate?: string }>;
  attachments: Array<{ id: string; name: string; addedAt: string; thumbnail?: string }>;
  executionDate?: string;
  completionDate?: string;
  budget: number;
  weight: 'Muito Baixo' | 'Baixo' | 'Médio' | 'Acima da média' | 'Alto' | 'Muito Alto';
  score: number;
  interactions: Array<{
    selected: boolean;
    name: string;
    role: string;
    buyingFunction: string;
  }>;
  isDraft?: boolean;
  category?: string;
  contactIds?: string[];
  notes?: Array<{
    id: string;
    author: string;
    initials: string;
    color: string;
    date: string;
    content: string;
    mentions: string[];
  }>;
  linkedinAd?: LinkedInAdData;
}

interface TouchpointTimelineProps {
  touchpoints: Touchpoint[];
  selectedTouchpointId: number;
  onSelectTouchpoint: (id: number) => void;
  onCompleteTouchpoint: (id: number) => void;
  onReorderTouchpoint: (id: number, direction: 'up' | 'down') => void;
  layoutOrientation: 'vertical' | 'horizontal';
  onAddTouchpoint?: (touchpoint: { type: string; title: string; category: string; weight?: string; insertPosition?: number; itemType?: 'touchpoint' | 'task' }) => void;
  onInsertTouchpoint?: (touchpointId: number, position: number) => void;
  onCreateDraft?: (insertPosition?: number) => void;
}

export function TouchpointTimeline({ 
  touchpoints, 
  selectedTouchpointId, 
  onSelectTouchpoint, 
  onCompleteTouchpoint, 
  onReorderTouchpoint, 
  layoutOrientation, 
  onAddTouchpoint,
  onInsertTouchpoint,
  onCreateDraft
}: TouchpointTimelineProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [insertAfterTouchpoint, setInsertAfterTouchpoint] = useState<number | null>(null);

  const getTypeStyle = (type: string, itemType?: string) => {
    if (itemType === 'task') {
      return {
        bg: 'bg-[#e8f5e9]',
        text: 'text-[#2e7d32]',
        border: 'border-[#81c784]'
      };
    }
    if (itemType === 'linkedin-ad') {
      return {
        bg: 'bg-[#e3f0ff]',
        text: 'text-[#0a66c2]',
        border: 'border-[#0a66c2]'
      };
    }
    
    switch (type) {
      case 'AUTORIDADE':
        return {
          bg: 'bg-[#c8e6c9]',
          text: 'text-[#2e7d32]',
          border: 'border-[#c8e6c9]'
        };
      case 'ATENÇÃO':
        return {
          bg: 'bg-[#ff9b83]',
          text: 'text-white',
          border: 'border-[#ff9b83]'
        };
      default:
        return {
          bg: 'bg-gray-200',
          text: 'text-gray-700',
          border: 'border-gray-200'
        };
    }
  };

  if (layoutOrientation === 'vertical') {
    return (
      <div className="w-full lg:w-[320px] bg-white flex flex-col border-r border-gray-200">
        <div className="flex border-b border-gray-200">
          <button className="flex-1 py-2 lg:py-2.5 text-xs font-bold text-[#212a46] border-b-2 border-[#4a90e2]">
            Ativos
          </button>
          <button className="flex-1 py-2 lg:py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Arquivados
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 lg:p-3">
          <div className="space-y-2">
            <>
              <div className="flex justify-center my-1.5 ml-8">
                <button
                  onClick={() => onCreateDraft ? onCreateDraft(0) : undefined}
                  className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#4a90e2] hover:bg-[#f0f7ff] transition-colors group"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#4a90e2]" />
                </button>
              </div>
              {touchpoints.map((touchpoint, index) => {
                const typeStyle = getTypeStyle(touchpoint.type, touchpoint.itemType);
                const isSelected = selectedTouchpointId === touchpoint.id;
                const isExecuted = touchpoint.status === 'Executado';
                const isTask = touchpoint.itemType === 'task';
                const isLinkedInAd = touchpoint.itemType === 'linkedin-ad';
                const isDraft = touchpoint.isDraft;

                return (
                  <div key={touchpoint.id}>
                    <div
                      onClick={() => onSelectTouchpoint(touchpoint.id)}
                      className={`relative border rounded-lg p-3 cursor-pointer transition-all ml-8 ${
                        isDraft
                          ? 'border-dashed border-2 border-[#4a90e2] bg-[#f0f7ff]'
                          : isSelected
                          ? 'border-[#4a90e2] bg-[#f0f7ff] shadow-sm'
                          : isExecuted
                          ? 'border-[#c8e6c9] bg-[#f1f8f4] hover:border-[#a5d6a7]'
                          : isLinkedInAd
                          ? 'border-[#0a66c2] bg-[#e3f0ff]/40 hover:border-[#0a4f8c]'
                          : isTask
                          ? 'border-[#81c784] bg-[#f1f8f4] hover:border-[#66bb6a]'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderTouchpoint(touchpoint.id, 'up');
                            }}
                            disabled={index === 0}
                            className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                              index === 0 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-[#354566] hover:bg-[#4a5f8a]'
                            }`}
                          >
                            <ChevronUp className={`w-2.5 h-2.5 ${index === 0 ? 'text-gray-400' : 'text-white'}`} />
                          </button>
                        )}
                        
                        <div className={`w-6 h-6 ${isLinkedInAd ? 'bg-[#0a66c2]' : isTask ? 'bg-[#6BCF7F]' : 'bg-[#354566]'} rounded-full flex items-center justify-center text-white font-bold text-xs`}>
                          {touchpoint.id}
                        </div>
                        
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderTouchpoint(touchpoint.id, 'down');
                            }}
                            disabled={index === touchpoints.length - 1}
                            className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                              index === touchpoints.length - 1
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-[#354566] hover:bg-[#4a5f8a]'
                            }`}
                          >
                            <ChevronDown className={`w-2.5 h-2.5 ${index === touchpoints.length - 1 ? 'text-gray-400' : 'text-white'}`} />
                          </button>
                        )}
                      </div>

                      {/* Header: icon left, type tag right */}
                      <div className="flex items-center justify-between mb-2">
                        {/* Icon top-left */}
                        <div
                          className={`relative group/icon w-6 h-6 rounded flex items-center justify-center ${isLinkedInAd ? 'bg-[#0a66c2]/15' : isTask ? 'bg-[#6BCF7F]/20' : 'bg-[#354566]/10'}`}
                        >
                          {isLinkedInAd ? (
                            <svg className="w-3.5 h-3.5 text-[#0a66c2]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                          ) : isTask ? (
                            <svg className="w-3.5 h-3.5 text-[#6BCF7F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                              <path d="M9 14l2 2 4-4"/>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-[#354566]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          )}
                          {/* Tooltip */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/icon:opacity-100 transition-opacity z-50">
                            <div className="bg-[#212a46] text-white text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap shadow-lg">
                              {isLinkedInAd ? 'LinkedIn Ads' : isTask ? 'Taskpoint' : 'Touchpoint'}
                            </div>
                            <div className="w-2 h-2 bg-[#212a46] rotate-45 mx-auto -mt-1" />
                          </div>
                        </div>

                        {/* Type tag top-right */}
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isDraft ? 'bg-[#e3f0ff] text-[#4a90e2]' : `${typeStyle.bg} ${typeStyle.text}`}`}>
                          {isDraft ? 'RASCUNHO' : (touchpoint.category || 'SEM CATEGORIA')}
                        </div>
                      </div>

                      <div className="font-bold text-xs text-[#212a46] mb-2">
                        {isDraft ? (
                          <span className="text-gray-400 italic">Preencha os detalhes →</span>
                        ) : touchpoint.title}
                      </div>

                      <div className="space-y-1.5 text-[10px]">
                        {!isTask && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-bold">CANAL</span>
                            <span className="font-medium text-gray-900">{touchpoint.channel}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-bold">RESPONSÁVEIS</span>
                          <div className="flex items-center gap-1">
                            <div className={`w-4 h-4 rounded-full ${isTask ? 'bg-[#6BCF7F]' : 'bg-[#ff9b83]'} flex items-center justify-center text-[8px] text-white font-bold`}>
                              {touchpoint.responsibles[0]?.charAt(0) || 'U'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-bold">DATA DE CONCLUSÃO</span>
                          <div className="flex items-center gap-1">
                            {isExecuted && (
                              <div className="w-3.5 h-3.5 rounded-full bg-[#5cb85c] flex items-center justify-center">
                                <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                            )}
                            <span className="font-medium text-gray-900">{touchpoint.date}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && !isExecuted && !isDraft && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteTouchpoint(touchpoint.id);
                          }}
                          className="mt-2 w-full py-1.5 px-2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {isLinkedInAd ? 'Marcar como publicado' : isTask ? 'Concluir Taskpoint' : 'Concluir Touchpoint'}
                        </button>
                      )}
                    </div>

                    {index < touchpoints.length - 1 && (
                      <div className="flex justify-center my-1.5 ml-8">
                        <button 
                          onClick={() => onCreateDraft ? onCreateDraft(index + 1) : undefined}
                          className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#4a90e2] hover:bg-[#f0f7ff] transition-colors group"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#4a90e2]" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-center my-1.5 ml-8">
                <button 
                  onClick={() => onCreateDraft ? onCreateDraft() : undefined}
                  className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#4a90e2] hover:bg-[#f0f7ff] transition-colors group"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#4a90e2]" />
                </button>
              </div>
            </>
          </div>
        </div>
      </div>
    );
  }

  return <div>Layout horizontal será implementado em breve</div>;
}