import { AnimationDriver, AnimationSequence, CardId, EasingName } from '@deck/core';
import { AnimationControls } from 'framer-motion';

type CardAnimationState = {
  controls: AnimationControls;
  flipProgress: number;
  isFaceUp: boolean;
};

const easingMap: Record<EasingName, [number, number, number, number] | 'linear' | 'easeInOut'> = {
  linear: 'linear',
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: 'easeInOut',
  spring: [0.22, 1, 0.36, 1]
};

export class WebMotionDriver implements AnimationDriver {
  private cards = new Map<CardId, CardAnimationState>();

  register(cardId: CardId, controls: AnimationControls, initialFaceUp = false): void {
    this.cards.set(cardId, { controls, flipProgress: 0, isFaceUp: initialFaceUp });
  }

  unregister(cardId: CardId): void {
    this.cards.delete(cardId);
  }

  has(cardId: CardId): boolean {
    return this.cards.has(cardId);
  }

  async play(sequence: AnimationSequence): Promise<void> {
    if (!sequence.steps.length) {
      return;
    }

    const isFlip = sequence.meta?.type === 'flip';
    const animations = sequence.steps.map((step: AnimationSequence['steps'][number]) => {
      const entry = this.cards.get(step.cardId);
      if (!entry) {
        return Promise.resolve();
      }
      const { controls } = entry;
      const { target } = step;
      const transition = this.toTransition(target.duration ?? 300, target.easing ?? 'easeInOut', target.delay ?? 0, isFlip);
      if (isFlip) {
        controls.start({
          x: target.x,
          y: target.y,
          rotate: target.rotation,
          scale: target.scale,
          transition
        }).catch((error) => {
          console.error('[WebMotionDriver] base animation error', error);
        });

        const current = this.cards.get(step.cardId);
        const startAngle = current?.isFaceUp ? 180 : 0;
        const endAngle = current?.isFaceUp ? 0 : 180;
        if (current) {
          current.isFaceUp = !current.isFaceUp;
        }

        return controls.start({
          rotateY: [startAngle, startAngle + 90, endAngle],
          transition: {
            times: [0, 0.5, 1],
            duration: transition.duration ?? 0.4,
            ease: 'easeInOut'
          }
        });
      }

      return controls.start({
        x: target.x,
        y: target.y,
        rotate: target.rotation,
        scale: target.scale,
        transition
      });
    });

    await Promise.all(animations);
  }

  cancel(cardIds?: CardId[]): void {
    if (!cardIds) {
      this.cards.forEach((entry) => {
        entry.controls.stop();
      });
      return;
    }
    cardIds.forEach((id) => {
      const entry = this.cards.get(id);
      entry?.controls.stop();
    });
  }

  private toTransition(durationMs: number, easing: EasingName, delayMs: number, forceSpring: boolean) {
    const duration = Math.max(durationMs, 16) / 1000;
    const delay = Math.max(delayMs, 0) / 1000;
    if (forceSpring || easing === 'spring') {
      return {
        type: 'spring',
        stiffness: 200,
        damping: 18,
        delay
      };
    }
    const ease = easingMap[easing] ?? 'easeInOut';
    return {
      duration,
      ease,
      delay
    };
  }
}
