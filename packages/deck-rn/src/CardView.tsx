import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  style
}) => {
  const rotation = useSharedValue(layout.rotation);
  const translateX = useSharedValue(layout.x - CARD_WIDTH / 2);
  const translateY = useSharedValue(layout.y - CARD_HEIGHT / 2);
  const scale = useSharedValue(layout.scale);

  useEffect(() => {
    rotation.value = withTiming(layout.rotation, { duration: 250 });
    translateX.value = withTiming(layout.x - CARD_WIDTH / 2, { duration: 250 });
    translateY.value = withTiming(layout.y - CARD_HEIGHT / 2, { duration: 250 });
    scale.value = withTiming(layout.scale, { duration: 250 });
  }, [layout, rotation, translateX, translateY, scale]);

  const handlePress = useCallback(() => {
    if (isSelected) {
      return;
    }
    onSelect?.();
  }, [isSelected, onSelect]);

  const handleLongPress = useCallback(() => {
    onFlip?.();
  }, [onFlip]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value }
    ],
    zIndex: layout.zIndex
  }));

  const content = state.faceUp
    ? renderFace({ state, data: state.data!, layout, isSelected })
    : renderBack({ state, data: state.data!, layout, isSelected });

  return (
    <Pressable onPress={handlePress} onLongPress={handleLongPress} style={styles.pressable}>
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
