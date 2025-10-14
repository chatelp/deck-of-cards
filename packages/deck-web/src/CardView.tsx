import React, { useCallback, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { CardViewProps } from './types';
import { WebMotionDriver } from './drivers/WebMotionDriver';

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
  const frontContent = renderBack({ state, data: state.data!, layout, isSelected });
  const backContent = renderFace({ state, data: state.data!, layout, isSelected });

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
      x: layout.x,
      y: layout.y,
      rotate: layout.rotation,
      scale: layout.scale,
      rotateY: state.faceUp ? 180 : 0,
      transition: { type: 'spring', stiffness: 240, damping: 20 }
    });
  }, [layout, controls, state.faceUp]);

  const handleClick = useCallback(async (): Promise<void> => {
    if (state.selected) {
      return;
    }
    await onFlip?.();
    await onSelect?.();
  }, [state.selected, onFlip, onSelect]);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className="deck-card card-3d-wrapper"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 160,
        height: 240,
        borderRadius: 12,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: state.selected ? 'default' : 'pointer',
        zIndex: isSelected ? layout.zIndex + 1000 : layout.zIndex
      }}
      animate={controls}
      initial={{
        x: layout.x,
        y: layout.y,
        rotate: layout.rotation,
        scale: layout.scale,
        rotateY: state.faceUp ? 180 : 0
      }}
    >
      <div className="card-side card-side-front">{frontContent}</div>
      <div className="card-side card-side-back">{backContent}</div>
    </motion.button>
  );
};
