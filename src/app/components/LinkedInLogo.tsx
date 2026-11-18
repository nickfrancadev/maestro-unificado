import React from 'react';
import linkedinLogo from '@/assets/linkedin-logo.png';

/** URL do logo oficial do LinkedIn (quadrado azul com "in" branco), para quem precisa só da imagem. */
export const LINKEDIN_LOGO_URL = linkedinLogo;

/**
 * Logo oficial do LinkedIn. Use sempre este componente: o ícone de contorno do
 * lucide ("Linkedin") não é o logo da marca.
 *
 * - `label`: texto alternativo. Deixe vazio quando a palavra "LinkedIn" já
 *   aparece ao lado, para o leitor de tela não repetir.
 * - `onBrand`: em fundo azul do LinkedIn (botões), o quadrado azul do logo
 *   some; com esta opção ele ganha uma moldura branca fina.
 */
export function LinkedInLogo({
  size = 16,
  label = '',
  onBrand = false,
  className = '',
}: {
  size?: number;
  label?: string;
  onBrand?: boolean;
  className?: string;
}) {
  const img = (
    <img
      src={linkedinLogo}
      width={size}
      height={size}
      alt={label}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={`shrink-0 select-none ${onBrand ? '' : className}`}
      style={{ width: size, height: size }}
    />
  );
  if (!onBrand) return img;
  return (
    <span
      className={`inline-flex shrink-0 rounded-[4px] bg-white p-px ${className}`}
      aria-hidden={label ? undefined : true}
    >
      {img}
    </span>
  );
}
