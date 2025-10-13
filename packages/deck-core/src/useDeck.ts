import { useCallback, useMemo, useReducer } from 'react';
import {
  AnimationDriver,
  CardData,
  CardId,
  DeckEvent,
  DeckEventName,
  DeckState
} from './models';
import { DeckObservable } from './observable';
import { createDeckState, setDeckPositions, updateCardLayout, updateCardState } from './state';
import { fan, stack, shuffle as shuffleDeck, flip as flipCard, animateTo as animateCard } from './primitives';

interface DeckReducerAction {
  type: 'SET_STATE' | 'UPDATE_STATE';
  payload: DeckState;
}

function deckReducer(state: DeckState, action: DeckReducerAction): DeckState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload;
    case 'UPDATE_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export function useDeck(cards: CardData[], driver: AnimationDriver) {
  const initialState = useMemo(() => createDeckState(cards), [cards]);
  const [deck, dispatch] = useReducer(deckReducer, initialState);
  const observable = useMemo(() => new DeckObservable(), []);

  const applySequence = useCallback(
    async (nextDeck: DeckState, sequence: ReturnType<typeof fan>['sequence']) => {
      dispatch({ type: 'SET_STATE', payload: nextDeck });
      await driver.play(sequence);
    },
    [driver]
  );

  const fanOut = useCallback(async () => {
    const { deck: nextDeck, sequence } = fan(deck);
    await applySequence(nextDeck, sequence);
    observable.emit({ type: 'fan', payload: { layouts: nextDeck.positions } });
  }, [deck, applySequence]);

  const resetStack = useCallback(async () => {
    const { deck: nextDeck, sequence } = stack(deck);
    await applySequence(nextDeck, sequence);
  }, [deck, applySequence]);

  const shuffle = useCallback(async () => {
    const { deck: nextDeck, sequence } = shuffleDeck(deck);
    await applySequence(nextDeck, sequence);
    observable.emit({ type: 'shuffle', payload: { order: nextDeck.cards.map((card) => card.id) } });
  }, [deck, applySequence]);

  const flip = useCallback(
    async (cardId: CardId) => {
      const { deck: nextDeck, sequence } = flipCard(deck, cardId);
      await applySequence(nextDeck, sequence);
      const card = nextDeck.cards.find((c) => c.id === cardId);
      if (card) {
        observable.emit({ type: 'flip', payload: { cardId, faceUp: card.faceUp } });
      }
    },
    [deck, applySequence]
  );

  const animateTo = useCallback(
    async (cardId: CardId, target: ReturnType<typeof animateCard>['sequence']['steps'][number]['target']) => {
      const { deck: nextDeck, sequence } = animateCard(deck, cardId, target);
      await applySequence(nextDeck, sequence);
    },
    [deck, applySequence]
  );

  const selectCard = useCallback(
    async (cardId: CardId) => {
      const nextDeck = updateCardState(deck, cardId, { selected: !deck.cards.find((card) => card.id === cardId)?.selected });
      dispatch({ type: 'SET_STATE', payload: nextDeck });
      observable.emit({ type: 'select', payload: { cardId } });
    },
    [deck]
  );

  const setLayout = useCallback(
    async (cardId: CardId, layout: Parameters<typeof updateCardLayout>[2]) => {
      const nextDeck = updateCardLayout(deck, cardId, layout);
      dispatch({ type: 'SET_STATE', payload: nextDeck });
    },
    [deck]
  );

  const setPositions = useCallback(
    async (positions: DeckState['positions']) => {
      const nextDeck = setDeckPositions(deck, positions);
      dispatch({ type: 'SET_STATE', payload: nextDeck });
    },
    [deck]
  );

  const on = useCallback(
    <T extends DeckEventName>(type: T, listener: (event: DeckEvent<T>) => void) => observable.on(type, listener),
    [observable]
  );

  return {
    deck,
    fan: fanOut,
    shuffle,
    flip,
    animateTo,
    selectCard,
    setLayout,
    resetStack,
    setPositions,
    on
  };
}
