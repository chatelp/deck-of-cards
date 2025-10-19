import { CardId, CardLayout, CardState } from './models';

export interface CardDimensions {
  width: number;
  height: number;
}

export interface DeckBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export function calculateDeckBounds(
  cards: CardState[],
  positions: Record<CardId, CardLayout>,
  dimensions: CardDimensions
): DeckBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let count = 0;

  cards.forEach((card) => {
    const layout = positions[card.id];
    if (!layout) {
      return;
    }

    const scale = layout.scale ?? 1;
    const width = dimensions.width * scale;
    const height = dimensions.height * scale;
    const rotationDegrees = layout.rotation ?? 0;
    const rotation = (rotationDegrees * Math.PI) / 180;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const halfWidth = (Math.abs(cos) * width + Math.abs(sin) * height) / 2;
    const halfHeight = (Math.abs(sin) * width + Math.abs(cos) * height) / 2;

    const centerX = layout.x ?? 0;
    const centerY = layout.y ?? 0;

    const cardMinX = centerX - halfWidth;
    const cardMaxX = centerX + halfWidth;
    const cardMinY = centerY - halfHeight;
    const cardMaxY = centerY + halfHeight;

    if (cardMinX < minX) {
      minX = cardMinX;
    }
    if (cardMaxX > maxX) {
      maxX = cardMaxX;
    }
    if (cardMinY < minY) {
      minY = cardMinY;
    }
    if (cardMaxY > maxY) {
      maxY = cardMaxY;
    }
    count += 1;
  });

  if (count === 0 || !Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0
    };
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    centerX,
    centerY
  };
}
