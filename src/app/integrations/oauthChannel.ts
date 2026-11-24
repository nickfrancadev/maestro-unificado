// Ponte entre a janelinha do OAuth do LinkedIn e a página que a abriu.
//
// Ao passar pelo linkedin.com, a janelinha perde o `window.opener` (o LinkedIn
// isola a janela por segurança) e o `popup.closed` passa a dizer "fechada"
// mesmo com ela aberta. Sem este canal, a troca do código acontecia dentro da
// janelinha e o modal da página principal nunca sabia: voltava para
// "Conectar via LinkedIn OAuth" em vez de ir para a escolha da conta.
//
// O canal usa BroadcastChannel (mesma origem, não depende do opener) e uma
// marca no localStorage para a página de retorno saber que está numa
// janelinha aberta pelo modal, e não num redirecionamento de página inteira.

export const OAUTH_CHANNEL = 'maestro-linkedin-oauth';
export const OAUTH_POPUP_FLAG = 'maestro.linkedinOAuthPopup';
/** A marca vale por 15 minutos: tempo de sobra para logar no LinkedIn. */
export const OAUTH_POPUP_TTL_MS = 15 * 60 * 1000;

export type OAuthChannelMessage =
  | { type: 'connected' }
  | { type: 'error'; error: string };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Marca, antes de abrir a janelinha, que o retorno do OAuth é de um popup. */
export function markOAuthPopup(now = Date.now()): void {
  storage()?.setItem(OAUTH_POPUP_FLAG, String(now));
}

/** A página de retorno está numa janelinha aberta pelo modal há pouco? */
export function isOAuthPopup(now = Date.now()): boolean {
  const raw = storage()?.getItem(OAUTH_POPUP_FLAG);
  const at = raw ? Number(raw) : NaN;
  return Number.isFinite(at) && now - at >= 0 && now - at < OAUTH_POPUP_TTL_MS;
}

export function clearOAuthPopup(): void {
  storage()?.removeItem(OAUTH_POPUP_FLAG);
}

/** Avisa a página principal do resultado. Sem BroadcastChannel, não faz nada. */
export function postOAuthResult(message: OAuthChannelMessage): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(OAUTH_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

/** Escuta o resultado do OAuth vindo da janelinha. Devolve a função para parar. */
export function onOAuthResult(handler: (message: OAuthChannelMessage) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(OAUTH_CHANNEL);
  channel.onmessage = (event: MessageEvent) => {
    const data = event.data as OAuthChannelMessage | undefined;
    if (data?.type === 'connected' || data?.type === 'error') handler(data);
  };
  return () => channel.close();
}
