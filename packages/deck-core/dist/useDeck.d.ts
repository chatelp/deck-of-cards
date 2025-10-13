import { AnimationDriver, CardData, CardId, DeckEvent, DeckEventName, DeckState } from './models';
import { updateCardLayout } from './state';
import { animateTo as animateCard } from './primitives';
export declare function useDeck(cards: CardData[], driver: AnimationDriver): {
    deck: DeckState;
    fan: () => Promise<void>;
    shuffle: () => Promise<void>;
    flip: (cardId: CardId) => Promise<void>;
    animateTo: (cardId: CardId, target: ReturnType<typeof animateCard>["sequence"]["steps"][number]["target"]) => Promise<void>;
    selectCard: (cardId: CardId) => Promise<void>;
    setLayout: (cardId: CardId, layout: Parameters<typeof updateCardLayout>[2]) => Promise<void>;
    resetStack: () => Promise<void>;
    setPositions: (positions: DeckState["positions"]) => Promise<void>;
    on: <T extends DeckEventName>(type: T, listener: (event: DeckEvent<T>) => void) => () => void;
};
//# sourceMappingURL=useDeck.d.ts.map