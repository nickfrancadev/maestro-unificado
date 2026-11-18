// Limite de uso da IA por usuário e empresa (F085): 30 chamadas a cada 15
// minutos nas rotas que custam (brief, marca, texto e imagem), configurável
// por AI_RATE_LIMIT_MAX / AI_RATE_LIMIT_WINDOW_MIN. Acima disso, 429 com a
// frase que diz quando tentar de novo.
//
// Puro (sem Deno nem npm): a janela é uma lista de horários guardada no KV.

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export const DEFAULT_AI_RATE_LIMIT: RateLimitConfig = { max: 30, windowMs: 15 * 60 * 1000 };

export function rateLimitConfigFrom(env: { max?: string | null; windowMin?: string | null }): RateLimitConfig {
  const max = Number.parseInt(env.max || "", 10);
  const windowMin = Number.parseInt(env.windowMin || "", 10);
  return {
    max: max > 0 ? max : DEFAULT_AI_RATE_LIMIT.max,
    windowMs: windowMin > 0 ? windowMin * 60 * 1000 : DEFAULT_AI_RATE_LIMIT.windowMs,
  };
}

/** Chave do contador: empresa + usuário. Sem identificação, cai num balde comum. */
export function rateLimitKey(companyId?: string | null, userId?: string | null): string {
  const clean = (s?: string | null) => (s || "").trim().replace(/[^\w.@-]/g, "").slice(0, 80) || "anon";
  return `ai_rate:${clean(companyId)}:${clean(userId)}`;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Horários que ficam guardados (os da janela, mais o desta chamada se permitida). */
  timestamps: number[];
  remaining: number;
  /** Segundos até liberar uma chamada; 0 quando permitida. */
  retryAfterSeconds: number;
}

export function checkRateLimit(previous: unknown, now: number, cfg: RateLimitConfig = DEFAULT_AI_RATE_LIMIT): RateLimitDecision {
  const list = Array.isArray(previous) ? previous.filter((t): t is number => typeof t === "number") : [];
  const inWindow = list.filter((t) => t > now - cfg.windowMs).sort((a, b) => a - b);
  if (inWindow.length >= cfg.max) {
    // Libera quando a chamada mais antiga da janela sair dela.
    const oldest = inWindow[inWindow.length - cfg.max];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + cfg.windowMs - now) / 1000));
    return { allowed: false, timestamps: inWindow, remaining: 0, retryAfterSeconds };
  }
  const timestamps = [...inWindow, now];
  return { allowed: true, timestamps, remaining: cfg.max - timestamps.length, retryAfterSeconds: 0 };
}

/** "Você usou a IA 30 vezes em 15 minutos. Tente de novo em 7 minutos, às 14:32." */
export function rateLimitMessage(retryAfterSeconds: number, now: number, cfg: RateLimitConfig = DEFAULT_AI_RATE_LIMIT): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  const at = new Date(now + retryAfterSeconds * 1000).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });
  const window = Math.round(cfg.windowMs / 60000);
  return `Você usou a IA ${cfg.max} vezes em ${window} minutos, o limite da sua empresa. Tente de novo em ${minutes} minuto${minutes > 1 ? "s" : ""}, às ${at}.`;
}
