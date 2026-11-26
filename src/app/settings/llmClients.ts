import claudeLogo from '../../assets/llm/claude-color.svg';
import openaiLogo from '../../assets/llm/openai.svg';
import geminiLogo from '../../assets/llm/gemini-color.svg';
import copilotLogo from '../../assets/llm/copilot-color.svg';
import cursorLogo from '../../assets/llm/cursor.svg';
import claudeCodeLogo from '../../assets/llm/claudecode-color.svg';

// Endereço do servidor MCP em produção (a confirmar com o time de back).
export const MCP_URL = 'https://api.maestroabm.com/mcp';

export interface LlmClient {
  id: string;
  name: string;
  /** Onde roda: aparece embaixo do nome no card. */
  surface: string;
  logo?: string;
  steps: string[];
  /** Linha de comando para copiar, quando o cliente é configurado pelo terminal. */
  command?: string;
  /** Botão principal: abre as configurações do cliente. */
  action?: { label: string; href: string };
  note?: string;
}

const cursorConfig = btoa(JSON.stringify({ url: MCP_URL }));

export const LLM_CLIENTS: LlmClient[] = [
  {
    id: 'claude',
    name: 'Claude',
    surface: 'Web, desktop e celular',
    logo: claudeLogo,
    steps: [
      'Abra as configurações de conectores do Claude.',
      'Clique em “Adicionar conector personalizado”.',
      'Dê o nome “Maestro” e cole o endereço do servidor.',
      'Clique em Conectar e entre com seu login da Maestro.',
    ],
    action: { label: 'Abrir conectores do Claude', href: 'https://claude.ai/settings/connectors' },
    note: 'Depois de conectado no navegador, o conector aparece também no app de desktop e no celular.',
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    surface: 'Terminal',
    logo: claudeCodeLogo,
    steps: [
      'Abra o terminal.',
      'Cole o comando abaixo e aperte Enter.',
      'Dentro do Claude Code, digite /mcp, escolha a Maestro e entre com seu login.',
    ],
    command: `claude mcp add --transport http maestro ${MCP_URL}`,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    surface: 'Web e desktop',
    logo: openaiLogo,
    steps: [
      'Abra Configurações › Aplicativos e conectores.',
      'Em Avançado, ative o modo desenvolvedor.',
      'Clique em Criar, dê o nome “Maestro” e cole o endereço do servidor.',
      'Escolha autenticação OAuth e entre com seu login da Maestro.',
    ],
    action: { label: 'Abrir configurações do ChatGPT', href: 'https://chatgpt.com/#settings/Connectors' },
    note: 'Conectores próprios precisam de um plano pago do ChatGPT (Plus, Pro, Business ou Enterprise).',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    surface: 'Gemini CLI',
    logo: geminiLogo,
    steps: [
      'Abra o terminal com o Gemini CLI instalado.',
      'Cole o comando abaixo e aperte Enter.',
      'Dentro do Gemini, digite /mcp auth maestro e entre com seu login da Maestro.',
    ],
    command: `gemini mcp add --transport http maestro ${MCP_URL}`,
    action: { label: 'Ver o Gemini CLI', href: 'https://github.com/google-gemini/gemini-cli' },
    note: 'Por enquanto, a conexão com o Gemini é feita pelo Gemini CLI.',
  },
  {
    id: 'copilot',
    name: 'Microsoft Copilot',
    surface: 'Copilot Studio',
    logo: copilotLogo,
    steps: [
      'Abra o seu agente no Copilot Studio.',
      'Vá em Ferramentas › Adicionar ferramenta › Model Context Protocol.',
      'Dê o nome “Maestro”, cole o endereço do servidor e escolha OAuth 2.0.',
      'Salve e entre com seu login da Maestro quando o Copilot pedir.',
    ],
    action: { label: 'Abrir o Copilot Studio', href: 'https://copilotstudio.microsoft.com' },
    note: 'Depende de a sua empresa ter o Copilot Studio liberado.',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    surface: 'Editor de código',
    logo: cursorLogo,
    steps: [
      'Clique em “Adicionar ao Cursor”. O Cursor abre com a Maestro já preenchida.',
      'Confirme a instalação.',
      'Clique em Conectar ao lado da Maestro e entre com seu login.',
    ],
    action: {
      label: 'Adicionar ao Cursor',
      href: `cursor://anysphere.cursor-deeplink/mcp/install?name=maestro&config=${cursorConfig}`,
    },
  },
  {
    id: 'outra',
    name: 'Outra IA',
    surface: 'Qualquer app com MCP',
    steps: [
      'Procure, nas configurações da sua IA, a opção de adicionar um servidor MCP ou conector.',
      'Cole o endereço do servidor e escolha o tipo HTTP.',
      'Se pedir autenticação, escolha OAuth e entre com seu login da Maestro.',
    ],
  },
];
