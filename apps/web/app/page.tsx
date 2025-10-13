import React, { useRef } from 'react';
import { DeckView, DeckViewActions } from '@deck/web';
import { CardData } from '@deck/core';

const cards: CardData[] = Array.from({ length: 10 }).map((_, index) => ({
  id: `card-${index}`,
  name: `Card ${index + 1}`
}));

export default function Page() {
  const actionsRef = useRef<DeckViewActions | null>(null);

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        background: '#223',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        color: '#fff'
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" onClick={() => actionsRef.current?.shuffle()}>
          Shuffle
        </button>
        <button type="button" onClick={() => actionsRef.current?.fan()}>
          Fan
        </button>
        <button type="button" onClick={() => actionsRef.current?.resetStack()}>
          Stack
        </button>
      </div>
      <div style={{ position: 'relative', width: 600, height: 400 }}>
        <DeckView
          cards={cards}
          autoFan
          onDeckReady={(actions) => {
            actionsRef.current = actions;
          }}
          renderCardFace={({ data }) => (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                borderRadius: 12
              }}
            >
              <span style={{ color: '#223', fontWeight: 600 }}>{data.name}</span>
            </div>
          )}
          renderCardBack={() => (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#444',
                color: '#fff',
                borderRadius: 12
              }}
            >
              <span>Yi Jing</span>
            </div>
          )}
        />
      </div>
    </main>
  );
}
