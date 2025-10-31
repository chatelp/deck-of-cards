# 🏗️ Architecture Technique

## 📋 Vue d'Ensemble

Le système Deck of Cards est conçu autour d'une **architecture monorepo modulaire** avec séparation claire des responsabilités :

```
@deck/core (Logique Métier)
    ↓ Fournit interfaces et algorithmes
    ↓
@deck/web + @deck/rn (Rendu Plateforme)
    ↓ Intègrent la logique via interfaces communes
    ↓
apps/mobile + apps/web (Applications Démo)
```

## 🎯 Principes Architecturaux

### 1. Single Source of Truth
- Toute la logique métier dans `@deck/core`
- Interfaces TypeScript partagées
- Algorithmes de calcul identiques Web/RN

### 2. Séparation Plateforme/Rendu
- `@deck/core` : 100% agnostique plateforme
- `@deck/web` + `@deck/rn` : Adapters plateforme-spécifiques
- Tests unitaires isolés par package

### 3. Performance First
- Animations GPU-accélérées
- Calculs memoïsés stratégiquement
- Bounds calculation optimisée

## 📦 Structure des Packages

### @deck/core

#### Responsabilités
- **Modèles de données** : `CardState`, `CardLayout`, `DeckState`
- **Algorithmes de layout** : `computeFanLayout`, `computeRingLayout`, `computeStackLayout`
- **Gestion d'état** : Hook `useDeck` avec actions (fan, ring, shuffle, etc.)
- **Utilitaires géométriques** : `calculateDeckBounds`, `pointInPolygon`

#### Architecture Interne
```typescript
// Models (agnostiques)
export interface CardState {
  id: string;
  faceUp: boolean;
  position: 'deck' | 'drawn';
  data?: any;
}

// Layout calculations (pure functions)
export function computeFanLayout(
  cards: CardState[],
  origin: Point,
  radius: number,
  spread: number
): Record<CardId, CardLayout> {
  // Pure calculation logic
}

// State management (hook)
export function useDeck(
  cards: CardData[],
  animationDriver: AnimationDriver,
  config: DeckConfig
): DeckHook {
  // State + actions
}
```

#### Invariants
- **Pas d'imports React** : Fonctions pures
- **Pas de calculs de rendu** : Seulement logique métier
- **Tests unitaires** : 100% coverage des algorithmes

### @deck/web

#### Architecture
```tsx
// WebMotionDriver (Framer Motion)
class WebMotionDriver implements AnimationDriver {
  register(cardId: string, values: AnimatedValues) {
    // Framer Motion animations
  }
}

// DeckView.tsx (React Component)
export const DeckView: React.FC<DeckViewProps> = ({ ... }) => {
  const { deck, fan, ring, shuffle } = useDeck(/*...*/);

  return (
    <motion.div style={{ scale: fitScale }}>
      {deck.cards.map(card => (
        <CardView
          key={card.id}
          layout={deck.positions[card.id]}
          driver={webDriver}
        />
      ))}
    </motion.div>
  );
};
```

#### Stratégie de Scaling
- **Parent Scale** : `transform: scale(fitScale)` sur le container
- **Positions logiques** : Cards utilisent positions non-scalées
- **Avantages** : GPU acceleration, précision parfaite

### @deck/rn

#### Architecture
```tsx
// ReanimatedDriver (React Native Reanimated)
class ReanimatedDriver implements AnimationDriver {
  register(cardId: string, values: AnimatedValues) {
    // Reanimated shared values
  }
}

// DeckView.tsx (React Component)
export const DeckView: React.FC<DeckViewProps> = ({ ... }) => {
  const { deck, fan, ring, shuffle } = useDeck(/*...*/);

  // Baked Scale approach (actuellement)
  const scaledPositions = useMemo(() => scalePositions(deck.positions, fitScale), []);
  const scaledCardDimensions = useMemo(() => scaleDimensions(BASE_DIMENSIONS, fitScale), []);

  return (
    <View>
      <View style={{ transform: [{ translateX }, { translateY }] }}>
        {deck.cards.map(card => (
          <CardView
            key={card.id}
            layout={scaledPositions[card.id]}
            cardDimensions={scaledCardDimensions}
            driver={reanimatedDriver}
          />
        ))}
      </View>
    </View>
  );
};
```

#### Stratégie de Scaling (Actuelle)
- **Baked Scale** : Positions et dimensions scalées individuellement
- **Translation manuelle** : Centrage calculé après scaling
- **Complexité** : 6 useMemo, calculs de bounds redondants

#### Migration Planifiée
```tsx
// Future: Parent Scale (comme Web)
return (
  <Animated.View style={{
    transform: [
      { translateX: centerX },
      { translateY: centerY },
      { scale: fitScale }  // ← Migration cible
    ]
  }}>
    {deck.cards.map(card => (
      <CardView
        key={card.id}
        layout={deck.positions[card.id]}  // ← Positions logiques
        cardDimensions={BASE_DIMENSIONS} // ← Dimensions fixes
        driver={reanimatedDriver}
      />
    ))}
  </Animated.View>
);
```

