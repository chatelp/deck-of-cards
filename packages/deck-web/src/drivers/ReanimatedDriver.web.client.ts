'use client';

import type { AnimationDriver, AnimationSequence, CardId, EasingName } from '@deck/core';
import type { EasingFn } from '@deck/core';

// NO TOP-LEVEL IMPORTS OF react-native-reanimated
// All imports must be dynamic and inside functions/blocks

// Type definition for SharedValue - defined locally to avoid importing react-native-reanimated
export type SharedValue<T> = { value: T };

// SSR-safe: Lazy load react-native-reanimated only on client
// Using dynamic import() for ESM compatibility
// Next.js webpack will handle the /web redirect at runtime
const fallbackEasing = (t: number) => t;
let withTiming: any = (value: number) => value;
let withDelay: any = (_delay: number, animation: any) => animation;
let Easing: any = {
  linear: fallbackEasing,
  in: (easing: any) => easing,
  out: (easing: any) => easing,
  inOut: (easing: any) => easing,
  cubic: fallbackEasing,
  exp: (t: number) => Math.pow(2, 10 * (t - 1))
};
let cancelAnimation: any = () => {};
let runOnJS: any = (fn: any) => fn;

// Load react-native-reanimated ONLY on client, using dynamic import
if (typeof window !== 'undefined') {
  // Use a function to ensure this is not hoisted or statically analyzed
  (function loadReanimated() {
    const moduleName = 'react-native-reanimated';
    import(moduleName).then((Reanimated: any) => {
      withTiming = Reanimated.withTiming;
      withDelay = Reanimated.withDelay;
      Easing = Reanimated.Easing;
      cancelAnimation = Reanimated.cancelAnimation;
      runOnJS = Reanimated.runOnJS;
    }).catch(() => {
      // Silent fail - fallbacks already set above
    });
  })();
}

// Re-export types with proper SharedValue typing
export type ReanimatedCardAnimationHandle = {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  rotation: SharedValue<number>;
  scale: SharedValue<number>;
  rotateY: SharedValue<number>;
  zIndex: SharedValue<number>;
  offsetX: number;
  offsetY: number;
};

type CardAnimationState = ReanimatedCardAnimationHandle & {
  isFaceUp: boolean;
};

// Initialize easing map - Easing is loaded above
const getEasingMap = (): Record<EasingName, EasingFn> => {
  return {
    linear: Easing.linear,
    easeIn: Easing.in(Easing.cubic),
    easeOut: Easing.out(Easing.cubic),
    easeInOut: Easing.inOut(Easing.cubic),
    spring: Easing.out(Easing.exp)
  };
};

function resolveEasing(easing: EasingName | undefined): EasingFn {
  const easingMap = getEasingMap();
  if (!easing) {
    return easingMap.easeInOut;
  }
  return easingMap[easing] ?? easingMap.easeInOut;
}

export class ReanimatedDriver implements AnimationDriver {
  private cards = new Map<CardId, CardAnimationState>();

  register(cardId: CardId, handle: ReanimatedCardAnimationHandle, initialFaceUp = false): void {
    this.cards.set(cardId, {
      ...handle,
      isFaceUp: initialFaceUp
    });
    handle.rotateY.value = initialFaceUp ? 180 : 0;
  }

  unregister(cardId: CardId): void {
    this.cards.delete(cardId);
  }

  private animateValue(
    sharedValue: SharedValue<number>,
    toValue: number,
    duration: number,
    easing: EasingFn,
    delay: number
  ): Promise<void> {
    if (!Number.isFinite(toValue)) {
      return Promise.resolve();
    }
    if (duration <= 0 && delay <= 0) {
      sharedValue.value = toValue;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const animation = withTiming(toValue, { duration: Math.max(duration, 0), easing }, () => {
        runOnJS(resolve)();
      });
      sharedValue.value = delay > 0 ? withDelay(delay, animation) : animation;
    });
  }

  async play(sequence: AnimationSequence): Promise<void> {
    if (!sequence.steps.length) {
      return;
    }
    const isFlip = sequence.meta?.type === 'flip';
    const animations = sequence.steps.map((step) => {
      const entry = this.cards.get(step.cardId);
      if (!entry) {
        return Promise.resolve();
      }
      const { target } = step;
      const duration = target.duration ?? 300;
      const delay = target.delay ?? 0;
      const easing = resolveEasing(target.easing);

      const translatePromises = [
        this.animateValue(entry.translateX, target.x - entry.offsetX, duration, easing, delay),
        this.animateValue(entry.translateY, target.y - entry.offsetY, duration, easing, delay),
        this.animateValue(entry.rotation, target.rotation, duration, easing, delay),
        this.animateValue(entry.scale, target.scale, duration, easing, delay)
      ];

      if (typeof target.zIndex === 'number') {
        entry.zIndex.value = target.zIndex;
      }

      if (isFlip) {
        const endAngle = entry.isFaceUp ? 0 : 180;
        entry.isFaceUp = !entry.isFaceUp;
        const easingMap = getEasingMap();
        const flipEasing = easingMap.easeInOut;
        translatePromises.push(this.animateValue(entry.rotateY, endAngle, duration, flipEasing, delay));
      }

      return Promise.all(translatePromises).then(() => undefined);
    });

    await Promise.all(animations);
  }

  cancel(cardIds?: CardId[]): void {
    const keys = cardIds ?? Array.from(this.cards.keys());
    keys.forEach((id) => {
      const entry = this.cards.get(id);
      if (!entry) {
        return;
      }
      cancelAnimation(entry.translateX);
      cancelAnimation(entry.translateY);
      cancelAnimation(entry.rotation);
      cancelAnimation(entry.scale);
      cancelAnimation(entry.rotateY);
    });
  }
}
