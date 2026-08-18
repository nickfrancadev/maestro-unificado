// Editor visual do overlay: desenha as camadas sobre a imagem-base e deixa
// arrastá-las. Não conhece template nem empresa — recebe um layout, devolve
// outro. Quem decide onde o resultado é gravado é o CreativeStep.
//
// Vive fora do CreativeStep de propósito: aquele arquivo já passa de 1900
// linhas, e a lógica de arrasto tem estado próprio que não interessa a ninguém
// mais.
import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import {
  AD_FORMAT_SIZE,
  OVERLAY_STYLE,
  LOGO_WRAP_ASPECT,
  aspectClass,
  clampCenter,
  effectiveLayout,
  logoInnerPadPx,
  textLayerRect,
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
//
// `weight` é obrigatório (não tem default): negrito é visivelmente mais largo
// que regular no mesmo tamanho, e o destaque renderiza em 700 enquanto o
// complementar renderiza em 400 — medir sem o peso subestima a largura do
// destaque, o teto do slider fica frouxo demais, e a caixa de fundo que o
// servidor desenha no PNG final sai estreita atrás do texto em negrito.
export function measureTextWidthPx(text: string, sizePx: number, fontFamily: string, weight: number): number {
  if (typeof document === 'undefined' || !text) return 0;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${weight} ${sizePx}px "${fontFamily}", sans-serif`;
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
  // Só serve para forçar re-render quando a fonte termina de carregar (ou
  // falha em carregar): até lá as camadas de texto estão medidas no
  // fallback e nascem com a largura errada, mas medir no fallback ainda é
  // melhor que não medir — por isso o `.catch` também dispara o tick.
  const [, setFontTick] = useState(0);
  // Largura real (em px de tela) do container. Começa em 0 e é preenchida
  // pela medição abaixo — até lá, `scale` cai no fallback de 1200px de
  // referência (ver definição de `scale` após o guard de `baseImageUrl`).
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const { w: CW } = AD_FORMAT_SIZE[format];

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let alive = true;
    document.fonts.load(`700 56px "${fontFamily}"`)
      .then(() => document.fonts.ready)
      .then(() => { if (alive) setFontTick((t) => t + 1); })
      .catch(() => { if (alive) setFontTick((t) => t + 1); });
    return () => { alive = false; };
  }, [fontFamily]);

  // Mede o container assim que ele existe no DOM (síncrono, antes do
  // primeiro paint): no primeiro render `canvasRef.current` ainda é `null`
  // — refs só são atribuídos depois do commit —, então sem isto `scale`
  // nasceria travada em 1 (como se o container tivesse exatos 1200px) até
  // algum re-render incidental acontecer. Depende de `baseImageUrl` porque
  // o `ref` só existe na árvore "carregada" (o placeholder não o carrega).
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    if (width > 0) setMeasuredWidth(width);
  }, [baseImageUrl]);

  // Reage a resize do container depois do mount: janela redimensionada,
  // sidebar recolhida, breakpoint responsivo. Mesmo padrão de
  // `LpThumbnail.tsx` (ResizeObserver na caixa externa → estado → escala).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) setMeasuredWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [baseImageUrl]);

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
    const layer = layout[drag.id];
    onLayoutChange?.({ ...layout, [drag.id]: { ...layer, x, y } });
  };

  const endDrag = () => setDrag(null);

  if (!baseImageUrl) {
    return (
      <div
        data-testid="overlay-canvas"
        className={`relative bg-slate-100 overflow-hidden ${aspectClass(format)}`}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon className="w-10 h-10 mb-1.5" />
          <span className="text-xs font-medium">Imagem aparecerá aqui</span>
        </div>
      </div>
    );
  }

  // Medido no tamanho GRAVADO (`layout.destaque.sizePx`), não no efetivo —
  // seria circular. É a entrada que `effectiveLayout` usa para derivar o
  // tamanho que realmente cabe, sem escrever nada de volta no layout. Task 8:
  // o payload da composição precisa medir do MESMO jeito (mesmo texto, mesma
  // fonte, mesmo peso) antes de desenhar o PNG, senão o resultado final
  // diverge do que esta tela mostrou.
  const eff = effectiveLayout(layout, format, {
    destaqueWidthPx: measureTextWidthPx(destaque, layout.destaque.sizePx, fontFamily, 700),
    complementarWidthPx: measureTextWidthPx(complementar, layout.complementar.sizePx, fontFamily, 400),
  });

  // `measuredWidth` só é 0 antes da primeira medição (ver `useLayoutEffect`
  // acima); a partir daí segue a largura real do container.
  const scale = (measuredWidth || CW) / CW;
  const ring = (id: OverlayLayerId) =>
    selected === id ? 'ring-2 ring-[#FF5F39] ring-offset-1 ring-offset-black/20' : '';

  const textLayer = (id: 'destaque' | 'complementar', text: string, weight: number) => {
    if (!text) return null;
    const l = eff[id];
    const widthPx = measureTextWidthPx(text, l.sizePx, fontFamily, weight);
    // Mesma conta que o servidor usa para a caixa de fundo (`overlaySvg.ts`
    // espelha `textLayerRect`) — reusar a função em vez de reimplementar a
    // aritmética à mão é o que garante que os dois nunca divirjam.
    const rect = textLayerRect(l, widthPx, format);
    const boxW = rect.w;
    const boxH = rect.h;
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
          fontWeight: weight,
          lineHeight: 1,
          color: l.color,
          background: l.backdrop === 'box' ? OVERLAY_STYLE.boxFill : 'transparent',
          textShadow: l.backdrop === 'shadow' ? '0 2px 8px rgba(0,0,0,0.75)' : undefined,
        }}
      >
        {text}
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
    const draggable = !(layout.paired && id === 'targetLogo');
    return (
      <div
        key={id}
        data-draggable={draggable ? 'true' : undefined}
        onPointerDown={draggable ? (e) => beginDrag(e, id, l.x, l.y, boxW, boxH) : undefined}
        className={`absolute flex items-center justify-center ${draggable ? 'cursor-move' : ''} ${ring(id)}`}
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
      className={`relative bg-slate-100 overflow-hidden touch-none ${aspectClass(format)}`}
    >
      <img src={baseImageUrl} alt="Imagem-base" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      {textLayer('destaque', destaque, 700)}
      {textLayer('complementar', complementar, 400)}
      {logoLayer('advertiserLogo', advertiserLogoUrl, 'Meu logo')}
      {logoLayer('targetLogo', targetLogoUrl, 'Logo da conta')}
    </div>
  );
}