## 🔄 Flux de Données

### 1. Initialisation
```
App.tsx → DeckView → useDeck (core) → AnimationDriver
    ↓           ↓           ↓                    ↓
  Cards     Container   DeckState           Platform-specific
  Config    Size       Positions           Animations
```

### 2. Layout Change
```
User Action → DeckView.onPress → useDeck.fan() → computeFanLayout()
    ↓              ↓              ↓                    ↓
  Update UI    Animate       Update State        Calculate positions
  Feedback     Transition    deck.positions      (pure function)
```

### 3. Animation Flow
```
computeLayout() → deck.positions → AnimationDriver.register()
    ↓                    ↓                    ↓
Pure calculation   State update       Platform animation
(synchronous)      (React state)      (GPU accelerated)
```

## 🎨 Patterns de Conception

### Hook Pattern (@deck/core)
```typescript
export function useDeck(cards, driver, config): DeckHook {
  // State management
  const [deck, setDeck] = useState<DeckState>(/*...*/);

  // Actions (closures)
  const fan = useCallback(async () => {
    const positions = computeFanLayout(/*...*/);
    await driver.animateTo(positions);
    setDeck(prev => ({ ...prev, positions }));
  }, [cards, config]);

  return { deck, fan, ring, shuffle, resetStack };
}
```

### Driver Pattern (Plateforme)
```typescript
interface AnimationDriver {
  register(cardId: string, values: AnimatedValues, faceUp: boolean): void;
  unregister(cardId: string): void;
  animateTo(positions: Record<string, CardLayout>): Promise<void>;
}
```

### Component Composition
```tsx
// High-level component (layout logic)
<DeckView cards={cards} autoFan onDeckStateChange={...}>
  {/* Render props for customization */}
  <DeckView.CardFace render={({ data }) => <CustomCard />} />
  <DeckView.CardBack render={({ asset }) => <CustomBack />} />
</DeckView>

// Low-level component (single card)
<CardView
  state={card}
  layout={position}
  driver={animationDriver}
  cardDimensions={dimensions}
/>
```

## 🔧 Optimisations Performance

### Memoization Stratégique
```typescript
// ✅ Bon : Calculs lourds memoïsés
const layoutParams = useMemo(() => computeLayoutParams(...), [dependencies]);

// ✅ Bon : Bounds calculation (1 seul calcul)
const bounds = useMemo(() => calculateDeckBounds(...), [positions, dimensions]);

// ❌ Mauvais : Tout memoïser (overhead React)
const everything = useMemo(() => ({ a, b, c }), [deps]);
```

### Calculs de Bounds Optimsés
```typescript
export function calculateDeckBounds(
  cards: CardState[],
  positions: Record<CardId, CardLayout>,
  dimensions: CardDimensions
): DeckBounds {
  // Rotation-aware bounds calculation
  // Accounts for card corners after rotation
  const halfWidth = Math.abs(cos) * width + Math.abs(sin) * height) / 2;
  const halfHeight = Math.abs(sin) * width + Math.abs(cos) * height) / 2;
  // ...
}
```

### Animation Batching
```typescript
// Group related animations
await Promise.all([
  driver.animateTo(newPositions),
  driver.animateScale(newScales),
  driver.animateRotation(newRotations)
]);
```

## 🧪 Tests et Qualité

### Tests Unitaires
```typescript
// Core algorithms (pure functions)
describe('computeFanLayout', () => {
  it('should distribute cards evenly in fan', () => {
    const positions = computeFanLayout(cards, origin, radius, spread);
    expect(positions).toHaveSymmetricXPositions();
  });
});

// Component integration
describe('DeckView', () => {
  it('should render all cards', () => {
    render(<DeckView cards={testCards} />);
    expect(screen.getAllByTestId('card')).toHaveLength(testCards.length);
  });
});
```

### Tests d'Intégration
```typescript
describe('Fan Animation', () => {
  it('should animate cards to fan positions', async () => {
    const { getByTestId } = render(<DeckView cards={cards} />);

    fireEvent.click(getByTestId('fan-button'));

    await waitFor(() => {
      expect(mockDriver.animateTo).toHaveBeenCalledWith(
        expect.objectContaining({ layoutMode: 'fan' })
      );
    });
  });
});
```

## 🚀 Migration et Évolution

### Version Actuelle (Baked Scale)
- ✅ Fonctionnel mais complexe
- ✅ Compatible toutes plateformes RN
- ❌ 6 useMemo, calculs redondants

### Version Cible (Parent Scale)
- ✅ Architecture simplifiée (2 useMemo)
- ✅ Performance optimale
- ✅ Cohérent avec Web
- ⚠️ Test Reanimated scale support requis

### Plan de Migration
1. **Phase 1** : Tester Parent Scale avec flag feature
2. **Phase 2** : Migration progressive (Web déjà compatible)
3. **Phase 3** : Cleanup code legacy
4. **Phase 4** : Optimisations additionnelles

---

**📖 Cette architecture garantit maintenabilité, performance et cohérence cross-platform.**
