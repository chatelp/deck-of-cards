import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardViewProps } from './types';
import { WebAnimationDriver } from './drivers/WebAnimationDriver';
import { StaticDriver } from './drivers/StaticDriver';
import type { CardLayout } from '@deck/core';

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
  driver,
  disableAnimations = false
}) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerActiveRef = useRef(false);
  const skipNextClickRef = useRef(false);
  const flipPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const cardRef = useRef<HTMLButtonElement>(null);
  
  const frontContent = renderBack({ state, data: state.data!, layout, isSelected });
  const backContent = renderFace({ state, data: state.data!, layout, isSelected });
  
  const latestLayoutRef = useRef<CardLayout>(layout);
  useEffect(() => {
    latestLayoutRef.current = layout;
  }, [layout]);

  // Layout converted to CSS coordinates (top-left origin)
  const cssLayout = useMemo<CardLayout>(() => ({
    ...layout,
    x: layout.x - CARD_WIDTH / 2,
    y: layout.y - CARD_HEIGHT / 2
  }), [layout]);

  // Register/unregister card element with driver (only once per driver instance)
  useEffect(() => {
    if (!(driver instanceof WebAnimationDriver)) {
      return;
    }
    const element = cardRef.current;
    if (!element) {
      return;
    }

    driver.register(state.id, element, latestLayoutRef.current, {
      offsetX: CARD_WIDTH / 2,
      offsetY: CARD_HEIGHT / 2
    });

    return () => {
      driver.unregister(state.id);
    };
  }, [driver, state.id]);

  // Update card position when layout changes (for static mode or when animations are disabled)
  useEffect(() => {
    if (!cardRef.current) return;
    
    if (disableAnimations || driver instanceof StaticDriver || !driver) {
      const transformParts: string[] = [];
      transformParts.push(`translate3d(${cssLayout.x}px, ${cssLayout.y}px, 0)`);
      if (cssLayout.rotation !== 0) {
        transformParts.push(`rotate(${cssLayout.rotation}deg)`);
      }
      if (cssLayout.scale !== 1) {
        transformParts.push(`scale(${cssLayout.scale})`);
      }
      
      cardRef.current.style.transform = transformParts.join(' ') || 'none';
    }
  }, [cssLayout, disableAnimations, driver]);

  useEffect(() => {
    if (!cardRef.current) return;
    cardRef.current.style.zIndex = (layout.zIndex + (isSelected ? 1000 : 0) + (isInteracting ? 2000 : 0)).toString();
  }, [layout.zIndex, isSelected, isInteracting]);

  // Static style for the card (base styles that don't change)
  const baseStyle: React.CSSProperties = useMemo(() => ({
    position: 'absolute',
    left: '50%', // We use center origin logic
    top: '50%',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: isSelected ? 'default' : 'pointer',
    transformStyle: 'preserve-3d', // Essential for 3D flip
    boxShadow: 'none',
    // Initial transform (will be overridden by driver or useEffect for static mode)
    transform: 'none',
    zIndex: layout.zIndex + (isSelected ? 1000 : 0) + (isInteracting ? 2000 : 0)
  }), [isSelected, layout.zIndex, isInteracting]);

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

  // Build inner wrapper class for flip animation
  const innerClassName = useMemo(() => {
    const classes = ['card-inner'];
    if (state.faceUp) {
      classes.push('card-inner-flipped');
    }
    return classes.join(' ');
  }, [state.faceUp]);

  return (
    <button
      ref={cardRef}
      type="button"
      data-testid={state.id}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="deck-card card-3d-wrapper"
      style={baseStyle}
    >
      <div
        className={innerClassName}
        style={disableAnimations ? { transition: 'none' } : undefined}
      >
        <div 
          className="card-side card-side-front"
          style={{
            boxShadow: 'none'
          }}
        >
          {frontContent}
        </div>
        <div 
          className="card-side card-side-back"
          style={{
            boxShadow: 'none'
          }}
        >
          {backContent}
        </div>
      </div>
    </button>
  );
};
