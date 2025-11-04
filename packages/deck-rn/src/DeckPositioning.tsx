import { useMemo } from 'react';
import { DeckState, CardLayout, calculateDeckBounds } from '@deck/core';
import { CARD_WIDTH, CARD_HEIGHT } from './CardView';

const LAYOUT_PADDING = 16;
const SAFETY_MARGIN = 8;
const MIN_FIT_SCALE = 0.1;
const SCALE_PRECISION = 10000;
const POSITION_PRECISION = 1000;

const ZERO_BOUNDS = {
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  width: 0,
  height: 0,
  centerX: 0,
  centerY: 0
} as const;

export interface LayoutParams {
  fanRadius: number;
  ringRadius: number;
  fanOrigin: { x: number; y: number };
  fanSpread: number;
  spacing: number;
}

export interface PositioningResult {
  fitScale: number;
  scaledPositions: Record<string, CardLayout>;
  scaledCardDimensions: { width: number; height: number };
  unscaledBounds: ReturnType<typeof calculateDeckBounds>;
  scaledBounds: ReturnType<typeof calculateDeckBounds>;
  deckTransform: {
    translateX: number;
    translateY: number;
    anchorLeft: number;
    anchorTop: number;
  };
  debug: {
    layoutWidth: number;
    layoutHeight: number;
    renderWidth: number;
    renderHeight: number;
    innerWidth: number;
    innerHeight: number;
    effectiveInnerWidth: number;
    effectiveInnerHeight: number;
    cardCount: number;
    layoutMode: string;
  };
}

export function calculateLayoutParams(
  containerWidth: number,
  containerHeight: number,
  cardCount: number,
  debugLogs: boolean = false
): LayoutParams {
  const innerWidth = Math.max(0, containerWidth - LAYOUT_PADDING * 2);
  const innerHeight = Math.max(0, containerHeight - LAYOUT_PADDING * 2);
  const effectiveInnerWidth = Math.max(0, innerWidth - SAFETY_MARGIN * 2);
  const effectiveInnerHeight = Math.max(0, innerHeight - SAFETY_MARGIN * 2);

  if (innerWidth <= 0 || innerHeight <= 0 || cardCount === 0) {
    return {
      fanRadius: 240,
      ringRadius: 260,
      fanOrigin: { x: 0, y: 144 },
      fanSpread: Math.PI,
      spacing: 24
    };
  }

  const maxFanRadiusByWidth = (effectiveInnerWidth - CARD_WIDTH) / 2;
  const maxFanRadiusByHeight = effectiveInnerHeight * 0.68;
  const dynamicFanCap = Math.min(
    Math.max(140, Math.min(effectiveInnerWidth, effectiveInnerHeight) * 0.85),
    360
  );
  const fanRadius = Math.max(
    60,
    Math.min(maxFanRadiusByWidth, maxFanRadiusByHeight, dynamicFanCap)
  );
  const fanOriginY = fanRadius * 0.6;

  const cardDiagonal = Math.sqrt(CARD_WIDTH ** 2 + CARD_HEIGHT ** 2);
  const minRadiusForNoOverlap = cardCount === 0 ? 0 : (cardCount * cardDiagonal) / (2 * Math.PI);
  const maxRingRadius = Math.min(effectiveInnerWidth, effectiveInnerHeight) / 2 - cardDiagonal / 2;
  let ringRadius = Math.max(minRadiusForNoOverlap, 72);
  if (maxRingRadius > 0) {
    ringRadius = Math.min(ringRadius, maxRingRadius);
  } else {
    ringRadius = Math.max(72, Math.min(effectiveInnerWidth, effectiveInnerHeight) / 2 - 20);
  }

  let spacing = 28;
  if (cardCount > 1) {
    const maxSpacing = (effectiveInnerWidth - CARD_WIDTH) / (cardCount - 1);
    spacing = Math.max(8, Math.min(maxSpacing, 32));
  }

  if (__DEV__ && debugLogs) {
    // eslint-disable-next-line no-console
    console.log('[DeckPositioning] layoutParams', {
      containerWidth,
      containerHeight,
      cardCount,
      fanRadius,
      ringRadius,
      spacing
    });
  }

  return {
    fanRadius,
    ringRadius,
    fanOrigin: { x: 0, y: fanOriginY },
    fanSpread: Math.PI,
    spacing
  };
}

