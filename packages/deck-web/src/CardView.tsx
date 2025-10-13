import React, { useCallback, useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { CardViewProps } from './types';

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

  useEffect(() => {
    if (driver) {
      driver.register(state.id, controls, state.faceUp);
      return () => {
        driver.unregister(state.id);
      };
    }
    return undefined;
  }, [driver, controls, state.id]);

  useEffect(() => {
    void controls.start({
      x: layout.x,
      y: layout.y,
      rotate: layout.rotation,
      scale: layout.scale,
      transition: { type: 'spring', stiffness: 240, damping: 20 }
    });
  }, [layout, controls]);

  const handleClick = useCallback((): void => {
    onSelect?.();
  }, [onSelect]);

  const handleDoubleClick = useCallback((): void => {
    onFlip?.();
  }, [onFlip]);

  const content = state.faceUp
    ? renderFace({ state, data: state.data!, layout, isSelected })
    : renderBack({ state, data: state.data!, layout, isSelected });

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="deck-card"
      style={{
        position: 'absolute',
        width: 160,
        height: 240,
        borderRadius: 12,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer'
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
      <motion.div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          background: '#fff',
          boxShadow: isSelected ? '0 12px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
          backfaceVisibility: 'hidden',
          overflow: 'hidden',
          transformStyle: 'preserve-3d',
          perspective: 1000
        }}
      >
        {content}
      </motion.div>
    </motion.button>
  );
};
