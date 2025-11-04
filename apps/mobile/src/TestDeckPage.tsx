import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, useWindowDimensions, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DeckView, CardRenderProps } from '@deck/rn';
import { AnimationDriver, CardData } from '@deck/core';

// Assets simples pour les tests
const CARD_BACK_LIGHT = require('../assets/cards/card-back-light.png');

interface TestCard extends CardData {
  name: string;
  backAsset?: number;
}

// Créer 10 cartes simples pour les tests
const createTestCards = (): TestCard[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `test-card-${i}`,
    name: `Card ${i + 1}`,
    backAsset: CARD_BACK_LIGHT
  }));
};

export default function TestDeckPage() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0
  });

  const cards = useMemo(() => createTestCards(), []);

  const instantDriver = useMemo<AnimationDriver>(() => ({
    play: async () => {
      /* no-op */
    },
    cancel: () => {
      /* no-op */
    }
  }), []);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    
    // Log seulement au changement réel
    if (containerSize.width !== width || containerSize.height !== height) {
      // Log désactivé - inclus dans le log condensé de DeckView
      setContainerSize({ width, height });
    }
  }, [containerSize]);

  const handleDeckReady = useCallback((actions: any) => {
    // Auto-fan après un court délai
    setTimeout(() => {
      actions.fan();
    }, 100);
  }, []);

  const handleDeckStateChange = useCallback((state: any) => {
    // Log désactivé - trop répétitif, log condensé dans DeckView
  }, []);

  // Render simple pour les faces de cartes
  const renderCardFace = useCallback((props: CardRenderProps) => {
    const { data } = props;
    return (
      <View style={styles.cardFace}>
        <Text style={styles.cardText}>{data?.name ?? 'Card'}</Text>
      </View>
    );
  }, []);

  // Render simple pour les dos de cartes
  const renderCardBack = useCallback((props: CardRenderProps) => {
    return (
      <View style={styles.cardBack}>
        <Text style={styles.cardBackText}>🂠</Text>
      </View>
    );
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container} onLayout={handleContainerLayout}>
          {/* Indicateurs visuels pour le centrage */}
          <View style={styles.centerIndicatorVertical} />
          <View style={styles.centerIndicatorHorizontal} />
          
          {/* Container info en overlay */}
          <View style={styles.infoOverlay}>
            <Text style={styles.infoText}>Screen: {screenWidth.toFixed(0)} × {screenHeight.toFixed(0)}</Text>
            <Text style={styles.infoText}>Container: {containerSize.width.toFixed(0)} × {containerSize.height.toFixed(0)}</Text>
            <Text style={styles.infoText}>Center: ({containerSize.width / 2}, {containerSize.height / 2})</Text>
          </View>

          {/* DeckView minimal */}
          {containerSize.width > 0 && containerSize.height > 0 && (
            <DeckView
              driver={instantDriver}
              cards={cards}
              containerSize={containerSize}
              autoFan={true}
              debugLogs={true}
              defaultBackAsset={CARD_BACK_LIGHT}
              renderCardFace={renderCardFace}
              renderCardBack={renderCardBack}
              onDeckReady={handleDeckReady}
              onDeckStateChange={handleDeckStateChange}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#16213e',
    position: 'relative'
  },
  centerIndicatorVertical: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 0, 0, 0.5)',
    zIndex: 1000
  },
  centerIndicatorHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0, 255, 0, 0.5)',
    zIndex: 1000
  },
  infoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1001
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2
  },
  cardFace: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12
  },
  cardText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000'
  },
  cardBack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a237e',
    borderRadius: 12
  },
  cardBackText: {
    fontSize: 48
  }
});

