# 📋 API Reference

## 🎴 DeckView (React Native)

### Props Principales

```tsx
interface DeckViewProps {
  // 📊 Données
  cards: CardData[];           // Cartes à afficher
  autoFan?: boolean;          // Fan automatique au montage

  // 🎮 Contrôles
  drawLimit?: number;         // Limite de cartes piochées (défaut: 2)

  // 📱 Layout
  containerSize?: { width: number; height: number }; // Taille externe

  // 🎨 Personnalisation
  defaultBackAsset?: number;  // Asset dos de carte par défaut
  debugLogs?: boolean;        // Logs de debug (__DEV__ only)

  // 🎯 Callbacks
  onDeckReady?: (actions: DeckViewActions) => void;
  onDeckStateChange?: (state: DeckState) => void;
  onFlipCard?: (cardId: string, faceUp: boolean) => void;
  onDrawCard?: (card: CardState) => void;
  onSelectCard?: (cardId: string, selected: boolean) => void;

  // ⚛️ Rendu
  renderCardFace?: CardRenderFunction;
  renderCardBack?: CardRenderFunction;

  // 🎨 Style
  style?: ViewStyle;
}
```

### Actions Disponibles

```tsx
interface DeckViewActions {
  // 🃏 Actions principales
  fan(): Promise<void>;        // Mode éventail
  ring(): Promise<void>;       // Mode cercle
  resetStack(): Promise<void>; // Mode pile

  // 🔄 Utilitaires
  shuffle(options?: { restoreLayout?: boolean }): Promise<void>;
  flip(cardId: string): Promise<void>;

  // 📊 État
  drawCard(cardId: string): Promise<CardState | null>;
  selectCard(cardId: string): Promise<void>;
}
```

## 🃏 Structures de Données

### CardData (Input)

```tsx
interface CardData {
  id: string;              // Identifiant unique
  name: string;            // Nom affiché
  data?: any;              // Données custom (passées aux renderers)
  backAsset?: number;      // Asset pour le dos (optionnel)
}
```

### CardState (Runtime)

```tsx
interface CardState extends CardData {
  faceUp: boolean;         // Carte face visible
  position: 'deck' | 'drawn'; // Position dans le jeu
  selected: boolean;       // Carte sélectionnée
  data: any;               // Données custom
}
```

### CardLayout (Position/Animation)

```tsx
interface CardLayout {
  x: number;               // Position X (pixels)
  y: number;               // Position Y (pixels)
  rotation: number;        // Rotation (degrés)
  scale?: number;          // Scale factor (optionnel)
  zIndex?: number;         // Ordre Z (optionnel)
}
```

### DeckState (État Global)

```tsx
interface DeckState {
  cards: CardState[];      // Toutes les cartes
  drawnCards: CardState[]; // Cartes piochées
  layoutMode: 'stack' | 'fan' | 'ring'; // Mode actuel
  positions: Record<string, CardLayout>; // Positions par ID
}
```

## 🎨 Fonctions de Rendu

### CardRenderFunction

```tsx
type CardRenderFunction = (props: CardRenderProps) => React.ReactElement;

interface CardRenderProps {
  state: CardState;        // État complet de la carte
  data: any;               // Données custom de la carte
  layout: CardLayout;      // Position/rotation actuelle
  isSelected: boolean;     // État de sélection
}
```

### Exemple d'Implémentation

```tsx
// Rendu face de carte custom
const renderCardFace: CardRenderFunction = ({ state, data, isSelected }) => (
  <View style={[styles.card, isSelected && styles.selected]}>
    <Text style={styles.title}>{data.name}</Text>
    <Text style={styles.description}>{data.description}</Text>
  </View>
);

// Rendu dos de carte
const renderCardBack: CardRenderFunction = ({ state }) => (
  <Image source={state.backAsset || defaultBack} style={styles.cardBack} />
);
```

## 🔧 Hooks Internes (@deck/core)

### useDeck

```tsx
function useDeck(
  cards: CardData[],
  animationDriver: AnimationDriver,
  config: DeckConfig
): {
  deck: DeckState;
  fan: () => Promise<void>;
  ring: () => Promise<void>;
  resetStack: () => Promise<void>;
  shuffle: (options?: ShuffleOptions) => Promise<void>;
  flip: (cardId: string) => Promise<void>;
  selectCard: (cardId: string) => Promise<void>;
  drawCard: (cardId: string) => Promise<CardState | null>;
}
```

### Configuration DeckConfig

```tsx
interface DeckConfig {
  drawLimit?: number;          // Limite de cartes piochables
  defaultBackAsset?: number;   // Asset dos par défaut
  ringRadius?: number;         // Rayon mode ring (auto-calculé)
  fanRadius?: number;          // Rayon mode fan (auto-calculé)
  fanAngle?: number;           // Angle mode fan (défaut: π)
}
```

## 🎭 Animation Driver

### Interface AnimationDriver

```tsx
interface AnimationDriver {
  // Enregistrement carte
  register(
    cardId: string,
    values: AnimatedValues,
    faceUp: boolean
  ): void;

  // Désenregistrement carte
  unregister(cardId: string): void;

  // Animation vers positions
  animateTo(positions: Record<string, CardLayout>): Promise<void>;
}
```

