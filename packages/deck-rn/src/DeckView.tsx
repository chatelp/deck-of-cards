import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Image, Text, LayoutChangeEvent, ViewStyle } from 'react-native';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  DeckState,
  calculateDeckBounds,
  resolveCardBackAsset,
  useDeck
} from '@deck/core';
import { CardView, CARD_HEIGHT, CARD_WIDTH } from './CardView';
import { ReanimatedDriver } from './drivers/ReanimatedDriver';
import { RN_DECK_VERSION } from './version';
import { CardAnimationTarget, CardRenderProps, DeckViewProps } from './types';

export const DeckView: React.FC<DeckViewProps> = ({
  cards,
  driver,
  selectedIds,
  onSelectCard,
  onDrawCard,
  onFlipCard,
  onDeckStateChange,
  renderCardFace,
  renderCardBack,
  drawLimit,
  defaultBackAsset,
  ringRadius,
  autoFan = false,
  style,
  onDeckReady,
  cardDimensions,
  scaleLimits,
  debugLogs,
  containerSize: containerSizeProp,
  fanConfig
}) => {
  const [internalContainerSize, setInternalContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new ReanimatedDriver(),
    [driver]
  );
  const deckHook = useDeck(cards, animationDriver, {
    drawLimit,
    defaultBackAsset,
    ringRadius,
    fanRadius: fanConfig?.radius,
    fanAngle: fanConfig?.spreadAngle
  });
  const { deck, fan, ring, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;
  const [prefetchedBackAssets, setPrefetchedBackAssets] = useState<Record<string, boolean>>({});

  const lastFannedLengthRef = useRef<number | null>(null);

  // Sanity log to ensure the correct build of @deck/rn is loaded by Metro/Expo
  useEffect(() => {
    if (!__DEV__ || !debugLogs) {
      return;
    }
    console.log('[DeckView] sanity: version=%s debug=%s', RN_DECK_VERSION, !!debugLogs);
    console.log('[DeckView] props cardDimensions=%o scaleLimits=%o', cardDimensions, scaleLimits);
    console.log('[DeckView] layoutConfig', { fanConfig, ringRadius });
  }, [debugLogs, cardDimensions, scaleLimits, fanConfig, ringRadius]);
  useEffect(() => {
    if (!autoFan) {
      return;
    }
    if (deck.layoutMode === 'ring') {
      return;
    }
    if (lastFannedLengthRef.current === deck.cards.length) {
      return;
    }
    lastFannedLengthRef.current = deck.cards.length;
    void fan();
  }, [autoFan, deck.cards.length, deck.layoutMode, fan]);

  useEffect(() => {
    if (onDeckReady) {
      const wrappedAnimateTo = async (cardId: string, target: CardAnimationTarget) => {
        await animateTo(cardId, target);
      };
      onDeckReady({
        fan,
        ring,
        shuffle,
        flip,
        animateTo: wrappedAnimateTo,
        selectCard,
        drawCard,
        resetStack
      });
    }
  }, [onDeckReady, fan, ring, shuffle, flip, animateTo, selectCard, drawCard, resetStack]);

  useEffect(() => {
    onDeckStateChange?.(deck);
  }, [deck, onDeckStateChange]);

  const cardWidth = cardDimensions?.width ?? CARD_WIDTH;
  const cardHeight = cardDimensions?.height ?? CARD_HEIGHT;

  const sizeScaleX = cardWidth / CARD_WIDTH;
  const sizeScaleY = cardHeight / CARD_HEIGHT;

  const adjustedPositions = useMemo(() => {
    const result: Record<string, CardLayout> = {};
    deck.cards.forEach((card) => {
      const position = deck.positions[card.id];
      if (!position) {
        return;
      }
      result[card.id] = {
        ...position,
        x: position.x * sizeScaleX,
        y: position.y * sizeScaleY
      };
    });
    return result;
  }, [deck.cards, deck.positions, sizeScaleX, sizeScaleY]);

  const deckBounds = useMemo(
    () =>
      calculateDeckBounds(deck.cards, adjustedPositions, {
        width: cardWidth,
        height: cardHeight
      }),
    [deck.cards, adjustedPositions, cardWidth, cardHeight]
  );

  useEffect(() => {
    if (!__DEV__ || !debugLogs) return;
    // eslint-disable-next-line no-console
    console.log('[DeckView] bounds', { w: deckBounds.width, h: deckBounds.height, cx: deckBounds.centerX, cy: deckBounds.centerY });
  }, [deckBounds, debugLogs]);

  const effectiveContainerSize = containerSizeProp ?? internalContainerSize;

  const deckTransform = useMemo(() => {
    const { width: availableWidth, height: availableHeight } = effectiveContainerSize;
    const minDimension = Math.max(0, Math.min(availableWidth, availableHeight));
    const basePaddingRatio = deck.layoutMode === 'ring' ? 0.16 : deck.layoutMode === 'fan' ? 0.12 : 0.08;
    const layoutPadding = Math.max(8, Math.min(cardHeight * basePaddingRatio, minDimension * 0.12));
    if (
      deckBounds.width === 0 ||
      deckBounds.height === 0 ||
      availableWidth <= 0 ||
      availableHeight <= 0
    ) {
      return {
        scale: 1,
        translateToOriginX: 0,
        translateToOriginY: 0,
        anchorLeft: 0,
        anchorTop: 0,
        innerWidth: 0,
        innerHeight: 0,
        layoutPadding
      } as const;
    }

    const paddedWidth = deckBounds.width + layoutPadding * 2;
    const paddedHeight = deckBounds.height + layoutPadding * 2;
    const innerWidth = Math.max(0, availableWidth);
    const innerHeight = Math.max(0, availableHeight);
    const scaleX = innerWidth / paddedWidth;
    const scaleY = innerHeight / paddedHeight;
    let scale = Math.min(scaleX, scaleY, 1);
    const minScale = scaleLimits?.minScale ?? 0;
    const maxScale = scaleLimits?.maxScale ?? 1;
    scale = Math.max(minScale, Math.min(scale, maxScale));

    if (__DEV__ && debugLogs) {
      // eslint-disable-next-line no-console
      console.log('[DeckView] container', { availableWidth, availableHeight, layoutPadding });
      // eslint-disable-next-line no-console
      console.log('[DeckView] padded', { paddedWidth, paddedHeight, scaleX, scaleY, scale });
      // eslint-disable-next-line no-console
      console.log('[DeckView] layout', { mode: deck.layoutMode, cardWidth, cardHeight, ringRadius });
    }

    const resolvedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    return {
      scale: resolvedScale,
      translateToOriginX: -deckBounds.centerX,
      translateToOriginY: -deckBounds.centerY,
      anchorLeft: innerWidth / 2,
      anchorTop: innerHeight / 2,
      innerWidth,
      innerHeight,
      layoutPadding
    } as const;
  }, [deckBounds, effectiveContainerSize, deck.layoutMode, debugLogs, scaleLimits, cardWidth, cardHeight, ringRadius]);

  const deckContentTransformStyle = useMemo<ViewStyle>(() => {
    const transforms: NonNullable<ViewStyle['transform']> = [];
    // move the deck's computed bounds center to the origin of the content wrapper
    if (deckTransform.translateToOriginX !== 0 || deckTransform.translateToOriginY !== 0) {
      transforms.push({ translateX: deckTransform.translateToOriginX });
      transforms.push({ translateY: deckTransform.translateToOriginY });
    }
    // scale around the content wrapper's own center (RN scales about view center)
    if (deckTransform.scale !== 1) {
      transforms.push({ scale: deckTransform.scale });
    }
    if (__DEV__ && debugLogs) {
      // eslint-disable-next-line no-console
      console.log('[DeckView] transform', {
        anchorLeft: deckTransform.anchorLeft,
        anchorTop: deckTransform.anchorTop,
        translateToOriginX: deckTransform.translateToOriginX,
        translateToOriginY: deckTransform.translateToOriginY,
        scale: deckTransform.scale,
        layoutPadding: deckTransform.layoutPadding,
        innerWidth: deckTransform.innerWidth,
        innerHeight: deckTransform.innerHeight
      });
    }
    return { transform: transforms };
  }, [deckTransform, debugLogs]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    if (containerSizeProp) {
      if (__DEV__ && debugLogs) {
        const { width, height } = event.nativeEvent.layout;
        console.log('[DeckView] onLayout (ignored, external size provided)', { width, height, external: containerSizeProp });
      }
      return;
    }
    const { width, height } = event.nativeEvent.layout;
    setInternalContainerSize((prev) => {
      if (prev.width === width && prev.height === height) {
        return prev;
      }
      return { width, height };
    });
    if (__DEV__ && debugLogs) {
      // eslint-disable-next-line no-console
      console.log('[DeckView] onLayout', { width, height });
    }
  }, [debugLogs, containerSizeProp]);

  useEffect(() => {
    deck.cards.forEach((card) => {
      const asset = resolveCardBackAsset(card, { defaultBackAsset: deck.config.defaultBackAsset }, { defaultAsset: defaultBackAsset });
      if (typeof asset === 'string' && prefetchedBackAssets[asset] !== true) {
        Image.prefetch(asset)
          .then(() => {
            setPrefetchedBackAssets((prev) => {
              if (prev[asset] === true) {
                return prev;
              }
              return { ...prev, [asset]: true };
            });
          })
          .catch(() => {
            setPrefetchedBackAssets((prev) => {
              if (prev[asset] === false) {
                return prev;
              }
              return { ...prev, [asset]: false };
            });
          });
      }
    });
  }, [deck.cards, deck.config.defaultBackAsset, defaultBackAsset, prefetchedBackAssets]);

  const layout: DeckState['positions'] = deck.positions;
  const fallbackRenderBack = useCallback(
    ({ state, data }: CardRenderProps) => {
      const asset = resolveCardBackAsset(state, { defaultBackAsset: deck.config.defaultBackAsset }, { defaultAsset: defaultBackAsset });
      return (
        <CardBackArtwork
          asset={asset}
          label={data.name ?? 'Card back'}
          fallbackInitial={data.name?.[0]?.toUpperCase() ?? '🂠'}
          isAssetPreloaded={typeof asset === 'string' ? prefetchedBackAssets[asset] === true : undefined}
        />
      );
    },
    [deck.config.defaultBackAsset, defaultBackAsset, prefetchedBackAssets]
  );
  const effectiveRenderBack = renderCardBack ?? fallbackRenderBack;

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    if (__DEV__ && debugLogs) {
      const { width, height } = event.nativeEvent.layout;
      // eslint-disable-next-line no-console
      console.log('[DeckView] canvas', { width, height });
    }
  }, [debugLogs]);

  const layoutPositions = adjustedPositions;

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {/* Fill canvas; anchor places content center exactly at container center (not scaled) */}
      <View style={styles.deckCanvas} onLayout={handleCanvasLayout}>
        <View style={[styles.centerAnchor, { left: deckTransform.anchorLeft, top: deckTransform.anchorTop }]}>
          <View style={deckContentTransformStyle}>
            {deck.cards.map((card) => (
            <CardView
              key={card.id}
              state={card}
              layout={layoutPositions[card.id] as CardLayout}
              isSelected={selectedIds ? selectedIds.includes(card.id) : card.selected}
              driver={animationDriver instanceof ReanimatedDriver ? animationDriver : undefined}
              cardDimensions={{ width: cardWidth, height: cardHeight }}
              onFlip={async () => {
                await flip(card.id);
                onFlipCard?.(card.id, !card.faceUp);
              }}
              onSelect={async () => {
                const drawn = await drawCard(card.id);
                if (drawn) {
                  onSelectCard?.(card.id, true);
                  onDrawCard?.(drawn as CardState);
                }
              }}
              renderFace={renderCardFace}
              renderBack={effectiveRenderBack}
              debugLogs={debugLogs}
            />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%'
  },
  deckCanvas: {
    ...StyleSheet.absoluteFillObject
  },
  centerAnchor: {
    position: 'absolute'
  },
  cardBackWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111'
  },
  cardBackImage: {
    width: '100%',
    height: '100%'
  },
  cardBackOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(9, 13, 24, 0.35)'
  },
  cardBackHighlight: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    right: '12%',
    bottom: '38%',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 12,
    opacity: 0.6
  },
  cardBackPlaceholder: {
    backgroundColor: '#1f2937'
  },
  cardBackPlaceholderContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardBackInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc'
  }
});

