import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  AnimationDriver,
  AnimationSequence,
  CardData,
  CardId,
  CardState,
  DeckEvent,
  DeckEventName,
  DeckState,
  DeckStateConfig,
  RingOptions,
  FanOptions,
  ShuffleOptions
} from './models';
import { DeckObservable } from './observable';
import { createDeckState, setDeckLayoutMode, setDeckPositions, updateCardLayout, updateCardState } from './state';
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

interface UseDeckOptions {
  animationsEnabled?: boolean;
  manageLayoutExternally?: boolean;
}

export function useDeck(
  cards: CardData[],
  driver: AnimationDriver,
  config?: DeckStateConfig,
  options?: UseDeckOptions
) {
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
  const deckRef = useRef(deck);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  const observable = useMemo(() => new DeckObservable(), []);
  const animationsEnabledRef = useRef<boolean>(options?.animationsEnabled ?? true);
  const manageLayoutExternallyRef = useRef<boolean>(options?.manageLayoutExternally ?? false);

  useEffect(() => {
    animationsEnabledRef.current = options?.animationsEnabled ?? true;
    if (!animationsEnabledRef.current) {
      driver.cancel?.();
    }
  }, [options?.animationsEnabled, driver]);

  useEffect(() => {
    manageLayoutExternallyRef.current = options?.manageLayoutExternally ?? false;
  }, [options?.manageLayoutExternally]);

  // When the cards input or config changes, rebuild the deck while preserving the current layout mode
  useEffect(() => {
    const base = createDeckState(cards, normalizedConfig);
    if (manageLayoutExternallyRef.current) {
      const current = deckRef.current;
      const next: DeckState = {
        ...current,
        cards: base.cards,
        config: base.config
      };
      dispatch({ type: 'SET_STATE', payload: next });
      return;
    }
    const currentLayout = deckRef.current.layoutMode;
    let next = base;
    try {
      if (currentLayout === 'ring') {
        next = ringDeck(base).deck;
      } else if (currentLayout === 'fan') {
        next = fan(base).deck;
      } else if (currentLayout === 'stack') {
        next = stack(base).deck;
      } else {
        // default to fan if an unknown/custom mode is active
        next = fan(base).deck;
      }
    } catch (_err) {
      next = base;
    }
    dispatch({ type: 'SET_STATE', payload: next });
  }, [cards, normalizedConfig]);

  const applySequence = useCallback(
    async (nextDeck: DeckState, sequence: ReturnType<typeof fan>['sequence']) => {
      dispatch({ type: 'SET_STATE', payload: nextDeck });
      if (!animationsEnabledRef.current) {
        driver.cancel?.();
        return sequence;
      }
      if (manageLayoutExternallyRef.current) {
        return sequence;
      }
      await driver.play(sequence);
      return sequence;
    },
    [driver]
  );

  const fanOut = useCallback(async (options?: FanOptions) => {
    const { deck: nextDeck, sequence } = fan(deck, options);
    const result = await applySequence(nextDeck, sequence);
    observable.emit({ type: 'fan', payload: { layouts: nextDeck.positions } });
    return result;
  }, [deck, applySequence]);

  const resetStack = useCallback(async () => {
    const { deck: nextDeck, sequence } = stack(deck);
    return applySequence(nextDeck, sequence);
  }, [deck, applySequence]);

  const ring = useCallback(async (options?: RingOptions) => {
    const { deck: nextDeck, sequence } = ringDeck(deck, options);
    const result = await applySequence(nextDeck, sequence);
    observable.emit({ type: 'ring', payload: { layouts: nextDeck.positions } });
    return result;
  }, [deck, applySequence]);

  const shuffle = useCallback(
    async (options?: ShuffleOptions) => {
      const { deck: nextDeck, sequence } = shuffleDeck(deck, options);
      const result = await applySequence(nextDeck, sequence);
      observable.emit({ type: 'shuffle', payload: { order: nextDeck.cards.map((card) => card.id) } });
      return result;
    },
    [deck, applySequence]
  );

  const flip = useCallback(
    async (cardId: CardId) => {
      const { deck: nextDeck, sequence } = flipCard(deck, cardId);
      const result = await applySequence(nextDeck, sequence);
      const card = nextDeck.cards.find((c) => c.id === cardId);
      if (card) {
        observable.emit({ type: 'flip', payload: { cardId, faceUp: card.faceUp } });
      }
      return result;
    },
    [deck, applySequence]
  );

  const animateTo = useCallback(
    async (cardId: CardId, target: ReturnType<typeof animateCard>['sequence']['steps'][number]['target']) => {
      const { deck: nextDeck, sequence } = animateCard(deck, cardId, target);
      return applySequence(nextDeck, sequence);
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
    async (cardId: CardId): Promise<{ card: CardState; sequence?: AnimationSequence } | undefined> => {
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
      const result = await applySequence(nextDeck, sequence);
      observable.emit({ type: 'draw', payload: { cardId, card: drawnCard } });
      return { card: drawnCard, sequence: result };
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

  const setLayoutModeAndPositions = useCallback(
    async (layoutMode: DeckState['layoutMode'], positions: DeckState['positions']) => {
      const nextDeckWithMode = setDeckLayoutMode(deck, layoutMode);
      const nextDeck = setDeckPositions(nextDeckWithMode, positions);
      dispatch({ type: 'SET_STATE', payload: nextDeck });
      return nextDeck;
    },
    [deck]
  );

  const setLayoutMode = useCallback(
    async (layoutMode: DeckState['layoutMode']) => {
      if (deck.layoutMode === layoutMode) {
        return;
      }
      const nextDeck = setDeckLayoutMode(deck, layoutMode);
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
    setLayoutModeAndPositions,
    setLayoutMode,
    on
  };
}
