import { AnimationDriver, AnimationSequence } from './models';
export declare class NoopAnimationDriver implements AnimationDriver {
    play(sequence: AnimationSequence): Promise<void>;
    cancel(): void;
}
//# sourceMappingURL=drivers.d.ts.map