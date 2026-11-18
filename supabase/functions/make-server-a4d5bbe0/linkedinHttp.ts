// Chamadas ao LinkedIn na publicação: nova tentativa com espera em 5xx/rede e
// tradução do erro para o usuário (F140).
//
// Antes o servidor devolvia "LinkedIn API 403: {texto cru da API}" para a
// tela. Agora a tela recebe uma frase em português que diz o que fazer; o
// texto cru fica só no log/auditoria do servidor.
//
// Puro (sem Deno nem npm) para rodar no Vitest: `fetch` e a espera entram
// como parâmetro.

export interface RetryOptions {
  /** Novas tentativas depois da primeira. */
  maxRetries?: number;
  /** Espera antes da 1ª nova tentativa; dobra a cada uma (500, 1000, 2000…). */
  baseDelayMs?: number;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  sleep?: (ms: number) => Promise<void>;
  log?: (msg: string) => void;
}

export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_BASE_DELAY_MS = 500;

/** Espera antes da tentativa `attempt` (0 = primeira nova tentativa). */
export function retryDelayMs(attempt: number, base = DEFAULT_BASE_DELAY_MS): number {
  return base * Math.pow(2, attempt);
}

/** Só erro do lado do LinkedIn (5xx) se repete; 4xx é recusa e não muda tentando de novo. */
export function isRetryableStatus(status: number): boolean {
  return status >= 500 && status <= 599;
}

/**
 * fetch com nova tentativa em 5xx e erro de rede, esperando entre elas.
 * Devolve a última resposta (mesmo 5xx) para quem chama traduzir o erro;
 * lança só se a rede falhou em todas as tentativas.
 */
export async function fetchWithRetry(
  url: string,
  opts: RequestInit,
  label: string,
  options: RetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const base = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const doFetch = options.fetchImpl ?? ((u: string, i: RequestInit) => fetch(u, i));
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = options.log ?? ((m: string) => console.log(m));
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await doFetch(url, opts);
      if (isRetryableStatus(res.status) && attempt < maxRetries) {
        const wait = retryDelayMs(attempt, base);
        log(`[${label}] ${res.status}, nova tentativa #${attempt + 1} em ${wait}ms`);
        await sleep(wait);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const wait = retryDelayMs(attempt, base);
        log(`[${label}] erro de rede, nova tentativa #${attempt + 1} em ${wait}ms`);
        await sleep(wait);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`[${label}] sem resposta do LinkedIn`);
}

// ---------- Tradução do erro ----------

export const RECONNECT_MESSAGE = "O acesso ao LinkedIn venceu ou foi revogado. Reconecte o LinkedIn em Integrações e tente de novo.";

export interface TranslatedError {
  /** Status HTTP que o servidor devolve para a tela. */
  status: number;
  /** Frase para a tela, em português. Nunca o texto cru da API. */
  message: string;
  /** Categoria, para a tela decidir a ação (ex.: link para Integrações). */
  kind: "reconnect" | "permission" | "page_admin" | "rate_limit" | "unavailable" | "invalid" | "not_found";
}

function parsed(raw: string): { message: string; code: string } {
  try {
    const j = JSON.parse(raw);
    const details = Array.isArray(j?.errorDetails?.inputErrors)
      ? j.errorDetails.inputErrors.map((e: any) => `${e?.code || ""} ${e?.description || ""} ${JSON.stringify(e?.input || "")}`).join(" ")
      : "";
    return { message: `${j?.message || ""} ${details}`, code: String(j?.code || j?.serviceErrorCode || "") };
  } catch {
    return { message: raw || "", code: "" };
  }
}

/**
 * Erro do LinkedIn → frase para a tela. `action` é o que estava sendo feito,
 * no infinitivo ("criar o grupo da campanha").
 */
export function translateLinkedInError(status: number, rawText: string, action: string): TranslatedError {
  const { message, code } = parsed(rawText);
  const text = `${code} ${message}`.toLowerCase();

  if (status === 401 || /expired_access_token|invalid_access_token|revoked|token.*(expired|invalid)/.test(text)) {
    // 424: o pedido depende de uma conexão que não vale mais.
    return { status: 424, kind: "reconnect", message: RECONNECT_MESSAGE };
  }
  if (status === 429) {
    return { status: 429, kind: "rate_limit", message: "O LinkedIn limitou as chamadas por alguns minutos. Espere um pouco e tente de novo." };
  }
  if (status >= 500) {
    return { status: 502, kind: "unavailable", message: `O LinkedIn não respondeu ao ${action} depois de algumas tentativas. Tente de novo em alguns minutos; o que já foi criado não será duplicado.` };
  }
  if (status === 403) {
    if (/organization|company page|page admin|administrator|admin|dsc|member.*not.*(authorized|allowed)/.test(text)) {
      return {
        status: 403, kind: "page_admin",
        message: "A conta do LinkedIn conectada precisa ser administradora da Página da empresa anunciante para publicar o anúncio. Peça acesso a um administrador da Página e tente de novo.",
      };
    }
    return {
      status: 403, kind: "permission",
      message: `A conta do LinkedIn conectada não tem permissão para ${action} nesta conta de anúncios. Confira o acesso dela à conta de anúncios em Integrações.`,
    };
  }
  if (status === 404) {
    return { status: 404, kind: "not_found", message: `O LinkedIn não encontrou o que era preciso para ${action}. Atualize a lista e tente de novo.` };
  }

  // 400/422: recusa por dado. Diz QUAL dado, sem o texto cru.
  const hints: [RegExp, string][] = [
    [/budget|amount/, "o orçamento"],
    [/runschedule|schedule|start|end ?date/, "as datas"],
    [/targeting|audience|facet|geo|location/, "a segmentação"],
    [/unitcost|bid|costtype|optimization/, "o lance ou a cobrança"],
    [/image|media|asset|upload/, "a imagem"],
    [/headline|description|commentary|text|too_long|length/, "o texto do anúncio"],
    [/url|landing|calltoaction|cta/, "a URL de destino ou o botão"],
    [/currency/, "a moeda da conta"],
  ];
  const hint = hints.find(([re]) => re.test(text))?.[1];
  return {
    status: 422, kind: "invalid",
    message: hint
      ? `O LinkedIn recusou ${action} por causa d${hint.startsWith("as ") ? "as" : hint.startsWith("a ") ? "a" : "o"} ${hint.replace(/^(as|a|o) /, "")}. Confira e tente de novo.`
      : `O LinkedIn recusou ${action}. Confira os dados da campanha e tente de novo.`,
  };
}
