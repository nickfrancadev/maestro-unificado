// Editor visual do overlay: desenha as camadas sobre a imagem-base e deixa
// arrastá-las. Não conhece template nem empresa — recebe um layout, devolve
// outro. Quem decide onde o resultado é gravado é o CreativeStep.
//
// Vive fora do CreativeStep de propósito: aquele arquivo já passa de 1900
// linhas, e a lógica de arrasto tem estado próprio que não interessa a ninguém
// mais.
import { useRef, useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  AD_FORMAT_SIZE,
  OVERLAY_STYLE,
  LOGO_WRAP_ASPECT,
  clampCenter,
  effectiveLayout,
  logoInnerPadPx,
  type AdFormat,
  type LogoLayer,
  type OverlayLayout,
} from './overlayLayout';

export type OverlayLayerId = 'destaque' | 'complementar' | 'advertiserLogo' | 'targetLogo';

export interface OverlayCanvasProps {
  format: AdFormat;
  baseImageUrl: string | null;
  layout: OverlayLayout;
  fontFamily: string;
  destaque: string;
  complementar: string;
  advertiserLogoUrl: string | null;
  targetLogoUrl: string | null;
  selected?: OverlayLayerId | null;
  onSelect?: (id: OverlayLayerId | null) => void;
  onLayoutChange?: (next: OverlayLayout) => void;
}

