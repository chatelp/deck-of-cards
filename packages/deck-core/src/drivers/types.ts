import type { CardId, EasingName } from '../models.js';

/**
 * Easing function type - platform agnostic
 */
export type EasingFn = (value: number) => number;

/**
 * Card animation handle interface - platform agnostic
 * The actual SharedValue type will be provided by platform-specific implementations
 */
export interface CardAnimationHandle {
  translateX: unknown; // Will be SharedValue<number> in platform implementations
  translateY: unknown;
  rotation: unknown;
  scale: unknown;
  rotateY: unknown;
  zIndex: unknown;
  offsetX: number;
  offsetY: number;
}

/**
 * Easing map type for platform-specific implementations
 */
export type EasingMap = Record<EasingName, EasingFn>;






