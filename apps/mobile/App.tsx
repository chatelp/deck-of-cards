import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  LayoutChangeEvent
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DeckView, DeckViewActions } from '@deck/rn';
import { CardData, CardState, DeckState } from '@deck/core';

import { TestDeckScreen } from './src/TestDeckPage';

const CARD_BACK_LIGHT = require('./assets/cards/card-back-light.png');
const CARD_BACK_DARK = require('./assets/cards/card-back-dark.png');

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
    onPress={onPress}
    disabled={disabled}
    style={[mainStyles.actionButton, active && mainStyles.actionButtonActive, disabled && mainStyles.actionButtonDisabled]}
  >
    <Text style={[mainStyles.actionButtonText, active && mainStyles.actionButtonTextActive, disabled && mainStyles.actionButtonTextDisabled]}>
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
  <TouchableOpacity onPress={onPress} style={[mainStyles.optionButton, active && mainStyles.optionButtonActive]}>
    <Text style={[mainStyles.optionButtonText, active && mainStyles.optionButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

type DeckLayoutMode = 'fan' | 'ring' | 'stack';

function MainDeckScreen() {
  const deckActions = useRef<DeckViewActions | null>(null);
  const [cardsSeed, setCardsSeed] = useState<number>(() => Date.now());
  const [drawLimit, setDrawLimit] = useState<number>(2);
  const [deckSize, setDeckSize] = useState<number>(10);
  const [cardBackOption, setCardBackOption] = useState<CardBackOptionId>('light');
  const [restoreLayoutAfterShuffle, setRestoreLayoutAfterShuffle] = useState<boolean>(true);
  const [desiredLayout, setDesiredLayout] = useState<DeckLayoutMode>('fan');
  const [drawnCards, setDrawnCards] = useState<CardState[]>([]);
  const [faceUp, setFaceUp] = useState<Record<string, boolean>>({});
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [deckContainerSize, setDeckContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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
  const selectedCard = drawnCards.find((card) => card.id === selectedCardId) ?? null;
  const deckKey = useMemo(() => `${deckSize}-${cardsSeed}-${cardBackOption}`, [deckSize, cardsSeed, cardBackOption]);

  const handleDeckContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDeckContainerSize((prev) => {
      if (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) {
        return prev;
      }
      return { width, height };
    });
  }, []);

  const handleShuffle = useCallback(async () => {
    const actions = deckActions.current;
    if (!actions) {
      return;
    }
    await actions.shuffle({ restoreLayout: restoreLayoutAfterShuffle });
    if (!restoreLayoutAfterShuffle) {
      setDesiredLayout('stack');
    }
  }, [restoreLayoutAfterShuffle]);

  const handleFan = useCallback(() => {
    setDesiredLayout('fan');
  }, []);

  const handleRing = useCallback(() => {
    setDesiredLayout('ring');
  }, []);

  const handleStack = useCallback(() => {
    setDesiredLayout('stack');
  }, []);

  const handleRestart = useCallback(() => {
    const newSeed = Date.now();
    setCardsSeed(newSeed);
    setDrawnCards([]);
    setFaceUp({});
    setSelectedCardId(null);
  }, []);

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

      if (selectedCardId && !state.drawnCards.some((card) => card.id === selectedCardId)) {
        setSelectedCardId(null);
      }
    },
    [selectedCardId]
  );

  const handleDeckSizeChange = useCallback(
    (nextSize: number) => {
      setDeckSize(nextSize);
      setDrawnCards([]);
      setFaceUp({});
      setSelectedCardId(null);
    },
    []
  );

  const handleDrawLimitChange = useCallback(
    (nextLimit: number) => {
      setDrawLimit(nextLimit);
      setDrawnCards([]);
      setFaceUp({});
      setSelectedCardId(null);
    },
    []
  );

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

  const handleCardBackChange = useCallback((optionId: CardBackOptionId) => {
    setCardBackOption(optionId);
  }, []);

  return (
    <View style={mainStyles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={mainStyles.scrollContent}>
        <View style={mainStyles.header}>
          <Text style={mainStyles.title}>Yi Jing Deck Prototype</Text>
          <Text style={mainStyles.subtitle}>Cross-platform animation base — React Native + Web</Text>
        </View>

        <View style={mainStyles.deckSection}>
          <View style={mainStyles.deckContainer} onLayout={handleDeckContainerLayout}>
            {deckContainerSize.width > 0 && deckContainerSize.height > 0 && (
              <DeckView
                key={deckKey}
                cards={cards}
                autoFan
                drawLimit={drawLimit}
                defaultBackAsset={defaultBackAsset}
                containerSize={deckContainerSize}
                layoutMode={desiredLayout}
                debugLogs={__DEV__}
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
                    <View style={[mainStyles.cardFace, mainStyles.card]}>
                      <Text style={mainStyles.cardHexagram}>{cardData.hexagram}</Text>
                      <Text style={mainStyles.cardTitle}>{cardData.name}</Text>
                      <Text style={mainStyles.cardMeaning}>{cardData.meaning}</Text>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>

        <View style={mainStyles.statsSection}>
          <View style={mainStyles.statCard}>
            <Text style={mainStyles.statLabel}>Initial</Text>
            <Text style={mainStyles.statValue}>{cards.length}</Text>
          </View>
          <View style={mainStyles.statCard}>
            <Text style={mainStyles.statLabel}>Remaining</Text>
            <Text style={mainStyles.statValue}>{remainingCount}</Text>
          </View>
          <View style={mainStyles.statCard}>
            <Text style={mainStyles.statLabel}>Drawn</Text>
            <Text style={mainStyles.statValue}>
              {drawnCards.length} / {drawLimit}
            </Text>
          </View>
          <View style={mainStyles.statCard}>
            <Text style={mainStyles.statLabel}>Face up</Text>
            <Text style={mainStyles.statValue}>
              {faceUpCount} / {cards.length}
            </Text>
          </View>
        </View>

        <View style={mainStyles.controlsSection}>
          <View style={mainStyles.buttonRow}>
            <ActionButton label="Shuffle" onPress={handleShuffle} />
            <ActionButton label="Fan" onPress={handleFan} active={desiredLayout === 'fan'} />
            <ActionButton label="Ring" onPress={handleRing} active={desiredLayout === 'ring'} />
            <ActionButton label="Stack" onPress={handleStack} active={desiredLayout === 'stack'} />
          </View>
          <View style={mainStyles.singleButtonRow}>
            <ActionButton label="Restart" onPress={handleRestart} />
          </View>
          <View style={mainStyles.toggleRow}>
            <Text style={mainStyles.toggleLabel}>Restore layout after shuffle</Text>
            <Switch
              value={restoreLayoutAfterShuffle}
              onValueChange={setRestoreLayoutAfterShuffle}
              thumbColor={restoreLayoutAfterShuffle ? '#2563eb' : '#6b7280'}
              trackColor={{ true: '#60a5fa', false: '#374151' }}
            />
          </View>
        </View>

        <View style={mainStyles.optionSection}>
          <Text style={mainStyles.sectionLabel}>Deck size</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyles.optionRow}>
            {[5, 10, 16, 24, 32, 48, 64].map((size) => (
              <OptionButton key={size} label={`${size}`} active={deckSize === size} onPress={() => handleDeckSizeChange(size)} />
            ))}
          </ScrollView>
        </View>

        <View style={mainStyles.optionSection}>
          <Text style={mainStyles.sectionLabel}>Draw limit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyles.optionRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((limit) => (
              <OptionButton key={limit} label={`${limit}`} active={drawLimit === limit} onPress={() => handleDrawLimitChange(limit)} />
            ))}
          </ScrollView>
        </View>

        <View style={mainStyles.optionSection}>
          <Text style={mainStyles.sectionLabel}>Card back</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyles.optionRow}>
            {CARD_BACK_OPTIONS.map((option) => (
              <OptionButton
                key={option.id}
                label={option.label}
                active={cardBackOption === option.id}
                onPress={() => handleCardBackChange(option.id)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={mainStyles.selectedSection}>
          <Text style={mainStyles.sectionLabel}>Selected card</Text>
          <View style={mainStyles.selectedCard}>
            {selectedCard ? (
              <>
                <Text style={mainStyles.selectedHexagram}>{selectedCard.hexagram}</Text>
                <Text style={mainStyles.selectedName}>{selectedCard.name}</Text>
                <Text style={mainStyles.selectedMeaning}>{selectedCard.meaning}</Text>
              </>
            ) : (
              <Text style={mainStyles.emptyText}>No card selected</Text>
            )}
          </View>
        </View>

        <View style={mainStyles.drawnSection}>
          <Text style={mainStyles.sectionLabel}>Drawn cards</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyles.drawnRow}>
            {drawnCards.length === 0 ? (
              <Text style={mainStyles.emptyText}>No cards drawn</Text>
            ) : (
              drawnCards.map((card) => (
                <View key={card.id} style={mainStyles.drawnCard}>
                  <Text style={mainStyles.drawnHexagram}>{card.hexagram}</Text>
                  <Text style={mainStyles.drawnName}>{card.name}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'main' | 'test'>('main');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={rootStyles.safeArea}>
        <View style={rootStyles.menuBar}>
          <TouchableOpacity
            style={[rootStyles.menuButton, activeScreen === 'main' && rootStyles.menuButtonActive]}
            onPress={() => setActiveScreen('main')}
          >
            <Text style={[rootStyles.menuButtonText, activeScreen === 'main' && rootStyles.menuButtonTextActive]}>App</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[rootStyles.menuButton, activeScreen === 'test' && rootStyles.menuButtonActive]}
            onPress={() => setActiveScreen('test')}
          >
            <Text style={[rootStyles.menuButtonText, activeScreen === 'test' && rootStyles.menuButtonTextActive]}>Test Deck</Text>
          </TouchableOpacity>
        </View>
        <View style={rootStyles.content}>
          {activeScreen === 'main' ? <MainDeckScreen /> : <TestDeckScreen showDebugOverlay={__DEV__} />}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const rootStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  menuBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)'
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.4)'
  },
  menuButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  menuButtonText: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600'
  },
  menuButtonTextActive: {
    color: '#f8fafc'
  },
  content: {
    flex: 1
  }
});

const mainStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16
  },
  header: {
    alignItems: 'center'
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4
  },
  deckSection: {
    marginTop: 16
  },
  deckContainer: {
    alignSelf: 'stretch',
    height: 480,
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
  controlsSection: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingHorizontal: 12
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  singleButtonRow: {
    marginTop: 12
  },
  toggleRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  toggleLabel: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600'
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    alignItems: 'center'
  },
  actionButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  actionButtonDisabled: {
    opacity: 0.4
  },
  actionButtonText: {
    color: '#cbd5f5',
    fontSize: 14,
    fontWeight: '600'
  },
  actionButtonTextActive: {
    color: '#f8fafc'
  },
  actionButtonTextDisabled: {
    color: '#94a3b8'
  },
  optionSection: {
    marginTop: 16
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
    marginBottom: 8,
    color: '#f8fafc'
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
    marginBottom: 6,
    color: '#f8fafc'
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
