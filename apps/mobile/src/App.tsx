import React, { useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, View, Text, Button } from 'react-native';
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

  useEffect(() => {
    const timer = setTimeout(() => {
      deckActions.current?.fan();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.controls}>
        <Button title="Shuffle" onPress={() => deckActions.current?.shuffle()} />
        <Button title="Fan" onPress={() => deckActions.current?.fan()} />
        <Button title="Ring" onPress={() => deckActions.current?.ring()} />
        <Button title="Stack" onPress={() => deckActions.current?.resetStack()} />
      </View>
      <View style={styles.deckContainer}>
        <DeckView
          cards={cards}
          autoFan
          onDeckReady={(actions) => {
            deckActions.current = actions;
          }}
          renderCardFace={({ data }) => (
            <View style={[styles.cardFace, styles.card]}>
              <Text style={styles.cardTitle}>{data.name}</Text>
            </View>
          )}
          defaultBackAsset={CARD_BACK_LIGHT}
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
