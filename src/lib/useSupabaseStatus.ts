import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'error';

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a4d5bbe0`;

export function useSupabaseStatus() {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [details, setDetails] = useState<string>('');

  const checkConnection = async () => {
    setStatus('checking');

    if (!projectId || !publicAnonKey) {
      setStatus('disconnected');
      setDetails('Supabase não configurado.');
      return;
    }

    try {
      const response = await fetch(`${SERVER_BASE}/health`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      if (response.ok) {
        setStatus('connected');
        setDetails('Servidor Supabase Edge Functions ativo.');
      } else {
        setStatus('error');
        setDetails(`Servidor respondeu com status ${response.status}`);
      }
    } catch (err: any) {
      setStatus('error');
      setDetails(`Erro de conexão: ${err.message}`);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return { status, details, checkConnection, isConfigured: Boolean(projectId && publicAnonKey) };
}
