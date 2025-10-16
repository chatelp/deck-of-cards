'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeckView, DeckViewActions } from '@deck/web';
import { CardData, CardState } from '@deck/core';

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

const allYiJingCards: YiJingCard[] = Array.from({ length: 64 }).map((_, index) => ({
  id: `card-${index}`,
  name: `Hexagram ${index + 1}`,
  hexagram: yiJingHexagrams[index],
  meaning: yiJingMeanings[index]
}));

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
  const actionsRef = useRef<DeckViewActions | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [faceUp, setFaceUp] = useState<Record<string, boolean>>({});
  const [drawnCards, setDrawnCards] = useState<CardState[]>([]);
  const [deckSize, setDeckSize] = useState<number>(10);
  const [drawLimit, setDrawLimit] = useState<number>(2);
  const [cardsSeed, setCardsSeed] = useState<number>(() => Date.now());

  const cards = useMemo(() => {
    const shuffled = shuffleWithSeed(allYiJingCards, cardsSeed);
    return shuffled.slice(0, deckSize);
  }, [deckSize, cardsSeed]);
  const remainingCount = cards.length - drawnCards.length;
  const faceUpCount = Object.values(faceUp).filter(Boolean).length;
  const selectedCard = drawnCards.find((card) => card.id === selected) ?? null;
  const drawLimitReached = drawnCards.length >= drawLimit;

  const handleRestart = useCallback(() => {
    const newSeed = Date.now();
    setCardsSeed(newSeed);
    setDrawnCards([]);
    setFaceUp({});
    setSelected(null);
    setTimeout(() => {
      actionsRef.current?.resetStack();
      actionsRef.current?.fan();
    }, 60);
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
        <button type="button" onClick={() => actionsRef.current?.shuffle()}>
          Shuffle
        </button>
        <button type="button" onClick={() => actionsRef.current?.fan()}>
          Fan
        </button>
        <button type="button" onClick={() => actionsRef.current?.resetStack()}>
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
              setSelected(null);
              setFaceUp({});
              setDrawnCards([]);
              setDeckSize(nextSize);
              setTimeout(() => {
                actionsRef.current?.resetStack();
                actionsRef.current?.fan();
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
              setDrawLimit(nextLimit);
              setSelected(null);
              setDrawnCards([]);
              setFaceUp({});
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((limitOption) => (
              <option key={limitOption} value={limitOption}>
                {limitOption}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="demo-main">
        <div className="deck-container">
          <DeckView
            key={deckSize}
            cards={cards}
            autoFan
            drawLimit={drawLimit}
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
              setFaceUp((prev) => ({ ...prev, [card.id]: true }));
            }}
            renderCardFace={({ data }) => (
              <div className="card-face">
                <span className="card-hexagram">{(data as YiJingCard).hexagram}</span>
                <span className="card-title">{data.name}</span>
                <span className="card-meaning">{(data as YiJingCard).meaning}</span>
              </div>
            )}
            renderCardBack={() => (
              <div className="card-back">
                <div className="card-back-ring">
                  <span className="card-back-logo">易</span>
                </div>
                <span className="card-back-text">Yi Jing Oracle</span>
              </div>
            )}
          />
        </div>

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
            <span className="insight-value">{faceUpCount}</span>
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
              <button type="button" onClick={() => setSelected(null)} className="selected-clear">Clear</button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