interface CardBackArtworkProps {
  asset?: string | number;
  label: string;
  fallbackInitial: string;
  isAssetPreloaded?: boolean;
}

const CardBackArtwork: React.FC<CardBackArtworkProps> = ({ asset, label, fallbackInitial, isAssetPreloaded }) => {
  const hasAsset = asset !== undefined && asset !== null;
  const isLocalAsset = typeof asset === 'number';
  const [isLoaded, setIsLoaded] = useState(isLocalAsset || (isAssetPreloaded ?? !hasAsset));
  const imageSource = useMemo(() => {
    if (typeof asset === 'number') {
      return asset;
    }
    if (typeof asset === 'string') {
      return { uri: asset };
    }
    return undefined;
  }, [asset]);

  useEffect(() => {
    if (isAssetPreloaded) {
      setIsLoaded(true);
    }
  }, [isAssetPreloaded]);

  useEffect(() => {
    setIsLoaded(isLocalAsset || (isAssetPreloaded ?? !hasAsset));
  }, [hasAsset, isAssetPreloaded, isLocalAsset]);

  return (
    <View style={[styles.cardBackWrapper, !hasAsset && styles.cardBackPlaceholder]}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={[styles.cardBackImage, { opacity: isLoaded ? 1 : 0 }]}
          resizeMode="cover"
          onLoadEnd={() => setIsLoaded(true)}
          accessible
          accessibilityLabel={`${label} card back`}
        />
      ) : null}

      {(!isLoaded || !hasAsset) && (
        <View style={styles.cardBackPlaceholderContent} pointerEvents="none">
          <Text style={styles.cardBackInitial}>{fallbackInitial}</Text>
        </View>
      )}

      <View style={[styles.cardBackOverlay, { opacity: isLoaded ? 1 : 0 }]} pointerEvents="none" />
      <View style={[styles.cardBackHighlight, { opacity: isLoaded ? 1 : 0.8 }]} pointerEvents="none" />
    </View>
  );
};
 
