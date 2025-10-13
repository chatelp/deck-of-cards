import React, { useEffect, useMemo } from 'react';
import { AnimationDriver, CardData, CardLayout, DeckState, NoopAnimationDriver, useDeck } from '@deck/core';
import { CardView } from './CardView';
import { CardAnimationTarget, DeckViewProps } from './types';

export const DeckView: React.FC<DeckViewProps> = ({
  cards,
  driver,
  selectedIds = [],
  onSelectCard,
  onFlipCard,
  renderCardFace,
  renderCardBack,
  autoFan = false,
  onDeckReady,
  className
}) => {
  const animationDriver: AnimationDriver = useMemo(
    () => driver ?? new NoopAnimationDriver(),
    [driver]
  );
  const deckHook = useDeck(cards, animationDriver);
  const { deck, fan, shuffle, resetStack, flip, selectCard, animateTo } = deckHook;

  useEffect(() => {
    if (autoFan) {
      void fan();
    }
  }, [autoFan, fan]);

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
