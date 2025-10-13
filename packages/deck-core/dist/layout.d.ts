import { CardId, CardLayout, DeckState, FanOptions } from './models';
export declare function computeFanLayout(deck: DeckState, options?: FanOptions): Record<CardId, CardLayout>;
export declare function computeStackLayout(deck: DeckState): Record<CardId, CardLayout>;
export declare function computeLineLayout(deck: DeckState, spacing?: number): Record<CardId, CardLayout>;
//# sourceMappingURL=layout.d.ts.map