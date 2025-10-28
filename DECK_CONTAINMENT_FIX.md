# Fix: Deck Containment on Mobile (Ring & Fan Layouts)

## Problème résolu

Les cartes débordaient du conteneur en mode `ring` et `fan` sur mobile Expo (iOS), sortant de la zone d'affichage malgré les ajustements précédents de padding et scale.

## Analyse du problème

### Issues identifiés

1. **Padding insuffisant**: Les paddings dans `DeckView.tsx` étaient trop petits
   - Ring: `0.38 × CARD_HEIGHT` → insuffisant pour contenir les cartes qui tournent
   - Fan: `0.28 × CARD_HEIGHT` → insuffisant pour l'arc des cartes

2. **Scale factors trop agressifs**: Les multiplicateurs de scale ne laissaient pas assez de marge
   - Ring: `0.92` → trop proche de 1
   - Fan: `0.96` → trop proche de 1

3. **Ring radius trop optimiste**: Le calcul dans `App.tsx` ne tenait pas suffisamment compte de l'espace occupé par les cartes
   - Formule: `availableRadius - CARD_HEIGHT / 2` → sous-estime l'espace nécessaire

## Solution implémentée

### 1. Ajustement des paddings (`packages/deck-rn/src/DeckView.tsx`)

**Avant:**
```typescript
case 'ring':
  return CARD_HEIGHT * 0.38;
case 'fan':
  return CARD_HEIGHT * 0.28;
```

**Après:**
```typescript
case 'ring':
  return CARD_HEIGHT * 0.6;    // +58% d'espace
case 'fan':
  return CARD_HEIGHT * 0.45;   // +61% d'espace
```

### 2. Ajustement des scale factors (`packages/deck-rn/src/DeckView.tsx`)

**Avant:**
```typescript
if (deck.layoutMode === 'ring') {
  scale *= 0.92;  // 8% de réduction
} else if (deck.layoutMode === 'fan') {
  scale *= 0.96;  // 4% de réduction
}
```

**Après:**
```typescript
if (deck.layoutMode === 'ring') {
  scale *= 0.88;  // 12% de réduction (plus conservateur)
} else if (deck.layoutMode === 'fan') {
  scale *= 0.93;  // 7% de réduction (plus conservateur)
}
```

### 3. Amélioration du calcul de ringRadius (`apps/mobile/src/App.tsx`)

**Avant:**
```typescript
const radius = Math.max(80, availableRadius - CARD_HEIGHT / 2);
```

**Après:**
```typescript
// For ring layout, account for card dimensions:
// - Card extends CARD_HEIGHT/2 beyond the ring radius
// - Add extra margin for safety (0.65 factor)
const radius = Math.max(80, availableRadius - CARD_HEIGHT * 0.65);
```

### 4. Suppression du minHeight fixe (`apps/mobile/src/App.tsx`)

Suppression de `minHeight: CARD_HEIGHT * 1.35` du style `deckContainer` pour permettre au conteneur de s'adapter dynamiquement selon l'`aspectRatio` défini pour chaque layout.

### 5. Export des types (`packages/deck-rn/src/index.ts`)

Ajout de `export * from './types';` pour exposer `DeckViewActions` et autres types nécessaires à l'application mobile.

## Architecture du système de containment

### Flux de calcul

```
1. App.tsx calcule ringRadius
   ↓
2. DeckView reçoit ringRadius et containerSize
   ↓
3. calculateDeckBounds calcule la bounding box de toutes les cartes
   (tient compte rotation + dimensions)
   ↓
4. DeckView calcule le scale nécessaire
   scale = min(
     availableWidth / (deckBounds.width + padding * 2),
     availableHeight / (deckBounds.height + padding * 2),
     1
   )
   ↓
5. Application du safety factor (0.88 pour ring, 0.93 pour fan)
   ↓
6. Application de la transformation finale
```

### Formules clés

#### Bounding Box (geometry.ts)
```typescript
// Pour chaque carte avec rotation
const halfWidth = (Math.abs(cos) * width + Math.abs(sin) * height) / 2;
const halfHeight = (Math.abs(sin) * width + Math.abs(cos) * height) / 2;
```

#### Scale avec padding (DeckView.tsx)
```typescript
const paddedWidth = deckBounds.width + layoutPadding * 2;
const paddedHeight = deckBounds.height + layoutPadding * 2;
const scaleX = availableWidth / paddedWidth;
const scaleY = availableHeight / paddedHeight;
let scale = Math.min(scaleX, scaleY, 1);
```

## Résultats attendus

- ✅ Les cartes restent entièrement visibles dans le conteneur en mode ring
- ✅ Les cartes restent entièrement visibles dans le conteneur en mode fan
- ✅ Aucune déformation du layout
- ✅ Les animations fonctionnent correctement
- ✅ Le scale s'adapte automatiquement à la taille du conteneur

## Testing

Pour tester les changements:

```bash
# Compiler les packages
pnpm build

# Lancer l'app mobile
cd apps/mobile
pnpm start
```

Tester avec différentes configurations:
- Deck size: 5, 10, 16, 24, 32, 48, 64 cartes
- Layouts: Fan, Ring, Stack
- Rotations: Portrait et landscape
- Différentes tailles d'écran iOS

## Notes techniques

### Pourquoi ces valeurs spécifiques ?

**Padding (0.6 pour ring, 0.45 pour fan):**
- Ring nécessite plus d'espace car les cartes sont distribuées sur 360°
- Fan a un arc limité (~180°) donc moins d'espace nécessaire
- Ces valeurs offrent une marge confortable sans trop réduire la taille

**Safety factors (0.88 pour ring, 0.93 pour fan):**
- Compense les imprécisions de calcul
- Tient compte du borderRadius du conteneur
- Évite les problèmes de dépassement aux extrêmes

**RingRadius factor (0.65):**
- Plus conservateur que 0.5 (juste la moitié de la carte)
- Compte l'espace pour la rotation et les marges visuelles
- Empiriquement testé pour différents nombres de cartes

## Fichiers modifiés

1. `packages/deck-rn/src/DeckView.tsx` - Ajustements padding et scale factors
2. `packages/deck-rn/src/index.ts` - Export des types
3. `apps/mobile/src/App.tsx` - Calcul ringRadius et suppression minHeight

## Limites connues

- Les valeurs sont optimisées pour des cartes de ratio standard (160×240)
- Pour des ratios de carte très différents, les paddings pourraient nécessiter un ajustement
- Le système assume que le conteneur a un aspect ratio adapté au layout

## Améliorations futures possibles

1. **Calcul dynamique du padding** basé sur le nombre de cartes et le rayon
2. **Auto-ajustement du ringRadius** dans DeckView plutôt que dans l'app
3. **Système de constraints** permettant de définir min/max radius
4. **Détection de débordement** avec warning en dev mode


