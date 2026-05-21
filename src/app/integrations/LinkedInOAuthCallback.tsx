import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { exchangeLinkedInCode } from '@/lib/linkedin';

export function LinkedInOAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      if (window.opener) {
        window.opener.postMessage({ type: 'linkedin-oauth-callback', error }, '*');
        window.close();
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
      try {
        const result = await exchangeLinkedInCode(code);
        if (result) {
          toast.success('LinkedIn autorizado com sucesso!');
        } else {
          toast.error('Falha ao conectar LinkedIn. Tente novamente.');
        }
      } catch {
        toast.error('Erro no OAuth do LinkedIn.');
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
