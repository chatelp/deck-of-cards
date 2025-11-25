import type { AnimationDriver, AnimationSequence, CardId, EasingName } from '@deck/core';
import type { SharedValue } from 'react-native-reanimated';
import { withTiming, withDelay, Easing, cancelAnimation, runOnJS } from 'react-native-reanimated';

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

type EasingFn = (value: number) => number;

type CardAnimationState = ReanimatedCardAnimationHandle & {
  isFaceUp: boolean;
};

const easingMap: Record<EasingName, EasingFn> = {
  linear: Easing.linear,
  easeIn: Easing.in(Easing.cubic),
  easeOut: Easing.out(Easing.cubic),
  easeInOut: Easing.inOut(Easing.cubic),
  spring: Easing.out(Easing.exp)
};

function resolveEasing(easing: EasingName | undefined): EasingFn {
  if (!easing) {
    return easingMap.easeInOut;
  }
  return easingMap[easing] ?? easingMap.easeInOut;
}

/**
 * Native animation driver using react-native-reanimated
 * Maps abstract AnimationSequence to Reanimated animations on SharedValues
 */
export class ReanimatedDriver implements AnimationDriver {
  private cards = new Map<CardId, CardAnimationState>();

  register(cardId: CardId, handle: ReanimatedCardAnimationHandle, initialFaceUp = false): void {
    this.cards.set(cardId, {
      ...handle,
      isFaceUp: initialFaceUp
    });
    // Ensure initial rotation is correct
    handle.rotateY.value = initialFaceUp ? 180 : 0;
  }

  unregister(cardId: CardId): void {
    this.cancel([cardId]);
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
    // If duration is 0, apply immediately (unless there is a delay)
    if (duration <= 0 && delay <= 0) {
      sharedValue.value = toValue;
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      const animation = withTiming(toValue, { duration: Math.max(duration, 0), easing }, (finished) => {
        if (finished) {
          runOnJS(resolve)();
        } else {
          // If cancelled, we also resolve to avoid hanging promises
          runOnJS(resolve)();
        }
      });
      
      if (delay > 0) {
        sharedValue.value = withDelay(delay, animation);
      } else {
        sharedValue.value = animation;
      }
    });
  }

  async play(sequence: AnimationSequence): Promise<void> {
    if (!sequence.steps || sequence.steps.length === 0) {
      return Promise.resolve();
    }

    const isFlip = sequence.meta?.type === 'flip';
    
    // Process all animations in parallel
    const animations = sequence.steps.map((step) => {
      const entry = this.cards.get(step.cardId);
      if (!entry) {
        console.warn(`[ReanimatedDriver] Card ${step.cardId} not registered`);
        return Promise.resolve();
      }

      const { target } = step;
      const duration = target.duration ?? 300;
      const delay = target.delay ?? 0;
      const easing = resolveEasing(target.easing);

      // Prepare all property animations
      const promises: Promise<void>[] = [];

      // Position
      if (typeof target.x === 'number') {
        promises.push(this.animateValue(entry.translateX, target.x - entry.offsetX, duration, easing, delay));
      }
      if (typeof target.y === 'number') {
        promises.push(this.animateValue(entry.translateY, target.y - entry.offsetY, duration, easing, delay));
      }

      // Transform
      if (typeof target.rotation === 'number') {
        promises.push(this.animateValue(entry.rotation, target.rotation, duration, easing, delay));
      }
      if (typeof target.scale === 'number') {
        promises.push(this.animateValue(entry.scale, target.scale, duration, easing, delay));
      }

      // Z-Index (immediate update usually, but we can animate/delay it if needed)
      // Reanimated doesn't really animate zIndex smoothly in 2D, but we can set it
      if (typeof target.zIndex === 'number') {
        if (delay > 0) {
          // If delayed, we could use a timeout or withDelay (but withDelay works on numbers)
          // Let's just set it immediately for now to avoid complexity, 
          // or strictly speaking we should delay it.
          // For shuffle, zIndex order matters throughout the movement.
          entry.zIndex.value = target.zIndex;
        } else {
          entry.zIndex.value = target.zIndex;
        }
      }

      // Flip handling
      if (isFlip) {
        const endAngle = entry.isFaceUp ? 0 : 180;
        entry.isFaceUp = !entry.isFaceUp;
        // Use easeInOut for flips usually
        const flipEasing = easingMap.easeInOut;
        promises.push(this.animateValue(entry.rotateY, endAngle, duration, flipEasing, delay));
      }

      return Promise.all(promises).then(() => undefined);
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
      // Note: We don't reset values, we stop them where they are.
    });
  }
}







