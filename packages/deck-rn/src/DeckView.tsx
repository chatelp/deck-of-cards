import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  AnimationDriver,
  CardData,
  CardLayout,
  CardState,
  DeckState,
  NoopAnimationDriver,
  useDeck
} from '@deck/core';
import { CardView } from './CardView';
import { CardAnimationTarget, DeckViewProps } from './types';

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
  autoFan = false,
  style,
  onDeckReady
}) => {
  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new NoopAnimationDriver(),
    [driver]
  );
  const deckHook = useDeck(cards, animationDriver);
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
          renderBack={renderCardBack}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
