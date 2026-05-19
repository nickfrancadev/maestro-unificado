import { Plus, CheckCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Touchpoint } from '@/app/App';
import { TouchpointCreationModal } from '@/app/components/TouchpointCreationModal';

interface TouchpointTimelineProps {
  touchpoints: Touchpoint[];
  selectedTouchpointId: number;
  onSelectTouchpoint: (id: number) => void;
  onCompleteTouchpoint: (id: number) => void;
  onReorderTouchpoint: (id: number, direction: 'up' | 'down') => void;
  layoutOrientation: 'vertical' | 'horizontal';
  onAddTouchpoint?: (touchpoint: { type: string; title: string; category: string }) => void;
  onInsertTouchpoint?: (touchpointId: number, position: number) => void;
}

export function TouchpointTimeline({ 
  touchpoints, 
  selectedTouchpointId, 
  onSelectTouchpoint, 
  onCompleteTouchpoint, 
  onReorderTouchpoint, 
  layoutOrientation, 
  onAddTouchpoint,
  onInsertTouchpoint 
}: TouchpointTimelineProps) {
  const [isPlayFinalized, setIsPlayFinalized] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [insertPosition, setInsertPosition] = useState<number | null>(null);

  const getTypeStyle = (type: string, itemType?: string) => {
    // Tasks têm estilo especial
    if (itemType === 'task') {
      return {
        bg: 'bg-[#e8f5e9]',
        text: 'text-[#2e7d32]',
        border: 'border-[#81c784]'
      };
    }
    
    // Touchpoints mantêm o estilo original
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

  // Vertical Layout (original timeline)
  if (layoutOrientation === 'vertical') {
    return (
      <div className="w-full lg:w-[320px] bg-white flex flex-col border-r border-gray-200">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button className="flex-1 py-2 lg:py-2.5 text-xs font-bold text-[#212a46] border-b-2 border-[#4a90e2]">
            Ativos
          </button>
          <button className="flex-1 py-2 lg:py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Arquivados
          </button>
        </div>

        {/* New Touchpoint Button */}
        <div className="p-2 lg:p-3 border-b border-gray-200">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2 px-3 bg-[#4a90e2] text-white rounded flex items-center justify-center gap-2 hover:bg-[#357abd] transition-colors text-xs lg:text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Touchpoint
          </button>
        </div>

        {/* Touchpoint List */}
        <div className="flex-1 overflow-y-auto p-2 lg:p-3">
          <div className="space-y-2">
            {touchpoints.map((touchpoint, index) => {
              const typeStyle = getTypeStyle(touchpoint.type, touchpoint.itemType);
              const isSelected = selectedTouchpointId === touchpoint.id;
              const isExecuted = touchpoint.status === 'Executado';
              const isTask = touchpoint.itemType === 'task';
              
              return (
                <div key={touchpoint.id}>
                  {/* Touchpoint Card */}
                  <div
                    onClick={() => onSelectTouchpoint(touchpoint.id)}
                    className={`relative border rounded-lg p-3 cursor-pointer transition-all ml-8 ${
                      isSelected
                        ? 'border-[#4a90e2] bg-[#f0f7ff] shadow-sm'
                        : isExecuted
                        ? 'border-[#c8e6c9] bg-[#f1f8f4] hover:border-[#a5d6a7]'
                        : isTask
                        ? 'border-[#81c784] bg-[#f1f8f4] hover:border-[#66bb6a]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Number Badge with Reorder Arrows */}
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5">
                      {/* Arrow Up */}
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
                      
                      {/* Number Badge */}
                      <div className={`w-6 h-6 ${isTask ? 'bg-[#6BCF7F]' : 'bg-[#354566]'} rounded-full flex items-center justify-center text-white font-bold text-xs`}>
                        {touchpoint.id}
                      </div>
                      
                      {/* Arrow Down */}
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

                    {/* Type Badge */}
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold mb-2 ${typeStyle.bg} ${typeStyle.text}`}>
                      {isTask ? (
                        <>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                            <path d="M9 14l2 2 4-4"/>
                          </svg>
                          TASKPOINT
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

                    {/* Title */}
                    <div className="font-bold text-xs text-[#212a46] mb-2">
                      {touchpoint.title}
                    </div>

                    {/* Info Grid */}
                    <div className="space-y-1.5 text-[10px]">
                      {/* Only show CANAL for touchpoints */}
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

                    {/* Complete Button - Only visible when selected and not executed */}
                    {isSelected && !isExecuted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompleteTouchpoint(touchpoint.id);
                        }}
                        className="mt-2 w-full py-1.5 px-2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {isTask ? 'Concluir Taskpoint' : 'Concluir Touchpoint'}
                      </button>
                    )}
                  </div>

                  {/* Add Button Between Cards */}
                  {index < touchpoints.length - 1 && (
                    <div className="flex justify-center my-1.5 ml-8">
                      <button 
                        onClick={() => {
                          setInsertPosition(index + 1);
                          setIsModalOpen(true);
                        }}
                        className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#4a90e2] hover:bg-[#f0f7ff] transition-colors group"
                      >
                        <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#4a90e2]" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Final Add Button */}
            <div className="flex justify-center my-1.5 ml-8">
              <button 
                onClick={() => {
                  setInsertPosition(touchpoints.length);
                  setIsModalOpen(true);
                }}
                className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#4a90e2] hover:bg-[#f0f7ff] transition-colors group"
              >
                <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#4a90e2]" />
              </button>
            </div>

            {/* Finalizar Play Button */}
            <div className="mt-4 ml-8">
              <button 
                onClick={() => setIsPlayFinalized(!isPlayFinalized)}
                className={`w-full rounded-lg p-3 transition-all shadow-md flex items-center gap-3 group ${
                  isPlayFinalized
                    ? 'bg-gradient-to-r from-[#5cb85c] to-[#4cae4c] hover:from-[#4cae4c] hover:to-[#449d44]'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600'
                }`}
              >
                <CheckCircle className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                  isPlayFinalized ? 'text-white' : 'text-white/80'
                }`} />
                <div className="text-left flex-1">
                  <div className="font-bold text-xs text-white">Finalizar Play</div>
                  <div className="text-[10px] text-white/90">Concluir e arquivar esta play</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal */}
        <TouchpointCreationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setInsertPosition(null);
          }}
          insertPosition={insertPosition}
          onCreateTouchpoint={(touchpoint) => {
            if (onAddTouchpoint) {
              onAddTouchpoint(touchpoint);
            }
            setIsModalOpen(false);
            setInsertPosition(null);
          }}
        />
      </div>
    );
  }

  // Horizontal Layout
  return (
    <div className="bg-white border-b border-gray-200">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        <button className="py-2.5 px-4 text-xs font-bold text-[#212a46] border-b-2 border-[#4a90e2]">
          Ativos
        </button>
        <button className="py-2.5 px-4 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
          Arquivados
        </button>
      </div>

      {/* Horizontal Touchpoint Scroll */}
      <div className="overflow-x-auto px-4 py-4">
        <div className="flex gap-4 items-start">
          {/* New Touchpoint Button */}
          <button className="flex-shrink-0 w-[380px] h-[110px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#4a90e2] hover:bg-[#f0f7ff] transition-colors group">
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-[#4a90e2]" />
            <span className="text-sm font-medium text-gray-600 group-hover:text-[#4a90e2]">
              Novo Touchpoint
            </span>
          </button>

          {/* Touchpoint Cards */}
          {touchpoints.map((touchpoint, index) => {
            const typeStyle = getTypeStyle(touchpoint.type, touchpoint.itemType);
            const isSelected = selectedTouchpointId === touchpoint.id;
            const isExecuted = touchpoint.status === 'Executado';
            const isTask = touchpoint.itemType === 'task';
            
            return (
              <div
                key={touchpoint.id}
                className={`flex-shrink-0 w-[400px] ${isSelected && !isExecuted ? 'h-[140px]' : 'h-[110px]'} border rounded-lg p-3 cursor-pointer transition-all relative ${
                  isSelected
                    ? 'border-[#4a90e2] bg-[#f0f7ff] shadow-md'
                    : isExecuted
                    ? 'border-[#c8e6c9] bg-[#f1f8f4] hover:border-[#a5d6a7]'
                    : isTask
                    ? 'border-[#81c784] bg-[#f1f8f4] hover:border-[#66bb6a]'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div onClick={() => onSelectTouchpoint(touchpoint.id)}>
                  {/* Number Badge */}
                  <div className={`absolute -top-2 -left-2 w-7 h-7 ${isTask ? 'bg-[#6BCF7F]' : 'bg-[#354566]'} rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                    {touchpoint.id}
                  </div>

                  {/* Type Badge */}
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold mb-1.5 ${typeStyle.bg} ${typeStyle.text}`}>
                    {isTask ? (
                      <>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                          <path d="M9 14l2 2 4-4"/>
                        </svg>
                        TASKPOINT
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

                  {/* Title */}
                  <div className="font-bold text-xs text-[#212a46] mb-2 line-clamp-1">
                    {touchpoint.title}
                  </div>

                  {/* Info Grid - Dynamic columns based on item type */}
                  <div className={`grid ${isTask ? 'grid-cols-2' : 'grid-cols-3'} gap-3 text-[10px]`}>
                    {/* Only show CANAL for touchpoints */}
                    {!isTask && (
                      <div>
                        <div className="text-gray-500 font-bold mb-0.5">CANAL</div>
                        <div className="font-medium text-gray-900 truncate">{touchpoint.channel}</div>
                      </div>
                    )}
                    
                    <div>
                      <div className="text-gray-500 font-bold mb-0.5">RESPONSÁVEL</div>
                      <div className="flex items-center gap-1">
                        <div className={`w-5 h-5 rounded-full ${isTask ? 'bg-[#6BCF7F]' : 'bg-[#ff9b83]'} flex items-center justify-center text-[9px] text-white font-bold`}>
                          {touchpoint.responsibles[0]?.charAt(0) || 'U'}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-gray-500 font-bold mb-0.5">DATA</div>
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
                </div>

                {/* Reorder Buttons */}
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderTouchpoint(touchpoint.id, 'up');
                    }}
                    className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReorderTouchpoint(touchpoint.id, 'down');
                    }}
                    className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                    disabled={index === touchpoints.length - 1}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Complete Button - Only visible when selected and not executed */}
                {isSelected && !isExecuted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteTouchpoint(touchpoint.id);
                    }}
                    className="mt-2 w-full py-1.5 px-2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {isTask ? 'Concluir Taskpoint' : 'Concluir Touchpoint'}
                  </button>
                )}
              </div>
            );
          })}

          {/* Finalizar Play Button */}
          <button 
            onClick={() => setIsPlayFinalized(!isPlayFinalized)}
            className={`flex-shrink-0 w-[380px] h-[110px] rounded-lg transition-all shadow-md flex items-center justify-center gap-3 group ${
              isPlayFinalized
                ? 'bg-gradient-to-br from-[#5cb85c] to-[#4cae4c] hover:from-[#4cae4c] hover:to-[#449d44]'
                : 'bg-gradient-to-br from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600'
            }`}
          >
            <CheckCircle className={`w-9 h-9 group-hover:scale-110 transition-transform ${
              isPlayFinalized ? 'text-white' : 'text-white/80'
            }`} />
            <div className="text-left">
              <div className="font-bold text-sm text-white mb-0.5">Finalizar Play</div>
              <div className="text-[10px] text-white/90">Concluir e arquivar esta play</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}