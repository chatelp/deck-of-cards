import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { CardViewProps } from './types';
import { WebMotionDriver } from './drivers/WebMotionDriver';

const CARD_WIDTH = 160;
const CARD_HEIGHT = 240;

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

  const handleClick = useCallback(async (): Promise<void> => {
    if (isSelected) {
      return;
    }
    try {
      await onFlip?.();
    } catch (error) {
      console.error('[CardView] flip error', error);
      throw error;
    }
  }, [isSelected, onFlip, state.id, state.faceUp]);

  const handlePointerDown = useCallback(() => {
    if (isSelected) {
      return;
    }
    setIsInteracting(true);
  }, [isSelected]);

  const handlePointerEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
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
