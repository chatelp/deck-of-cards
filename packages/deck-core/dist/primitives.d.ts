import { AnimateToOptions, AnimationSequence, CardId, DeckState, FlipOptions, ShuffleOptions } from './models';
export declare function fan(deck: DeckState): {
    deck: DeckState;
    sequence: AnimationSequence;
};
export declare function stack(deck: DeckState): {
    deck: DeckState;
    sequence: AnimationSequence;
};
export declare function shuffle(deck: DeckState, options?: ShuffleOptions): {
    deck: DeckState;
    sequence: AnimationSequence;
};
export declare function animateTo(deck: DeckState, cardId: CardId, target: AnimationSequence['steps'][number]['target'], options?: AnimateToOptions): {
    deck: DeckState;
    sequence: AnimationSequence;
};
export declare function flip(deck: DeckState, cardId: CardId, options?: FlipOptions): {
    deck: DeckState;
    sequence: AnimationSequence;
};
//# sourceMappingURL=primitives.d.ts.map