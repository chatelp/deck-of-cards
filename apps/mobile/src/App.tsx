import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, Text, Button, useWindowDimensions } from 'react-native';
import { DeckView, DeckViewActions } from '@deck/rn';
import { CardData } from '@deck/core';

const CARD_BACK_LIGHT = require('../assets/cards/card-back-light.png');

const cards: CardData[] = Array.from({ length: 10 }).map((_, index) => ({
  id: `card-${index}`,
  name: `Card ${index + 1}`,
  backAsset: CARD_BACK_LIGHT
}));

export default function App() {
  const deckActions = useRef<DeckViewActions | null>(null);
  const [layoutMode, setLayoutMode] = useState<'fan' | 'ring' | 'stack'>('fan');
  const { width: viewportWidth } = useWindowDimensions();

  useEffect(() => {
    const timer = setTimeout(() => {
      deckActions.current?.fan();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const layoutMetrics = useMemo(() => {
    const safeWidth = Math.max(280, viewportWidth - 32);
    if (layoutMode === 'ring') {
      const maxWidth = Math.min(safeWidth, 360);
      const padding = Math.max(16, maxWidth * 0.08);
      const radius = Math.max(100, (maxWidth - padding * 2) / 2);
      return {
        style: {
          width: '100%',
          maxWidth,
          aspectRatio: 1,
          padding
        } as const,
        ringRadius: radius
      };
    }
    if (layoutMode === 'stack') {
      const maxWidth = Math.min(safeWidth, 360);
      const padding = Math.max(14, maxWidth * 0.06);
      return {
        style: {
          width: '100%',
          maxWidth,
          aspectRatio: 3 / 4,
          padding
        } as const,
        ringRadius: undefined
      };
    }
    const maxWidth = Math.min(safeWidth, 600);
    const padding = Math.max(18, maxWidth * 0.05);
    return {
      style: {
        width: '100%',
        maxWidth,
        aspectRatio: 5 / 3,
        padding
      } as const,
      ringRadius: undefined
    };
  }, [layoutMode, viewportWidth]);

  const deckContainerStyle = useMemo(() => [styles.deckContainer, layoutMetrics.style], [layoutMetrics]);

  useEffect(() => {
    if (layoutMode === 'ring') {
      deckActions.current?.ring({ radius: layoutMetrics.ringRadius });
    }
  }, [layoutMode, layoutMetrics.ringRadius]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.controls}>
        <Button title="Shuffle" onPress={() => deckActions.current?.shuffle()} />
        <Button title="Fan" onPress={() => deckActions.current?.fan()} />
        <Button
          title="Ring"
          onPress={() => deckActions.current?.ring({ radius: layoutMetrics.ringRadius })}
        />
        <Button title="Stack" onPress={() => deckActions.current?.resetStack()} />
      </View>
      <View style={deckContainerStyle}>
        <DeckView
          cards={cards}
          autoFan
          onDeckReady={(actions) => {
            deckActions.current = actions;
          }}
          onDeckStateChange={(state) => {
            if (state.layoutMode === 'ring' || state.layoutMode === 'fan' || state.layoutMode === 'stack') {
              setLayoutMode(state.layoutMode);
            }
          }}
          renderCardFace={({ data }) => (
            <View style={[styles.cardFace, styles.card]}>
              <Text style={styles.cardTitle}>{data.name}</Text>
            </View>
          )}
          defaultBackAsset={CARD_BACK_LIGHT}
          ringRadius={layoutMetrics.ringRadius}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111'
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    paddingHorizontal: 16
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardFace: {
    backgroundColor: '#fff'
  },
  cardTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '600'
  }
});
