import { CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';
import type { IntegrationStatus } from './types';

export interface StatusBadge {
  label: string;
  icon: JSX.Element;
  classes: string;
}

export function getStatusBadge(status: IntegrationStatus, hasAdAccount?: boolean): StatusBadge {
  if (status === 'connected' && hasAdAccount) {
    return {
      label: 'Conectado',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      classes: 'bg-green-50 text-green-700 border-green-200',
    };
  }
  if (status === 'connected' && !hasAdAccount) {
    return {
      label: 'Sem Ad Account',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  switch (status) {
    case 'expired':
      return {
        label: 'Token Expirado',
        icon: <Clock className="w-3.5 h-3.5" />,
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'error':
      return {
        label: 'Erro',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        classes: 'bg-red-50 text-red-700 border-red-200',
      };
    default:
      return {
        label: 'Desconectado',
        icon: <XCircle className="w-3.5 h-3.5" />,
        classes: 'bg-slate-100 text-slate-600 border-slate-200',
      };
  }
}
