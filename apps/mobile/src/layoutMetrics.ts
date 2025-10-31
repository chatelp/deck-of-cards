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
  fanConfig?: {
    radius: number;
    spreadAngle: number;
    originY: number;
  };
  scaleLimits: {
    minScale: number;
    maxScale: number;
  };
}

const CARD_ASPECT = CARD_WIDTH / CARD_HEIGHT;

// Estimate deck bounds for a given layout mode and card dimensions
function estimateDeckBounds(layout: LayoutMode, cardWidth: number, cardHeight: number) {
  const cardDiagonal = Math.sqrt(cardWidth ** 2 + cardHeight ** 2);

  switch (layout) {
    case 'stack':
      return { width: cardWidth, height: cardHeight };

    case 'ring': {
      // Estimate ring diameter (simplified - assumes reasonable number of cards)
      const ringDiameter = cardDiagonal * 2.5; // Rough estimate
      return { width: ringDiameter, height: ringDiameter };
    }

    case 'fan': {
      // Estimate fan bounds based on radius and spread
      const fanRadius = Math.max(cardHeight * 1.1, cardWidth * 0.8);
      const spreadWidth = fanRadius * 2;
      const spreadHeight = fanRadius * 1.2; // Fan extends downward
      return { width: spreadWidth, height: spreadHeight };
    }

    default:
      return { width: cardWidth, height: cardHeight };
  }
}

export function getResponsiveCardSize(availableWidth: number, layout: LayoutMode, availableHeight?: number): {
  width: number;
  height: number;
} {
  const ratio = layout === 'stack' ? 0.78 : layout === 'fan' ? 0.58 : 0.52;
  const hardCap = layout === 'stack' ? 260 : 220;
  const minWidth = 96;
  const widthLimit = Math.min(availableWidth * ratio, availableWidth - 16, hardCap);
  const heightLimit = availableHeight ? availableHeight * (layout === 'stack' ? 0.92 : 0.78) : Number.POSITIVE_INFINITY;
  const widthFromHeight = Number.isFinite(heightLimit) ? heightLimit * CARD_ASPECT : Number.POSITIVE_INFINITY;
  const width = Math.max(minWidth, Math.min(widthLimit, widthFromHeight));
  return {
    width,
    height: width / CARD_ASPECT
  };
}

export function getDeckLayoutMetrics(viewportWidth: number, layout: LayoutMode, containerSize?: { width: number; height: number }): DeckLayoutMetrics {
  // If we have container size, use it to compute baked scale for card dimensions
  const hasContainerSize = containerSize && containerSize.width > 0 && containerSize.height > 0;
  const safeWidth = Math.max(320, viewportWidth - 32);

  const baseMaxWidth = layout === 'ring'
    ? Math.min(safeWidth, 420)
    : layout === 'stack'
      ? Math.min(safeWidth, 380)
      : Math.min(safeWidth, 640);
  const basePadding = layout === 'ring'
    ? Math.max(12, baseMaxWidth * 0.04)
    : layout === 'stack'
      ? Math.max(10, baseMaxWidth * 0.035)
      : Math.max(14, baseMaxWidth * 0.035);
  const aspectRatio = layout === 'ring' ? 1 : layout === 'stack' ? 3 / 4 : 4 / 3;

  const measuredWidth = containerSize?.width && containerSize.width > 0 ? Math.min(containerSize.width, baseMaxWidth) : baseMaxWidth;
  const measuredHeight = containerSize?.height && containerSize.height > 0
    ? containerSize.height
    : Math.max(baseMaxWidth / aspectRatio, baseMaxWidth * 0.7);

  const innerWidth = Math.max(120, measuredWidth - basePadding * 2);
  const innerHeight = Math.max(160, measuredHeight - basePadding * 2);

  // Calculate card size based on available space
  const cardSize = getResponsiveCardSize(innerWidth, layout, innerHeight);

  const containerStyle = {
    width: '100%' as const,
    maxWidth: measuredWidth,
    aspectRatio,
    padding: basePadding,
    minHeight: Math.max(measuredHeight, cardSize.height * 1.3)
  };

  if (layout === 'ring') {
    const cardDiagonal = Math.sqrt(cardSize.width ** 2 + cardSize.height ** 2);
    // Since cardSize already includes baked scale, we can compute ringRadius relative to inner dimensions
    const ringRadius = Math.max(36, (Math.min(innerWidth, innerHeight) - cardDiagonal) / 2);
    return {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      containerStyle,
      ringRadius,
      scaleLimits: {
        minScale: 0,
        maxScale: 1
      }
    };
  }

  if (layout === 'fan') {
    const cardDiagonal = Math.sqrt(cardSize.width ** 2 + cardSize.height ** 2);
    // Compute fan parameters relative to inner dimensions, accounting for baked scale in cardSize
    const maxRadiusByWidth = (innerWidth - cardDiagonal) / 2;
    const maxRadiusByHeight = innerHeight - cardSize.height * 0.8; // Leave some space at bottom
    const fanRadius = Math.max(cardSize.height * 1.1, Math.min(maxRadiusByWidth, maxRadiusByHeight));
    const spreadAngle = Math.PI * 0.95;
    const originY = cardSize.height * 0.45; // Origin relative to card height
    return {
      cardWidth: cardSize.width,
      cardHeight: cardSize.height,
      containerStyle,
      fanConfig: {
        radius: fanRadius,
        spreadAngle,
        originY
      },
      scaleLimits: {
        minScale: 0,
        maxScale: 1
      }
    };
  }

  return {
    cardWidth: cardSize.width,
    cardHeight: cardSize.height,
    containerStyle,
    scaleLimits: {
      minScale: 0,
      maxScale: 1
    }
  };
}
