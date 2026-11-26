import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  Users,
  Tags,
  Play,
  Flag,
  StickyNote,
  ListChecks,
  FileText,
  Image,
} from 'lucide-react';

// Tools do servidor MCP da Maestro, reescritas para quem não é técnico.
// Fonte: maestro_api, origin/development (25/11/2026), src/modules/mcp/mcp-tools.service.ts.
//   • `registerRead`  → Consulta (só lê, nada muda na Maestro)
//   • `registerWrite` → Ação (cria, altera ou exclui; o servidor exige confirmação explícita)
// Ficam de fora 3 tools internas: `get_whatsapp_public_context` (contexto do próprio
// atendimento de WhatsApp) e `get_client_usage_overview` / `get_client_usage_company`
// (painel de uso dos clientes, só para a Maestro e agências).
// No WhatsApp, todas as consultas funcionam, mas só 2 ações (WHATSAPP_WRITE_TOOLS).

export type McpKind = 'consulta' | 'acao';

export interface McpCapability {
  tool: string;
  kind: McpKind;
  title: string;
  description: string;
  example: string;
  /** Funciona também na conversa pelo WhatsApp. */
  whatsapp: boolean;
}

export interface McpGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: McpCapability[];
}

type Raw = [tool: string, title: string, description: string, example: string];

const consulta = (rows: Raw[]): McpCapability[] =>
  rows.map(([tool, title, description, example]) => ({ tool, kind: 'consulta', title, description, example, whatsapp: true }));

const WHATSAPP_ACTIONS = new Set(['create_contact_and_link_account', 'create_account_and_contact_and_link']);
const acao = (rows: Raw[]): McpCapability[] =>
  rows.map(([tool, title, description, example]) => ({
    tool,
    kind: 'acao',
    title,
    description,
    example,
    whatsapp: WHATSAPP_ACTIONS.has(tool),
  }));