### AnimatedValues

```tsx
interface AnimatedValues {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  rotation: SharedValue<number>;
  scale: SharedValue<number>;
  rotateY: SharedValue<number>;
  zIndex: SharedValue<number>;
  offsetX?: number;           // Offset pour centrage
  offsetY?: number;           // Offset pour centrage
}
```

## 🧮 Utilitaires Géométriques

### calculateDeckBounds

```tsx
function calculateDeckBounds(
  cards: CardState[],
  positions: Record<string, CardLayout>,
  dimensions: CardDimensions
): DeckBounds;
```

**Calcul** : Bounds englobants tenant compte des rotations.

```tsx
interface DeckBounds {
  minX: number; maxX: number;
  minY: number; maxY: number;
  width: number; height: number;
  centerX: number; centerY: number;
}
```

### computeFanLayout

```tsx
function computeFanLayout(
  cards: CardState[],
  origin: Point,
  radius: number,
  spread: number
): Record<string, CardLayout>;
```

**Algorithme** : Distribution circulaire des cartes en éventail.

### computeRingLayout

```tsx
function computeRingLayout(
  cards: CardState[],
  center: Point,
  radius: number
): Record<string, CardLayout>;
```

**Algorithme** : Distribution circulaire équidistante.

### computeStackLayout

```tsx
function computeStackLayout(
  cards: CardState[],
  origin: Point
): Record<string, CardLayout>;
```

**Algorithme** : Pile centrée (toutes cartes à même position).

## 📱 Plateforme Spécifique

### React Native (Reanimated)

**Driver** : `ReanimatedDriver`  
**Animations** : GPU-accelerated via Shared Values  
**Compatibilité** : iOS 12+, Android 8+

### Web (Framer Motion)

**Driver** : `WebMotionDriver`  
**Animations** : Framer Motion transforms  
**Compatibilité** : Tous navigateurs modernes

## 🎯 Exemples d'Usage

### Jeu de Tarot Simple

```tsx
import { DeckView } from '@deck/rn';

export default function TarotGame() {
  const [spread, setSpread] = useState<'past' | 'present' | 'future'>('past');

  return (
    <DeckView
      cards={tarotCards}
      drawLimit={3}
      autoFan={false}
      onDeckReady={(actions) => {
        // Actions disponibles
        actions.fan();
      }}
      onDrawCard={(card) => {
        // Carte piochée
        console.log('Drew:', card.data.name);
      }}
      renderCardFace={({ data }) => (
        <View style={styles.tarotCard}>
          <Image source={data.image} style={styles.image} />
          <Text style={styles.name}>{data.name}</Text>
        </View>
      )}
    />
  );
}
```

### Memory Game

```tsx
export default function MemoryGame() {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());

  return (
    <DeckView
      cards={memoryCards}
      drawLimit={2}
      onFlipCard={(cardId, faceUp) => {
        setFlipped(prev => {
          const next = new Set(prev);
          if (faceUp) next.add(cardId);
          else next.delete(cardId);
          return next;
        });
      }}
      renderCardFace={({ state, data }) => (
        <TouchableOpacity style={styles.memoryCard}>
          {flipped.has(state.id) ? (
            <Text style={styles.emoji}>{data.emoji}</Text>
          ) : (
            <Text style={styles.questionMark}>?</Text>
          )}
        </TouchableOpacity>
      )}
    />
  );
}
```

## 🚨 Gestion d'Erreurs

### Erreurs Courantes

```typescript
// ❌ Carte introuvable
await actions.flip('invalid-id'); // → Error: Card not found

// ❌ Limite atteinte
await actions.drawCard('card-1'); // → null (draw limit reached)

// ✅ Gestion propre
try {
  const drawn = await actions.drawCard(cardId);
  if (drawn) {
    // Succès
  } else {
    // Limite atteinte
    showLimitReachedMessage();
  }
} catch (error) {
  // Erreur système
  reportError(error);
}
```

### Validation Props

```typescript
// Props validées automatiquement
<DeckView
  cards={[]}           // ❌ → Warning: Empty deck
  drawLimit={-1}       // ❌ → Warning: Invalid limit
  containerSize={{     // ❌ → Warning: Invalid size
    width: -100,
    height: 0
  }}
/>
```

## 🔧 Types TypeScript

### Exports Principaux

```typescript
// Types principaux
export type {
  DeckViewProps,
  DeckViewActions,
  CardData,
  CardState,
  CardLayout,
  DeckState,
  CardRenderProps,
  CardRenderFunction
};

// Hooks
export { useDeck };

// Utilitaires
export { calculateDeckBounds };

// Constantes
export { CARD_WIDTH, CARD_HEIGHT } from './CardView';
```

### Types Internes (Advanced)

```typescript
// Pour développement avancé
export type {
  AnimationDriver,
  AnimatedValues,
  DeckBounds,
  CardDimensions,
  Point,
  DeckConfig,
  ShuffleOptions
};
```

---

**📖 API conçue pour être simple à utiliser tout en restant puissante et extensible.**
