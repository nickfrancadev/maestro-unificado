import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Brain, TrendingUp, Target, Users, FileText, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE_PROMPTS = [
  {
    category: 'Análise de Contas',
    icon: TrendingUp,
    prompts: [
      'Quais contas estão com maior risco de churn?',
      'Me mostre as contas mais engajadas este mês',
      'Análise de saúde das top 10 contas'
    ]
  },
  {
    category: 'Plays e Estratégia',
    icon: Target,
    prompts: [
      'Sugira um play para contas enterprise inativas',
      'Qual play teve melhor performance em Q1?',
      'Como estruturar cadência para upsell?'
    ]
  },
  {
    category: 'Touchpoints',
    icon: MessageCircle,
    prompts: [
      'Quantos touchpoints atrasados temos?',
      'Qual o melhor horário para enviar emails?',
      'Touchpoints com maior taxa de conversão'
    ]
  },
  {
    category: 'Dossiês e Insights',
    icon: FileText,
    prompts: [
      'Gere um dossiê completo da conta Itaú',
      'Principais insights das contas financeiras',
      'Análise de sentimento dos últimos contatos'
    ]
  }
];

const AI_RESPONSES: { [key: string]: string } = {
  'default': 'Olá! Sou o Maestro, seu assistente de ABM com IA. Como posso ajudar você hoje?',
  'Quais contas estão com maior risco de churn?': `Baseado na análise de engajamento e saúde das contas, identifiquei **3 contas** com risco elevado de churn:

📊 **Contas em Risco Crítico:**

1. **Natura** - Score de Saúde: 32/100
   - Sem interações nos últimos 45 dias
   - NPS em queda (-15 pontos)
   - Uso da plataforma: 12% (normal: 65%+)
   - **Ação sugerida**: Play de Retenção imediato

2. **Magazine Luiza** - Score: 41/100
   - Champion não responde emails (3 tentativas)
   - Redução de 40% no uso mensal
   - Reclamação aberta há 12 dias
   - **Ação sugerida**: Escalação executiva

3. **Ambev** - Score: 48/100
   - Renovação em 60 dias
   - Baixo engajamento com CSM
   - Menções negativas em Slack
   - **Ação sugerida**: Business Review urgente

Deseja que eu crie um plano de ação detalhado para alguma dessas contas?`,

  'Me mostre as contas mais engajadas este mês': `Excelente! Aqui estão suas **top performers** de Março/2026:

🏆 **Contas Altamente Engajadas:**

1. **Itaú Unibanco** - Score: 94/100
   - 47 interações este mês
   - 8 logins por semana (média da conta)
   - NPS: 9.2/10
   - Oportunidade: Cross-sell Analytics

2. **Banco Safra** - Score: 89/100
   - Participou de 3 workshops
   - Champion super ativo no Slack community
   - Referência ativa (2 indicações)
   - Oportunidade: Case study + upsell

3. **XP Investimentos** - Score: 87/100
   - ROI documentado: 340%
   - Expansão para 3 novos departamentos
   - 100% das features ativadas
   - Oportunidade: Expansion play

💡 **Insight**: Contas financeiras estão 2.3x mais engajadas que outros segmentos. Considere criar plays específicos para esse vertical.`,

  'Sugira um play para contas enterprise inativas': `Ótima pergunta! Preparei um **Play de Reativação Enterprise** customizado:

🎯 **Play: "Executive Re-Engagement"**

**Objetivo**: Reativar contas enterprise inativas (60+ dias sem uso)

**Duração**: 6 semanas | **Cadência**: 8 touchpoints

**Touchpoints:**
1. **Semana 1**: Executive email personalizado do CEO
2. **Semana 1**: LinkedIn InMail do Account Executive
3. **Semana 2**: Envio de Gift + Case study relevante
4. **Semana 2**: Call de check-in (foco em dores)
5. **Semana 3**: Convite para Workshop exclusivo
6. **Semana 4**: Business Review + Health Check
7. **Semana 5**: Demonstração de novas features
8. **Semana 6**: Proposta de Success Plan renovado

**Conteúdo incluído:**
- Templates de email personalizados
- Script de discovery call
- Apresentação executiva customizada
- ROI calculator

**Métricas de sucesso:**
- Taxa de resposta: >30%
- Meetings agendados: >20%
- Reativação: >15%

Deseja que eu crie este play agora ou prefere ajustar algo antes?`,

  'Quantos touchpoints atrasados temos?': `📊 **Status de Touchpoints - Hoje (13/03/2026)**

⚠️ **Touchpoints Atrasados**: **68 touchpoints**

**Breakdown por severidade:**
- 🔴 Crítico (>7 dias): 23 touchpoints
- 🟡 Moderado (3-7 dias): 31 touchpoints  
- 🟠 Recente (1-2 dias): 14 touchpoints

**Por tipo de touchpoint:**
- Emails: 28 atrasados
- Calls: 19 atrasados
- Meetings: 12 atrasados
- LinkedIn: 9 atrasados

**Top 3 contas mais impactadas:**
1. Natura - 12 touchpoints atrasados
2. Banco Safra - 9 touchpoints atrasados
3. Magazine Luiza - 7 touchpoints atrasados

**Por responsável:**
- João Silva: 18 atrasados
- Maria Santos: 15 atrasados
- Carlos Oliveira: 12 atrasados

💡 **Recomendação**: Priorizar touchpoints críticos da Natura (conta em risco de churn). Deseja que eu gere um plano de recuperação?`,

  'Gere um dossiê completo da conta Itaú': `📋 **Dossiê Completo - Itaú Unibanco**

---

**🏢 Informações da Empresa**
- Segmento: Banking & Financial Services
- Receita Anual: R$ 98.5B
- Funcionários: 94,000+
- Sede: São Paulo, SP

**👥 Stakeholders Mapeados (7)**

*Champions:*
- Marina Costa - VP Digital Strategy
  • Email: marina.costa@itau.com.br
  • LinkedIn: linkedin.com/in/marinacosta
  • Perfil: Early Adopter, Tech Enthusiast
  • Último contato: 11/03 - Demo Analytics

*Decision Makers:*
- Roberto Fernandes - CDO
  • Poder de decisão: Alto
  • Budget owner: Sim
  • Último contato: 28/02 - Business Review

**📊 Saúde da Conta**
- Score Geral: **94/100** ✅
- Trend: ↗️ +12 pontos vs. mês anterior
- NPS: 9.2/10
- Adoption Rate: 87%
- Time to Value: Alcançado (32 dias)

**💰 Dados Comerciais**
- ARR: R$ 480,000/ano
- MRR: R$ 40,000
- Contrato: Anual (renovação em Nov/2026)
- Upsell Potential: **Alto** (R$ 180k ARR)

**🎯 Plays Ativas (2)**
1. Cross-sell Analytics - 45% progresso
2. Expansion Enterprise - 30% progresso

**📈 Histórico de Engajamento**
- Total Touchpoints: 47 (último mês)
- Taxa de resposta: 78%
- Meetings realizados: 8
- Logins mensais: 124

**🎁 Oportunidades Identificadas**
1. **Cross-sell Analytics** - Confidence: 85%
   - Valor: R$ 120k ARR
   - Timeline: 60-90 dias
   
2. **Expansão Departamental** - Confidence: 72%
   - 3 novos departamentos interessados
   - Valor: R$ 60k ARR

**⚠️ Riscos**
- Baixo: Champion pode sair Q3 (rumores LinkedIn)

**💡 Próximos Passos Recomendados**
1. Agendar QBR para Abril
2. Preparar proposta de expansion
3. Mapear stakeholders novos departamentos
4. Solicitar case study + referência

Deseja explorar alguma seção específica?`
};

