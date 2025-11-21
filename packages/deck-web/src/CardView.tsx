import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  runOnJS
} from 'react-native-reanimated';
import { CardViewProps } from './types';
import { ReanimatedCardAnimationHandle } from './drivers/ReanimatedDriver.web.client';

// ADAPTER: CleanButton bridges the gap between Reanimated and standard HTML DOM.
// 1. Filters out Native props (nativeID, forwardedRef) that React warns about.
// 2. Flattens style arrays (Reanimated uses arrays, React DOM expects objects).
const CleanButton = React.forwardRef<HTMLButtonElement, any>((props, ref) => {
  const { nativeID, forwardedRef, style, ...rest } = props;

  // Reanimated often passes styles as an array (e.g. [base, animated]). 
  // React DOM <button> crashes if style is an array. We must flatten it.
  const flattenedStyle = Array.isArray(style)
    ? style.reduce((acc, s) => Object.assign(acc, s), {})
    : style;

  return <button ref={ref} style={flattenedStyle} {...rest} />;
});
CleanButton.displayName = 'CleanButton';

// Create animated button component using the robust wrapper
const AnimatedButton = Animated.createAnimatedComponent(CleanButton) as any;

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
  const frontContent = renderBack({ state, data: state.data!, layout, isSelected });
  const backContent = renderFace({ state, data: state.data!, layout, isSelected });
  
  const centeredLayout = useMemo(() => ({
    ...layout,
    x: layout.x - CARD_WIDTH / 2,
    y: layout.y - CARD_HEIGHT / 2
  }), [layout]);

  // --- Reanimated Logic ---
  // Initialize SharedValues with current layout
  const translateX = useSharedValue(centeredLayout.x);
  const translateY = useSharedValue(centeredLayout.y);
  const rotation = useSharedValue(centeredLayout.rotation);
  const scale = useSharedValue(centeredLayout.scale);
  const rotateY = useSharedValue(state.faceUp ? 180 : 0);
  const zIndex = useSharedValue(layout.zIndex);

  // Convert interaction states to SharedValues to avoid capturing React state in worklets
  // This prevents 'global is not defined' errors and stale closures
  const isSelectedSV = useSharedValue(isSelected ? 1 : 0);
  const isInteractingSV = useSharedValue(isInteracting ? 1 : 0);

  useEffect(() => {
    isSelectedSV.value = isSelected ? 1 : 0;
  }, [isSelected, isSelectedSV]);

  useEffect(() => {
    isInteractingSV.value = isInteracting ? 1 : 0;
  }, [isInteracting, isInteractingSV]);

  // Register/Unregister with driver
  useEffect(() => {
    if (!driver) return;

    const handle: ReanimatedCardAnimationHandle = {
      translateX,
      translateY,
      rotation,
      scale,
      rotateY,
      zIndex,
      offsetX: CARD_WIDTH / 2,
      offsetY: CARD_HEIGHT / 2
    };

    // Register logic
    // Note: We cast to any because the interface might slightly differ in TS definition but structure matches
    (driver as any).register?.(state.id, handle, state.faceUp);

    return () => {
      (driver as any).unregister?.(state.id);
    };
  }, [driver, state.id, state.faceUp, translateX, translateY, rotation, scale, rotateY, zIndex]);

  // Define animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
        { rotateY: `${rotateY.value}deg` } // 3D rotation for flip
      ],
      zIndex: zIndex.value + (isSelectedSV.value ? 1000 : 0) + (isInteractingSV.value ? 2000 : 0),
      // Ensure visibility
      opacity: 1,
    };
  });

  // --- Static Logic (Phase 0 / Fallback) ---
  const staticStyle = useMemo<React.CSSProperties>(() => {
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
      transform: transformParts.join(' '),
      zIndex: layout.zIndex + (isSelected ? 1000 : 0) + (isInteracting ? 2000 : 0),
    };
  }, [centeredLayout, state.faceUp, layout.zIndex, isSelected, isInteracting]);

  // Common base style
  const baseStyle: React.CSSProperties = {
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
    boxShadow: 'none'
  };

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

  // Choose style based on mode
  // If animations are disabled, we use the React-computed static style.
  // If enabled, we use the Reanimated style.
  // Note: We merge baseStyle in both cases.
  const finalStyle = disableAnimations 
    ? { ...baseStyle, ...staticStyle }
    : { ...baseStyle, ...animatedStyle }; // Reanimated style object is compatible with style prop of Animated components

  // We use AnimatedButton in both cases for consistency, or we could conditional render.
  // AnimatedButton works with static styles too.
  
  return (
    <AnimatedButton
      type="button"
      data-testid={state.id}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="deck-card card-3d-wrapper"
      style={finalStyle}
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
    </AnimatedButton>
  );
};