export function useDeckPositioning(
  deck: DeckState,
  layoutWidth: number,
  layoutHeight: number,
  renderWidth: number,
  renderHeight: number,
  debugLogs: boolean = false
): PositioningResult {
  const dimensions = useMemo(() => {
    const innerWidth = Math.max(0, layoutWidth - LAYOUT_PADDING * 2);
    const innerHeight = Math.max(0, layoutHeight - LAYOUT_PADDING * 2);
    const effectiveInnerWidth = Math.max(0, innerWidth - SAFETY_MARGIN * 2);
    const effectiveInnerHeight = Math.max(0, innerHeight - SAFETY_MARGIN * 2);

    return {
      innerWidth,
      innerHeight,
      effectiveInnerWidth,
      effectiveInnerHeight
    };
  }, [layoutWidth, layoutHeight]);

  const unscaledBounds = useMemo(() => {
    if (deck.cards.length === 0) {
      return ZERO_BOUNDS;
    }
    return calculateDeckBounds(deck.cards, deck.positions, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT
    });
  }, [deck.cards, deck.positions]);

  const fitScale = useMemo(() => {
    if (
      unscaledBounds.width === 0 ||
      unscaledBounds.height === 0 ||
      dimensions.effectiveInnerWidth <= 0 ||
      dimensions.effectiveInnerHeight <= 0
    ) {
      return 1;
    }

    const scaleX = dimensions.effectiveInnerWidth / unscaledBounds.width;
    const scaleY = dimensions.effectiveInnerHeight / unscaledBounds.height;
    const scale = Math.min(scaleX, scaleY, 1);
    const clamped = Math.max(MIN_FIT_SCALE, scale);
    return Math.round(clamped * SCALE_PRECISION) / SCALE_PRECISION;
  }, [dimensions, unscaledBounds]);

  const scaledPositions = useMemo(() => {
    const result: Record<string, CardLayout> = {};
    const basePrecision = POSITION_PRECISION;
    const scalePrecision = SCALE_PRECISION;

    deck.cards.forEach((card) => {
      const layout = deck.positions[card.id];
      if (!layout) {
        return;
      }

      result[card.id] = {
        ...layout,
        x: Math.round(layout.x * fitScale * basePrecision) / basePrecision,
        y: Math.round(layout.y * fitScale * basePrecision) / basePrecision,
        rotation: layout.rotation,
        scale: Math.round((layout.scale ?? 1) * fitScale * scalePrecision) / scalePrecision,
        zIndex: layout.zIndex
      };
    });

    return result;
  }, [deck.cards, deck.positions, fitScale]);

  const scaledBounds = useMemo(() => {
    if (deck.cards.length === 0) {
      return ZERO_BOUNDS;
    }
    return calculateDeckBounds(deck.cards, scaledPositions, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT
    });
  }, [deck.cards, scaledPositions]);

  if (__DEV__ && debugLogs) {
    const { effectiveInnerWidth, effectiveInnerHeight } = dimensions;
    if (
      scaledBounds.width > effectiveInnerWidth + 1 ||
      scaledBounds.height > effectiveInnerHeight + 1
    ) {
      // eslint-disable-next-line no-console
      console.warn('[DeckPositioning] overflow detected', {
        scaledBounds,
        layoutWidth,
        layoutHeight,
        fitScale
      });
    }
  }

  const deckTransform = useMemo(() => {
    if (renderWidth <= 0 || renderHeight <= 0) {
      return { translateX: 0, translateY: 0, anchorLeft: 0, anchorTop: 0 };
    }

    const anchorLeft = renderWidth / 2;
    const anchorTop = renderHeight / 2;
    const translateX = anchorLeft - scaledBounds.centerX;
    const translateY = anchorTop - scaledBounds.centerY;

    return {
      translateX: Math.round(translateX * POSITION_PRECISION) / POSITION_PRECISION,
      translateY: Math.round(translateY * POSITION_PRECISION) / POSITION_PRECISION,
      anchorLeft,
      anchorTop
    };
  }, [renderWidth, renderHeight, scaledBounds]);

  const scaledCardDimensions = useMemo(() => {
    return {
      width: CARD_WIDTH * fitScale,
      height: CARD_HEIGHT * fitScale
    };
  }, [fitScale]);

  return {
    fitScale,
    scaledPositions,
    scaledCardDimensions,
    unscaledBounds,
    scaledBounds,
    deckTransform,
    debug: {
      layoutWidth,
      layoutHeight,
      renderWidth,
      renderHeight,
      innerWidth: dimensions.innerWidth,
      innerHeight: dimensions.innerHeight,
      effectiveInnerWidth: dimensions.effectiveInnerWidth,
      effectiveInnerHeight: dimensions.effectiveInnerHeight,
      cardCount: deck.cards.length,
      layoutMode: deck.layoutMode
    }
  };
}
