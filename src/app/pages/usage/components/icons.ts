import {
  OctagonAlert,
  TriangleAlert,
  CircleDashed,
  CircleCheck,
  type LucideIcon,
} from 'lucide-react';
import type { RiskBucket } from '../data/types';

/**
 * Mapeia o nome do ícone declarado em `BUCKET_META[bucket].icon` (uma string,
 * porque `lib/` é puro e não pode importar React) para o componente lucide.
 */
export const BUCKET_ICON: Record<RiskBucket, LucideIcon> = {
  critical: OctagonAlert,
  at_risk: TriangleAlert,
  watch: CircleDashed,
  healthy: CircleCheck,
};