export function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: AI_RESPONSES['default'],
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: AI_RESPONSES[content] || `Entendo sua pergunta sobre "${content}". Estou processando essa informação e em breve terei insights relevantes para você. Por enquanto, posso ajudar com análises de contas, sugestões de plays, status de touchpoints e geração de dossiês. Escolha um dos exemplos ao lado ou faça outra pergunta!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF5F39] to-[#FF8A6B] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Assistente Maestro I.A</h2>
              <p className="text-xs text-white/90">Seu copiloto de ABM com inteligência artificial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Examples Sidebar */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-700 mb-1">💡 Exemplos de Perguntas</h3>
              <p className="text-xs text-gray-500">Clique para experimentar</p>
            </div>

            <div className="space-y-4">
              {EXAMPLE_PROMPTS.map((category, idx) => {
                const Icon = category.icon;
                return (
                  <div key={idx}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className="text-[#FF5F39]" />
                      <h4 className="text-xs font-bold text-gray-800">{category.category}</h4>
                    </div>
                    <div className="space-y-1.5">
                      {category.prompts.map((prompt, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handlePromptClick(prompt)}
                          className="w-full text-left p-2.5 bg-white rounded-lg border border-gray-200 hover:border-[#FF5F39] hover:bg-[#FFF5F3] transition-all text-xs text-gray-700 hover:text-[#FF5F39]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-[#FF5F39] text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {message.type === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-[#FF5F39]" />
                        <span className="text-xs font-bold text-[#FF5F39]">Maestro I.A</span>
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                    <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className="text-[#FF5F39]" />
                      <span className="text-xs font-bold text-[#FF5F39]">Maestro I.A</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="mb-3 px-2">
                <p className="text-xs text-gray-500">
                  ⚠️ O Maestro I.A pode cometer erros. Sempre valide informações críticas.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(input);
                    }
                  }}
                  placeholder="Enviar mensagem..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#FF5F39] focus:ring-2 focus:ring-[#FF5F39]/20"
                />
                <button
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim()}
                  className="px-6 py-3 bg-[#FF5F39] text-white rounded-lg font-bold hover:bg-[#E54D29] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={18} />
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
