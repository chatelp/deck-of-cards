import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { CardViewProps } from './types';
import { WebMotionDriver } from './drivers/WebMotionDriver';

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
  const controls = useAnimationControls();
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

  useEffect(() => {
    if (driver instanceof WebMotionDriver) {
      driver.register(state.id, controls, state.faceUp);
      return () => {
        driver.unregister(state.id);
      };
    }
    return undefined;
  }, [driver, controls, state.id, state.faceUp]);

  useEffect(() => {
    void controls.start({
      x: centeredLayout.x,
      y: centeredLayout.y,
      rotate: centeredLayout.rotation,
      scale: centeredLayout.scale,
      rotateY: state.faceUp ? 180 : 0,
      transition: { type: 'spring', stiffness: 240, damping: 20 }
    });
  }, [centeredLayout, controls, state.faceUp]);

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
    <motion.button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="deck-card card-3d-wrapper"
      style={{
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
        zIndex: layout.zIndex + (isSelected ? 1000 : 0) + (isInteracting ? 2000 : 0)
      }}
      animate={controls}
      initial={{
        x: centeredLayout.x,
        y: centeredLayout.y,
        rotate: centeredLayout.rotation,
        scale: centeredLayout.scale,
        rotateY: state.faceUp ? 180 : 0
      }}
    >
      <div className="card-side card-side-front">{frontContent}</div>
      <div className="card-side card-side-back">{backContent}</div>
    </motion.button>
  );
};
