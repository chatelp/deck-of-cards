import {
  AnimateToOptions,
  AnimationSequence,
  CardId,
  DeckState,
  FlipOptions,
  ShuffleOptions
} from './models';
import { computeFanLayout, computeStackLayout } from './layout';
import { setDeckLayoutMode, setDeckPositions, updateCardState, updateCardLayout } from './state';
import { shuffleArray } from './shuffle';

export function fan(deck: DeckState): { deck: DeckState; sequence: AnimationSequence } {
  const layouts = computeFanLayout(deck);
  const sequence: AnimationSequence = {
    steps: Object.entries(layouts).map(([cardId, target], index) => ({
      cardId,
      target: { ...target, duration: 400, easing: 'easeOut', delay: index * 15 }
    })),
    stagger: 15
  };
  return {
    deck: setDeckLayoutMode(setDeckPositions(deck, layouts), 'fan'),
    sequence
  };
}

export function stack(deck: DeckState): { deck: DeckState; sequence: AnimationSequence } {
  const layouts = computeStackLayout(deck);
  const sequence: AnimationSequence = {
    steps: Object.entries(layouts).map(([cardId, target]) => ({
      cardId,
      target: { ...target, duration: 300, easing: 'easeInOut' }
    }))
  };
  return {
    deck: setDeckLayoutMode(setDeckPositions(deck, layouts), 'stack'),
    sequence
  };
}

export function shuffle(deck: DeckState, options: ShuffleOptions = {}): { deck: DeckState; sequence: AnimationSequence } {
  const cards = shuffleArray(deck.cards, options.seed, options.iterations);
  const layouts = computeStackLayout({ ...deck, cards });
  const sequence: AnimationSequence = {
    steps: cards.map((card, index) => ({
      cardId: card.id,
      target: {
        ...layouts[card.id],
        duration: 500,
        easing: 'spring',
        delay: index * 20
      }
    })),
    stagger: 20
  };
  return {
    deck: setDeckLayoutMode(
      {
        ...deck,
        cards,
        positions: layouts
      },
      'stack'
    ),
    sequence
  };
}

export function animateTo(
  deck: DeckState,
  cardId: CardId,
  target: AnimationSequence['steps'][number]['target'],
  options: AnimateToOptions = {}
): { deck: DeckState; sequence: AnimationSequence } {
  const { duration = target.duration, easing = target.easing, delay = target.delay } = options;
  return {
    deck: updateCardLayout(deck, cardId, target),
    sequence: {
      steps: [
        {
          cardId,
          target: { ...target, duration, easing, delay }
        }
      ]
    }
  };
}

export function flip(deck: DeckState, cardId: CardId, options: FlipOptions = {}): { deck: DeckState; sequence: AnimationSequence } {
  const card = deck.cards.find((c) => c.id === cardId);
  if (!card) {
    return { deck, sequence: { steps: [] } };
  }

  const updatedDeck = updateCardState(deck, cardId, { faceUp: !card.faceUp });
  const sequence: AnimationSequence = {
    steps: [
      {
        cardId,
        target: {
          ...deck.positions[cardId],
          rotation: deck.positions[cardId].rotation,
          scale: 1,
          zIndex: deck.positions[cardId].zIndex,
          duration: options.duration ?? 400,
          easing: options.easing ?? 'easeInOut'
        }
      }
    ],
    meta: {
      type: 'flip'
    }
  };
  return { deck: updatedDeck, sequence };
}
