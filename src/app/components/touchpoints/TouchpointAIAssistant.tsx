import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Zap, ChevronRight, Brain, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { Touchpoint } from './TouchpointTimeline';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'reasoning';
  content: string;
  timestamp: Date;
  actions?: ActionSuggestion[];
  reasoningStep?: ReasoningStep;
}

interface ActionSuggestion {
  label: string;
  command: string;
}

interface ReasoningStep {
  label: string;
  icon: string;
  fullText: string;
  status: 'streaming' | 'done';
  visibleText: string;
}

interface TouchpointAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  touchpoints: Touchpoint[];
  onUpdateTouchpoint: (t: Touchpoint) => void;
  onAddTouchpoint: (data: {
    type: string; title: string; category: string; weight?: string;
    insertPosition?: number; itemType?: 'touchpoint' | 'task';
    channel?: string; date?: string; responsibles?: string[];
    description?: string;
  }) => void;
  playName?: string;
  accountName?: string;
  isNewPlay?: boolean;
  dossierContaName?: string;
  dossierContatoName?: string;
  gtmName?: string;
  produtoName?: string;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const QUICK_COMMANDS = [
  { label: '📋 Listar itens', command: 'liste todos os itens da timeline' },
  { label: '➕ Criar touchpoint', command: 'crie um touchpoint de engajamento via LinkedIn' },
  { label: '✅ Criar taskpoint', command: 'crie uma taskpoint interna chamada Pesquisa de concorrentes' },
  { label: '📊 Resumo da play', command: 'me dê um resumo desta play' },
  { label: '🎯 Próximo passo', command: 'sugira o próximo touchpoint ideal para esta play' },
];

// ─── Reasoning text generators ────────────────────────────────────────────────

function buildReasoningTexts(
  dossierConta: string,
  dossierContato: string,
  gtm: string,
  produto: string,
  account: string,
) {
  return {
    conta: `Abrindo dossiê de conta "${dossierConta}"...\n\nIdentificando perfil da empresa ${account}:\n→ Setor: Financeiro / Tecnologia B2B\n→ Porte: Enterprise (500+ funcionários)\n→ Maturidade digital: Alta\n→ Dores prioritárias: eficiência operacional, escalabilidade e redução de CAC\n→ Budget estimado: R$ 180k–300k/ano\n→ Ciclo de compra médio: 60–90 dias\n→ Nível de urgência: Médio-alto (iniciativa aprovada em Q1)\n\nDecisores identificados: 3 stakeholders-chave\nInfluenciadores mapeados: 2 perfis técnicos\nRisco de churn: Baixo — conta estratégica com fit alto.`,

    contato: `Carregando dossiê de contato "${dossierContato}"...\n\nPerfil comportamental:\n→ Cargo: Diretor de Operações\n→ Estilo: Analítico, orientado a dados e ROI\n→ Canal preferido: LinkedIn (ativo diariamente) + Email (manhãs)\n→ Último contato: há 12 dias — aguardando follow-up\n→ Tom ideal: consultivo, sem jargões excessivos\n\nHistórico de interações:\n→ Abriu 3 de 4 emails anteriores ✓\n→ Clicou em case study do setor financeiro ✓\n→ Participou de webinar sobre ABM em Fev/26 ✓\n\nSinal de compra detectado: interesse em demo técnica.\nRecomendação: abordar com prova social e personalização alta.`,

    gtm: `Processando estratégia GTM "${gtm}"...\n\nMomento atual da jornada: Consideração → Decisão\nICP score: 87/100 — fit muito alto\n\nMensagem central validada:\n"Reduza o tempo de fechamento em 40% com inteligência de conta em tempo real"\n\nCanais priorizados pelo GTM:\n1. LinkedIn (organic + InMail) — awareness e autoridade\n2. Email personalizado — nurturing e proposta\n3. Videoconferência — demo e negociação\n\nMomentos críticos identificados:\n→ M1: Abertura de conexão e aquecimento\n→ M2: Entrega de valor com case relevante\n→ M3: Demo consultiva com customização\n→ M4: Proposta e fechamento\n\nOportunidade de expansão: upsell identificado pós-contrato.`,

    produto: `Mapeando aderência do produto "${produto}" ao perfil...\n\nScore de fit produto-conta: 91/100 ⭐\n\nDiferenciais mais relevantes para este perfil:\n→ Automação de ABM multi-canal com IA preditiva\n→ Analytics de engajamento em tempo real\n→ Integração nativa com Salesforce e HubSpot\n→ Onboarding dedicado em 30 dias\n\nCase de sucesso comparável:\n"Empresa similar do setor financeiro atingiu +38% na taxa de conversão em 90 dias após implementação"\n\nObjeções prováveis e respostas:\n→ "Preço alto" → ROI de 3x em 6 meses documentado\n→ "Integração complexa" → API REST + equipe dedicada\n→ "Mudança cultural" → Treinamento incluído no plano\n\nPlano sugerido: Enterprise Anual com piloto de 30 dias.`,
  };
}

