import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
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
  const { deck, fan, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;

  const lastFannedLengthRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoFan) {
      return;
    }
    if (lastFannedLengthRef.current === deck.cards.length) {
      return;
    }
    lastFannedLengthRef.current = deck.cards.length;
    void fan();
  }, [autoFan, deck.cards.length, fan]);

  useEffect(() => {
    if (onDeckReady) {
      const wrappedAnimateTo = async (cardId: string, target: CardAnimationTarget) => {
        await animateTo(cardId, target);
      };
      onDeckReady({
        fan,
        shuffle,
        flip,
        animateTo: wrappedAnimateTo,
        selectCard,
        drawCard,
        resetStack
      });
    }
  }, [onDeckReady, fan, shuffle, flip, animateTo, selectCard, drawCard, resetStack]);

  useEffect(() => {
    onDeckStateChange?.(deck);
  }, [deck, onDeckStateChange]);

  const layout: DeckState['positions'] = deck.positions;
  const fallbackRenderBack = useCallback(
    ({ state }: CardRenderProps) => {
      const asset = resolveCardBackAsset(state, { defaultBackAsset: deck.config.defaultBackAsset }, { defaultAsset: defaultBackAsset });
      if (!asset) {
        return <View style={[styles.cardBackPlaceholder]} />;
      }
      return <Image source={{ uri: asset }} style={styles.cardBackImage} resizeMode="cover" />;
    },
    [deck.config.defaultBackAsset, defaultBackAsset]
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
  cardBackImage: {
    width: '100%',
    height: '100%'
  },
  cardBackPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#1f2937'
  }
});
