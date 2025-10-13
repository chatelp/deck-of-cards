export class NoopAnimationDriver {
    async play(sequence) {
        if (!sequence.steps.length) {
            return;
        }
        await new Promise((resolve) => {
            const maxDuration = Math.max(...sequence.steps.map((step) => (step.target.duration ?? 0) + (step.target.delay ?? 0)));
            setTimeout(resolve, maxDuration);
        });
    }
    cancel() { }
}
