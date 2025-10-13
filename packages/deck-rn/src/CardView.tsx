import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { CardViewProps } from './types';

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
  const translateX = useSharedValue(layout.x);
  const translateY = useSharedValue(layout.y);
  const scale = useSharedValue(layout.scale);

  useEffect(() => {
    rotation.value = withTiming(layout.rotation, { duration: 250 });
    translateX.value = withTiming(layout.x, { duration: 250 });
    translateY.value = withTiming(layout.y, { duration: 250 });
    scale.value = withTiming(layout.scale, { duration: 250 });
  }, [layout, rotation, translateX, translateY, scale]);

  const handlePress = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

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
    position: 'absolute'
  },
  card: {
    width: 160,
    height: 240,
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