// ─── Items to be created after analysis ──────────────────────────────────────

function buildPlayItems(account: string, contato: string, produto: string) {
  return [
    {
      itemType: 'touchpoint' as const,
      type: 'AUTORIDADE',
      title: 'Conexão LinkedIn com decisor principal',
      category: 'Autoridade',
      channel: 'LinkedIn',
      weight: 'Alto' as const,
      description: `Conectar com o decisor principal de ${account} via LinkedIn com mensagem personalizada. Referenciar interesse demonstrado no webinar de ABM. Tom consultivo, sem pitch direto na primeira abordagem.`,
      subtasks: [
        'Personalizar mensagem de conexão com referência ao webinar',
        'Mapear rede de 2º grau em comum',
        'Agendar follow-up 48h após aceite',
      ],
      interactions: [{ name: contato, role: 'Diretor de Operações', buyingFunction: 'Decisor', selected: true }],
    },
    {
      itemType: 'task' as const,
      type: 'TASKPOINT',
      title: 'Pesquisa aprofundada da stack tecnológica',
      category: 'Pesquisa',
      channel: '-',
      weight: 'Médio' as const,
      description: `Mapear as ferramentas e sistemas utilizados atualmente por ${account}. Identificar pontos de integração com ${produto} e possíveis friction points técnicos.`,
      subtasks: [
        'Verificar integrações disponíveis no site institucional',
        'Pesquisar perfis técnicos no LinkedIn da empresa',
        'Checar reviews no G2/Capterra sobre ferramentas atuais',
        'Documentar gaps que o produto resolve',
      ],
      interactions: [],
    },
    {
      itemType: 'touchpoint' as const,
      type: 'ATENÇÃO',
      title: 'Email com case de sucesso do setor financeiro',
      category: 'Atenção',
      channel: 'Email',
      weight: 'Alto' as const,
      description: `Envio de email personalizado para ${contato} com case de empresa financeira similar que atingiu +38% de conversão usando ${produto}. Incluir métricas específicas e convite para call de 20 minutos.`,
      subtasks: [
        'Adaptar case study para linguagem da conta',
        'Incluir métricas de ROI específicas do setor',
        'Criar CTA claro para agendamento de call',
        'Configurar rastreamento de abertura',
      ],
      interactions: [{ name: contato, role: 'Diretor de Operações', buyingFunction: 'Decisor', selected: true }],
    },
    {
      itemType: 'touchpoint' as const,
      type: 'ATENÇÃO',
      title: 'Call de descoberta de necessidades',
      category: 'Atenção',
      channel: 'Videoconferência',
      weight: 'Alto' as const,
      description: `Call consultiva de 30 minutos para aprofundar as dores e necessidades de ${account}. Usar framework de descoberta: situação atual → dores → impacto → necessidade de solução. Não apresentar produto nesta etapa.`,
      subtasks: [
        'Preparar roteiro de perguntas de descoberta',
        'Pesquisar notícias recentes da empresa',
        'Configurar sala de videoconferência',
        'Registrar insights no CRM após a call',
      ],
      interactions: [{ name: contato, role: 'Diretor de Operações', buyingFunction: 'Decisor', selected: true }],
    },
    {
      itemType: 'task' as const,
      type: 'TASKPOINT',
      title: 'Preparar proposta de valor customizada',
      category: 'Pesquisa',
      channel: '-',
      weight: 'Alto' as const,
      description: `Montar proposta comercial personalizada para ${account} com base nas dores identificadas na call de descoberta. Destacar ROI de 3x em 6 meses e incluir plano de onboarding dedicado.`,
      subtasks: [
        'Cruzar dores levantadas com features do produto',
        'Calcular ROI estimado para o perfil da conta',
        'Incluir timeline de implementação realista',
        'Adicionar depoimento de cliente similar',
        'Revisão com equipe antes do envio',
      ],
      interactions: [],
    },
    {
      itemType: 'touchpoint' as const,
      type: 'ENCANTAMENTO',
      title: `Demo personalizada do ${produto}`,
      category: 'Encantamento',
      channel: 'Videoconferência',
      weight: 'Alto' as const,
      description: `Demonstração técnica de ${produto} com casos de uso específicos para ${account}. Mostrar integração com o stack atual identificado e simular cenário real da operação do cliente. Duração: 45 minutos + 15 de Q&A.`,
      subtasks: [
        'Preparar ambiente de demo com dados simulados da conta',
        'Configurar cenário de uso específico para o setor',
        'Incluir módulo de analytics em tempo real',
        'Preparar respostas para objeções de preço e integração',
        'Enviar gravação e próximos passos após a demo',
      ],
      interactions: [{ name: contato, role: 'Diretor de Operações', buyingFunction: 'Decisor', selected: true }],
    },
  ];
}

