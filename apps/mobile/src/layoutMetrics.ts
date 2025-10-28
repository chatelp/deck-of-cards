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
    const maxRadiusByWidth = innerWidth / 2;
    const maxRadiusByHeight = innerHeight * 0.95;
    const fanRadius = Math.max(cardSize.height * 1.1, Math.min(maxRadiusByWidth, maxRadiusByHeight));
    const spreadAngle = Math.PI * 0.95;
    const originY = cardSize.height * 0.45;
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
