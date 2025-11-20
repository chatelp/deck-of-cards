'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { CardData, CardState, DeckState } from '@deck/core';
import type { DeckViewActions } from '@deck/web';

// Phase 0: Force client-only rendering for DeckView to eliminate hydration mismatches
// No SSR for deck components - ensures identical rendering on client
// ssr: false ensures DeckView is never rendered on the server
const DeckView = nextDynamic(
  () => import('@deck/web').then((mod) => ({ default: mod.DeckView })),
  {
    ssr: false,
    loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading deck...</div>
  }
);

interface YiJingCard extends CardData {
  hexagram: string;
  meaning: string;
}

const yiJingHexagrams = [
  '䷀',
  '䷁',
  '䷂',
  '䷃',
  '䷄',
  '䷅',
  '䷆',
  '䷇',
  '䷈',
  '䷉',
  '䷊',
  '䷋',
  '䷌',
  '䷍',
  '䷎',
  '䷏',
  '䷐',
  '䷑',
  '䷒',
  '䷓',
  '䷔',
  '䷕',
  '䷖',
  '䷗',
  '䷘',
  '䷙',
  '䷚',
  '䷛',
  '䷜',
  '䷝',
  '䷞',
  '䷟',
  '䷠',
  '䷡',
  '䷢',
  '䷣',
  '䷤',
  '䷥',
  '䷦',
  '䷧',
  '䷨',
  '䷩',
  '䷪',
  '䷫',
  '䷬',
  '䷭',
  '䷮',
  '䷯',
  '䷰',
  '䷱',
  '䷲',
  '䷳',
  '䷴',
  '䷵',
  '䷶',
  '䷷',
  '䷸',
  '䷹',
  '䷺',
  '䷻',
  '䷼',
  '䷽',
  '䷾',
  '䷿'
];

const yiJingMeanings = [
  'The Creative',
  'The Receptive',
  'Difficulty at the Beginning',
  'Youthful Folly',
  'Waiting',
  'Conflict',
  'The Army',
  'Holding Together',
  'Small Taming',
  'Treading',
  'Peace',
  'Standstill',
  'Fellowship',
  'Great Possession',
  'Modesty',
  'Enthusiasm',
  'Following',
  'Work on What Has Been Spoiled',
  'Approach',
  'Contemplation',
  'Biting Through',
  'Grace',
  'Splitting Apart',
  'Return',
  'The Innocent',
  'Great Taming',
  'Great Accumulating',
  'The Corners of the Mouth',
  'The Abysmal',
  'The Clinging',
  'Influence',
  'Duration',
  'Retreat',
  'Great Power',
  'Progress',
  'Darkening of the Light',
  'Family',
  'Opposition',
  'Obstruction',
  'Deliverance',
  'Decrease',
  'Increase',
  'Breakthrough',
  'Coming to Meet',
  'Gathering Together',
  'Pushing Upward',
  'Oppression',
  'The Well',
  'Revolution',
  'The Cauldron',
  'The Arousing',
  'Keeping Still',
  'Development',
  'Marrying Maiden',
  'Abundance',
  'The Wanderer',
  'The Gentle',
  'The Joyous',
  'Dispersion',
  'Limitation',
  'Inner Truth',
  'Small Preponderance',
  'After Completion',
  'Before Completion'
];

const CARD_BACK_OPTIONS = [
  { id: 'light', label: 'Light', asset: '/cards/card-back-light.png' },
  { id: 'dark', label: 'Dark', asset: '/cards/card-back-dark.png' }
] as const;

const allYiJingCards: YiJingCard[] = Array.from({ length: 64 }).map((_, index) => ({
  id: `card-${index}`,
  name: `Hexagram ${index + 1}`,
  hexagram: yiJingHexagrams[index],
  meaning: yiJingMeanings[index]
}));

type CardBackOptionId = (typeof CARD_BACK_OPTIONS)[number]['id'];

function seededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleWithSeed<T>(source: T[], seed: number): T[] {
  const result = [...source];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function Page() {
  const searchParams = useSearchParams();
  const baselineMode = searchParams?.get('baseline') === '1';
  // Allow fixing seed for deterministic tests
  const testSeed = useMemo(() => {
    const seedParam = searchParams?.get('seed');
    return seedParam ? parseInt(seedParam, 10) : 0;
  }, [searchParams]);

  const actionsRef = useRef<DeckViewActions | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [faceUp, setFaceUp] = useState<Record<string, boolean>>({});
  const [drawnCards, setDrawnCards] = useState<CardState[]>([]);
  const [deckSize, setDeckSize] = useState<number>(10);
  const [drawLimit, setDrawLimit] = useState<number>(2);
  const [cardsSeed, setCardsSeed] = useState<number>(0);
  type LayoutMode = 'fan' | 'stack' | 'ring';
  const [desiredLayout, setDesiredLayout] = useState<LayoutMode>('fan');
  const [actualLayout, setActualLayout] = useState<LayoutMode>('fan');
  const [restoreLayoutAfterShuffle, setRestoreLayoutAfterShuffle] = useState<boolean>(true);
  const [cardBackOption, setCardBackOption] = useState<CardBackOptionId>('light');
  const defaultBackAsset = useMemo(
    () => CARD_BACK_OPTIONS.find((option) => option.id === cardBackOption)?.asset ?? CARD_BACK_OPTIONS[0].asset,
    [cardBackOption]
  );

  const cards = useMemo(() => {
    const shuffled = shuffleWithSeed(allYiJingCards, cardsSeed);
    return shuffled.slice(0, deckSize).map((card) => ({
      ...card,
      backAsset: defaultBackAsset
    }));
  }, [deckSize, cardsSeed, defaultBackAsset]);
  const remainingCount = cards.length - drawnCards.length;
  const faceUpCount = Object.values(faceUp).filter(Boolean).length;
  const selectedCard = drawnCards.find((card) => card.id === selected) ?? null;
  const drawLimitReached = drawnCards.length >= drawLimit;
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const layoutMetrics = useMemo(() => {
    const safeWidth = Math.max(320, viewportWidth - 48);
    if (actualLayout === 'ring') {
      const maxWidth = Math.min(safeWidth, 520);
      const padding = Math.max(24, maxWidth * 0.08);
      const radius = Math.max(120, (maxWidth - padding * 2) / 2);
      return {
        style: {
          width: '100%',
          maxWidth,
          aspectRatio: '1 / 1',
          padding
        } as React.CSSProperties,
        ringRadius: radius
      };
    }
    if (actualLayout === 'stack') {
      const maxWidth = Math.min(safeWidth, 420);
      const padding = Math.max(20, maxWidth * 0.08);
      return {
        style: {
          width: '100%',
          maxWidth,
          aspectRatio: '3 / 4',
          padding
        } as React.CSSProperties,
        ringRadius: undefined
      };
    }
    const maxWidth = Math.min(safeWidth, 900);
    const padding = Math.max(24, maxWidth * 0.05);
    return {
      style: {
        width: '100%',
        maxWidth,
        aspectRatio: '5 / 3',
        padding
      } as React.CSSProperties,
      ringRadius: undefined
    };
  }, [actualLayout, viewportWidth]);

  const deckContainerStyle = layoutMetrics.style;
  const ringRadius = layoutMetrics.ringRadius;

  useEffect(() => {
    if (cardsSeed === 0) {
      // Use provided test seed or fallback to random
      const newSeed = testSeed || Date.now();
      setCardsSeed(newSeed);
      setDesiredLayout('fan');
      setTimeout(() => {
        actionsRef.current?.resetStack();
        actionsRef.current?.fan();
      }, 60);
    }
  }, [cardsSeed, testSeed]);

  const handleRestart = useCallback(() => {
    const newSeed = Date.now();
    const layoutToRestore = actualLayout; // capture current mode
    setCardsSeed(newSeed);
    setDrawnCards([]);
    setFaceUp({});
    setSelected(null);
    // Re-applique explicitement le layout courant juste après le rebuild
    // pour éviter toute transition visuelle en stack.
    setTimeout(() => {
      const actions = actionsRef.current;
      if (!actions) {
        return;
      }
      if (layoutToRestore === 'fan') {
        void actions.fan();
      } else if (layoutToRestore === 'ring') {
        void actions.ring({ radius: ringRadius });
      } else {
        void actions.resetStack();
      }
    }, 50);
  }, [actualLayout, ringRadius]);

  const applyDesiredLayout = useCallback(async () => {
    const actions = actionsRef.current;
    if (!actions) {
      return;
    }
    console.log('[Page] applyDesiredLayout', { desiredLayout, actualLayout });
    if (desiredLayout === actualLayout) {
      return;
    }
    if (desiredLayout === 'fan') {
      await actions.fan();
    } else if (desiredLayout === 'ring') {
      await actions.ring({ radius: ringRadius });
    } else if (desiredLayout === 'stack') {
      await actions.resetStack();
    }
  }, [desiredLayout, actualLayout, ringRadius]);

  const handleShuffle = useCallback(async () => {
    const actions = actionsRef.current;
    if (!actions) {
      return;
    }
    console.log('[Page] handleShuffle', { desiredLayout, actualLayout });
    await actions.shuffle({ restoreLayout: restoreLayoutAfterShuffle });
    if (restoreLayoutAfterShuffle) {
      await applyDesiredLayout();
    } else {
      if (desiredLayout !== 'stack') {
        setDesiredLayout('stack');
      }
    }
  }, [applyDesiredLayout, restoreLayoutAfterShuffle, desiredLayout, actualLayout]);

  const handleFan = useCallback(() => {
    setDesiredLayout('fan');
    console.log('[Page] handleFan -> desiredLayout set to fan');
    void actionsRef.current?.fan();
  }, []);

  const handleRing = useCallback(() => {
    setDesiredLayout('ring');
    console.log('[Page] handleRing -> desiredLayout set to ring');
    void actionsRef.current?.ring({ radius: ringRadius });
  }, [ringRadius]);

  const handleStack = useCallback(() => {
    setDesiredLayout('stack');
    console.log('[Page] handleStack -> desiredLayout set to stack');
    void actionsRef.current?.resetStack();
  }, []);

  useEffect(() => {
    if (actualLayout === 'ring' && actionsRef.current) {
      void actionsRef.current.ring({ radius: ringRadius });
    }
  }, [actualLayout, ringRadius]);

  const handleDeckStateChange = useCallback((state: DeckState) => {
    setDrawnCards(state.drawnCards);
    const nextFaceUp: Record<string, boolean> = {};
    state.cards.forEach((card) => {
      nextFaceUp[card.id] = card.faceUp;
    });
    state.drawnCards.forEach((card) => {
      nextFaceUp[card.id] = card.faceUp;
    });
    setFaceUp(nextFaceUp);

    if (state.layoutMode === 'fan' || state.layoutMode === 'stack' || state.layoutMode === 'ring') {
      setActualLayout(state.layoutMode);
      console.log('[Page] onDeckStateChange layout', { layoutMode: state.layoutMode });
    }
  }, []);

  useEffect(() => {
    if (selected && !drawnCards.some((card) => card.id === selected)) {
      setSelected(null);
    }
  }, [drawnCards, selected]);

  return (
    <main className="demo-root">
      <header className="demo-header">
        <h1>Yi Jing Deck Prototype</h1>
        <p>Cross-platform animation base — React Native + Web</p>
      </header>

      <section className="demo-controls">
        <button type="button" onClick={handleShuffle}>
          Shuffle
        </button>
        <label className="toggle-restore">
          <input
            type="checkbox"
            checked={restoreLayoutAfterShuffle}
            onChange={(event) => {
              const nextValue = event.target.checked;
              console.log('[Page] toggle restoreLayoutAfterShuffle', { nextValue });
              setRestoreLayoutAfterShuffle(nextValue);
            }}
          />
          Restore layout after shuffle
        </label>
        <button type="button" onClick={handleFan}>
          Fan
        </button>
        <button type="button" onClick={handleRing}>
          Ring
        </button>
        <button type="button" onClick={handleStack}>
          Stack
        </button>
        <button type="button" onClick={handleRestart}>
          Restart
        </button>
        <label className="deck-size-picker">
          Deck size:
          <select
            value={deckSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              const layoutToRestore = actualLayout;
              setSelected(null);
              setFaceUp({});
              setDrawnCards([]);
              setDeckSize(nextSize);
              setTimeout(() => {
                const actions = actionsRef.current;
                if (!actions) {
                  return;
                }
                if (layoutToRestore === 'ring') {
                  void actions.ring({ radius: ringRadius });
                } else if (layoutToRestore === 'fan') {
                  void actions.fan();
                } else {
                  void actions.resetStack();
                }
              }, 50);
            }}
          >
            {[5, 10, 16, 24, 32, 48, 64].map((sizeOption) => (
              <option key={sizeOption} value={sizeOption}>
                {sizeOption}
              </option>
            ))}
          </select>
        </label>
        <label className="deck-size-picker">
          Draw limit:
          <select
            value={drawLimit}
            onChange={(event) => {
              const nextLimit = Number(event.target.value);
              const layoutToRestore = actualLayout;
              setDrawLimit(nextLimit);
              setSelected(null);
              setDrawnCards([]);
              setFaceUp({});
              setTimeout(() => {
                const actions = actionsRef.current;
                if (!actions) {
                  return;
                }
                if (layoutToRestore === 'ring') {
                  void actions.ring({ radius: ringRadius });
                } else if (layoutToRestore === 'fan') {
                  void actions.fan();
                } else {
                  void actions.resetStack();
                }
              }, 50);
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((limitOption) => (
              <option key={limitOption} value={limitOption}>
                {limitOption}
              </option>
            ))}
          </select>
        </label>
        <label className="deck-size-picker">
          Card back:
          <select
            value={cardBackOption}
            onChange={(event) => {
              const nextOption = event.target.value as CardBackOptionId;
              setCardBackOption(nextOption);
            }}
          >
            {CARD_BACK_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="demo-main">
        <DeckView
          key={deckSize}
          className="deck-container"
          style={deckContainerStyle}
          baselineMode={baselineMode}
          cards={cards}
          autoFan
          drawLimit={drawLimit}
          ringRadius={ringRadius}
          defaultBackAsset={defaultBackAsset}
          onDeckReady={(actions) => {
            actionsRef.current = actions;
          }}
          onFlipCard={(cardId, isFaceUp) => {
            setFaceUp((prev) => ({ ...prev, [cardId]: isFaceUp }));
          }}
          onDrawCard={(card) => {
            setDrawnCards((prev) => {
              if (prev.some((existing) => existing.id === card.id)) {
                return prev;
              }
              return [...prev, card];
            });
            setSelected(card.id);
          }}
          onDeckStateChange={handleDeckStateChange}
          renderCardFace={({ data }) => (
            <div className="card-face">
              <span className="card-hexagram">{(data as YiJingCard).hexagram}</span>
              <span className="card-title">{data.name}</span>
              <span className="card-meaning">{(data as YiJingCard).meaning}</span>
            </div>
          )}
        />

        <div className="deck-insights">
          <div className="insight-item">
            <span className="insight-label">Initial</span>
            <span className="insight-value">{cards.length}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Remaining</span>
            <span className="insight-value">{remainingCount}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Drawn</span>
            <span className="insight-value">{drawnCards.length} / {drawLimit}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Face up</span>
            <span className="insight-value">{faceUpCount} / {cards.length}</span>
          </div>
        </div>

        <div className="deck-drawn-inline">
          {drawnCards.length ? (
            <ul className="drawn-card-list-inline">
              {drawnCards.map((card) => {
                const data = card.data as YiJingCard | undefined;
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      className={`drawn-card-button${selected === card.id ? ' is-active' : ''}`}
                      onClick={() => setSelected(card.id)}
                      title={data?.name}
                    >
                      <span className="drawn-hexagram">{data?.hexagram}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="drawn-empty">No cards drawn yet</p>
          )}
        </div>

        <div className="deck-selected-inline">
          {selectedCard ? (
            <div className="selected-inline">
              <span className="selected-hexagram">{(selectedCard.data as YiJingCard | undefined)?.hexagram}</span>
              <span className="selected-title">{(selectedCard.data as YiJingCard | undefined)?.name}</span>
              <span className="selected-meaning">{(selectedCard.data as YiJingCard | undefined)?.meaning}</span>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
