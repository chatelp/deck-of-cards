import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CardViewProps } from './types';
import { ReanimatedDriver } from './drivers/ReanimatedDriver';

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
  style,
  driver
}) => {
  const rotation = useSharedValue(layout.rotation);
  const translateX = useSharedValue(layout.x - CARD_WIDTH / 2);
  const translateY = useSharedValue(layout.y - CARD_HEIGHT / 2);
  const scale = useSharedValue(layout.scale);
  const rotateY = useSharedValue(state.faceUp ? 180 : 0);
  const zIndex = useSharedValue(layout.zIndex);

  useEffect(() => {
    if (driver instanceof ReanimatedDriver) {
      return;
    }
    rotation.value = withTiming(layout.rotation, { duration: 250 });
    translateX.value = withTiming(layout.x - CARD_WIDTH / 2, { duration: 250 });
    translateY.value = withTiming(layout.y - CARD_HEIGHT / 2, { duration: 250 });
    scale.value = withTiming(layout.scale, { duration: 250 });
    zIndex.value = layout.zIndex;
  }, [layout, rotation, translateX, translateY, scale, zIndex, driver]);

  useEffect(() => {
    if (driver instanceof ReanimatedDriver) {
      return;
    }
    rotateY.value = withTiming(state.faceUp ? 180 : 0, { duration: 300 });
  }, [state.faceUp, rotateY, driver]);

  useEffect(() => {
    if (driver instanceof ReanimatedDriver) {
      driver.register(state.id, {
        translateX,
        translateY,
        rotation,
        scale,
        rotateY,
        zIndex,
        offsetX: CARD_WIDTH / 2,
        offsetY: CARD_HEIGHT / 2
      }, state.faceUp);
      return () => {
        driver.unregister(state.id);
      };
    }
    return undefined;
  }, [driver, state.id, translateX, translateY, rotation, scale, rotateY, zIndex, state.faceUp]);

  const invokeAsync = useCallback((fn?: () => void | Promise<void>) => {
    if (!fn) {
      return;
    }
    try {
      const result = fn();
      if (result && typeof (result as Promise<void>).then === 'function') {
        void (result as Promise<void>).catch((error) => {
          console.error('[CardView] async handler error', error);
        });
      }
    } catch (error) {
      console.error('[CardView] handler error', error);
    }
  }, []);

  const handlePressIn = useCallback(() => {
    invokeAsync(onFlip);
  }, [invokeAsync, onFlip]);

  const handlePressOut = useCallback(() => {
    if (isSelected) {
      return;
    }
    invokeAsync(onSelect);
  }, [invokeAsync, onSelect, isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value }
    ],
    zIndex: zIndex.value
  }));

  const content = state.faceUp
    ? renderFace({ state, data: state.data!, layout, isSelected })
    : renderBack({ state, data: state.data!, layout, isSelected });

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.pressable}>
      <Animated.View style={[styles.card, animatedStyle, isSelected && styles.selected, style]}>{content}</Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    position: 'absolute',
    left: '50%',
    top: '50%'
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#fff',
    backfaceVisibility: 'hidden',
    overflow: 'hidden'
  },
  selected: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6
  }
});
