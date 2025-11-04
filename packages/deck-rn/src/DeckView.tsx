import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Image, Text, LayoutChangeEvent, ViewStyle } from 'react-native';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  DeckState,
  resolveCardBackAsset,
  useDeck
} from '@deck/core';
import { CardView } from './CardView';
import { ReanimatedDriver } from './drivers/ReanimatedDriver';
import { RN_DECK_VERSION } from './version';
import { CardAnimationTarget, CardRenderProps, DeckViewProps } from './types';
import { useDeckPositioning, calculateLayoutParams } from './DeckPositioning';
import { useOrientationManager } from './OrientationManager';

/**
 * REFACTORED DeckView - Architecture Simplifiée
 * 
 * Principe: Single Source of Truth
 * - DeckView gère TOUT le responsive
 * - Dimensions de base constantes (CARD_WIDTH/HEIGHT)
 * - Scale unique calculé pour fit
 * - Pas de double responsabilité avec App.tsx
 * - Utilise DeckPositioning pour toute la logique de positionnement
 */

const SIZE_EPSILON = 0.5;
const normalizeSizeValue = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.round(value * 10) / 10;
};

const normalizeSize = (size: { width: number; height: number }): { width: number; height: number } => ({
  width: normalizeSizeValue(size.width),
  height: normalizeSizeValue(size.height)
});

