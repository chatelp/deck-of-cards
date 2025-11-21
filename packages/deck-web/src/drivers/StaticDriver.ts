import { AnimationDriver, AnimationSequence, CardId } from '@deck/core';

export class StaticDriver implements AnimationDriver {
  register(cardId: CardId, handle: any, initialFaceUp = false): void {
    // No-op: static driver doesn't need to track handles for animation
  }

  unregister(cardId: CardId): void {
    // No-op
  }

  async play(sequence: AnimationSequence): Promise<void> {
    // Resolve immediately without animating
    return Promise.resolve();
  }

  cancel(cardIds?: CardId[]): void {
    // No-op
  }
}

