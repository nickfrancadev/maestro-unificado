import { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Filter,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  CheckCircle,
  AlertCircle,
  Clock,
  GripVertical,
  X,
  Plus,
  Users,
  Shield,
  Sparkles,
  Search,
  Heart,
  Handshake
} from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Touchpoint {
  id: string;
  title: string;
  date: Date;
  status: 'completed' | 'in-progress' | 'overdue' | 'scheduled';
  type: string;
}

interface PlayData {
  id: string;
  name: string;
  accountName: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  touchpoints: Touchpoint[];
  color: string;
  connectedTo?: string[]; // IDs of connected plays
}

interface Connection {
  from: string;
  to: string;
}

const INITIAL_PLAYS: PlayData[] = [
  {
    id: 'play-1',
    name: 'Outbound Enterprise',
    accountName: 'Banco Safra',
    startDate: new Date(2026, 2, 1), // March 1, 2026
    endDate: new Date(2026, 4, 15), // May 15, 2026
    progress: 0,
    color: '#3B82F6',
    touchpoints: [
      { id: 'tp-1-1', title: 'Email Inicial', date: new Date(2026, 2, 3), status: 'overdue', type: 'relacionamento' },
      { id: 'tp-1-2', title: 'Follow-up LinkedIn', date: new Date(2026, 2, 10), status: 'overdue', type: 'relacionamento' },
      { id: 'tp-1-3', title: 'Call Discovery', date: new Date(2026, 2, 17), status: 'overdue', type: 'descoberta' },
      { id: 'tp-1-4', title: 'Demo Produto', date: new Date(2026, 2, 24), status: 'overdue', type: 'encantamento' },
      { id: 'tp-1-5', title: 'Proposta Comercial', date: new Date(2026, 3, 7), status: 'overdue', type: 'negociacao' },
      { id: 'tp-1-6', title: 'Negociação', date: new Date(2026, 3, 21), status: 'in-progress', type: 'negociacao' },
      { id: 'tp-1-7', title: 'Fechamento', date: new Date(2026, 4, 5), status: 'scheduled', type: 'negociacao' },
    ]
  },
  {
    id: 'play-2',
    name: 'Upsell Premium',
    accountName: 'Magazine Luiza',
    startDate: new Date(2026, 2, 15),
    endDate: new Date(2026, 5, 30),
    progress: 0,
    color: '#10B981',
    touchpoints: [
      { id: 'tp-2-1', title: 'Apresentação Features', date: new Date(2026, 2, 18), status: 'overdue', type: 'encantamento' },
      { id: 'tp-2-2', title: 'Case Study', date: new Date(2026, 3, 1), status: 'overdue', type: 'autoridade' },
      { id: 'tp-2-3', title: 'Trial Extended', date: new Date(2026, 3, 15), status: 'overdue', type: 'engajamento' },
      { id: 'tp-2-4', title: 'Check-in Semanal', date: new Date(2026, 3, 22), status: 'overdue', type: 'relacionamento' },
      { id: 'tp-2-5', title: 'Review ROI', date: new Date(2026, 4, 10), status: 'in-progress', type: 'autoridade' },
      { id: 'tp-2-6', title: 'Proposta Upsell', date: new Date(2026, 4, 20), status: 'scheduled', type: 'negociacao' },
      { id: 'tp-2-7', title: 'Assinatura', date: new Date(2026, 5, 15), status: 'scheduled', type: 'negociacao' },
    ]
  },
  {
    id: 'play-3',
    name: 'Retenção Churn Risk',
    accountName: 'Natura',
    startDate: new Date(2026, 1, 20),
    endDate: new Date(2026, 3, 30),
    progress: 0,
    color: '#EF4444',
    touchpoints: [
      { id: 'tp-3-1', title: 'Outreach Executivo', date: new Date(2026, 1, 22), status: 'overdue', type: 'relacionamento' },
      { id: 'tp-3-2', title: 'Health Check', date: new Date(2026, 2, 5), status: 'overdue', type: 'descoberta' },
      { id: 'tp-3-3', title: 'Action Plan', date: new Date(2026, 2, 15), status: 'overdue', type: 'engajamento' },
      { id: 'tp-3-4', title: 'Weekly Sync', date: new Date(2026, 2, 22), status: 'overdue', type: 'relacionamento' },
      { id: 'tp-3-5', title: 'Success Review', date: new Date(2026, 3, 10), status: 'overdue', type: 'autoridade' },
      { id: 'tp-3-6', title: 'Renewal Discussion', date: new Date(2026, 3, 20), status: 'in-progress', type: 'negociacao' },
    ]
  },
  {
    id: 'play-4',
    name: 'Partner Co-Sell',
    accountName: 'Ambev',
    startDate: new Date(2026, 3, 1),
    endDate: new Date(2026, 5, 15),
    progress: 0,
    color: '#8B5CF6',
    touchpoints: [
      { id: 'tp-4-1', title: 'Intro Partner', date: new Date(2026, 3, 5), status: 'overdue', type: 'relacionamento' },
      { id: 'tp-4-2', title: 'Joint Discovery', date: new Date(2026, 3, 12), status: 'overdue', type: 'descoberta' },
      { id: 'tp-4-3', title: 'Proposta Conjunta', date: new Date(2026, 3, 26), status: 'in-progress', type: 'negociacao' },
      { id: 'tp-4-4', title: 'Workshop Técnico', date: new Date(2026, 4, 10), status: 'scheduled', type: 'encantamento' },
      { id: 'tp-4-5', title: 'Pilot Start', date: new Date(2026, 4, 24), status: 'scheduled', type: 'engajamento' },
      { id: 'tp-4-6', title: 'Pilot Review', date: new Date(2026, 5, 8), status: 'scheduled', type: 'autoridade' },
    ]
  },
  {
    id: 'play-5',
    name: 'Cross-Sell Analytics',
    accountName: 'Itaú',
    startDate: new Date(2026, 2, 10),
    endDate: new Date(2026, 4, 25),
    progress: 0,
    color: '#F59E0B',
    touchpoints: [
      { id: 'tp-5-1', title: 'Value Proposition', date: new Date(2026, 2, 12), status: 'overdue', type: 'encantamento' },
      { id: 'tp-5-2', title: 'Demo Analytics', date: new Date(2026, 2, 19), status: 'overdue', type: 'encantamento' },
      { id: 'tp-5-3', title: 'Data Integration', date: new Date(2026, 3, 3), status: 'overdue', type: 'descoberta' },
      { id: 'tp-5-4', title: 'POC Setup', date: new Date(2026, 3, 17), status: 'overdue', type: 'engajamento' },
      { id: 'tp-5-5', title: 'Results Review', date: new Date(2026, 4, 1), status: 'in-progress', type: 'autoridade' },
      { id: 'tp-5-6', title: 'Commercial Close', date: new Date(2026, 4, 15), status: 'scheduled', type: 'negociacao' },
    ]
  }
];