// Mede a largura real do texto na fonte carregada. O servidor usa este número
// para dimensionar a caixa de fundo — sem ele cairia num estimador por
// contagem de caracteres, e a caixa do preview não bateria com a do PNG.
export function measureTextWidthPx(text: string, sizePx: number, fontFamily: string): number {
  if (typeof document === 'undefined' || !text) return 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${sizePx}px "${fontFamily}", sans-serif`;
  return Math.ceil(ctx.measureText(text).width);
}

interface DragState {
  id: OverlayLayerId;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  boxW: number;   // px do canvas de referência
  boxH: number;
}

export function OverlayCanvas({
  format, baseImageUrl, layout, fontFamily, destaque, complementar,
  advertiserLogoUrl, targetLogoUrl, selected = null, onSelect, onLayoutChange,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Só serve para forçar re-render quando a fonte termina de carregar: até lá
  // as camadas de texto estão medidas no fallback e nascem com a largura errada.
  const [, setFontTick] = useState(0);

  const { w: CW, h: CH } = AD_FORMAT_SIZE[format];
  const eff = effectiveLayout(layout, format);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let vivo = true;
    document.fonts.load(`700 56px "${fontFamily}"`)
      .then(() => document.fonts.ready)
      .then(() => { if (vivo) setFontTick((t) => t + 1); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [fontFamily]);

  const scaleOf = () => (canvasRef.current?.getBoundingClientRect().width || CW) / CW;

  const beginDrag = (
    e: React.PointerEvent, id: OverlayLayerId, x: number, y: number, boxW: number, boxH: number,
  ) => {
    e.stopPropagation();
    onSelect?.(id);
    // jsdom não implementa setPointerCapture; o `?.` mantém os testes vivos.
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({
      id, pointerId: e.pointerId,
      startClientX: e.clientX, startClientY: e.clientY,
      startX: x, startY: y, boxW, boxH,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return;
    const nx = drag.startX + (e.clientX - drag.startClientX) / rect.width;
    const ny = drag.startY + (e.clientY - drag.startClientY) / rect.height;
    const { x, y } = clampCenter(nx, ny, drag.boxW, drag.boxH, format);
    const camada = layout[drag.id];
    onLayoutChange?.({ ...layout, [drag.id]: { ...camada, x, y } });
  };

  const endDrag = () => setDrag(null);

  if (!baseImageUrl) {
    return (
      <div
        data-testid="overlay-canvas"
        className={`relative bg-slate-100 overflow-hidden ${format === 'square' ? 'aspect-[1200/1200]' : 'aspect-[1200/628]'}`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon className="w-10 h-10 mb-1.5" />
          <span className="text-xs font-medium">Imagem aparecerá aqui</span>
        </div>
      </div>
    );
  }

  const scale = scaleOf();
  const ring = (id: OverlayLayerId) =>
    selected === id ? 'ring-2 ring-[#FF5F39] ring-offset-1 ring-offset-black/20' : '';

  const textLayer = (id: 'destaque' | 'complementar', texto: string, peso: number) => {
    if (!texto) return null;
    const l = eff[id];
    const larguraPx = measureTextWidthPx(texto, l.sizePx, fontFamily);
    const boxW = larguraPx + OVERLAY_STYLE.boxPadX * 2;
    const boxH = l.sizePx + OVERLAY_STYLE.boxPadY * 2;
    return (
      <div
        key={id}
        data-draggable="true"
        onPointerDown={(e) => beginDrag(e, id, l.x, l.y, boxW, boxH)}
        className={`absolute cursor-move select-none whitespace-nowrap rounded-[14px] ${ring(id)}`}
        style={{
          left: `${l.x * 100}%`,
          top: `${l.y * 100}%`,
          transform: 'translate(-50%, -50%)',
          padding: `${OVERLAY_STYLE.boxPadY * scale}px ${OVERLAY_STYLE.boxPadX * scale}px`,
          fontFamily: `"${fontFamily}", sans-serif`,
          fontSize: `${l.sizePx * scale}px`,
          fontWeight: peso,
          lineHeight: 1,
          color: l.color,
          background: l.backdrop === 'box' ? OVERLAY_STYLE.boxFill : 'transparent',
          textShadow: l.backdrop === 'shadow' ? '0 2px 8px rgba(0,0,0,0.75)' : undefined,
        }}
      >
        {texto}
      </div>
    );
  };

  const logoLayer = (id: 'advertiserLogo' | 'targetLogo', url: string | null, alt: string) => {
    const l: LogoLayer = eff[id];
    if (!l.enabled || !url) return null;
    const boxW = l.sizePx;
    const boxH = l.sizePx / LOGO_WRAP_ASPECT[l.wrap];
    const pad = logoInnerPadPx(l.wrap, boxW);
    // No modo par só o logo do anunciante recebe alça: o da conta é derivado
    // dele, e dar duas alças a uma posição só seria mentira.
    const arrastavel = !(layout.paired && id === 'targetLogo');
    return (
      <div
        key={id}
        data-draggable={arrastavel ? 'true' : undefined}
        onPointerDown={arrastavel ? (e) => beginDrag(e, id, l.x, l.y, boxW, boxH) : undefined}
        className={`absolute flex items-center justify-center ${arrastavel ? 'cursor-move' : ''} ${ring(id)}`}
        style={{
          left: `${l.x * 100}%`,
          top: `${l.y * 100}%`,
          width: `${boxW * scale}px`,
          height: `${boxH * scale}px`,
          transform: 'translate(-50%, -50%)',
          padding: `${pad * scale}px`,
          background: l.wrap === 'none' ? 'transparent' : OVERLAY_STYLE.logoCardFill,
          borderRadius: l.wrap === 'circle' ? '9999px' : l.wrap === 'none' ? 0 : `${OVERLAY_STYLE.logoCardRadius * scale}px`,
          boxShadow: l.wrap === 'none' ? undefined : '0 2px 3px rgba(0,0,0,0.18)',
        }}
      >
        <img src={url} alt={alt} draggable={false} className="w-full h-full object-contain pointer-events-none" />
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      data-testid="overlay-canvas"
      onPointerDown={() => onSelect?.(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`relative bg-slate-100 overflow-hidden touch-none ${format === 'square' ? 'aspect-[1200/1200]' : 'aspect-[1200/628]'}`}
    >
      <img src={baseImageUrl} alt="Imagem-base" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      {textLayer('destaque', destaque, 700)}
      {textLayer('complementar', complementar, 400)}
      {logoLayer('advertiserLogo', advertiserLogoUrl, 'Meu logo')}
      {logoLayer('targetLogo', targetLogoUrl, 'Logo da conta')}
    </div>
  );
}