// ─── Command parser ───────────────────────────────────────────────────────────

function parseCommand(
  input: string,
  touchpoints: Touchpoint[],
  onUpdateTouchpoint: (t: Touchpoint) => void,
  onAddTouchpoint: TouchpointAIAssistantProps['onAddTouchpoint'],
  playName?: string,
  accountName?: string,
): { reply: string; actions?: ActionSuggestion[] } {
  const lower = input.toLowerCase();

  if (lower.includes('list') || lower.includes('liste') || lower.includes('mostrar todos') || lower.includes('quais são')) {
    if (touchpoints.length === 0) {
      return { reply: 'A timeline ainda está vazia. Que tal criar o primeiro touchpoint?' };
    }
    const lines = touchpoints.map((t, i) =>
      `**${i + 1}. ${t.title}** — ${t.itemType === 'task' ? '✅ Taskpoint' : '💬 Touch'} | ${t.status} | ${t.channel}`
    ).join('\n');
    return {
      reply: `Aqui estão os ${touchpoints.length} itens da timeline:\n\n${lines}`,
      actions: [{ label: 'Resumo da play', command: 'me dê um resumo desta play' }]
    };
  }

  if (lower.includes('resumo') || lower.includes('visão geral') || lower.includes('overview')) {
    const done = touchpoints.filter(t => t.status === 'Executado').length;
    const inProgress = touchpoints.filter(t => t.status === 'Em andamento').length;
    const tasks = touchpoints.filter(t => t.itemType === 'task').length;
    const touches = touchpoints.filter(t => t.itemType === 'touchpoint').length;
    return {
      reply: `📊 **Resumo da Play "${playName || 'atual'}"** para ${accountName || 'a conta'}:\n\n• **${touchpoints.length}** itens no total\n• **${touches}** touchpoints e **${tasks}** taskpoints internas\n• **${done}** executados ✅ e **${inProgress}** em andamento 🔄`,
      actions: [{ label: 'Sugerir próximo passo', command: 'sugira o próximo touchpoint ideal' }]
    };
  }

  if (lower.includes('sugir') || lower.includes('próximo') || lower.includes('proximo') || lower.includes('recomendar')) {
    const hasEmail = touchpoints.some(t => t.channel === 'Email');
    const suggestion = hasEmail
      ? 'Agendar reunião de descoberta por videoconferência'
      : 'Enviar email personalizado com case de sucesso do setor';
    return {
      reply: `💡 **Próximo passo recomendado:**\n\n_${suggestion}_`,
      actions: [{ label: 'Criar este touchpoint', command: `crie um touchpoint: ${suggestion}` }]
    };
  }

  if (lower.includes('canal') && lower.includes('para')) {
    const numMatch = lower.match(/\d+/);
    const channelWords = ['linkedin', 'email', 'whatsapp', 'telefone', 'presencial', 'videoconferência'];
    const newChannel = channelWords.find(c => lower.includes(c));
    if (numMatch && newChannel) {
      const idx = parseInt(numMatch[0]) - 1;
      const target = touchpoints[idx];
      if (target && target.itemType === 'touchpoint') {
        const fmt = newChannel.charAt(0).toUpperCase() + newChannel.slice(1);
        onUpdateTouchpoint({ ...target, channel: fmt });
        return { reply: `✅ Canal de **"${target.title}"** atualizado para **${fmt}**!` };
      }
    }
    return { reply: 'Informe o número do touchpoint e o novo canal. Ex: _"mude o canal do touchpoint 2 para Email"_' };
  }

  if (lower.includes('renomear') || lower.includes('mude o nome') || lower.includes('altere o título')) {
    const numMatch = lower.match(/\d+/);
    const quoteMatch = input.match(/"([^"]+)"/);
    const paraMatch = input.match(/para\s+(.+?)(?:$|,)/i);
    const newTitle = quoteMatch?.[1] || paraMatch?.[1];
    if (numMatch && newTitle) {
      const target = touchpoints[parseInt(numMatch[0]) - 1];
      if (target) {
        onUpdateTouchpoint({ ...target, title: newTitle.trim() });
        return { reply: `✅ Renomeado para **"${newTitle.trim()}"**!` };
      }
    }
    return { reply: 'Indique o número e o novo título. Ex: _"renomeie o item 2 para \\"Follow-up Email\\""_' };
  }

  if (lower.includes('executad') || lower.includes('concluíd') || lower.includes('marcar como feito')) {
    const numMatch = lower.match(/\d+/);
    if (numMatch) {
      const target = touchpoints[parseInt(numMatch[0]) - 1];
      if (target) {
        onUpdateTouchpoint({ ...target, status: 'Executado' });
        return { reply: `✅ **"${target.title}"** marcado como **Executado**!` };
      }
    }
    return { reply: 'Qual item deseja marcar como executado? Ex: _"marque o item 1 como executado"_' };
  }

  if (lower.includes('crie') || lower.includes('criar') || lower.includes('adicione') || lower.includes('novo touchpoint') || lower.includes('nova taskpoint')) {
    const isTask = lower.includes('taskpoint') || lower.includes('task');
    const channels: Record<string, string> = {
      linkedin: 'LinkedIn', email: 'Email', whatsapp: 'WhatsApp',
      telefone: 'Telefone', presencial: 'Presencial', videoconferência: 'Videoconferência'
    };
    const channelKey = Object.keys(channels).find(k => lower.includes(k));
    const channel = channelKey ? channels[channelKey] : 'LinkedIn';
    const quoteMatch = input.match(/"([^"]+)"/);
    const chamadaMatch = input.match(/chamad[ao]\s+(.+?)(?:\s+via|\s+por|$)/i);
    const title = quoteMatch?.[1] || chamadaMatch?.[1] || (isTask ? 'Nova Taskpoint Interna' : `Touchpoint via ${channel}`);
    const type = isTask ? 'TASKPOINT' : 'ENGAJAMENTO';
    const category = isTask ? 'Atividade' : 'Engajamento';
    onAddTouchpoint({ type, title, category, itemType: isTask ? 'task' : 'touchpoint', channel: isTask ? '-' : channel });
    return {
      reply: `✅ ${isTask ? 'Taskpoint' : 'Touchpoint'} **"${title}"** criado na timeline!`,
      actions: [{ label: 'Ver todos', command: 'liste todos os itens da timeline' }]
    };
  }

  if (lower.includes('ajuda') || lower.includes('help') || lower.includes('o que você pode')) {
    return {
      reply: '🤖 Posso te ajudar com:\n\n• **Listar** todos os itens\n• **Criar** touchpoints ou taskpoints\n• **Renomear** qualquer item\n• **Mudar canal** de touchpoints\n• **Marcar** como executado\n• **Resumir** a play\n• **Sugerir** próximos passos',
      actions: QUICK_COMMANDS.slice(0, 3).map(q => ({ label: q.label, command: q.command }))
    };
  }

  return {
    reply: `Não consegui identificar o comando. Tente:\n\n• _"Liste os touchpoints"_\n• _"Crie um touchpoint via Email"_\n• _"Resumo da play"_`,
    actions: QUICK_COMMANDS.slice(0, 3).map(q => ({ label: q.label, command: q.command }))
  };
}

