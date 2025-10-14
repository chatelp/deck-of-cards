'use client';

import React, { useMemo, useRef, useState } from 'react';
import { DeckView, DeckViewActions } from '@deck/web';
import { CardData } from '@deck/core';

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

export default function Page() {
  const actionsRef = useRef<DeckViewActions | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [faceUp, setFaceUp] = useState<Record<string, boolean>>({});
  const [deckSize, setDeckSize] = useState<number>(10);
  const [drawLimit, setDrawLimit] = useState<number>(2);

  const cards = useMemo(() => allYiJingCards.slice(0, deckSize), [deckSize]);

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
        <label className="deck-size-picker">
          Deck size:
          <select
            value={deckSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              setSelected(null);
              setFaceUp({});
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
            selectedIds={selected ? [selected] : []}
            drawLimit={drawLimit}
            onDeckReady={(actions) => {
              actionsRef.current = actions;
            }}
            onSelectCard={(cardId) => {
              setSelected((current) => (current === cardId ? current : cardId));
            }}
            onFlipCard={(cardId, isFaceUp) => {
              setFaceUp((prev) => ({ ...prev, [cardId]: isFaceUp }));
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

        <aside className="deck-panel">
          <div className="deck-summary">
            <h2>Deck Insights</h2>
            <p>Total cards: {cards.length}</p>
            <p>Face up: {Object.values(faceUp).filter(Boolean).length}</p>
          </div>
          <div className="deck-selected">
            <h3>Selected Card</h3>
            {selected ? (
              <div>
                <p className="selected-hexagram">{cards.find((card) => card.id === selected)?.hexagram}</p>
                <p className="selected-title">{cards.find((card) => card.id === selected)?.name}</p>
                <p className="selected-meaning">{cards.find((card) => card.id === selected)?.meaning}</p>
                <div className="selected-actions">
                  <button type="button" onClick={() => actionsRef.current?.flip(selected)}>
                    Flip
                  </button>
                  <button type="button" onClick={() => setSelected(null)}>
                    Clear selection
                  </button>
                </div>
              </div>
            ) : (
              <p>No card selected</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
