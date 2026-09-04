/**
 * Cabeçalho padrão de card: título (+ subtítulo, + ícone) SEMPRE dentro do box.
 *
 * Fonte única de tamanho e peso do título. Antes cada card escrevia o seu
 * (`text-sm font-semibold` num, `fontSize: 13` noutro, um `<h2>` de 15px solto
 * ACIMA do box nos usuários) — três hierarquias diferentes para o mesmo nível de
 * informação, e a página lia como blocos de origens distintas.
 */
import type { LucideIcon } from 'lucide-react';

const NAVY = '#212A46';
const MUTED = '#64748B';

/** Tamanho do título dos cards. Mudar aqui muda a página inteira. */
export const CARD_TITLE_SIZE = 15;

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Conteúdo alinhado à direita (ex.: um resumo, um contador). */
  aside?: React.ReactNode;
}

export function CardHeader({ title, subtitle, icon: Icon, aside }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        {Icon && (
          <Icon size={17} style={{ color: NAVY }} aria-hidden="true" className="mt-0.5 shrink-0" />
        )}
        <div className="min-w-0">
          <h3
            className="leading-tight"
            style={{ fontSize: CARD_TITLE_SIZE, fontWeight: 600, color: NAVY }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5" style={{ fontSize: 12, color: MUTED }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {aside}
    </div>
  );
}
