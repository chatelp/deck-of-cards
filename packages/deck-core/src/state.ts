import { CardData, CardId, CardLayout, CardState, DeckLayoutMode, DeckState, DeckStateConfig, Vector2 } from './models';

const defaultConfig: Required<DeckStateConfig> = {
  fanAngle: Math.PI,
  fanRadius: 240,
  spacing: 24,
  seed: Date.now(),
  drawLimit: 2
};

export function createDeckState(cards: CardData[], config: DeckStateConfig = {}): DeckState {
  const mergedConfig = { ...defaultConfig, ...config };
  const cardStates: CardState[] = cards.map((card) => ({
    id: card.id,
    faceUp: false,
    selected: false,
    draggable: true,
    data: card
  }));

  const positions: Record<CardId, CardLayout> = {};
  cardStates.forEach((card, index) => {
    positions[card.id] = {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      zIndex: index
    };
  });

  return {
    cards: cardStates,
    drawnCards: [],
    positions,
    config: mergedConfig,
    layoutMode: 'stack'
  };
}

export function updateCardState(deck: DeckState, cardId: CardId, updater: Partial<CardState>): DeckState {
  const cards = deck.cards.map((card) => (card.id === cardId ? { ...card, ...updater } : card));
  return { ...deck, cards };
}

export function updateCardLayout(deck: DeckState, cardId: CardId, layout: Partial<CardLayout>): DeckState {
  const positions = {
    ...deck.positions,
    [cardId]: {
      ...deck.positions[cardId],
      ...layout
    }
  };
  return { ...deck, positions };
}

export function setDeckPositions(deck: DeckState, positions: Record<CardId, CardLayout>): DeckState {
  return { ...deck, positions };
}

export function setDeckConfig(deck: DeckState, config: DeckStateConfig): DeckState {
  return { ...deck, config: { ...deck.config, ...config } };
}

export function setDeckLayoutMode(deck: DeckState, layoutMode: DeckLayoutMode): DeckState {
  return { ...deck, layoutMode };
}

export function getHandOrigin(size: number, index: number, spacing: number, origin: Vector2 = { x: 0, y: 0 }): Vector2 {
  const totalWidth = (size - 1) * spacing;
  const startX = origin.x - totalWidth / 2;
  return {
    x: startX + index * spacing,
    y: origin.y
  };
}