const DraggablePlay = ({ play, index, movePlay, onSelectPlay, isSelected, onUpdatePlayDates, DAY_WIDTH, timelineStart, zoom }: any) => {
  const [isDraggingBody, setIsDraggingBody] = useState(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);
  const dragStartRight = useRef(0);

  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    setIsDraggingBody(true);
    dragStartX.current = e.clientX;
  };

  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingLeft(true);
    dragStartLeft.current = e.clientX;
  };

  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingRight(true);
    dragStartRight.current = e.clientX;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingBody) {
        const deltaX = e.clientX - dragStartX.current;
        const daysMoved = Math.round(deltaX / DAY_WIDTH);
        
        if (daysMoved !== 0) {
          const newStartDate = addDays(play.startDate, daysMoved);
          const newEndDate = addDays(play.endDate, daysMoved);
          onUpdatePlayDates(play.id, newStartDate, newEndDate, daysMoved);
          dragStartX.current = e.clientX;
        }
      } else if (isDraggingLeft) {
        const deltaX = e.clientX - dragStartLeft.current;
        const daysMoved = Math.round(deltaX / DAY_WIDTH);
        
        if (daysMoved !== 0) {
          const newStartDate = addDays(play.startDate, daysMoved);
          if (newStartDate < play.endDate) {
            onUpdatePlayDates(play.id, newStartDate, play.endDate, 0);
            dragStartLeft.current = e.clientX;
          }
        }
      } else if (isDraggingRight) {
        const deltaX = e.clientX - dragStartRight.current;
        const daysMoved = Math.round(deltaX / DAY_WIDTH);
        
        if (daysMoved !== 0) {
          const newEndDate = addDays(play.endDate, daysMoved);
          if (newEndDate > play.startDate) {
            onUpdatePlayDates(play.id, play.startDate, newEndDate, 0);
            dragStartRight.current = e.clientX;
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingBody(false);
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingBody || isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingBody, isDraggingLeft, isDraggingRight, play, onUpdatePlayDates, DAY_WIDTH]);

  // Simplified view for very zoomed out views
  const isSimplified = zoom < 0.3;

  if (isSimplified) {
    return (
      <div className="h-full relative" style={{ cursor: isDraggingBody ? 'grabbing' : 'grab' }}>
        {/* Left Resize Handle */}
        <div
          className="resize-handle absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-white/50 transition-colors"
          onMouseDown={handleLeftMouseDown}
        />
        
        {/* Right Resize Handle */}
        <div
          className="resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-white/50 transition-colors"
          onMouseDown={handleRightMouseDown}
        />

        {/* Simplified Bar */}
        <div
          onMouseDown={handleBodyMouseDown}
          onClick={() => onSelectPlay(play.id)}
          className={`h-full rounded transition-all flex items-center justify-center ${
            isSelected ? 'ring-2 ring-white ring-offset-1' : 'hover:opacity-80'
          }`}
          style={{ backgroundColor: play.color }}
          title={`${play.name} - ${play.accountName}`}
        >
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-white/80"
              style={{ width: `${play.progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative" style={{ cursor: isDraggingBody ? 'grabbing' : 'grab' }}>
      {/* Left Resize Handle */}
      <div
        className="resize-handle absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-white/30 transition-colors"
        onMouseDown={handleLeftMouseDown}
      />
      
      {/* Right Resize Handle */}
      <div
        className="resize-handle absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 hover:bg-white/30 transition-colors"
        onMouseDown={handleRightMouseDown}
      />

      <div
        onMouseDown={handleBodyMouseDown}
        onClick={() => onSelectPlay(play.id)}
        className={`h-full rounded-lg border-2 transition-all p-3 flex items-center justify-between ${
          isSelected ? 'border-white shadow-lg' : 'border-transparent hover:border-white/50'
        }`}
        style={{ backgroundColor: `${play.color}dd` }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <GripVertical size={16} className="text-white/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-white truncate">{play.name}</div>
            <div className="text-xs text-white/80 truncate">{play.accountName}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs text-white/70">Progresso</div>
            <div className="text-sm font-bold text-white">{play.progress}%</div>
          </div>
          <div className="w-16 bg-white/20 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-white"
              style={{ width: `${play.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const DraggableTouchpoint = ({ touchpoint, playId, onMoveTouchpoint, DAY_WIDTH, timelineStart, zoom }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartDate = useRef(touchpoint.date);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartDate.current = touchpoint.date;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartX.current;
        const daysMoved = Math.round(deltaX / DAY_WIDTH);
        
        if (daysMoved !== 0) {
          const newDate = addDays(dragStartDate.current, daysMoved);
          onMoveTouchpoint(playId, touchpoint.id, newDate);
          dragStartX.current = e.clientX;
          dragStartDate.current = newDate;
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, touchpoint, playId, onMoveTouchpoint, DAY_WIDTH]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'in-progress': return '#3B82F6';
      case 'overdue': return '#EF4444';
      case 'scheduled': return '#9CA3AF';
      default: return '#9CA3AF';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'relacionamento': return <Users size={14} />;
      case 'autoridade': return <Shield size={14} />;
      case 'encantamento': return <Sparkles size={14} />;
      case 'descoberta': return <Search size={14} />;
      case 'engajamento': return <Heart size={14} />;
      case 'negociacao': return <Handshake size={14} />;
      default: return <Calendar size={14} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'relacionamento': return 'Relacionamento';
      case 'autoridade': return 'Autoridade';
      case 'encantamento': return 'Encantamento';
      case 'descoberta': return 'Descoberta';
      case 'engajamento': return 'Engajamento';
      case 'negociacao': return 'Negociação';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'relacionamento': return '#60C3E8';
      case 'autoridade': return '#8BC53F';
      case 'encantamento': return '#D661D2';
      case 'descoberta': return '#5B9FED';
      case 'engajamento': return '#F56DAD';
      case 'negociacao': return '#FF9966';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'in-progress': return 'Em andamento';
      case 'overdue': return 'Atrasado';
      case 'scheduled': return 'Agendado';
      default: return status;
    }
  };

  const statusColor = getStatusColor(touchpoint.status);
  
  // Simplified view for zoomed out views
  const isSimplified = zoom < 0.5;

  if (isSimplified) {
    // Show only circle for zoomed out views
    return (
      <div
        onMouseDown={handleMouseDown}
        className="absolute group"
        style={{
          opacity: isDragging ? 0.5 : 1,
          zIndex: 10,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div
          className="w-3 h-3 rounded-full border border-white shadow-md transition-all group-hover:scale-150 group-hover:shadow-lg"
          style={{ backgroundColor: statusColor }}
          title={touchpoint.title}
        />
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute group flex items-center gap-2"
      style={{
        opacity: isDragging ? 0.5 : 1,
        zIndex: 10,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      {/* Touchpoint Circle */}
      <div
        className="w-6 h-6 rounded-full border-2 border-white shadow-lg transition-all group-hover:scale-110 shrink-0"
        style={{ backgroundColor: statusColor }}
      />
      
      {/* Card Always Visible */}
      <div 
        className="bg-white rounded-lg shadow-md border-2 p-2 transition-all group-hover:shadow-xl"
        style={{ 
          borderColor: statusColor,
          minWidth: 140,
          maxWidth: 180
        }}
      >
        <div className="font-bold text-xs text-gray-900 leading-tight line-clamp-2 mb-1.5">
          {touchpoint.title}
        </div>
        
        {/* Type - Always Visible */}
        <div className="flex items-center gap-2">
          <div 
            className="p-1 rounded shrink-0"
            style={{ backgroundColor: `${getTypeColor(touchpoint.type)}20`, color: getTypeColor(touchpoint.type) }}
          >
            {getTypeIcon(touchpoint.type)}
          </div>
          <div className="text-xs font-medium" style={{ color: getTypeColor(touchpoint.type) }}>
            {getTypeLabel(touchpoint.type)}
          </div>
        </div>
        
        {/* Additional Info on Hover - Date and Status */}
        <div className="mt-2 pt-2 border-t border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity max-h-0 group-hover:max-h-20 overflow-hidden">
          <div className="text-xs text-gray-500 mb-1">
            {format(touchpoint.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
          <div className="flex items-center gap-1">
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            <span className="text-xs text-gray-600">
              {getStatusLabel(touchpoint.status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function PlaysCanvas() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 2, 13)); // March 13, 2026
  const [viewMode, setViewMode] = useState<'month' | 'quarter' | 'semester' | 'year'>('month');
  const [loadedMonths, setLoadedMonths] = useState<Date[]>([
    new Date(2026, 1, 1), // Feb
    new Date(2026, 2, 1), // March (current)
    new Date(2026, 3, 1), // April
  ]);
  const [plays, setPlays] = useState<PlayData[]>(INITIAL_PLAYS);
  const [selectedPlays, setSelectedPlays] = useState<string[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectMode, setConnectMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string[]>(['completed', 'in-progress', 'overdue', 'scheduled']);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Função para obter abreviação limpa do dia da semana
  const getDayAbbreviation = (date: Date): string => {
    const dayOfWeek = date.getDay();
    const abbreviations = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    return abbreviations[dayOfWeek];
  };

  // Calculate metrics
  const allTouchpoints = plays.flatMap(p => p.touchpoints);
  const inProgressCount = allTouchpoints.filter(tp => tp.status === 'in-progress').length;
  const completedCount = allTouchpoints.filter(tp => tp.status === 'completed').length;
  const overdueCount = allTouchpoints.filter(tp => tp.status === 'overdue').length;
  const scheduledCount = allTouchpoints.filter(tp => tp.status === 'scheduled').length;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const movePlay = (fromIndex: number, toIndex: number) => {
    const updatedPlays = [...plays];
    const [movedPlay] = updatedPlays.splice(fromIndex, 1);
    updatedPlays.splice(toIndex, 0, movedPlay);
    setPlays(updatedPlays);
  };

  const handleSelectPlay = (playId: string) => {
    if (connectMode) {
      if (selectedPlays.includes(playId)) {
        setSelectedPlays(selectedPlays.filter(id => id !== playId));
      } else if (selectedPlays.length === 0) {
        setSelectedPlays([playId]);
      } else if (selectedPlays.length === 1) {
        // Create connection
        const newConnection: Connection = {
          from: selectedPlays[0],
          to: playId
        };
        setConnections([...connections, newConnection]);
        setSelectedPlays([]);
        setConnectMode(false);
      }
    } else {
      if (selectedPlays.includes(playId)) {
        setSelectedPlays(selectedPlays.filter(id => id !== playId));
      } else {
        setSelectedPlays([...selectedPlays, playId]);
      }
    }
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const toggleFilter = (status: string) => {
    if (filterStatus.includes(status)) {
      setFilterStatus(filterStatus.filter(s => s !== status));
    } else {
      setFilterStatus([...filterStatus, status]);
    }
  };

  const removeConnection = (connection: Connection) => {
    setConnections(connections.filter(c => c.from !== connection.from || c.to !== connection.to));
  };

  // Calculate zoom and loaded months based on view mode
  useEffect(() => {
    const baseDate = currentMonth;
    const monthIndex = baseDate.getMonth();
    const year = baseDate.getFullYear();

    switch (viewMode) {
      case 'month':
        // Show 3 months (prev, current, next)
        setLoadedMonths([
          subMonths(baseDate, 1),
          baseDate,
          addMonths(baseDate, 1)
        ]);
        setZoom(1);
        break;
      case 'quarter':
        // Show quarter (3 months) + 1 month before and after
        const quarterStartMonth = Math.floor(monthIndex / 3) * 3;
        const quarterStart = new Date(year, quarterStartMonth, 1);
        setLoadedMonths([
          subMonths(quarterStart, 1),
          quarterStart,
          addMonths(quarterStart, 1),
          addMonths(quarterStart, 2),
          addMonths(quarterStart, 3)
        ]);
        setZoom(0.33);
        break;
      case 'semester':
        // Show semester (6 months) + 1 month before and after
        const semesterStartMonth = Math.floor(monthIndex / 6) * 6;
        const semesterStart = new Date(year, semesterStartMonth, 1);
        setLoadedMonths([
          subMonths(semesterStart, 1),
          semesterStart,
          addMonths(semesterStart, 1),
          addMonths(semesterStart, 2),
          addMonths(semesterStart, 3),
          addMonths(semesterStart, 4),
          addMonths(semesterStart, 5),
          addMonths(semesterStart, 6)
        ]);
        setZoom(0.16);
        break;
      case 'year':
        // Show full year + 1 month before and after
        const yearStart = new Date(year, 0, 1);
        setLoadedMonths([
          subMonths(yearStart, 1),
          ...Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i)),
          addMonths(yearStart, 12)
        ]);
        setZoom(0.08);
        break;
    }
  }, [viewMode, currentMonth]);

  const DAY_WIDTH = 48 * zoom;
  const PLAY_HEIGHT = zoom < 0.3 ? 60 : 120; // Reduce height for zoomed out views

  // Scroll handler for infinite loading
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleScroll = () => {
      if (isLoadingRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = canvas;
      const scrollPercentage = scrollLeft / (scrollWidth - clientWidth);

      // Load next month if scrolled near end (90%)
      if (scrollPercentage > 0.9) {
        isLoadingRef.current = true;
        const lastMonth = loadedMonths[loadedMonths.length - 1];
        const nextMonth = addMonths(lastMonth, 1);
        setLoadedMonths([...loadedMonths, nextMonth]);
        setTimeout(() => {
          isLoadingRef.current = false;
        }, 100);
      }

      // Load previous month if scrolled near start (10%)
      if (scrollPercentage < 0.1 && scrollLeft > 0) {
        isLoadingRef.current = true;
        const firstMonth = loadedMonths[0];
        const prevMonth = subMonths(firstMonth, 1);
        setLoadedMonths([prevMonth, ...loadedMonths]);
        
        // Maintain scroll position after adding month to the left
        setTimeout(() => {
          const firstMonthDays = eachDayOfInterval({
            start: startOfMonth(prevMonth),
            end: endOfMonth(prevMonth)
          }).length;
          canvas.scrollLeft = scrollLeft + (firstMonthDays * DAY_WIDTH);
          isLoadingRef.current = false;
        }, 0);
      }
    };

    canvas.addEventListener('scroll', handleScroll);
    return () => canvas.removeEventListener('scroll', handleScroll);
  }, [loadedMonths, DAY_WIDTH]);

  // Calculate all days from all loaded months
  const allDays = loadedMonths.flatMap(month => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  });

  const timelineStart = allDays[0];
  const timelineEnd = allDays[allDays.length - 1];

  // Auto-scroll to today on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const today = new Date();
    if (today >= timelineStart && today <= timelineEnd) {
      const todayDiff = differenceInDays(today, timelineStart);
      const todayPos = todayDiff * DAY_WIDTH;
      
      // Center today in the viewport
      const centerOffset = canvas.clientWidth / 2 - DAY_WIDTH / 2;
      canvas.scrollLeft = Math.max(0, todayPos - centerOffset);
    }
  }, []); // Empty dependency array to run only once on mount

  const onUpdatePlayDates = (playId: string, newStartDate: Date, newEndDate: Date, daysMoved: number) => {
    const updatedPlays = plays.map(play => {
      if (play.id === playId) {
        return {
          ...play,
          startDate: newStartDate,
          endDate: newEndDate,
          progress: daysMoved !== 0 ? Math.min(100, Math.max(0, play.progress + (daysMoved * 100 / (differenceInDays(play.endDate, play.startDate) + 1)))) : play.progress
        };
      }
      return play;
    });
    setPlays(updatedPlays);
  };

  const onMoveTouchpoint = (playId: string, touchpointId: string, newDate: Date) => {
    const updatedPlays = plays.map(play => {
      if (play.id === playId) {
        return {
          ...play,
          touchpoints: play.touchpoints.map(tp => {
            if (tp.id === touchpointId) {
              return {
                ...tp,
                date: newDate
              };
            }
            return tp;
          })
        };
      }
      return play;
    });
    setPlays(updatedPlays);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex-1 overflow-hidden bg-[#edf2f5] flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#212a46]">Canvas de Plays Ativas</h1>
              <p className="text-sm text-gray-600">
                Visualize e gerencie o timeline de todas as suas plays em execução
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-2 text-xs font-bold transition-all ${
                    viewMode === 'month' 
                      ? 'bg-[#FF5F39] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Mês
                </button>
                <button
                  onClick={() => setViewMode('quarter')}
                  className={`px-3 py-2 text-xs font-bold transition-all border-l border-gray-300 ${
                    viewMode === 'quarter' 
                      ? 'bg-[#FF5F39] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Trimestre
                </button>
                <button
                  onClick={() => setViewMode('semester')}
                  className={`px-3 py-2 text-xs font-bold transition-all border-l border-gray-300 ${
                    viewMode === 'semester' 
                      ? 'bg-[#FF5F39] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Semestre
                </button>
                <button
                  onClick={() => setViewMode('year')}
                  className={`px-3 py-2 text-xs font-bold transition-all border-l border-gray-300 ${
                    viewMode === 'year' 
                      ? 'bg-[#FF5F39] text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Ano
                </button>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <ZoomOut size={18} />
              </button>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                <ZoomIn size={18} />
              </button>
              <button className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                <Maximize2 size={18} />
              </button>
              <div className="w-px h-8 bg-gray-300"></div>
              <button
                onClick={() => setConnectMode(!connectMode)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: connectMode ? '#FF5F39' : 'white',
                  color: connectMode ? 'white' : '#212a46',
                  border: connectMode ? 'none' : '1px solid #e5e7eb'
                }}
              >
                <div className="flex items-center gap-2">
                  <LinkIcon size={16} />
                  {connectMode ? 'Cancelar Conexão' : 'Conectar Plays'}
                </div>
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-900">Em Andamento</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-xs font-bold text-green-900">Concluídos</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={16} className="text-red-600" />
                <span className="text-xs font-bold text-red-900">Atrasados</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-gray-600" />
                <span className="text-xs font-bold text-gray-900">Agendados</span>
              </div>
              <div className="text-2xl font-bold text-gray-600">{scheduledCount}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-600" />
              <span className="text-sm font-bold text-gray-700">Filtros:</span>
              <button
                onClick={() => toggleFilter('completed')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: filterStatus.includes('completed') ? '#D1FAE5' : '#F3F4F6',
                  color: filterStatus.includes('completed') ? '#065F46' : '#6B7280',
                  border: `1px solid ${filterStatus.includes('completed') ? '#10B981' : '#E5E7EB'}`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Finalizado
              </button>
              <button
                onClick={() => toggleFilter('in-progress')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: filterStatus.includes('in-progress') ? '#DBEAFE' : '#F3F4F6',
                  color: filterStatus.includes('in-progress') ? '#1E40AF' : '#6B7280',
                  border: `1px solid ${filterStatus.includes('in-progress') ? '#3B82F6' : '#E5E7EB'}`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                Andamento
              </button>
              <button
                onClick={() => toggleFilter('overdue')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: filterStatus.includes('overdue') ? '#FEE2E2' : '#F3F4F6',
                  color: filterStatus.includes('overdue') ? '#991B1B' : '#6B7280',
                  border: `1px solid ${filterStatus.includes('overdue') ? '#EF4444' : '#E5E7EB'}`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Atrasado
              </button>
              <button
                onClick={() => toggleFilter('scheduled')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: filterStatus.includes('scheduled') ? '#F3F4F6' : '#F3F4F6',
                  color: filterStatus.includes('scheduled') ? '#374151' : '#6B7280',
                  border: `1px solid ${filterStatus.includes('scheduled') ? '#9CA3AF' : '#E5E7EB'}`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                Agendado
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold text-gray-700 min-w-[180px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronRight size={18} />
            </button>
            <button
              onClick={goToToday}
              className="ml-2 px-3 py-2 bg-[#FF5F39] text-white rounded-lg text-xs font-bold hover:bg-[#E54D29]"
            >
              Ir para hoje
            </button>
          </div>
        </div>

        {/* Active Connections */}
        {connections.length > 0 && (
          <div className="bg-purple-50 border-b border-purple-200 px-6 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-purple-900">Conexões Ativas:</span>
              {connections.map((conn, idx) => {
                const fromPlay = plays.find(p => p.id === conn.from);
                const toPlay = plays.find(p => p.id === conn.to);
                return (
                  <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-purple-300">
                    <span className="text-xs text-purple-900">
                      {fromPlay?.name} → {toPlay?.name}
                    </span>
                    <button
                      onClick={() => removeConnection(conn)}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 overflow-auto relative" ref={canvasRef}>
          {/* Timeline */}
          <div className="relative" style={{ minHeight: '100%' }}>
            {/* Days Header */}
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 flex z-20">
              {allDays.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                const showSimplified = zoom < 0.2;
                
                // For very zoomed out views, only show every 7th day
                if (showSimplified && day.getDate() !== 1 && day.getDate() % 7 !== 0) {
                  return (
                    <div
                      key={`${day.getTime()}-${idx}`}
                      className="shrink-0 border-r border-gray-200"
                      style={{ width: DAY_WIDTH }}
                    />
                  );
                }
                
                return (
                  <div
                    key={`${day.getTime()}-${idx}`}
                    className="shrink-0 border-r border-gray-200 text-center py-2 px-1 relative"
                    style={{ width: DAY_WIDTH }}
                  >
                    {!showSimplified && (
                      <div className={`text-xs font-bold uppercase ${isToday ? 'text-[#FF5F39]' : 'text-gray-700'}`}>
                        {getDayAbbreviation(day)}
                      </div>
                    )}
                    <div className={`${showSimplified ? 'text-xs' : 'text-sm'} font-bold ${isToday ? 'text-[#FF5F39]' : 'text-gray-800'}`}>
                      {format(day, showSimplified ? 'dd' : 'dd/MM')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plays Timeline */}
            <div className="relative">
              {plays.map((play, playIndex) => {
                const playStart = play.startDate;
                const playEnd = play.endDate;
                
                // Calculate position based on timeline start
                const startDiff = differenceInDays(playStart, timelineStart);
                const duration = differenceInDays(playEnd, playStart) + 1;
                
                const leftPos = startDiff * DAY_WIDTH;
                const width = duration * DAY_WIDTH;

                return (
                  <div
                    key={play.id}
                    className="relative border-b border-gray-100"
                    style={{ height: PLAY_HEIGHT }}
                  >
                    {/* Timeline Grid */}
                    <div className="absolute inset-0 flex">
                      {allDays.map((day, idx) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={`grid-${day.getTime()}-${idx}`}
                            className="shrink-0 border-r border-gray-100"
                            style={{
                              width: DAY_WIDTH,
                              backgroundColor: isToday ? 'rgba(255, 95, 57, 0.05)' : 'transparent'
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Play Card with Touchpoints Inside */}
                    {leftPos >= -width && leftPos < allDays.length * DAY_WIDTH && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 z-[5]"
                        style={{
                          left: Math.max(0, leftPos),
                          width: Math.min(width, (allDays.length * DAY_WIDTH) - Math.max(0, leftPos)),
                          height: 70,
                        }}
                      >
                        <div className="relative h-full">
                          <DraggablePlay
                            play={play}
                            index={playIndex}
                            movePlay={movePlay}
                            onSelectPlay={handleSelectPlay}
                            isSelected={selectedPlays.includes(play.id)}
                            onUpdatePlayDates={onUpdatePlayDates}
                            DAY_WIDTH={DAY_WIDTH}
                            timelineStart={timelineStart}
                            zoom={zoom}
                          />
                          
                          {/* Touchpoints positioned relative to play card */}
                          {play.touchpoints
                            .filter(tp => filterStatus.includes(tp.status))
                            .map(tp => {
                              // Calculate touchpoint position relative to play start
                              const tpFromPlayStart = differenceInDays(tp.date, playStart);
                              const tpPosInPlay = tpFromPlayStart * DAY_WIDTH + (DAY_WIDTH / 2);

                              // Only show if touchpoint is within the visible part of the play
                              const playVisibleStart = Math.max(0, -leftPos);
                              const playVisibleEnd = Math.min(width, allDays.length * DAY_WIDTH - leftPos);

                              if (tpPosInPlay < playVisibleStart || tpPosInPlay > playVisibleEnd) return null;

                              return (
                                <div
                                  key={tp.id}
                                  style={{
                                    position: 'absolute',
                                    left: tpPosInPlay,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                  }}
                                >
                                  <DraggableTouchpoint
                                    touchpoint={tp}
                                    playId={play.id}
                                    onMoveTouchpoint={onMoveTouchpoint}
                                    DAY_WIDTH={DAY_WIDTH}
                                    timelineStart={timelineStart}
                                    zoom={zoom}
                                  />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Today Line */}
            {(() => {
              const today = new Date();
              if (today >= timelineStart && today <= timelineEnd) {
                const todayDiff = differenceInDays(today, timelineStart);
                const todayPos = todayDiff * DAY_WIDTH + (DAY_WIDTH / 2);
                
                return (
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-[#FF5F39] pointer-events-none z-10"
                    style={{ left: todayPos }}
                  >
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#FF5F39] text-white text-xs font-bold rounded whitespace-nowrap">
                      Hoje
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}