import { CardData, CardId, CardLayout, CardState, DeckState, DeckStateConfig, Vector2 } from './models';
export declare function createDeckState(cards: CardData[], config?: DeckStateConfig): DeckState;
export declare function updateCardState(deck: DeckState, cardId: CardId, updater: Partial<CardState>): DeckState;
export declare function updateCardLayout(deck: DeckState, cardId: CardId, layout: Partial<CardLayout>): DeckState;
export declare function setDeckPositions(deck: DeckState, positions: Record<CardId, CardLayout>): DeckState;
export declare function setDeckConfig(deck: DeckState, config: DeckStateConfig): DeckState;
export declare function getHandOrigin(size: number, index: number, spacing: number, origin?: Vector2): Vector2;
//# sourceMappingURL=state.d.ts.map