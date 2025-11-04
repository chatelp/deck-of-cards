import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Image, Text, LayoutChangeEvent, ViewStyle } from 'react-native';
import {
  AnimationDriver,
  AnimationSequence,
  CardData,
  CardLayout,
  CardState,
  DeckState,
  FanOptions,
  RingOptions,
  ShuffleOptions,
  computeFanLayout,
  computeLineLayout,
  computeRingLayout,
  computeStackLayout,
  resolveCardBackAsset,
  useDeck
} from '@deck/core';
import { CardView, CARD_WIDTH, CARD_HEIGHT } from './CardView';
import { ReanimatedDriver } from './drivers/ReanimatedDriver';
import { RN_DECK_VERSION } from './version';
import { CardAnimationTarget, CardRenderProps, DeckViewProps } from './types';
import { computeDeckScene, calculateLayoutParams, DeckScene } from './DeckPositioning';
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
  containerSize: containerSizeProp,
  layoutMode: layoutModeProp
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
    if (isTransitioning) {
      return stableDimensions;
    }
    if (pendingDimensions && pendingDimensions.width > 0 && pendingDimensions.height > 0) {
      return pendingDimensions;
    }
    return stableDimensions;
  }, [containerSizeProp, stableDimensions, pendingDimensions, isTransitioning]);

  const containerWidth = effectiveContainerSize.width;
  const containerHeight = effectiveContainerSize.height;

  const normalizedEffectiveSize = useMemo(
    () => normalizeSize(effectiveContainerSize),
    [effectiveContainerSize.width, effectiveContainerSize.height]
  );

  const [committedLayoutSize, setCommittedLayoutSize] = useState<{ width: number; height: number }>(() => normalizedEffectiveSize);
  const [committedRenderSize, setCommittedRenderSize] = useState<{ width: number; height: number }>(() => normalizedEffectiveSize);

  useEffect(() => {
    if (committedLayoutSize.width > 0 && committedLayoutSize.height > 0) {
      return;
    }
    if (normalizedEffectiveSize.width <= 0 || normalizedEffectiveSize.height <= 0) {
      return;
    }
    setCommittedLayoutSize(normalizedEffectiveSize);
    setCommittedRenderSize(normalizedEffectiveSize);
  }, [committedLayoutSize.width, committedLayoutSize.height, normalizedEffectiveSize]);

  useEffect(() => {
    if (isTransitioning) {
      return;
    }
    if (normalizedEffectiveSize.width <= 0 || normalizedEffectiveSize.height <= 0) {
      return;
    }
    setCommittedLayoutSize((prev) => (sizesAreEqual(prev, normalizedEffectiveSize) ? prev : normalizedEffectiveSize));
    setCommittedRenderSize((prev) => (sizesAreEqual(prev, normalizedEffectiveSize) ? prev : normalizedEffectiveSize));
  }, [isTransitioning, normalizedEffectiveSize, transitionId]);

  // Calculer les paramètres de layout ADAPTATIFS AVANT la création du deck
  // Cela permet au core de générer les positions avec les bons paramètres dès le départ
  const layoutParams = useMemo(() => {
    return calculateLayoutParams(committedLayoutSize.width, committedLayoutSize.height, cards.length, debugLogs);
  }, [committedLayoutSize.width, committedLayoutSize.height, cards.length, debugLogs]);

  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new ReanimatedDriver(),
    [driver]
  );

  // Utiliser les paramètres adaptatifs calculés pour initialiser le deck
  const deckHook = useDeck(
    cards,
    animationDriver,
    {
      drawLimit,
      defaultBackAsset,
      ringRadius: layoutParams.ringRadius,
      fanRadius: layoutParams.fanRadius,
      fanAngle: layoutParams.fanSpread,
      spacing: layoutParams.spacing // Pour le mode 'line'
    },
    {
      animationsEnabled: !isTransitioning,
      manageLayoutExternally: true
    }
  );

  const { deck, fan, ring, shuffle, resetStack, flip, selectCard, drawCard, animateTo, setPositions, setLayoutMode } = deckHook;
  const [prefetchedBackAssets, setPrefetchedBackAssets] = useState<Record<string, boolean>>({});
  const lastFannedLengthRef = useRef<number | null>(null);
  const lastSyncedBasePositionsRef = useRef<string>('');

  const effectiveLayoutMode = layoutModeProp ?? deck.layoutMode;

  const basePositions = useMemo(() => {
    if (deck.cards.length === 0) {
      return {} as Record<string, CardLayout>;
    }

    const deckForLayout: DeckState = {
      ...deck,
      config: {
        ...deck.config,
        fanRadius: layoutParams.fanRadius,
        fanAngle: layoutParams.fanSpread,
        ringRadius: layoutParams.ringRadius,
        spacing: layoutParams.spacing
      },
      layoutMode: effectiveLayoutMode
    };

    if (effectiveLayoutMode === 'ring') {
      return computeRingLayout(deckForLayout, { radius: layoutParams.ringRadius });
    }

    if (effectiveLayoutMode === 'stack') {
      return computeStackLayout(deckForLayout);
    }

    if (effectiveLayoutMode === 'line') {
      return computeLineLayout(deckForLayout, layoutParams.spacing);
    }

    return computeFanLayout(deckForLayout, {
      radius: layoutParams.fanRadius,
      spreadAngle: layoutParams.fanSpread,
      origin: layoutParams.fanOrigin
    });
  }, [deck, layoutParams, effectiveLayoutMode]);

  const basePositionsSignature = useMemo(() => {
    return deck.cards
      .map((card) => {
        const layout = basePositions[card.id];
        if (!layout) {
          return `${card.id}:missing`;
        }
        return `${card.id}:${layout.x.toFixed(2)}:${layout.y.toFixed(2)}:${(layout.rotation ?? 0).toFixed(2)}:${(layout.scale ?? 1).toFixed(3)}`;
      })
      .join('|');
  }, [deck.cards, basePositions]);

  useEffect(() => {
    if (deck.cards.length === 0) {
      return;
    }
    if (basePositionsSignature === lastSyncedBasePositionsRef.current) {
      return;
    }
    lastSyncedBasePositionsRef.current = basePositionsSignature;
    void setPositions(basePositions);
  }, [basePositions, basePositionsSignature, setPositions, deck.cards.length]);

  const playSequence = useCallback(
    async (sequence?: AnimationSequence) => {
      if (!sequence || sequence.steps.length === 0) {
        return sequence;
      }
      if (isTransitioning) {
        return sequence;
      }
      try {
        await animationDriver.play(sequence);
      } catch (error) {
        if (__DEV__) {
          console.error('[DeckView] animation error', error);
        }
      }
      return sequence;
    },
    [animationDriver, isTransitioning]
  );

  const fanWithAnimation = useCallback(
    async (options?: FanOptions) => {
      const sequence = await fan({
        ...options,
        radius: layoutParams.fanRadius,
        spreadAngle: layoutParams.fanSpread,
        origin: layoutParams.fanOrigin
      });
      return playSequence(sequence);
    },
    [fan, layoutParams.fanRadius, layoutParams.fanSpread, layoutParams.fanOrigin, playSequence]
  );

  const ringWithAnimation = useCallback(
    async (options?: RingOptions) => {
      const sequence = await ring({
        radius: layoutParams.ringRadius,
        ...options
      });
      return playSequence(sequence);
    },
    [ring, layoutParams.ringRadius, playSequence]
  );

  const stackWithAnimation = useCallback(async () => {
    const sequence = await resetStack();
    return playSequence(sequence);
  }, [resetStack, playSequence]);

  const shuffleWithAnimation = useCallback(
    async (options?: ShuffleOptions) => {
      const sequence = await shuffle(options);
      return playSequence(sequence);
    },
    [shuffle, playSequence]
  );

  const flipWithAnimation = useCallback(
    async (cardId: string) => {
      const sequence = await flip(cardId);
      return playSequence(sequence);
    },
    [flip, playSequence]
  );

  const animateToWithAnimation = useCallback(
    async (cardId: string, target: CardAnimationTarget) => {
      const sequence = await animateTo(cardId, target);
      return playSequence(sequence);
    },
    [animateTo, playSequence]
  );

  useEffect(() => {
    if (!layoutModeProp) {
      return;
    }
    if (deck.layoutMode === layoutModeProp) {
      return;
    }
    if (layoutModeProp === 'ring') {
      void ringWithAnimation();
    } else if (layoutModeProp === 'stack') {
      void stackWithAnimation();
    } else {
      void fanWithAnimation();
    }
  }, [layoutModeProp, deck.layoutMode, fanWithAnimation, ringWithAnimation, stackWithAnimation]);

  const deckScene = useMemo(() => {
    if (
      committedLayoutSize.width <= 0 ||
      committedLayoutSize.height <= 0 ||
      committedRenderSize.width <= 0 ||
      committedRenderSize.height <= 0
    ) {
      return null;
    }
    return computeDeckScene(
      deck,
      basePositions,
      committedLayoutSize.width,
      committedLayoutSize.height,
      committedRenderSize.width,
      committedRenderSize.height,
      debugLogs
    );
  }, [
    deck,
    basePositions,
    committedLayoutSize.width,
    committedLayoutSize.height,
    committedRenderSize.width,
    committedRenderSize.height,
    debugLogs
  ]);

  const hasValidContainer = committedRenderSize.width > 4 && committedRenderSize.height > 4;
  const isResizing = isTransitioning;
  const fitScale = deckScene?.fitScale ?? 1;
  const scaledPositions = deckScene?.scaledPositions ?? {};
  const scaledCardDimensions = deckScene?.scaledCardDimensions ?? { width: CARD_WIDTH, height: CARD_HEIGHT };
  const scaledBounds = deckScene?.scaledBounds ?? {
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    width: 0,
    height: 0,
    centerX: 0,
    centerY: 0
  };
  const deckTransform = deckScene?.deckTransform ?? {
    translateX: 0,
    translateY: 0,
    anchorLeft: committedRenderSize.width / 2,
    anchorTop: committedRenderSize.height / 2
  };

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
      committedLayoutSize.width.toFixed(1),
      committedLayoutSize.height.toFixed(1),
      committedRenderSize.width.toFixed(1),
      committedRenderSize.height.toFixed(1),
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
    committedLayoutSize.width,
    committedLayoutSize.height,
    committedRenderSize.width,
    committedRenderSize.height,
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
    if (!deckScene) return;
    
    const containerKey = `${deck.layoutMode}|${orientationInfo.type}|${committedRenderSize.width.toFixed(1)}x${committedRenderSize.height.toFixed(1)}`;
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
            w: committedLayoutSize.width.toFixed(0),
            h: committedLayoutSize.height.toFixed(0)
          }
        },
        container: {
          size: { w: committedRenderSize.width.toFixed(0), h: committedRenderSize.height.toFixed(0) },
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
    committedRenderSize.width,
    committedRenderSize.height,
    committedLayoutSize.width,
    committedLayoutSize.height,
    logStateKey,
    fitScale,
    scaledPositions,
    scaledCardDimensions,
    deckScene,
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
    void fanWithAnimation();
  }, [autoFan, deck.cards.length, deck.layoutMode, fanWithAnimation, debugLogs]);

  useEffect(() => {
    if (onDeckReady) {
      onDeckReady({
        fan: fanWithAnimation,
        ring: ringWithAnimation,
        shuffle: shuffleWithAnimation,
        flip: flipWithAnimation,
        animateTo: animateToWithAnimation,
        selectCard,
        drawCard,
        resetStack: stackWithAnimation,
        setLayoutMode
      });
    }
  }, [
    onDeckReady,
    fanWithAnimation,
    ringWithAnimation,
    shuffleWithAnimation,
    flipWithAnimation,
    animateToWithAnimation,
    selectCard,
    drawCard,
    stackWithAnimation,
    setLayoutMode
  ]);

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
  }, [deckTransform]);

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
            {deck.cards.map((card) => {
              const layout = scaledPositions[card.id];
              if (!layout) {
                return null;
              }
              return (
                <CardView
                  key={card.id}
                  state={card}
                  layout={layout}
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
              );
            })}
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
