import React, { useMemo, useRef, useState } from 'react';
import { DeckView, DeckViewActions } from '@deck/web';
import { CardData } from '@deck/core';

interface YiJingCard extends CardData {
  hexagram: string;
  meaning: string;
}

const yiJingCards: YiJingCard[] = Array.from({ length: 10 }).map((_, index) => ({
  id: `card-${index}`,
  name: `Hexagram ${index + 1}`,
  hexagram: ['䷀', '䷁', '䷂', '䷃', '䷄', '䷅', '䷆', '䷇', '䷈', '䷉'][index],
  meaning: ['Force', 'Field', 'Sprouting', 'Enthusiasm', 'Waiting', 'Conflict', 'The Army', 'Holding Together', 'Small Taming', 'Treading'][
    index
  ]
}));

export default function Page() {
  const actionsRef = useRef<DeckViewActions | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [faceUp, setFaceUp] = useState<Record<string, boolean>>({});

  const cards = useMemo(() => yiJingCards, []);

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
      </section>

      <section className="demo-main">
        <div className="deck-container">
          <DeckView
            cards={cards}
            autoFan
            selectedIds={selected ? [selected] : []}
            onDeckReady={(actions) => {
              actionsRef.current = actions;
            }}
            onSelectCard={(cardId) => {
              setSelected((current) => (current === cardId ? null : cardId));
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
            renderCardBack={({ data }) => (
              <div className="card-back">
                <span className="card-back-title">Yi Jing</span>
                <span className="card-back-subtitle">{data.name}</span>
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