export const MCP_GROUPS: McpGroup[] = [
  {
    id: 'resultados',
    title: 'Resultados',
    icon: BarChart3,
    items: consulta([
      ['get_performance_overview', 'Ver o panorama da operação', 'Resume suas plays por situação, metas e temperatura.', 'Como foi a operação nos últimos 90 dias?'],
      ['get_weekly_report', 'Receber o resumo da semana', 'O mesmo resumo do report semanal, na hora que você pedir.', 'Me dá o resumo da semana.'],
      ['get_engagement', 'Ver o engajamento', 'Mostra o engajamento por conta, contato ou função de compra, e há quantos dias foi a última interação.', 'Quais contas estão esfriando há mais de 30 dias?'],
      ['get_effective_touchpoints', 'Ver o que mais funciona', 'Mostra os touchpoints que mais geraram resposta no período.', 'Quais touchpoints mais geraram resposta nos últimos 3 meses?'],
    ]),
  },
  {
    id: 'contas',
    title: 'Contas',
    icon: Building2,
    items: [
      ...consulta([
        ['search_accounts', 'Encontrar contas', 'Procura empresas pelo nome, pelo segmento ou pelas tags. Inclui as arquivadas, se você pedir.', 'Quais contas têm a tag “Prioridade Q1”?'],
        ['get_account', 'Ver o resumo de uma conta', 'Mostra os contatos da empresa e as plays em que ela está.', 'Me dá um resumo da conta Mercado Livre.'],
      ]),
      ...acao([
        ['create_account', 'Criar uma conta', 'Cadastra uma empresa nova. A IA mostra um rascunho para você conferir antes de salvar.', 'Cria a conta Natura, do segmento Varejo.'],
        ['update_account', 'Editar uma conta', 'Muda os dados cadastrais da empresa, como site, setor ou endereço.', 'Atualiza o site da Natura para natura.com.br.'],
        ['archive_account', 'Arquivar uma conta', 'Tira a conta de circulação sem apagar o histórico.', 'Arquiva a conta da Ambev.'],
        ['restore_account', 'Restaurar uma conta', 'Traz de volta uma conta arquivada.', 'Restaura a conta da Ambev.'],
        ['delete_account', 'Excluir uma conta', 'Apaga a conta de vez se ela não estiver em nenhuma play. Se estiver, ela é arquivada para não perder o histórico.', 'Exclui a conta de teste que eu criei ontem.'],
      ]),
    ],
  },
  {
    id: 'contatos',
    title: 'Contatos',
    icon: Users,
    items: [
      ...consulta([
        ['search_contacts', 'Encontrar contatos', 'Procura pessoas pelo nome ou pelas tags. Inclui as arquivadas, se você pedir.', 'Quem é a Juliana que está nas minhas contas?'],
        ['get_contact', 'Ver o perfil de um contato', 'Mostra os dados da pessoa e o histórico de interações com ela.', 'Qual foi a última interação com o Felipe Gonzalez?'],
      ]),
      ...acao([
        ['create_contact', 'Criar um contato', 'Cadastra uma pessoa nova. A IA mostra um rascunho para você conferir antes de salvar.', 'Cadastra a Ana Beatriz, diretora de compras.'],
        ['create_contact_and_link_account', 'Cadastrar um contato numa conta', 'Cadastra a pessoa e já liga ela a uma empresa da sua base.', 'Cadastra o Felipe Gonzalez, gerente de marketing da Ambev.'],
        ['create_account_and_contact_and_link', 'Criar conta e contato de uma vez', 'Cadastra uma empresa nova junto com a primeira pessoa de contato.', 'Cadastra a Natura e a Ana Beatriz, diretora de compras de lá.'],
        ['update_contact', 'Editar um contato', 'Muda os dados da pessoa, como cargo, e-mail ou telefone.', 'O Felipe agora é diretor de marketing.'],
        ['archive_contact', 'Arquivar um contato', 'Tira a pessoa de circulação sem apagar o histórico.', 'Arquiva o contato do Rafael, ele saiu da empresa.'],
        ['restore_contact', 'Restaurar um contato', 'Traz de volta um contato arquivado.', 'Restaura o contato do Rafael.'],
        ['delete_contact', 'Excluir um contato', 'Apaga a pessoa de vez se ela não tiver histórico. Se tiver, ela é arquivada.', 'Exclui o contato duplicado da Juliana.'],
        ['link_contact_to_account', 'Ligar um contato a uma conta', 'Diz em qual empresa a pessoa trabalha.', 'Liga a Ana Beatriz à conta da Natura.'],
        ['unlink_contact_from_account', 'Desligar um contato de uma conta', 'Tira a pessoa da empresa. Se já houve interação, o histórico é guardado.', 'O Rafael não está mais na Ambev.'],
      ]),
    ],
  },
  {
    id: 'organizacao',
    title: 'Tags, segmentos e funções de compra',
    icon: Tags,
    items: consulta([
      ['list_tags', 'Ver suas tags', 'Lista as tags da empresa e quantas contas e contatos usam cada uma.', 'Quais tags a gente usa?'],
      ['list_segments', 'Ver seus segmentos', 'Lista os segmentos e grupos de contas que você montou na Maestro.', 'Quais segmentos eu tenho cadastrados?'],
      ['list_purchase_functions', 'Ver as funções de compra', 'Lista os papéis no comitê de compra, como decisor, influenciador e usuário.', 'Quais funções de compra a Maestro usa?'],
    ]),
  },
  {
    id: 'plays',
    title: 'Plays',
    icon: Play,
    items: [
      ...consulta([
        ['list_plays', 'Listar suas plays', 'Mostra suas plays ativas ou encerradas, com contas, touchpoints e pontuação.', 'Quais plays estão ativas agora?'],
        ['get_play', 'Ver os detalhes de uma play', 'Abre uma play com as contas, os touchpoints e o andamento.', 'Como está a play “Envio de proposta”?'],
      ]),
      ...acao([
        ['create_play', 'Criar uma play', 'Monta uma play nova. A IA mostra um rascunho para você conferir antes de salvar.', 'Cria uma play de prospecção para Ambev e Natura começando segunda.'],
        ['update_play', 'Editar uma play', 'Muda o nome, a descrição e outros dados da play.', 'Muda o nome da play para “Prospecção Bebidas 2027”.'],
        ['update_play_dates', 'Mudar as datas de uma play', 'Ajusta o início ou o fim previsto.', 'Estende a play “Envio de proposta” até 31 de dezembro.'],
        ['add_account_to_play', 'Colocar contas numa play', 'Adiciona uma ou mais empresas a uma play.', 'Coloca o iFood na play “Envio de proposta”.'],
        ['remove_account_from_play', 'Tirar contas de uma play', 'Remove empresas que ainda não tiveram interação. As que já tiveram ficam, e a IA te avisa quais.', 'Tira a Ambev da play de prospecção.'],
        ['archive_play', 'Arquivar uma play', 'Guarda a play sem apagar nada. É o caminho padrão quando você pede para remover uma play.', 'Arquiva a play “Teste de outubro”.'],
        ['restore_play', 'Restaurar uma play', 'Traz de volta uma play arquivada.', 'Restaura a play “Teste de outubro”.'],
        ['delete_play', 'Excluir uma play de vez', 'Apaga a play e tudo o que está dentro dela. Não dá para desfazer.', 'Exclui de vez a play “Teste de outubro”.'],
      ]),
    ],
  },
  {
    id: 'touchpoints',
    title: 'Touchpoints',
    icon: Flag,
    items: [
      ...consulta([
        ['list_touchpoints', 'Listar os touchpoints de uma play', 'Mostra cada ação da play com datas, canal e responsáveis.', 'Quais touchpoints tem na play da Natura?'],
        ['get_touchpoint', 'Ver um touchpoint em detalhe', 'Mostra quem participou, quem respondeu, o desempenho e as notas.', 'Quem respondeu ao touchpoint do webinar?'],
      ]),
      ...acao([
        ['create_touchpoint', 'Criar um touchpoint', 'Adiciona uma ação nova a uma play. A IA mostra um rascunho para você conferir antes de salvar.', 'Cria um touchpoint de ligação com a Ambev para amanhã às 10h.'],
        ['update_touchpoint', 'Editar um touchpoint', 'Muda o nome, o canal e outros dados da ação.', 'Muda o canal do touchpoint da Natura para LinkedIn.'],
        ['update_touchpoint_dates', 'Mudar as datas de um touchpoint', 'Ajusta quando a ação começa ou termina.', 'Passa o touchpoint da reunião com a Natura para sexta.'],
        ['close_touchpoint', 'Finalizar um touchpoint', 'Marca uma ação como concluída.', 'Finaliza o touchpoint do envio de proposta da Natura.'],
        ['reopen_touchpoint', 'Reabrir um touchpoint', 'Volta um touchpoint finalizado para aberto.', 'Reabre o touchpoint de follow-up da Ambev.'],
        ['add_contact_to_touchpoint', 'Incluir um contato num touchpoint', 'Coloca uma pessoa na ação, com a função de compra dela.', 'Inclui a Ana Beatriz como decisora no touchpoint do almoço.'],
        ['remove_contact_from_touchpoint', 'Tirar um contato de um touchpoint', 'Tira a pessoa da ação. Se ela já interagiu, o histórico é guardado.', 'Tira o Rafael do touchpoint do webinar.'],
        ['log_touchpoint_response', 'Registrar que alguém respondeu', 'Marca a resposta de um contato. Isso entra nas métricas de engajamento.', 'A Ana Beatriz respondeu o e-mail da proposta.'],
        ['archive_touchpoint', 'Arquivar um touchpoint', 'Guarda o touchpoint sem apagar nada. É o caminho padrão quando você pede para remover um.', 'Arquiva o touchpoint duplicado da Ambev.'],
        ['restore_touchpoint', 'Restaurar um touchpoint', 'Traz de volta um touchpoint arquivado.', 'Restaura o touchpoint da Ambev.'],
        ['delete_touchpoint', 'Excluir um touchpoint de vez', 'Apaga o touchpoint e o que está ligado a ele. Não dá para desfazer.', 'Exclui de vez o touchpoint de teste.'],
      ]),
    ],
  },
  {
    id: 'notas',
    title: 'Notas',
    icon: StickyNote,
    items: acao([
      ['add_touchpoint_note', 'Anotar algo num touchpoint', 'Registra uma observação, como o resumo de uma conversa.', 'Anota no touchpoint da Ambev: cliente pediu proposta até dia 10.'],
      ['update_touchpoint_note', 'Editar uma nota', 'Corrige o texto de uma nota. Se ela está no dossiê, lá também muda.', 'Corrige a nota da Ambev: o prazo é dia 12.'],
      ['delete_touchpoint_note', 'Excluir uma nota', 'Apaga a nota do touchpoint e do dossiê.', 'Apaga a última nota que eu fiz na Ambev.'],
      ['sync_touchpoint_note_to_dossier', 'Levar uma nota para o dossiê', 'Copia a nota do touchpoint para o dossiê da conta.', 'Leva essa nota para o dossiê da Ambev.'],
      ['unsync_touchpoint_note_from_dossier', 'Tirar uma nota do dossiê', 'Tira a cópia do dossiê. A nota continua no touchpoint.', 'Tira essa nota do dossiê da Ambev.'],
    ]),
  },
  {
    id: 'tarefas',
    title: 'Tarefas',
    icon: ListChecks,
    items: [
      ...consulta([['get_my_tasks', 'Ver suas tarefas', 'Lista o que está com você.', 'Quais são minhas tarefas?']]),
      ...acao([
        ['create_task', 'Criar uma tarefa', 'Cria um lembrete ligado a uma play ou a um touchpoint.', 'Me lembra de ligar para o Felipe na quinta às 15h.'],
        ['update_task', 'Editar uma tarefa', 'Muda o assunto ou a data de uma tarefa sua.', 'Passa a ligação do Felipe para sexta.'],
        ['complete_task', 'Concluir uma tarefa', 'Marca a tarefa como feita.', 'Conclui a tarefa de ligar para o Felipe.'],
        ['delete_task', 'Excluir uma tarefa', 'Apaga uma tarefa sua.', 'Apaga a tarefa de ligar para o Felipe.'],
      ]),
    ],
  },
  {
    id: 'dossies',
    title: 'Dossiês',
    icon: FileText,
    items: [
      ...consulta([
        ['search_dossiers', 'Encontrar dossiês', 'Procura os dossiês de contas, contatos e plays.', 'Tem dossiê do iFood?'],
        ['get_dossier', 'Ler um dossiê', 'Abre o dossiê completo.', 'O que sabemos sobre o iFood?'],
      ]),
      ...acao([
        ['create_dossier', 'Criar um dossiê', 'Monta um dossiê novo. A IA mostra um rascunho para você conferir antes de salvar.', 'Cria um dossiê de expansão para a Natura.'],
        ['update_dossier', 'Atualizar um dossiê', 'Muda os dados do dossiê ou liga ele a uma play.', 'Liga o dossiê do iFood à play “Envio de proposta”.'],
        ['save_dossier_insight', 'Guardar uma descoberta no dossiê', 'Salva uma análise ou algo que você descobriu sobre a conta, para o time todo ver.', 'Salva no dossiê da Ambev que eles trocaram de diretor de compras.'],
        ['add_contact_to_dossier', 'Incluir um contato no dossiê', 'Liga uma pessoa já cadastrada ao dossiê.', 'Inclui a Ana Beatriz no dossiê da Natura.'],
        ['remove_contact_from_dossier', 'Tirar um contato do dossiê', 'Desliga a pessoa do dossiê. O contato continua cadastrado.', 'Tira o Rafael do dossiê da Ambev.'],
        ['unlink_play_from_dossier', 'Desligar uma play do dossiê', 'Tira a ligação entre o dossiê e uma play.', 'Desliga a play de prospecção do dossiê do iFood.'],
        ['delete_dossier', 'Excluir um dossiê', 'Apaga o dossiê e os anexos dele.', 'Exclui o dossiê de teste.'],
      ]),
    ],
  },
  {
    id: 'criativos',
    title: 'Criativos',
    icon: Image,
    items: acao([
      ['generate_collab_image', 'Criar uma imagem de parceria', 'Gera uma arte com a sua marca e a do cliente. A IA pede antes o manual da marca, o objetivo e os dois logos.', 'Cria uma imagem de parceria entre a gente e a Natura para o LinkedIn.'],
    ]),
  },
];

const all = MCP_GROUPS.flatMap((g) => g.items);
export const MCP_TOTAL = all.length;
export const MCP_COUNTS = {
  consulta: all.filter((i) => i.kind === 'consulta').length,
  acao: all.filter((i) => i.kind === 'acao').length,
  whatsapp: all.filter((i) => i.whatsapp).length,
};