// ─── Reasoning bubble component ───────────────────────────────────────────────

function ReasoningBubble({ step }: { step: ReasoningStep }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
        <Brain className="w-3 h-3 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <button
          onClick={() => step.status === 'done' && setCollapsed(c => !c)}
          className={`w-full text-left border rounded-xl overflow-hidden transition-all ${
            step.status === 'streaming'
              ? 'border-violet-200 bg-violet-50'
              : 'border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100'
          }`}
        >
          {/* Step header */}
          <div className="px-3 py-2 flex items-center gap-2">
            {step.status === 'streaming' ? (
              <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            )}
            <span className="text-[11px] font-semibold text-gray-700 flex-1">{step.icon} {step.label}</span>
            {step.status === 'done' && (
              collapsed
                ? <ChevronDown className="w-3 h-3 text-gray-400" />
                : <ChevronUp className="w-3 h-3 text-gray-400" />
            )}
          </div>

          {/* Streaming text */}
          {!collapsed && (
            <div className="px-3 pb-3 border-t border-violet-100">
              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-mono leading-relaxed mt-2">
                {step.visibleText}
                {step.status === 'streaming' && (
                  <span className="inline-block w-1.5 h-3 bg-violet-400 ml-0.5 animate-pulse rounded-sm" />
                )}
              </pre>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Creation progress badge ──────────────────────────────────────────────────

function CreationBadge({ title, index, done }: { title: string; index: number; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all ${
      done ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'
    }`}>
      {done
        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        : <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
      <span className={done ? 'text-emerald-700' : 'text-gray-500'}>{title}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TouchpointAIAssistant({
  isOpen, onClose, touchpoints, onUpdateTouchpoint, onAddTouchpoint,
  playName, accountName, isNewPlay,
  dossierContaName, dossierContatoName, gtmName, produtoName,
}: TouchpointAIAssistantProps) {

  const resolvedConta = dossierContaName || 'Dossiê de Conta';
  const resolvedContato = dossierContatoName || 'Dossiê de Contato';
  const resolvedGtm = gtmName || 'GTM';
  const resolvedProduto = produtoName || 'Produto';
  const resolvedAccount = accountName || 'a conta';

  const reasoningTexts = buildReasoningTexts(resolvedConta, resolvedContato, resolvedGtm, resolvedProduto, resolvedAccount);
  const playItems = buildPlayItems(resolvedAccount, resolvedContato, resolvedProduto);

  const REASONING_STEPS: { label: string; icon: string; text: string }[] = [
    { label: `Dossiê de Conta — ${resolvedConta}`, icon: '🏛️', text: reasoningTexts.conta },
    { label: `Dossiê de Contato — ${resolvedContato}`, icon: '👤', text: reasoningTexts.contato },
    { label: `Estratégia GTM — ${resolvedGtm}`, icon: '📣', text: reasoningTexts.gtm },
    { label: `Produto — ${resolvedProduto}`, icon: '📦', text: reasoningTexts.produto },
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  // Reasoning steps state: each has visibleText and status
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  // Which step is currently streaming (-1 = none)
  const [activeStep, setActiveStep] = useState(-1);
  // Creation progress
  const [creationItems, setCreationItems] = useState<{ title: string; done: boolean }[]>([]);
  const [creationStarted, setCreationStarted] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, reasoningSteps, creationItems, activeStep]);

  // ── Focus input ──
  useEffect(() => {
    if (isOpen && analysisDone) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, analysisDone]);

  // ── Stream a single reasoning step ──
  const streamStep = useCallback((stepIndex: number, onDone: () => void) => {
    const fullText = REASONING_STEPS[stepIndex].text;
    let charIndex = 0;
    const chunkSize = 4; // chars per tick

    setReasoningSteps(prev => {
      const next = [...prev];
      next[stepIndex] = { ...next[stepIndex], status: 'streaming', visibleText: '' };
      return next;
    });
    setActiveStep(stepIndex);

    streamIntervalRef.current = setInterval(() => {
      charIndex += chunkSize;
      const slice = fullText.slice(0, charIndex);
      setReasoningSteps(prev => {
        const next = [...prev];
        next[stepIndex] = { ...next[stepIndex], visibleText: slice };
        return next;
      });

      if (charIndex >= fullText.length) {
        clearInterval(streamIntervalRef.current!);
        setReasoningSteps(prev => {
          const next = [...prev];
          next[stepIndex] = { ...next[stepIndex], status: 'done', visibleText: fullText };
          return next;
        });
        setActiveStep(-1);
        onDone();
      }
    }, 18);
  }, []);

  // ── Run creation sequence ──
  const runCreation = useCallback(() => {
    setCreationStarted(true);

    // Add "creating" intro message
    setMessages(prev => [...prev, {
      id: `creating-intro`,
      role: 'assistant',
      content: `✅ **Análise concluída!** Identifiquei **${playItems.length} itens** ideais para esta play com base nos dossiês e estratégia GTM.\n\nCriando estrutura na timeline...`,
      timestamp: new Date(),
    }]);

    // Initialize creation badges
    setCreationItems(playItems.map(item => ({ title: item.title, done: false })));

    // Create items one by one with delays
    playItems.forEach((item, index) => {
      stepTimeoutRef.current = setTimeout(() => {
        onAddTouchpoint({
          type: item.type,
          title: item.title,
          category: item.category,
          itemType: item.itemType,
          channel: item.channel,
          weight: item.weight,
          description: item.description,
        });

        setCreationItems(prev => {
          const next = [...prev];
          next[index] = { ...next[index], done: true };
          return next;
        });

        // After last item
        if (index === playItems.length - 1) {
          setTimeout(() => {
            setAnalysisDone(true);
            setMessages(prev => [...prev, {
              id: 'final-summary',
              role: 'assistant',
              content: `🎯 **Play estruturada com sucesso!**\n\nCriei **${playItems.filter(i => i.itemType === 'touchpoint').length} touchpoints** e **${playItems.filter(i => i.itemType === 'task').length} taskpoints internas**, cada um com descrição detalhada e subtaskpoints.\n\nAgora você pode editar qualquer item, adicionar contatos, ajustar datas ou pedir mais sugestões. Como posso ajudar?`,
              timestamp: new Date(),
              actions: [
                { label: 'Listar todos os itens', command: 'liste todos os itens da timeline' },
                { label: 'Resumo da play', command: 'me dê um resumo desta play' },
                { label: 'Próximo passo', command: 'sugira o próximo touchpoint ideal' },
              ],
            }]);
          }, 600);
        }
      }, 800 + index * 900);
    });
  }, [onAddTouchpoint, playItems]);

  // ── Start full analysis sequence ──
  const startAnalysis = useCallback(() => {
    if (analysisStarted) return;
    setAnalysisStarted(true);

    // Initialize reasoning steps
    const initialSteps: ReasoningStep[] = REASONING_STEPS.map(s => ({
      label: s.label,
      icon: s.icon,
      fullText: s.text,
      status: 'streaming',
      visibleText: '',
    }));
    setReasoningSteps(initialSteps.map(s => ({ ...s, status: 'streaming', visibleText: '' })));

    // Intro message
    setTimeout(() => {
      setMessages([{
        id: 'intro',
        role: 'assistant',
        content: `Olá! Detectei que esta é uma nova play para **${resolvedAccount}**.\n\nVou analisar todos os documentos vinculados para estruturar a melhor estratégia de touchpoints. Aguarde enquanto processo os dados...`,
        timestamp: new Date(),
      }]);

      // Run steps sequentially
      const runNextStep = (stepIndex: number) => {
        if (stepIndex >= REASONING_STEPS.length) {
          // All steps done → run creation
          setTimeout(runCreation, 800);
          return;
        }
        streamStep(stepIndex, () => {
          setTimeout(() => runNextStep(stepIndex + 1), 400);
        });
      };

      setTimeout(() => runNextStep(0), 600);
    }, 500);
  }, [analysisStarted, resolvedAccount, streamStep, runCreation]);

  // ── Trigger analysis when panel opens on new play ──
  useEffect(() => {
    if (isOpen && isNewPlay && !analysisStarted) {
      startAnalysis();
    }
    // Fallback greeting for existing plays
    if (isOpen && !isNewPlay && messages.length === 0) {
      setMessages([{
        id: '0',
        role: 'assistant',
        content: `Olá! Sou o assistente desta play. Posso te ajudar a gerenciar touchpoints, taskpoints, dossiês e estratégias de GTM.\n\nO que você gostaria de fazer?`,
        timestamp: new Date(),
        actions: QUICK_COMMANDS.slice(0, 4).map(q => ({ label: q.label, command: q.command }))
      }]);
      setAnalysisDone(true);
    }
  }, [isOpen]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
    };
  }, []);

  // ── Send message ──
  const sendMessage = (text: string) => {
    if (!text.trim() || !analysisDone) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      const { reply, actions } = parseCommand(text, touchpoints, onUpdateTouchpoint, onAddTouchpoint, playName, accountName);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date(), actions }]);
      setIsTyping(false);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*|_[^_]+_|\n)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_')) return <em key={i} className="text-gray-500">{part.slice(1, -1)}</em>;
      if (part === '\n') return <br key={i} />;
      return part;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={analysisDone ? onClose : undefined} />

      <div className="fixed right-4 top-20 bottom-4 w-[400px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-200 overflow-hidden">

        {/* ── Header ── */}
        <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 shrink-0"
          style={{ background: 'linear-gradient(135deg, #212a46 0%, #2d3e6f 100%)' }}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF5F39] to-[#ff9b83] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-bold">Assistente IA</div>
            <div className="text-white/50 text-[10px]">Play: {playName || 'Sem nome'} · {resolvedAccount}</div>
          </div>
          {analysisDone && (
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-white/70" />
            </button>
          )}
        </div>

        {/* ── Quick commands (only after analysis) ── */}
        {analysisDone && (
          <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_COMMANDS.slice(0, 3).map((cmd, i) => (
                <button key={i} onClick={() => sendMessage(cmd.command)}
                  className="px-2.5 py-1 bg-gray-50 hover:bg-[#f0f7ff] text-gray-600 hover:text-[#4a90e2] rounded-lg text-[10px] font-medium border border-gray-200 hover:border-[#4a90e2]/30 transition-all">
                  {cmd.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

          {/* Regular messages */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF5F39] to-[#ff9b83] flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#212a46] text-white rounded-tr-sm'
                    : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-200'
                }`}>
                  {renderContent(msg.content)}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-1">
                    {msg.actions.map((action, i) => (
                      <button key={i} onClick={() => sendMessage(action.command)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#4a90e2]/10 hover:bg-[#4a90e2]/20 text-[#4a90e2] rounded-full text-[10px] font-medium transition-colors">
                        <ChevronRight className="w-2.5 h-2.5" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-[9px] text-gray-400 mx-1">
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* ── Reasoning steps ── */}
          {reasoningSteps.length > 0 && (
            <div className="space-y-2">
              {reasoningSteps.map((step, i) => (
                (i <= activeStep || step.status === 'done' || activeStep === -1) && (
                  <ReasoningBubble key={i} step={step} />
                )
              ))}
            </div>
          )}

          {/* ── Creation progress ── */}
          {creationStarted && creationItems.length > 0 && (
            <div className="space-y-1.5 mt-1">
              {creationItems.map((item, i) => (
                <CreationBadge key={i} title={item.title} index={i} done={item.done} />
              ))}
            </div>
          )}

          {/* ── Typing indicator ── */}
          {isTyping && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF5F39] to-[#ff9b83] flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ── */}
        <div className="px-3 py-3 border-t border-gray-100 shrink-0">
          <div className={`flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2 transition-all ${
            analysisDone
              ? 'border-gray-200 focus-within:border-[#4a90e2] focus-within:ring-2 focus-within:ring-[#4a90e2]/10'
              : 'border-gray-100 opacity-50'
          }`}>
            <Zap className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!analysisDone}
              placeholder={analysisDone ? 'Digite um comando ou pergunta...' : 'Aguardando análise...'}
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping || !analysisDone}
              className="w-7 h-7 rounded-lg bg-[#212a46] hover:bg-[#2d3e6f] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-[9px] text-gray-400 text-center mt-2">IA experimental · Pode cometer erros</p>
        </div>
      </div>
    </>
  );
}
