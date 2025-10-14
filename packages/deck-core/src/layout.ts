import { CardId, CardLayout, DeckState, FanOptions } from './models';
import { getHandOrigin } from './state';

export function computeFanLayout(deck: DeckState, options: FanOptions = {}): Record<CardId, CardLayout> {
  const { cards, config } = deck;
  const defaultOrigin = { x: 0, y: deck.config.fanRadius * 0.6 };
  const origin = options.origin ?? defaultOrigin;
  const spreadAngle = options.spreadAngle ?? config.fanAngle;
  const radius = options.radius ?? config.fanRadius;
  const middle = (cards.length - 1) / 2;

  const layouts: Record<CardId, CardLayout> = {};
  const step = cards.length > 1 ? spreadAngle / (cards.length - 1) : 0;
  cards.forEach((card, index) => {
    const angleOffset = -spreadAngle / 2 + step * index - Math.PI / 2;
    const x = origin.x + radius * Math.cos(angleOffset);
    const y = origin.y + radius * Math.sin(angleOffset);
    const rotation = (angleOffset * 180) / Math.PI + 90;
    layouts[card.id] = {
      x,
      y,
      rotation,
      scale: 1,
      zIndex: index
    };
  });
  return layouts;
}

export function computeStackLayout(deck: DeckState): Record<CardId, CardLayout> {
  const { cards } = deck;
  const layouts: Record<CardId, CardLayout> = {};
  cards.forEach((card, index) => {
    layouts[card.id] = {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      zIndex: index
    };
  });
  return layouts;
}

export function computeLineLayout(deck: DeckState, spacing = deck.config.spacing): Record<CardId, CardLayout> {
  const { cards } = deck;
  const layouts: Record<CardId, CardLayout> = {};
  cards.forEach((card, index) => {
    const { x, y } = getHandOrigin(cards.length, index, spacing);
    layouts[card.id] = {
      x,
      y,
      rotation: 0,
      scale: 1,
      zIndex: index
    };
  });
  return layouts;
}
