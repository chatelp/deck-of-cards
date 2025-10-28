import { CARD_HEIGHT, CARD_WIDTH } from '@deck/rn';

export type LayoutMode = 'fan' | 'ring' | 'stack';

export interface DeckLayoutMetrics {
  cardWidth: number;
  cardHeight: number;
  containerStyle: {
    width: string;
    maxWidth: number;
    aspectRatio: number;
    padding: number;
    minHeight: number;
  };
  ringRadius?: number;
  scaleLimits: {
    minScale: number;
    maxScale: number;
  };
}

const CARD_ASPECT = CARD_WIDTH / CARD_HEIGHT;

export function getResponsiveCardSize(availableWidth: number, layout: LayoutMode): {
  width: number;
  height: number;
} {
  const maxCardWidth = Math.min(availableWidth * 0.35, 180);
  const minCardWidth = 120;
  let width = Math.max(minCardWidth, maxCardWidth);
  if (layout === 'stack') {
    width *= 0.9;
  }
  return {
    width,
    height: width / CARD_ASPECT
  };
}

export function getDeckLayoutMetrics(viewportWidth: number, layout: LayoutMode): DeckLayoutMetrics {
  const safeWidth = Math.max(320, viewportWidth - 32);
  const cardSize = getResponsiveCardSize(safeWidth, layout);

  if (layout === 'ring') {
    const maxWidth = Math.min(safeWidth, 420);
    const padding = Math.max(12, maxWidth * 0.04);
    const availableRadius = (maxWidth - padding * 2) / 2;
    const cardDiagonal = Math.sqrt(cardSize.width ** 2 + cardSize.height ** 2);
    const ringRadius = Math.max(40, availableRadius - cardDiagonal / 2);
    return {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      containerStyle: {
        width: '100%',
        maxWidth,
        aspectRatio: 1,
        padding,
        minHeight: cardSize.height * 1.4
      },
      ringRadius,
      scaleLimits: {
        minScale: 0,
        maxScale: 1
      }
    };
  }

  if (layout === 'stack') {
    const maxWidth = Math.min(safeWidth, 380);
    const padding = Math.max(10, maxWidth * 0.035);
    return {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      containerStyle: {
        width: '100%',
        maxWidth,
        aspectRatio: 3 / 4,
        padding,
        minHeight: cardSize.height * 1.4
      },
      scaleLimits: {
        minScale: 0,
        maxScale: 1
      }
    };
  }

  const maxWidth = Math.min(safeWidth, 640);
  const padding = Math.max(14, maxWidth * 0.035);
  return {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      containerStyle: {
        width: '100%',
        maxWidth,
        aspectRatio: 4 / 3,
        padding,
        minHeight: cardSize.height * 1.35
      },
    scaleLimits: {
      minScale: 0,
      maxScale: 1
    }
  };
}
