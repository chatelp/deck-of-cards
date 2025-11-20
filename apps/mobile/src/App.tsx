import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  StatusBar,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  useWindowDimensions
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DeckView, DeckViewActions } from '@deck/rn';
import { CardData, CardState, DeckState } from '@deck/core';

const CARD_BACK_LIGHT = require('../assets/cards/card-back-light.png');
const CARD_BACK_DARK = require('../assets/cards/card-back-dark.png');

const CARD_BACK_OPTIONS = [
  { id: 'light', label: 'Light', asset: CARD_BACK_LIGHT },
  { id: 'dark', label: 'Dark', asset: CARD_BACK_DARK }
] as const;

type CardBackOptionId = (typeof CARD_BACK_OPTIONS)[number]['id'];
interface YiJingCard extends CardData {
  hexagram: string;
  meaning: string;
  backAsset?: number;
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

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onPress, active = false, disabled = false }) => (
  <TouchableOpacity
    testID={label}
    onPress={onPress}
    disabled={disabled}
    style={[styles.actionButton, active && styles.actionButtonActive, disabled && styles.actionButtonDisabled]}
  >
    <Text style={[styles.actionButtonText, active && styles.actionButtonTextActive, disabled && styles.actionButtonTextDisabled]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface OptionButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({ label, active, onPress }) => (
  <TouchableOpacity 
    testID={`option-${label}`}
    onPress={onPress} 
    style={[styles.optionButton, active && styles.optionButtonActive]}
  >
    <Text style={[styles.optionButtonText, active && styles.optionButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export default function App() {
  const { width: viewportWidth } = useWindowDimensions();
  const deckActions = useRef<DeckViewActions | null>(null);
  const [cardsSeed, setCardsSeed] = useState<number>(() => Date.now());
  const [drawLimit, setDrawLimit] = useState<number>(2);
  const [deckSize, setDeckSize] = useState<number>(10);
  const [cardBackOption, setCardBackOption] = useState<CardBackOptionId>('light');
  const [restoreLayoutAfterShuffle, setRestoreLayoutAfterShuffle] = useState<boolean>(true);
  const [desiredLayout, setDesiredLayout] = useState<'fan' | 'ring' | 'stack'>('fan');
  const [actualLayout, setActualLayout] = useState<'fan' | 'ring' | 'stack'>('fan');
  const [drawnCards, setDrawnCards] = useState<CardState[]>([]);
  const [faceUp, setFaceUp] = useState<Record<string, boolean>>({});
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const defaultBackAsset = useMemo(
    () => CARD_BACK_OPTIONS.find((option) => option.id === cardBackOption)?.asset ?? CARD_BACK_OPTIONS[0].asset,
    [cardBackOption]
  );

  const cards = useMemo(() => {
    const shuffled = shuffleWithSeed(allYiJingCards, cardsSeed);
    const asset = defaultBackAsset;
    return shuffled.slice(0, deckSize).map((card) => ({
      ...card,
      backAsset: asset
    }));
  }, [deckSize, cardsSeed, defaultBackAsset]);

  const remainingCount = cards.length - drawnCards.length;
  const faceUpCount = Object.values(faceUp).filter(Boolean).length;
  const selectedCard = drawnCards.find((card) => card.id === selectedCardId) ?? null;
  const [deckContainerSize, setDeckContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const deckKey = useMemo(() => `${deckSize}-${cardsSeed}-${cardBackOption}`, [deckSize, cardsSeed, cardBackOption]);

  const applyLayout = useCallback(
    async (mode: 'fan' | 'ring' | 'stack') => {
      const actions = deckActions.current;
      if (!actions) {
        return;
      }
      if (mode === 'fan') {
        await actions.fan();
      } else if (mode === 'ring') {
        await actions.ring();
      } else {
        await actions.resetStack();
      }
    },
    []
  );

  const handleShuffle = useCallback(async () => {
    const actions = deckActions.current;
    if (!actions) {
      return;
    }
    await actions.shuffle({ restoreLayout: restoreLayoutAfterShuffle });
    if (restoreLayoutAfterShuffle) {
      await applyLayout(desiredLayout);
    } else {
      setDesiredLayout('stack');
    }
  }, [restoreLayoutAfterShuffle, applyLayout, desiredLayout]);

  const handleFan = useCallback(() => {
    setDesiredLayout('fan');
    void applyLayout('fan');
  }, [applyLayout]);

  const handleRing = useCallback(() => {
    setDesiredLayout('ring');
    void applyLayout('ring');
  }, [applyLayout]);

  const handleStack = useCallback(() => {
    setDesiredLayout('stack');
    void applyLayout('stack');
  }, [applyLayout]);

  const handleRestart = useCallback(() => {
    const newSeed = Date.now();
    const layoutToRestore = actualLayout;
    setCardsSeed(newSeed);
    setDrawnCards([]);
    setFaceUp({});
    setSelectedCardId(null);
    setTimeout(() => {
      void applyLayout(layoutToRestore);
    }, 50);
  }, [actualLayout, applyLayout]);

  const handleDeckStateChange = useCallback(
    (state: DeckState) => {
      setDrawnCards(state.drawnCards);
      const nextFaceUp: Record<string, boolean> = {};
      state.cards.forEach((card) => {
        nextFaceUp[card.id] = card.faceUp;
      });
      state.drawnCards.forEach((card) => {
        nextFaceUp[card.id] = card.faceUp;
      });
      setFaceUp(nextFaceUp);

      if (state.layoutMode === 'fan' || state.layoutMode === 'ring' || state.layoutMode === 'stack') {
        setActualLayout(state.layoutMode);
      }

      if (selectedCardId && !state.drawnCards.some((card) => card.id === selectedCardId)) {
        setSelectedCardId(null);
      }
    },
    [selectedCardId]
  );

  const handleDeckSizeChange = useCallback(
    (nextSize: number) => {
      const layoutToRestore = actualLayout;
      setDeckSize(nextSize);
      setDrawnCards([]);
      setFaceUp({});
      setSelectedCardId(null);
      setTimeout(() => {
        void applyLayout(layoutToRestore);
      }, 50);
    },
    [actualLayout, applyLayout]
  );

  const handleDrawLimitChange = useCallback(
    (nextLimit: number) => {
      const layoutToRestore = actualLayout;
      setDrawLimit(nextLimit);
      setDrawnCards([]);
      setFaceUp({});
      setSelectedCardId(null);
      setTimeout(() => {
        void applyLayout(layoutToRestore);
      }, 50);
    },
    [actualLayout, applyLayout]
  );

  useEffect(() => {
    if (deckActions.current == null) {
      return;
    }
    if (actualLayout === 'fan') {
      void applyLayout('fan');
    } else if (actualLayout === 'ring') {
      void applyLayout('ring');
    }
  }, [actualLayout, applyLayout]);

  useEffect(() => {
    if (deckActions.current == null) {
      return;
    }
    void applyLayout(desiredLayout);
  }, [desiredLayout, applyLayout]);

  const handleSelectCard = useCallback((cardId: string, selected: boolean) => {
    setSelectedCardId(selected ? cardId : null);
  }, []);

  const handleDrawCard = useCallback((card: CardState) => {
    setDrawnCards((prev) => {
      if (prev.some((existing) => existing.id === card.id)) {
        return prev;
      }
      return [...prev, card];
    });
    setSelectedCardId(card.id);
  }, []);

  const handleFlipCard = useCallback((cardId: string, isFaceUp: boolean) => {
    setFaceUp((prev) => ({ ...prev, [cardId]: isFaceUp }));
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Yi Jing Deck Prototype</Text>
            <Text style={styles.subtitle}>Cross-platform animation base — React Native + Web</Text>
          </View>

          <View style={styles.deckSection}>
            <View
              testID="DeckRoot"
              style={styles.deckContainer}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                // eslint-disable-next-line no-console
                console.log('[App] deckContainer', { width, height });
                setDeckContainerSize({ width, height });
              }}
            >
              <DeckView
                key={deckKey}
                cards={cards}
                autoFan
                drawLimit={drawLimit}
                defaultBackAsset={defaultBackAsset}
                containerSize={deckContainerSize.width > 0 && deckContainerSize.height > 0 ? deckContainerSize : undefined}
                debugLogs
                onDeckReady={(actions) => {
                  deckActions.current = actions;
                }}
                onDeckStateChange={handleDeckStateChange}
                onFlipCard={handleFlipCard}
                onDrawCard={handleDrawCard}
                onSelectCard={handleSelectCard}
                renderCardFace={({ data }) => {
                  const cardData = data as YiJingCard;
                  return (
                    <View style={[styles.cardFace, styles.card]}>
                      <Text style={styles.cardHexagram}>{cardData.hexagram}</Text>
                      <Text style={styles.cardTitle}>{cardData.name}</Text>
                      <Text style={styles.cardMeaning}>{cardData.meaning}</Text>
                    </View>
                  );
                }}
              />
            </View>
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Initial</Text>
              <Text style={styles.statValue}>{cards.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>{remainingCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Drawn</Text>
              <Text style={styles.statValue}>
                {drawnCards.length} / {drawLimit}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Face up</Text>
              <Text style={styles.statValue}>
                {faceUpCount} / {cards.length}
              </Text>
            </View>
          </View>

          <View style={styles.controlsSection}>
            <View style={styles.buttonRow}>
              <ActionButton label="Shuffle" onPress={handleShuffle} />
              <ActionButton label="Fan" onPress={handleFan} active={desiredLayout === 'fan'} />
              <ActionButton label="Ring" onPress={handleRing} active={desiredLayout === 'ring'} />
              <ActionButton label="Stack" onPress={handleStack} active={desiredLayout === 'stack'} />
            </View>
            <View style={styles.singleButtonRow}>
              <ActionButton label="Restart" onPress={handleRestart} />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Restore layout after shuffle</Text>
              <Switch
                value={restoreLayoutAfterShuffle}
                onValueChange={(value) => setRestoreLayoutAfterShuffle(value)}
                thumbColor={restoreLayoutAfterShuffle ? '#2563eb' : '#6b7280'}
                trackColor={{ true: '#60a5fa', false: '#374151' }}
              />
            </View>
          </View>

          <View style={styles.optionSection}>
            <Text style={styles.sectionLabel}>Deck size</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {[5, 10, 16, 24, 32, 48, 64].map((size) => (
                <OptionButton key={size} label={`${size}`} active={deckSize === size} onPress={() => handleDeckSizeChange(size)} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.optionSection}>
            <Text style={styles.sectionLabel}>Draw limit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((limit) => (
                <OptionButton key={limit} label={`${limit}`} active={drawLimit === limit} onPress={() => handleDrawLimitChange(limit)} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.optionSection}>
            <Text style={styles.sectionLabel}>Card back</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {CARD_BACK_OPTIONS.map((option) => (
                <OptionButton
                  key={option.id}
                  label={option.label}
                  active={cardBackOption === option.id}
                  onPress={() => setCardBackOption(option.id)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.selectedSection}>
            <Text style={styles.sectionLabel}>Selected card</Text>
            {selectedCard ? (
              <View style={styles.selectedCard}>
                <Text style={styles.selectedHexagram}>{(selectedCard.data as YiJingCard).hexagram}</Text>
                <Text style={styles.selectedName}>{selectedCard.data?.name}</Text>
                <Text style={styles.selectedMeaning}>{(selectedCard.data as YiJingCard).meaning}</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>No card selected yet</Text>
            )}
          </View>

          <View style={styles.drawnSection}>
            <Text style={styles.sectionLabel}>Drawn cards</Text>
            {drawnCards.length === 0 ? (
              <Text style={styles.emptyText}>No cards drawn yet</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawnRow}>
                {drawnCards.map((card) => (
                  <View key={card.id} style={styles.drawnCard}>
                    <Text style={styles.drawnHexagram}>{(card.data as YiJingCard).hexagram}</Text>
                    <Text style={styles.drawnName}>{card.data?.name}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48
  },
  header: {
    paddingTop: 24,
    paddingBottom: 12
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#cbd5f5'
  },
  controlsSection: {
    marginTop: 16,
    paddingVertical: 12
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  singleButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButtonActive: {
    backgroundColor: '#2563eb'
  },
  actionButtonDisabled: {
    opacity: 0.5
  },
  actionButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600'
  },
  actionButtonTextActive: {
    color: '#f8fafc'
  },
  actionButtonTextDisabled: {
    color: '#94a3b8'
  },
  toggleRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  toggleLabel: {
    color: '#cbd5f5',
    fontSize: 14,
    flex: 1,
    marginRight: 12
  },
  optionSection: {
    marginTop: 16,
    paddingVertical: 10
  },
  sectionLabel: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8
  },
  optionRow: {
    flexDirection: 'row'
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    marginRight: 8
  },
  optionButtonActive: {
    backgroundColor: '#2563eb'
  },
  optionButtonText: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600'
  },
  optionButtonTextActive: {
    color: '#f8fafc'
  },
  deckSection: {
    marginTop: 16
  },
  deckContainer: {
    alignSelf: 'stretch',
    height: 480,
    // Distinct color to visualize the deck container bounds in mobile UI
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderColor: '#22d3ee',
    borderWidth: 2,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    marginHorizontal: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  statLabel: {
    color: '#cbd5f5',
    fontSize: 12,
    marginBottom: 4
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700'
  },
  selectedSection: {
    marginTop: 16,
    paddingVertical: 12
  },
  selectedCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16
  },
  selectedHexagram: {
    fontSize: 42,
    textAlign: 'center',
    marginBottom: 8
  },
  selectedName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center'
  },
  selectedMeaning: {
    color: '#cbd5f5',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14
  },
  drawnSection: {
    marginTop: 16,
    paddingVertical: 12
  },
  drawnRow: {
    flexDirection: 'row'
  },
  drawnCard: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center'
  },
  drawnHexagram: {
    fontSize: 26,
    marginBottom: 6
  },
  drawnName: {
    color: '#e2e8f0',
    fontSize: 14,
    textAlign: 'center'
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  cardFace: {
    backgroundColor: '#f8fafc'
  },
  cardHexagram: {
    fontSize: 48,
    color: '#0f172a',
    marginBottom: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  cardMeaning: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
    marginTop: 4
  }
});
