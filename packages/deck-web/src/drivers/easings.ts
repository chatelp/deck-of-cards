import type { EasingName } from '@deck/core';

/**
 * Easing function type - pure function that maps [0,1] to [0,1]
 */
export type EasingFn = (t: number) => number;

/**
 * Linear easing - no acceleration
 */
export function linear(t: number): number {
  return t;
}

/**
 * Ease-in - slow start, fast end
 */
export function easeIn(t: number): number {
  return t * t;
}

/**
 * Ease-out - fast start, slow end
 */
export function easeOut(t: number): number {
  return t * (2 - t);
}

/**
 * Ease-in-out - slow start and end, fast middle
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Spring easing - bouncy, elastic motion
 * Simplified spring approximation using ease-out with overshoot
 */
export function spring(t: number): number {
  // Simplified spring: ease-out with slight overshoot
  // This approximates a spring animation without complex physics
  if (t < 0.5) {
    return 2 * t * t;
  }
  // Overshoot and settle
  const overshoot = 1.1;
  const settled = 1 - Math.pow(2, -10 * (t - 0.5));
  return Math.min(overshoot * settled, 1);
}

/**
 * Easing map for all supported easing functions
 */
export const EASING_MAP: Record<EasingName, EasingFn> = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  spring
};

/**
 * Get easing function by name
 */
export function getEasing(name: EasingName = 'linear'): EasingFn {
  return EASING_MAP[name] || linear;
}