const sizesAreEqual = (
  left: { width: number; height: number },
  right: { width: number; height: number }
): boolean => Math.abs(left.width - right.width) < SIZE_EPSILON && Math.abs(left.height - right.height) < SIZE_EPSILON;

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
  autoFan = false,
  style,
  onDeckReady,
  debugLogs,
  containerSize: containerSizeProp
}) => {
  const {
    orientation: orientationInfo,
    stableDimensions,
    pendingDimensions,
    isTransitioning,
    transitionId,
    observe: observeDimensions
  } = useOrientationManager({ settleDelay: 240, threshold: 0.75 });

  useEffect(() => {
    if (!containerSizeProp) {
      return;
    }
    if (containerSizeProp.width <= 0 || containerSizeProp.height <= 0) {
      return;
    }
    observeDimensions(containerSizeProp, 'prop');
  }, [containerSizeProp?.width, containerSizeProp?.height, observeDimensions]);

  const effectiveContainerSize = useMemo<{ width: number; height: number }>(() => {
    if (containerSizeProp && containerSizeProp.width > 0 && containerSizeProp.height > 0) {
      return containerSizeProp;
    }
    if (stableDimensions.width > 0 && stableDimensions.height > 0) {
      return stableDimensions;
    }
    if (pendingDimensions && pendingDimensions.width > 0 && pendingDimensions.height > 0) {
      return pendingDimensions;
    }
    return stableDimensions;
  }, [containerSizeProp, stableDimensions, pendingDimensions]);

  const containerWidth = effectiveContainerSize.width;
  const containerHeight = effectiveContainerSize.height;

  const measuredContainerSize = useMemo(
    () => normalizeSize(effectiveContainerSize),
    [effectiveContainerSize.width, effectiveContainerSize.height]
  );

  const [layoutContainerSize, setLayoutContainerSize] = useState<{ width: number; height: number }>(() => measuredContainerSize);

  useEffect(() => {
    if (layoutContainerSize.width > 0 && layoutContainerSize.height > 0) {
      return;
    }
    if (measuredContainerSize.width <= 0 || measuredContainerSize.height <= 0) {
      return;
    }
    setLayoutContainerSize(measuredContainerSize);
  }, [layoutContainerSize.width, layoutContainerSize.height, measuredContainerSize]);

  useEffect(() => {
    if (isTransitioning) {
      return;
    }
    if (measuredContainerSize.width <= 0 || measuredContainerSize.height <= 0) {
      return;
    }
    setLayoutContainerSize((prev) => (sizesAreEqual(prev, measuredContainerSize) ? prev : measuredContainerSize));
  }, [isTransitioning, measuredContainerSize, transitionId]);

  // Calculer les paramètres de layout ADAPTATIFS AVANT la création du deck
  // Cela permet au core de générer les positions avec les bons paramètres dès le départ
  const layoutParams = useMemo(() => {
    return calculateLayoutParams(layoutContainerSize.width, layoutContainerSize.height, cards.length, debugLogs);
  }, [layoutContainerSize.width, layoutContainerSize.height, cards.length, debugLogs]);

  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new ReanimatedDriver(),
    [driver]
  );

  // Utiliser les paramètres adaptatifs calculés pour initialiser le deck
  const deckHook = useDeck(cards, animationDriver, {
    drawLimit,
    defaultBackAsset,
    ringRadius: layoutParams.ringRadius,
    fanRadius: layoutParams.fanRadius,
    fanAngle: layoutParams.fanSpread,
    spacing: layoutParams.spacing // Pour le mode 'line'
  });

  const { deck, fan, ring, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;
  const [prefetchedBackAssets, setPrefetchedBackAssets] = useState<Record<string, boolean>>({});
  const lastFannedLengthRef = useRef<number | null>(null);

  // Utiliser DeckPositioning pour toute la logique de positionnement
  // NOTE: On doit recalculer les layoutParams après que le deck soit créé
  // car le core a besoin des paramètres AVANT de générer les positions.
  // On va utiliser les paramètres calculés par DeckPositioning pour mettre à jour le deck.
  // Mais pour l'instant, on utilise les positions existantes pour le calcul du positionnement.
  // Inclure layoutMode, dimensions et orientation dans le token
  // Les dimensions sont critiques car les positions dépendent des dimensions du container
  const positioning = useDeckPositioning(
    deck,
    layoutContainerSize.width,
    layoutContainerSize.height,
    containerWidth,
    containerHeight,
    debugLogs
  );

  const { scaledPositions, scaledCardDimensions, scaledBounds, deckTransform, fitScale } = positioning;

  const hasValidContainer = containerWidth > 4 && containerHeight > 4;
  const isResizing = isTransitioning;

  const samplePositionsKey = useMemo(() => {
    return deck.cards.slice(0, 3)
      .map((card) => {
        const pos = scaledPositions[card.id];
        if (!pos) {
          return 'none';
        }
        return `${card.id}:${pos.x.toFixed(1)}:${pos.y.toFixed(1)}`;
      })
      .join('|');
  }, [deck.cards, scaledPositions]);

  const logStateKey = useMemo(() => {
    return [
      deck.layoutMode,
      deck.cards.length,
      orientationInfo.type,
      transitionId,
      layoutContainerSize.width.toFixed(1),
      layoutContainerSize.height.toFixed(1),
      containerWidth.toFixed(1),
      containerHeight.toFixed(1),
      fitScale.toFixed(3),
      scaledBounds.width.toFixed(1),
      scaledBounds.height.toFixed(1),
      deckTransform.translateX.toFixed(1),
      deckTransform.translateY.toFixed(1),
      samplePositionsKey
    ].join('|');
  }, [
    deck.layoutMode,
    deck.cards.length,
    orientationInfo.type,
    transitionId,
    layoutContainerSize.width,
    layoutContainerSize.height,
    containerWidth,
    containerHeight,
    fitScale,
    scaledBounds,
    deckTransform,
    samplePositionsKey
  ]);

  // Log condensé UNE FOIS après que toutes les cartes soient positionnées
  const logTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoggedRef = useRef<string>('');
  const pendingLogKeyRef = useRef<string | null>(null);
  const pendingContainerKeyRef = useRef<string | null>(null);
  const lastContainerLogRef = useRef<Record<string, { key: string; timestamp: number }>>({});
 
  useEffect(() => {
    if (isResizing && logTimeoutRef.current) {
      clearTimeout(logTimeoutRef.current);
      logTimeoutRef.current = null;
      pendingLogKeyRef.current = null;
      pendingContainerKeyRef.current = null;
    }
  }, [isResizing]);

  useEffect(() => {
    if (!__DEV__ || !debugLogs) return;
    if (!hasValidContainer) return;
    if (deck.cards.length === 0) return;
    if (isResizing) return;
    
    const containerKey = `${deck.layoutMode}|${orientationInfo.type}|${containerWidth.toFixed(1)}x${containerHeight.toFixed(1)}`;
    const now = Date.now();
    const lastContainerLog = lastContainerLogRef.current[containerKey];

    if (pendingContainerKeyRef.current === containerKey) {
      return;
    }

    if (lastContainerLog && lastContainerLog.key === logStateKey && now - lastContainerLog.timestamp < 1000) {
      return;
    }

    if (lastLoggedRef.current === logStateKey) {
      return;
    }

    if (pendingLogKeyRef.current === logStateKey) {
      return;
    }

    if (logTimeoutRef.current) {
      clearTimeout(logTimeoutRef.current);
      logTimeoutRef.current = null;
      pendingLogKeyRef.current = null;
      pendingContainerKeyRef.current = null;
    }

    pendingLogKeyRef.current = logStateKey;
    pendingContainerKeyRef.current = containerKey;
    logTimeoutRef.current = setTimeout(() => {
      if (Object.keys(scaledPositions).length === 0) {
        console.warn('[DeckView] Pas de positions scalées disponibles');
        lastLoggedRef.current = '';
        pendingLogKeyRef.current = null;
        pendingContainerKeyRef.current = null;
        logTimeoutRef.current = null;
        return;
      }
      
      const sampleCards = deck.cards.slice(0, 3);
      const cardSamples = sampleCards.map((card) => {
        const pos = scaledPositions[card.id];
        return pos
          ? {
              id: card.id.substring(0, 12),
              center: { x: pos.x.toFixed(0), y: pos.y.toFixed(0) },
              translate: {
                x: (pos.x - scaledCardDimensions.width / 2).toFixed(0),
                y: (pos.y - scaledCardDimensions.height / 2).toFixed(0)
              }
            }
          : null;
      }).filter(Boolean);
      
      const finalCenterX = scaledBounds.centerX + deckTransform.translateX;
      const finalCenterY = scaledBounds.centerY + deckTransform.translateY;
      const offsetX = finalCenterX - deckTransform.anchorLeft;
      const offsetY = finalCenterY - deckTransform.anchorTop;
      
      console.log('[DeckView] 📊 LOG CONDENSÉ - Deck affiché', {
        layout: {
          size: {
            w: layoutContainerSize.width.toFixed(0),
            h: layoutContainerSize.height.toFixed(0)
          }
        },
        container: {
          size: { w: containerWidth.toFixed(0), h: containerHeight.toFixed(0) },
          center: { x: deckTransform.anchorLeft.toFixed(0), y: deckTransform.anchorTop.toFixed(0) }
        },
        deck: {
          mode: deck.layoutMode,
          cardCount: deck.cards.length,
          scale: fitScale.toFixed(3),
          bounds: {
            center: { x: scaledBounds.centerX.toFixed(0), y: scaledBounds.centerY.toFixed(0) },
            width: scaledBounds.width.toFixed(0),
            height: scaledBounds.height.toFixed(0),
            minX: scaledBounds.minX.toFixed(0),
            maxX: scaledBounds.maxX.toFixed(0)
          }
        },
        transform: {
          translate: { x: deckTransform.translateX.toFixed(0), y: deckTransform.translateY.toFixed(0) },
          finalCenter: { x: finalCenterX.toFixed(0), y: finalCenterY.toFixed(0) }
        },
        centering: {
          offset: { x: offsetX.toFixed(1), y: offsetY.toFixed(1) },
          centered: Math.abs(offsetX) < 0.5 && Math.abs(offsetY) < 0.5
        },
        cardSamples: cardSamples.slice(0, 2),
        cardDimensions: {
          width: scaledCardDimensions.width.toFixed(0),
          height: scaledCardDimensions.height.toFixed(0)
        }
      });
      
      lastLoggedRef.current = logStateKey;
      pendingLogKeyRef.current = null;
      pendingContainerKeyRef.current = null;
      lastContainerLogRef.current[containerKey] = { key: logStateKey, timestamp: Date.now() };
      logTimeoutRef.current = null;
      
      if (Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5) {
        console.warn('[DeckView] ⚠️ DECALAGE DETECTE!', {
          offsetX: offsetX.toFixed(1),
          offsetY: offsetY.toFixed(1),
          direction: offsetX > 0 ? 'droite' : 'gauche'
        });
        delete lastContainerLogRef.current[containerKey];
      }
    }, 300);
  }, [
    debugLogs,
    deck.layoutMode,
    deck.cards.length,
    hasValidContainer,
    containerWidth,
    containerHeight,
    layoutContainerSize.width,
    layoutContainerSize.height,
    logStateKey,
    fitScale,
    scaledPositions,
    scaledCardDimensions,
    scaledBounds,
    deckTransform,
    isResizing,
    orientationInfo.type
  ]);

  useEffect(() => {
    return () => {
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
        logTimeoutRef.current = null;
      }
      pendingLogKeyRef.current = null;
      pendingContainerKeyRef.current = null;
      lastContainerLogRef.current = {};
    };
  }, []);

  // Auto-fan
  useEffect(() => {
    if (!autoFan) {
      if (__DEV__ && debugLogs) {
        // Log autoFan désactivé
      }
      return;
    }
    if (deck.layoutMode === 'ring') {
      if (__DEV__ && debugLogs) {
        // Log autoFan skipped
      }
      return;
    }
    if (lastFannedLengthRef.current === deck.cards.length) {
      if (__DEV__ && debugLogs) {
        // Log autoFan skipped
      }
      return;
    }
    // Log autoFan executing - désactivé
    lastFannedLengthRef.current = deck.cards.length;
    void fan();
  }, [autoFan, deck.cards.length, deck.layoutMode, fan, debugLogs]);

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

  // Transform style pour le wrapper des cartes
  // IMPORTANT: Les positions des cartes sont dans un système où (0,0) est le centre du deck
  // On doit appliquer le transform depuis le point d'ancrage (centre du container)
  // Le translateX/Y est calculé comme: containerCenter - deckCenter
  const deckContentTransformStyle = useMemo<ViewStyle>(() => {
    const style: ViewStyle = {
      transform: [
        { translateX: deckTransform.translateX },
        { translateY: deckTransform.translateY }
      ]
    };
    
    // Logs individuels désactivés - log condensé dans useEffect
    
    return style;
  }, [deckTransform, deck.layoutMode, debugLogs, positioning, containerWidth, containerHeight]);

  // Handle container layout
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (containerSizeProp) {
        if (__DEV__ && debugLogs) {
          const { width, height } = event.nativeEvent.layout;
          // Log onLayout ignored - désactivé
        }
        return;
      }

      const { width, height } = event.nativeEvent.layout;
      if (width <= 4 || height <= 4) {
        return;
      }
      observeDimensions({ width, height }, 'layout');
    },
    [debugLogs, containerSizeProp, observeDimensions]
  );

  // Prefetch card backs
  useEffect(() => {
    deck.cards.forEach((card) => {
      const asset = resolveCardBackAsset(
        card,
        { defaultBackAsset: deck.config.defaultBackAsset },
        { defaultAsset: defaultBackAsset }
      );
      if (typeof asset === 'string' && prefetchedBackAssets[asset] !== true) {
        Image.prefetch(asset)
          .then(() => {
            setPrefetchedBackAssets((prev) => {
              if (prev[asset] === true) return prev;
              return { ...prev, [asset]: true };
            });
          })
          .catch(() => {
            setPrefetchedBackAssets((prev) => {
              if (prev[asset] === false) return prev;
              return { ...prev, [asset]: false };
            });
          });
      }
    });
  }, [deck.cards, deck.config.defaultBackAsset, defaultBackAsset, prefetchedBackAssets]);

  const fallbackRenderBack = useCallback(
    ({ state, data }: CardRenderProps) => {
      const asset = resolveCardBackAsset(
        state,
        { defaultBackAsset: deck.config.defaultBackAsset },
        { defaultAsset: defaultBackAsset }
      );
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

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {/* Canvas absolu qui remplit le conteneur */}
      <View style={styles.deckCanvas}>
        {/* Point d'ancrage au centre du container */}
        <View
          style={[
            styles.centerAnchor,
            {
              left: deckTransform.anchorLeft,
              top: deckTransform.anchorTop,
              width: 0,
              height: 0
            }
          ]}
        >
          {/* Wrapper des cartes avec transform pour centrer le deck */}
          <View style={hasValidContainer ? deckContentTransformStyle : undefined}>
            {deck.cards.map((card) => (
              <CardView
                key={card.id}
                state={card}
                layout={scaledPositions[card.id] as CardLayout}
                isSelected={selectedIds ? selectedIds.includes(card.id) : card.selected}
                driver={animationDriver instanceof ReanimatedDriver ? animationDriver : undefined}
                cardDimensions={scaledCardDimensions}
                isResizing={isResizing}
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

const CardBackArtwork: React.FC<CardBackArtworkProps> = ({ 
  asset, 
  label, 
  fallbackInitial, 
  isAssetPreloaded 
}) => {
  const hasAsset = asset !== undefined && asset !== null;
  const isLocalAsset = typeof asset === 'number';
  const [isLoaded, setIsLoaded] = useState(isLocalAsset || (isAssetPreloaded ?? !hasAsset));
  
  const imageSource = useMemo(() => {
    if (typeof asset === 'number') return asset;
    if (typeof asset === 'string') return { uri: asset };
    return undefined;
  }, [asset]);

  useEffect(() => {
    if (isAssetPreloaded) setIsLoaded(true);
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
