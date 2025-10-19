import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  AnimationDriver,
  CardData,
  CardId,
  CardState,
  DeckEvent,
  DeckEventName,
  DeckState,
  DeckStateConfig,
  RingOptions,
  ShuffleOptions
} from './models';
import { DeckObservable } from './observable';
import { createDeckState, setDeckPositions, updateCardLayout, updateCardState } from './state';
import { fan, ring as ringDeck, stack, shuffle as shuffleDeck, flip as flipCard, animateTo as animateCard } from './primitives';

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

export function useDeck(cards: CardData[], driver: AnimationDriver, config?: DeckStateConfig) {
  const normalizedConfig = useMemo(() => {
    if (!config) {
      return undefined;
    }
    return { ...config } as DeckStateConfig;
  }, [
    config?.drawLimit,
    config?.fanAngle,
    config?.fanRadius,
    config?.spacing,
    config?.seed,
    config?.defaultBackAsset,
    config?.ringRadius
  ]);

  const initialState = useMemo(() => createDeckState(cards, normalizedConfig), [cards, normalizedConfig]);
  const [deck, dispatch] = useReducer(deckReducer, initialState);
  const observable = useMemo(() => new DeckObservable(), []);

  // When the cards input changes (e.g., deck size changes) or config changes, rebuild the deck state
  useEffect(() => {
    const next = createDeckState(cards, normalizedConfig);
    dispatch({ type: 'SET_STATE', payload: next });
  }, [cards, normalizedConfig]);

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

  const ring = useCallback(async (options?: RingOptions) => {
    const { deck: nextDeck, sequence } = ringDeck(deck, options);
    await applySequence(nextDeck, sequence);
    observable.emit({ type: 'ring', payload: { layouts: nextDeck.positions } });
  }, [deck, applySequence]);

  const shuffle = useCallback(
    async (options?: ShuffleOptions) => {
      const { deck: nextDeck, sequence } = shuffleDeck(deck, options);
      await applySequence(nextDeck, sequence);
      observable.emit({ type: 'shuffle', payload: { order: nextDeck.cards.map((card) => card.id) } });
    },
    [deck, applySequence]
  );

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
    async (cardId: CardId): Promise<boolean | undefined> => {
      const currentCard = deck.cards.find((card) => card.id === cardId);
      if (!currentCard) {
        return undefined;
      }

      const selectedCount = deck.cards.filter((card) => card.selected).length + deck.drawnCards.length;
      const isCurrentlySelected = currentCard.selected;
      const drawLimit = deck.config.drawLimit ?? 2;

      if (!isCurrentlySelected && selectedCount >= drawLimit) {
        return undefined;
      }

      const nextSelected = !isCurrentlySelected;
      const nextDeck = updateCardState(deck, cardId, { selected: nextSelected });
      dispatch({ type: 'SET_STATE', payload: nextDeck });
      observable.emit({ type: 'select', payload: { cardId, selected: nextSelected } });
      return nextSelected;
    },
    [deck]
  );

  const drawCard = useCallback(
    async (cardId: CardId): Promise<CardState | undefined> => {
      const cardIndex = deck.cards.findIndex((card) => card.id === cardId);
      if (cardIndex === -1) {
        console.warn('[useDeck] drawCard:missing-card', { cardId });
        return undefined;
      }

      if (deck.drawnCards.length >= deck.config.drawLimit) {
        console.warn('[useDeck] drawCard:limit-reached', {
          cardId,
          drawnCount: deck.drawnCards.length,
          limit: deck.config.drawLimit
        });
        return undefined;
      }

      const card = deck.cards[cardIndex];
      const remainingCards = deck.cards.filter((c) => c.id !== cardId);
      const { [cardId]: _removed, ...restPositions } = deck.positions;
      const drawnCard: CardState = { ...card, faceUp: true, selected: true };

      const baseDeck: DeckState = {
        ...deck,
        cards: remainingCards,
        positions: restPositions,
        drawnCards: [...deck.drawnCards, drawnCard]
      };

      let layoutResult:
        | ReturnType<typeof fan>
        | ReturnType<typeof ringDeck>
        | ReturnType<typeof stack>
        | undefined;
      if (deck.layoutMode === 'ring') {
        layoutResult = ringDeck(baseDeck);
      } else if (deck.layoutMode === 'stack') {
        layoutResult = stack(baseDeck);
      } else if (deck.layoutMode === 'fan') {
        layoutResult = fan(baseDeck);
      } else {
        layoutResult = fan(baseDeck);
      }
      const { deck: nextDeck, sequence } = layoutResult;
      dispatch({ type: 'SET_STATE', payload: nextDeck });
      void driver.play(sequence).catch((error) => {
        console.error('[useDeck] drawCard animation error', error);
      });
      observable.emit({ type: 'draw', payload: { cardId, card: drawnCard } });
      return drawnCard;
    },
    [deck, applySequence]
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
    ring,
    shuffle,
    flip,
    animateTo,
    selectCard,
    drawCard,
    setLayout,
    resetStack,
    setPositions,
    on
  };
}
