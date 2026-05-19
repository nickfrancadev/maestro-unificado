import { useState } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { Header } from '@/app/components/Header';
import { TouchpointTimeline } from '@/app/components/TouchpointTimeline';
import { TouchpointDetails } from '@/app/components/TouchpointDetails';
import { MobileTouchpointModal } from '@/app/components/MobileTouchpointModal';

export interface Touchpoint {
  id: number;
  itemType: 'touchpoint' | 'task'; // Novo campo para diferenciar touchpoints de taskpoints internas
  type: 'AUTORIDADE' | 'ATENÇÃO' | 'INTERESSE' | 'DESEJO' | 'AÇÃO' | 'TASKPOINT';
  title: string;
  channel: string;
  responsibles: string[];
  date: string;
  status: 'Em andamento' | 'Executado' | 'Arquivado';
  description: string;
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
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
}

export default function App() {
  const [selectedTouchpointId, setSelectedTouchpointId] = useState<number>(2);
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([
    {
      id: 1,
      itemType: 'touchpoint',
      type: 'AUTORIDADE',
      title: 'Conectar LinkedIn',
      channel: 'LinkedIn',
      responsibles: ['João Silva'],
      date: '15-01-2026',
      status: 'Executado',
      description: 'Conectar com os principais stakeholders da empresa através do LinkedIn para estabelecer um primeiro contato.',
      subtasks: [],
      attachments: [],
      budget: 0,
      weight: 'Médio',
      score: 8,
      interactions: []
    },
    {
      id: 2,
      itemType: 'task',
      type: 'TASKPOINT',
      title: 'Pesquisar sobre a empresa e seus concorrentes',
      channel: '-',
      responsibles: ['Carlos Mendes'],
      date: '18-01-2026',
      status: 'Em andamento',
      description: 'Realizar pesquisa profunda sobre a empresa alvo, identificando suas principais necessidades, desafios atuais e concorrentes diretos no mercado.',
      subtasks: [
        { id: 'st-t1', title: 'Analisar site institucional', completed: true },
        { id: 'st-t2', title: 'Pesquisar notícias recentes', completed: true },
        { id: 'st-t3', title: 'Mapear concorrentes', completed: false }
      ],
      attachments: [],
      budget: 0,
      weight: 'Médio',
      score: 0,
      interactions: []
    },
    {
      id: 3,
      itemType: 'touchpoint',
      type: 'ATENÇÃO',
      title: 'Email do especialista do projeto',
      channel: 'LinkedIn',
      responsibles: ['Maria Santos'],
      date: '20-01-2026',
      status: 'Em andamento',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae semper velit. Fusce nec lacinia dolor. Cras non hendrerit massa, in imperdiet ligula. Vivamus mollis, purus vel scelerisque porttitor, purus nibh porta ipsum, vel hendrerit metus augue eget est. Pellentesque ut lectus dapibus, sagittis nisi eu, pretium metus. Mauris sed lorem a eros condimentum tristique. Maecenas tempor auctor nisl, et suscipit turpis vehicula non. Vestibulum bibendum est ipsum, a consectetur velit tristique ac.',
      subtasks: [
        { id: 'st1', title: 'Preparar conteúdo do email', completed: true },
        { id: 'st2', title: 'Revisar ortografia', completed: false }
      ],
      attachments: [
        {
          id: 'att1',
          name: 'Titulo-do-anexo.png',
          addedAt: 'Adicionado há 2 horas atrás'
        }
      ],
      budget: 250,
      weight: 'Alto',
      score: 0,
      interactions: [
        { selected: true, name: 'Aline Macedo', role: 'Analista de Vendas', buyingFunction: 'Influenciador(a)' },
        { selected: false, name: 'Aline Macedo', role: 'Analista de Vendas', buyingFunction: 'Influenciador(a)' },
        { selected: false, name: 'Aline Macedo', role: 'Analista de Vendas', buyingFunction: 'Influenciador(a)' }
      ]
    },
    {
      id: 4,
      itemType: 'touchpoint',
      type: 'ATENÇÃO',
      title: 'Envio de vídeo por inbox',
      channel: 'LinkedIn',
      responsibles: ['Pedro Costa'],
      date: '20-01-2026',
      status: 'Em andamento',
      description: 'Enviar vídeo personalizado através do inbox do LinkedIn apresentando nossa solução.',
      subtasks: [],
      attachments: [],
      budget: 100,
      weight: 'Baixo',
      score: 5,
      interactions: []
    }
  ]);

  const selectedTouchpoint = touchpoints.find(t => t.id === selectedTouchpointId);

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
    
    // Swap positions
    [newTouchpoints[currentIndex], newTouchpoints[newIndex]] = 
      [newTouchpoints[newIndex], newTouchpoints[currentIndex]];
    
    setTouchpoints(newTouchpoints);
  };

  const handleAddTouchpoint = (touchpointData: { type: string; title: string; category: string; weight?: string; insertPosition?: number; itemType?: 'touchpoint' | 'task' }) => {
    // Calcula o novo ID baseado no maior ID existente
    const maxId = Math.max(...touchpoints.map(t => t.id), 0);
    const newId = maxId + 1;
    
    const newTouchpoint: Touchpoint = {
      id: newId,
      itemType: touchpointData.itemType || 'touchpoint',
      type: touchpointData.type as Touchpoint['type'],
      title: touchpointData.title,
      channel: touchpointData.itemType === 'task' ? '-' : 'LinkedIn',
      responsibles: [],
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'),
      status: 'Em andamento',
      description: '',
      subtasks: [],
      attachments: [],
      budget: 0,
      weight: (touchpointData.weight as Touchpoint['weight']) || 'Médio',
      score: touchpointData.itemType === 'task' ? 0 : 0,
      interactions: []
    };
    
    // Se tiver insertPosition, inserir na posição específica e renumerar
    if (touchpointData.insertPosition !== undefined) {
      const position = touchpointData.insertPosition;
      
      // Insere o novo touchpoint na posição especificada
      const newTouchpoints = [
        ...touchpoints.slice(0, position),
        newTouchpoint,
        ...touchpoints.slice(position)
      ];
      
      // Renumera todos os IDs para manter a sequência correta
      const renumberedTouchpoints = newTouchpoints.map((t, index) => ({
        ...t,
        id: index + 1
      }));
      
      setTouchpoints(renumberedTouchpoints);
      setSelectedTouchpointId(position + 1); // Seleciona o touchpoint inserido
    } else {
      // Se não tiver posição, adiciona no final
      setTouchpoints([...touchpoints, newTouchpoint]);
      setSelectedTouchpointId(newTouchpoint.id);
    }
  };

  const handleInsertTouchpoint = (touchpointId: number, position: number) => {
    // Encontra o touchpoint que será inserido
    const touchpointToInsert = touchpoints.find(t => t.id === touchpointId);
    if (!touchpointToInsert) return;

    // Remove o touchpoint da posição atual
    const filteredTouchpoints = touchpoints.filter(t => t.id !== touchpointId);
    
    // Insere na nova posição
    const newTouchpoints = [
      ...filteredTouchpoints.slice(0, position),
      touchpointToInsert,
      ...filteredTouchpoints.slice(position)
    ];
    
    setTouchpoints(newTouchpoints);
    setSelectedTouchpointId(touchpointId);
  };

  return (
    <div className="flex h-screen bg-[#edf2f5]">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          layoutOrientation={layoutOrientation}
          onToggleOrientation={() => setLayoutOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
        />
        
        {layoutOrientation === 'vertical' ? (
          /* Layout Vertical: Timeline (esquerda) | Detalhes (direita) */
          <div className="flex-1 flex overflow-hidden">
            <TouchpointTimeline
              touchpoints={touchpoints}
              selectedTouchpointId={selectedTouchpointId}
              onSelectTouchpoint={(id) => {
                setSelectedTouchpointId(id);
                // Em mobile, abre o modal
                if (window.innerWidth < 1024) {
                  setIsMobileModalOpen(true);
                }
              }}
              onCompleteTouchpoint={handleCompleteTouchpoint}
              onReorderTouchpoint={handleReorderTouchpoint}
              onAddTouchpoint={handleAddTouchpoint}
              onInsertTouchpoint={handleInsertTouchpoint}
              layoutOrientation="vertical"
            />
            
            {/* Desktop: Mostra detalhes ao lado */}
            {selectedTouchpoint && (
              <div className="hidden lg:block flex-1">
                <TouchpointDetails
                  touchpoint={selectedTouchpoint}
                  onUpdate={handleUpdateTouchpoint}
                  layoutOrientation="vertical"
                />
              </div>
            )}
          </div>
        ) : (
          /* Layout Horizontal: Timeline (topo) + Detalhes (baixo) */
          <div className="flex-1 flex flex-col overflow-hidden">
            <TouchpointTimeline
              touchpoints={touchpoints}
              selectedTouchpointId={selectedTouchpointId}
              onSelectTouchpoint={(id) => {
                setSelectedTouchpointId(id);
                // Em mobile, abre o modal
                if (window.innerWidth < 1024) {
                  setIsMobileModalOpen(true);
                }
              }}
              onCompleteTouchpoint={handleCompleteTouchpoint}
              onReorderTouchpoint={handleReorderTouchpoint}
              onAddTouchpoint={handleAddTouchpoint}
              onInsertTouchpoint={handleInsertTouchpoint}
              layoutOrientation="horizontal"
            />
            
            {/* Desktop: Mostra detalhes abaixo */}
            {selectedTouchpoint && (
              <div className="hidden lg:block">
                <TouchpointDetails
                  touchpoint={selectedTouchpoint}
                  onUpdate={handleUpdateTouchpoint}
                  layoutOrientation="horizontal"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Modal */}
      <MobileTouchpointModal
        isOpen={isMobileModalOpen}
        touchpoint={selectedTouchpoint || null}
        onClose={() => setIsMobileModalOpen(false)}
        onUpdate={handleUpdateTouchpoint}
      />
    </div>
  );
}