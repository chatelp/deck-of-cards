import {
  AnimateToOptions,
  AnimationSequence,
  CardId,
  DeckLayoutMode,
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
  const originalLayout = deck.layoutMode;
  const cards = shuffleArray(deck.cards, options.seed, options.iterations);
  const stackLayouts = computeStackLayout({ ...deck, cards });

  const shouldRestore = options.restoreLayout ?? true;
  const targetLayout: typeof originalLayout = shouldRestore
    ? options.restoreLayoutMode ?? originalLayout
    : 'stack';

  const finalLayouts = targetLayout === 'fan'
    ? computeFanLayout({ ...deck, cards })
    : stackLayouts;

  const sequence: AnimationSequence = {
    steps: cards.map((card, index) => {
      const stackTarget = stackLayouts[card.id];
      const finalTarget = finalLayouts[card.id];
      const delayMs = index * 20;

      const target = shouldRestore && targetLayout !== 'stack'
        ? {
            x: [stackTarget.x, finalTarget.x],
            y: [stackTarget.y, finalTarget.y],
            rotate: [stackTarget.rotation, finalTarget.rotation],
            scale: [stackTarget.scale, finalTarget.scale],
            zIndex: finalTarget.zIndex,
            transition: {
              duration: 800,
              ease: 'easeInOut',
              delay: delayMs,
              times: [0, 1]
            }
          }
        : {
            x: stackTarget.x,
            y: stackTarget.y,
            rotate: stackTarget.rotation,
            scale: stackTarget.scale,
            zIndex: stackTarget.zIndex,
            transition: {
              duration: 500,
              ease: 'spring',
              delay: delayMs
            }
          };

      return {
        cardId: card.id,
        target
      };
    })
  };

  const nextDeck = setDeckLayoutMode(
    {
      ...deck,
      cards,
      positions: finalLayouts
    },
    targetLayout
  );

  return {
    deck: nextDeck,
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
