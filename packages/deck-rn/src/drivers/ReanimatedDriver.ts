import { AnimationDriver, AnimationSequence } from '@deck/core';
import { runOnJS } from 'react-native-reanimated';

export class ReanimatedDriver implements AnimationDriver {
  async play(sequence: AnimationSequence): Promise<void> {
    if (sequence.steps.length === 0) {
      return;
    }
    // TODO: Map sequence steps to Shared Values and Reanimated animations
    await new Promise<void>((resolve) => {
      const maxDuration = Math.max(
        ...sequence.steps.map((step) => (step.target.duration ?? 0) + (step.target.delay ?? 0))
      );
      runOnJS(resolve)();
      setTimeout(resolve, maxDuration);
    });
  }

  cancel(): void {
    // TODO: Implement cancellation using Reanimated shared values
  }
}
