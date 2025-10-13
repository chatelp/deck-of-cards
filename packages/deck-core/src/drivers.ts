import { AnimationDriver, AnimationSequence, CardId } from './models';

export class NoopAnimationDriver implements AnimationDriver {
  async play(sequence: AnimationSequence): Promise<void> {
    if (!sequence.steps.length) {
      return;
    }
    await new Promise<void>((resolve) => {
      const maxDuration = Math.max(...sequence.steps.map((step) => (step.target.duration ?? 0) + (step.target.delay ?? 0)));
      setTimeout(resolve, maxDuration);
    });
  }

  cancel(): void {}
}
