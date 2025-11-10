import {
  AnimateToOptions,
  AnimationSequence,
  CardId,
  CardTransform,
  DeckLayoutMode,
  DeckState,
  RingOptions,
  FlipOptions,
  ShuffleOptions,
  FanOptions
} from './models';
import { computeFanLayout, computeRingLayout, computeStackLayout } from './layout';
import { setDeckLayoutMode, setDeckPositions, updateCardState, updateCardLayout } from './state';
import { shuffleArray } from './shuffle';

export function fan(deck: DeckState, options: FanOptions = {}): { deck: DeckState; sequence: AnimationSequence } {
  const layouts = computeFanLayout(deck, options);
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

export function ring(deck: DeckState, options: RingOptions = {}): { deck: DeckState; sequence: AnimationSequence } {
  const layouts = computeRingLayout(deck, options);
  const sequence: AnimationSequence = {
    steps: Object.entries(layouts).map(([cardId, target], index) => ({
      cardId,
      target: { ...target, duration: 420, easing: 'easeOut', delay: index * 10 }
    })),
    stagger: 10
  };
  return {
    deck: setDeckLayoutMode(setDeckPositions(deck, layouts), 'ring'),
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
  const normalizedOriginalLayout = originalLayout === 'none' ? 'stack' : originalLayout;
  const cards = shuffleArray(deck.cards, options.seed, options.iterations);
  const stackLayouts = computeStackLayout({ ...deck, cards });

  const shouldRestore = options.restoreLayout ?? true;
  const targetLayout: DeckLayoutMode = shouldRestore
    ? options.restoreLayoutMode ?? normalizedOriginalLayout
    : 'stack';

  const finalLayouts = targetLayout === 'fan'
    ? computeFanLayout({ ...deck, cards })
    : targetLayout === 'ring'
      ? computeRingLayout({ ...deck, cards })
      : stackLayouts;

  const sequence: AnimationSequence = {
    steps: cards.map((card, index) => {
      const stackTarget = stackLayouts[card.id];
      const finalTarget = finalLayouts[card.id];
      const delayMs = index * 20;

      const restoringToOriginalLayout = shouldRestore && targetLayout !== 'stack';
      const animationTarget = restoringToOriginalLayout ? finalTarget : stackTarget;

      const duration = restoringToOriginalLayout ? 800 : 500;
      const easing = restoringToOriginalLayout ? 'easeInOut' : 'spring';

      const target: CardTransform = {
        x: animationTarget.x,
        y: animationTarget.y,
        rotation: animationTarget.rotation,
        scale: animationTarget.scale,
        zIndex: finalTarget.zIndex,
        duration,
        easing,
        delay: delayMs
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
