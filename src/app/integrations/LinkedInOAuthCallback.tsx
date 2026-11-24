import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { exchangeLinkedInCode } from '@/lib/linkedin';
import { clearOAuthPopup, isOAuthPopup, postOAuthResult } from './oauthChannel';

export function LinkedInOAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    // Janelinha aberta pelo modal, mas sem `window.opener`: o linkedin.com
    // isola a janela e corta o vínculo. Troca o código aqui, avisa a página
    // principal pelo canal e fecha.
    const severedPopup = !window.opener && isOAuthPopup();

    if (error) {
      if (window.opener) {
        window.opener.postMessage({ type: 'linkedin-oauth-callback', error }, '*');
        window.close();
      } else if (severedPopup) {
        clearOAuthPopup();
        postOAuthResult({ type: 'error', error });
        window.close();
        navigate('/integrations', { replace: true });
      } else {
        toast.error(`Erro no OAuth do LinkedIn: ${error}`);
        navigate('/integrations', { replace: true });
      }
      return;
    }

    if (!code) {
      navigate('/integrations', { replace: true });
      return;
    }

    if (window.opener) {
      window.opener.postMessage({ type: 'linkedin-oauth-callback', code }, '*');
      window.close();
      return;
    }

    (async () => {
      let ok = false;
      try {
        ok = Boolean(await exchangeLinkedInCode(code));
      } catch {
        ok = false;
      }
      if (severedPopup) {
        clearOAuthPopup();
        postOAuthResult(ok ? { type: 'connected' } : { type: 'error', error: 'Falha ao trocar o código de autorização.' });
        window.close();
        // Se o navegador não deixar fechar, a janelinha mostra a integração.
      } else if (ok) {
        toast.success('LinkedIn autorizado com sucesso!');
      } else {
        toast.error('Falha ao conectar LinkedIn. Tente novamente.');
      }
      navigate('/integrations', { replace: true });
    })();
  }, [navigate, params]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <p className="text-slate-600">Conectando LinkedIn…</p>
    </div>
  );
}
