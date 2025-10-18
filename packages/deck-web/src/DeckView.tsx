import React, { useEffect, useMemo, useRef } from 'react';
import { AnimationDriver, CardData, CardLayout, CardState, DeckState, useDeck } from '@deck/core';
import { CardView } from './CardView';
import { CardAnimationTarget, DeckViewProps } from './types';
import { WebMotionDriver } from './drivers/WebMotionDriver';

export const DeckView: React.FC<DeckViewProps> = ({
  cards,
  driver,
  selectedIds,
  onSelectCard,
  onDrawCard,
  onFlipCard,
  onDeckStateChange,
  drawLimit,
  renderCardFace,
  renderCardBack,
  autoFan = false,
  onDeckReady,
  className
}) => {
  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new WebMotionDriver(),
    [driver]
  );
  const deckHook = useDeck(cards, animationDriver, { drawLimit });
  const { deck, fan, shuffle, resetStack, flip, selectCard, drawCard, animateTo } = deckHook;

  // Initial fan is handled by the next effect on first render (cards.length stable)

  // Re-fan when the number of cards in the deck changes (e.g., draw/remove)
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
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {deck.cards.map((card) => (
        <CardView
          key={card.id}
          state={card}
          layout={layout[card.id] as CardLayout}
          isSelected={selectedIds ? selectedIds.includes(card.id) : card.selected}
          driver={animationDriver instanceof WebMotionDriver ? animationDriver : undefined}
          onFlip={async () => {
            const willBeFaceUp = !card.faceUp;
            try {
              await flip(card.id);
              onFlipCard?.(card.id, willBeFaceUp);
            } catch (error) {
              console.error('[DeckView] flip error', error);
              throw error;
            }
          }}
          onSelect={async () => {
            try {
              const drawn = await drawCard(card.id);
              if (drawn) {
                onSelectCard?.(card.id, true);
                onDrawCard?.(drawn as CardState);
              }
            } catch (error) {
              console.error('[DeckView] draw error', error);
              throw error;
            }
          }}
          renderFace={renderCardFace}
          renderBack={renderCardBack}
        />
      ))}
    </div>
  );
};
