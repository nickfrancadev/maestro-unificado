import { useState } from 'react';
import { TouchpointHeader } from './touchpoints/TouchpointHeader';
import { TouchpointTimeline, type Touchpoint } from './touchpoints/TouchpointTimeline';
import { TouchpointDetails } from './touchpoints/TouchpointDetails';
import { TouchpointAIAssistant } from './touchpoints/TouchpointAIAssistant';
import { NewPlayData } from './PlayDetailPage';
import { getPlayMock } from '../data/playsMockData';

interface TouchpointManagerPageProps {
  accountId?: string;
  playId?: string;
  onBack?: () => void;
  newPlayData?: NewPlayData;
}

export function TouchpointManagerPage({ accountId, playId, onBack, newPlayData }: TouchpointManagerPageProps) {
  const [selectedTouchpointId, setSelectedTouchpointId] = useState<number | null>(newPlayData ? null : 2);
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [isAIOpen, setIsAIOpen] = useState(!!(newPlayData?.withAI));

  const playMock = playId ? getPlayMock(playId) : undefined;

  // Mock: buscar nome da conta baseado no accountId
  const accountNames: Record<string, string> = {
    "1": "STAR BANK",
    "2": "Natura",
    "3": "Magazine Luiza",
    "4": "Nubank",
    "5": "iFood",
  };

  const accountName = newPlayData
    ? newPlayData.contas.map((c) => c.name).join(", ")
    : playMock
    ? playMock.accountName
    : accountId
    ? accountNames[accountId] || "Empresa"
    : "";

  const playName = newPlayData ? newPlayData.name : playMock?.name;

  // Badge data: from wizard or play mock
  const dossierContaName = newPlayData && newPlayData.dossiêsContas.length > 0
    ? newPlayData.dossiêsContas[0].name
    : playMock?.dossierContaName;
  const dossierContatoName = newPlayData && newPlayData.dossiêsContatos.length > 0
    ? newPlayData.dossiêsContatos[0].name
    : playMock?.dossierContatoName;
  const produtoName = newPlayData?.produto?.nome ?? playMock?.produtoName;
  const gtmName = newPlayData && newPlayData.momentos.length > 0
    ? newPlayData.momentos[0].titulo
    : playMock?.gtmName;

  // Audience for LinkedIn Ads drawer (derived from play context)
  const audienceAccounts = playMock
    ? [{ id: playMock.accountId, name: playMock.accountName }]
    : accountId
    ? [{ id: accountId, name: accountNames[accountId] || 'Empresa' }]
    : [];
  const audienceContacts = [
    { id: 'c1', name: 'Aline Macedo', role: 'Analista de Vendas' },
    { id: 'c2', name: 'Bruno Costa', role: 'Gerente de TI' },
    { id: 'c3', name: 'Carla Souza', role: 'Diretora Comercial' },
  ];

  const initialTouchpoints: Touchpoint[] = newPlayData
    ? []
    : playMock
    ? playMock.touchpoints
    : (getPlayMock('p1')?.touchpoints ?? []);

  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>(initialTouchpoints);

  const selectedTouchpoint = selectedTouchpointId !== null
    ? touchpoints.find(t => t.id === selectedTouchpointId)
    : undefined;

  const handleUpdateTouchpoint = (updatedTouchpoint: Touchpoint) => {
    setTouchpoints(touchpoints.map(t => 
      t.id === updatedTouchpoint.id ? updatedTouchpoint : t
    ));
  };

  const handleCompleteTouchpoint = (id: number) => {
    setTouchpoints(touchpoints.map(t => 
      t.id === id ? { ...t, status: 'Executado' as const } : t
    ));
  };

  const handleReorderTouchpoint = (id: number, direction: 'up' | 'down') => {
    const currentIndex = touchpoints.findIndex(t => t.id === id);
    if (currentIndex === -1) return;
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === touchpoints.length - 1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newTouchpoints = [...touchpoints];
    
    [newTouchpoints[currentIndex], newTouchpoints[newIndex]] = 
      [newTouchpoints[newIndex], newTouchpoints[currentIndex]];
    
    setTouchpoints(newTouchpoints);
  };

  const handleAddTouchpoint = (touchpointData: { 
    type: string; 
    title: string; 
    category: string; 
    weight?: string; 
    insertPosition?: number; 
    itemType?: 'touchpoint' | 'task';
    channel?: string;
    date?: string;
    responsibles?: string[];
    description?: string;
  }) => {
    // Format date if provided
    let formattedDate = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    if (touchpointData.date) {
      const d = new Date(touchpointData.date + 'T12:00:00');
      formattedDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    }

    // Use functional update to avoid stale closure when multiple items are added rapidly
    setTouchpoints(prev => {
      const maxId = Math.max(...prev.map(t => t.id), 0);
      const newId = maxId + 1;

      const newTouchpoint: Touchpoint = {
        id: newId,
        itemType: touchpointData.itemType || 'touchpoint',
        type: touchpointData.type as Touchpoint['type'],
        title: touchpointData.title,
        category: touchpointData.category,
        channel: touchpointData.channel || (touchpointData.itemType === 'task' ? '-' : 'LinkedIn'),
        responsibles: touchpointData.responsibles || [],
        date: formattedDate,
        status: 'Em andamento',
        description: touchpointData.description || '',
        subtasks: [],
        attachments: [],
        budget: 0,
        weight: (touchpointData.weight as Touchpoint['weight']) || 'Médio',
        score: 0,
        interactions: []
      };

      if (touchpointData.insertPosition !== undefined) {
        const position = touchpointData.insertPosition;
        const merged = [
          ...prev.slice(0, position),
          newTouchpoint,
          ...prev.slice(position)
        ];
        return merged.map((t, index) => ({ ...t, id: index + 1 }));
      }

      return [...prev, newTouchpoint];
    });

    setSelectedTouchpointId(null);
  };

  const handleCreateDraft = (insertPosition?: number) => {
    setTouchpoints(prev => {
      const maxId = Math.max(...prev.map(t => t.id), 0);
      const newId = maxId + 1;
      const draft: Touchpoint = {
        id: newId,
        itemType: 'touchpoint',
        type: 'ATENÇÃO',
        title: '',
        category: 'Engajamento',
        channel: '',
        responsibles: [],
        date: '',
        status: 'Em andamento',
        description: '',
        subtasks: [],
        attachments: [],
        budget: 0,
        weight: 'Médio',
        score: 0,
        interactions: [],
        isDraft: true,
      };
      if (insertPosition !== undefined) {
        const merged = [...prev.slice(0, insertPosition), draft, ...prev.slice(insertPosition)];
        return merged.map((t, i) => ({ ...t, id: i + 1 }));
      }
      return [...prev, draft];
    });
    // Select the draft (it'll get the last id after state update, use setTimeout)
    setTimeout(() => {
      setTouchpoints(prev => {
        const draft = prev.find(t => t.isDraft);
        if (draft) setSelectedTouchpointId(draft.id);
        return prev;
      });
    }, 0);
  };

  const handleConfirmDraft = (confirmed: Touchpoint) => {
    setTouchpoints(prev => prev.map(t => t.id === confirmed.id ? confirmed : t));
    setSelectedTouchpointId(confirmed.id);
  };

  const handleCancelDraft = () => {
    setTouchpoints(prev => {
      const filtered = prev.filter(t => !t.isDraft);
      return filtered.map((t, i) => ({ ...t, id: i + 1 }));
    });
    setSelectedTouchpointId(null);
  };
  
  return (
    <div className="flex h-screen bg-[#edf2f5]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TouchpointHeader 
          layoutOrientation={layoutOrientation}
          onToggleOrientation={() => setLayoutOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
          onToggleAI={() => setIsAIOpen(prev => !prev)}
          isAIOpen={isAIOpen}
          accountName={accountName}
          onBack={onBack}
          playName={playName}
          dossierContaName={dossierContaName}
          dossierContatoName={dossierContatoName}
          produtoName={produtoName}
          gtmName={gtmName}
          isEmpty={newPlayData !== undefined && touchpoints.length === 0}
        />
        
        {/* AI Assistant Panel */}
        <TouchpointAIAssistant
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          touchpoints={touchpoints}
          onUpdateTouchpoint={handleUpdateTouchpoint}
          onAddTouchpoint={handleAddTouchpoint}
          playName={playName}
          accountName={accountName}
          isNewPlay={!!newPlayData}
          dossierContaName={dossierContaName}
          dossierContatoName={dossierContatoName}
          gtmName={gtmName}
          produtoName={produtoName}
        />
        
        {layoutOrientation === 'vertical' ? (
          <div className="flex-1 flex overflow-hidden">
            <TouchpointTimeline
              touchpoints={touchpoints}
              selectedTouchpointId={selectedTouchpointId ?? -1}
              onSelectTouchpoint={(id) => setSelectedTouchpointId(id)}
              onCompleteTouchpoint={handleCompleteTouchpoint}
              onReorderTouchpoint={handleReorderTouchpoint}
              onAddTouchpoint={handleAddTouchpoint}
              onCreateDraft={handleCreateDraft}
              layoutOrientation="vertical"
            />
            
            {selectedTouchpoint && (
              <div className="hidden lg:block flex-1">
                <TouchpointDetails
                  touchpoint={selectedTouchpoint}
                  onUpdate={handleUpdateTouchpoint}
                  layoutOrientation="vertical"
                  onConfirmDraft={handleConfirmDraft}
                  onCancelDraft={handleCancelDraft}
                  playName={playName}
                  audienceAccounts={audienceAccounts}
                  audienceContacts={audienceContacts}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <TouchpointTimeline
              touchpoints={touchpoints}
              selectedTouchpointId={selectedTouchpointId ?? -1}
              onSelectTouchpoint={(id) => setSelectedTouchpointId(id)}
              onCompleteTouchpoint={handleCompleteTouchpoint}
              onReorderTouchpoint={handleReorderTouchpoint}
              onAddTouchpoint={handleAddTouchpoint}
              onCreateDraft={handleCreateDraft}
              layoutOrientation="horizontal"
            />
            
            {selectedTouchpoint && (
              <div className="hidden lg:block">
                <TouchpointDetails
                  touchpoint={selectedTouchpoint}
                  onUpdate={handleUpdateTouchpoint}
                  layoutOrientation="horizontal"
                  onConfirmDraft={handleConfirmDraft}
                  onCancelDraft={handleCancelDraft}
                  playName={playName}
                  audienceAccounts={audienceAccounts}
                  audienceContacts={audienceContacts}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}