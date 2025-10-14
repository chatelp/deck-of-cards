import React, { useEffect, useMemo, useRef } from 'react';
import { AnimationDriver, CardData, CardLayout, DeckState, useDeck } from '@deck/core';
import { CardView } from './CardView';
import { CardAnimationTarget, DeckViewProps } from './types';
import { WebMotionDriver } from './drivers/WebMotionDriver';

export const DeckView: React.FC<DeckViewProps> = ({
  cards,
  driver,
  selectedIds = [],
  onSelectCard,
  onFlipCard,
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
  const { deck, fan, shuffle, resetStack, flip, selectCard, animateTo } = deckHook;

  const fanRef = useRef(fan);
  useEffect(() => {
    fanRef.current = fan;
  }, [fan]);

  useEffect(() => {
    if (!autoFan) {
      return;
    }
    fanRef.current();
  }, [autoFan, cards.length]);

  // When the effective deck size changes, re-fan to update layout visually
  useEffect(() => {
    if (!autoFan) {
      return;
    }
    void fan();
  }, [autoFan, deck.cards.length, fan]);

  useEffect(() => {
    if (onDeckReady) {
      const wrappedAnimateTo = async (cardId: string, target: CardAnimationTarget) => {
        await animateTo(cardId, target);
      };
      onDeckReady({ fan, shuffle, flip, animateTo: wrappedAnimateTo, selectCard, resetStack });
    }
  }, [onDeckReady, fan, shuffle, flip, animateTo, selectCard, resetStack]);

  const layout: DeckState['positions'] = deck.positions;

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {deck.cards.map((card) => (
        <CardView
          key={card.id}
          state={card}
          layout={layout[card.id] as CardLayout}
          isSelected={selectedIds.includes(card.id)}
          driver={animationDriver instanceof WebMotionDriver ? animationDriver : undefined}
          onFlip={async () => {
            await flip(card.id);
            onFlipCard?.(card.id, !card.faceUp);
          }}
          onSelect={() => {
            selectCard(card.id);
            onSelectCard?.(card.id);
          }}
          renderFace={renderCardFace}
          renderBack={renderCardBack}
        />
      ))}
    </div>
  );
};
