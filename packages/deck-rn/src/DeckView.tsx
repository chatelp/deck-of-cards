import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  DeckState,
  NoopAnimationDriver,
  resolveCardBackAsset,
  useDeck
} from '@deck/core';
import { CardView } from './CardView';
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
  autoFan = false,
  style,
  onDeckReady
}) => {
  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new NoopAnimationDriver(),
    [driver]
  );
  const deckHook = useDeck(cards, animationDriver, { drawLimit, defaultBackAsset });
  const { deck, fan, ring, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;
  const [prefetchedBackAssets, setPrefetchedBackAssets] = useState<Record<string, boolean>>({});

  const lastFannedLengthRef = useRef<number | null>(null);
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

  return (
    <View style={[styles.container, style]}>
      {deck.cards.map((card) => (
        <CardView
          key={card.id}
          state={card}
          layout={layout[card.id] as CardLayout}
          isSelected={selectedIds ? selectedIds.includes(card.id) : card.selected}
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
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
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
    borderWidth: 16,
    borderColor: 'rgba(10, 12, 22, 0.5)'
  },
  cardBackHighlight: {
    position: 'absolute',
    top: '15%',
    left: '15%',
    right: '15%',
    bottom: '35%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    opacity: 0.85
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
