import React, { useCallback, useMemo, useRef, useState } from 'react';
import { CardViewProps } from './types';

export const CARD_WIDTH = 160;
export const CARD_HEIGHT = 240;

export const CardView: React.FC<CardViewProps> = ({
  state,
  layout,
  isSelected,
  onFlip,
  onSelect,
  renderFace,
  renderBack,
  driver
}) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerActiveRef = useRef(false);
  const skipNextClickRef = useRef(false);
  const flipPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const frontContent = renderBack({ state, data: state.data!, layout, isSelected });
  const backContent = renderFace({ state, data: state.data!, layout, isSelected });
  const centeredLayout = useMemo(() => ({
    ...layout,
    x: layout.x - CARD_WIDTH / 2,
    y: layout.y - CARD_HEIGHT / 2
  }), [layout]);

  // Phase 0: Static styles without animations
  const cardStyle = useMemo<React.CSSProperties>(() => {
    const transformParts: string[] = [];
    transformParts.push(`translate(${centeredLayout.x}px, ${centeredLayout.y}px)`);
    if (centeredLayout.rotation !== 0) {
      transformParts.push(`rotate(${centeredLayout.rotation}deg)`);
    }
    if (centeredLayout.scale !== 1) {
      transformParts.push(`scale(${centeredLayout.scale})`);
    }
    if (state.faceUp) {
      transformParts.push('rotateY(180deg)');
    }
    
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 12,
      background: 'transparent',
      border: 'none',
      padding: 0,
      cursor: isSelected ? 'default' : 'pointer',
      zIndex: layout.zIndex + (isSelected ? 1000 : 0) + (isInteracting ? 2000 : 0),
      transform: transformParts.join(' '),
      transformStyle: 'preserve-3d',
      boxShadow: 'none' // Phase 0: Explicitly disable shadows to ensure deterministic snapshots
    };
  }, [centeredLayout, state.faceUp, layout.zIndex, isSelected, isInteracting]);

  const settleInteraction = useCallback(async () => {
    const pendingFlip = flipPromiseRef.current;
    flipPromiseRef.current = undefined;

    if (pendingFlip) {
      void pendingFlip.catch((error) => {
        console.error('[CardView] flip promise error', error);
      });
    }

    if (onSelect) {
      try {
        await onSelect();
      } catch (error) {
        console.error('[CardView] select error', error);
      }
    }
  }, [onSelect]);

  const handleClick = useCallback(async (): Promise<void> => {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }

    if (isSelected) {
      return;
    }

    if (!flipPromiseRef.current && onFlip) {
      try {
        const maybeFlip = onFlip();
        flipPromiseRef.current = maybeFlip ? Promise.resolve(maybeFlip) : undefined;
      } catch (error) {
        console.error('[CardView] flip error on click', error);
        flipPromiseRef.current = undefined;
      }
    }

    await settleInteraction();
    pointerActiveRef.current = false;
    setIsInteracting(false);
  }, [isSelected, onFlip, settleInteraction]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (isSelected || pointerActiveRef.current) {
        return;
      }
      pointerActiveRef.current = true;
      skipNextClickRef.current = true;
      setIsInteracting(true);
      if (event.currentTarget.setPointerCapture) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch (error) {
          console.warn('[CardView] pointer capture failed', error);
        }
      }
      try {
        const maybeFlip = onFlip?.();
        flipPromiseRef.current = maybeFlip ? Promise.resolve(maybeFlip) : undefined;
      } catch (error) {
        console.error('[CardView] pointer flip error', error);
        flipPromiseRef.current = undefined;
      }
    },
    [isSelected, onFlip]
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!pointerActiveRef.current) {
        return;
      }
      pointerActiveRef.current = false;
      if (event.currentTarget.releasePointerCapture && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (error) {
          console.warn('[CardView] pointer release failed', error);
        }
      }
      void settleInteraction().finally(() => {
        setIsInteracting(false);
        setTimeout(() => {
          skipNextClickRef.current = false;
        }, 0);
      });
    },
    [settleInteraction]
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!pointerActiveRef.current) {
        return;
      }
      pointerActiveRef.current = false;
      flipPromiseRef.current = undefined;
      setIsInteracting(false);
      skipNextClickRef.current = false;
      if (event.currentTarget.releasePointerCapture && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch (error) {
          console.warn('[CardView] pointer release failed', error);
        }
      }
    },
    []
  );

  return (
    <button
      type="button"
      data-testid={state.id}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="deck-card card-3d-wrapper"
      style={cardStyle}
    >
      <div 
        className="card-side card-side-front"
        style={{
          boxShadow: 'none' // Phase 0: Explicitly disable shadows to ensure deterministic snapshots
        }}
      >
        {frontContent}
      </div>
      <div 
        className="card-side card-side-back"
        style={{
          boxShadow: 'none' // Phase 0: Explicitly disable shadows to ensure deterministic snapshots
        }}
      >
        {backContent}
      </div>
    </button>
  );
};
