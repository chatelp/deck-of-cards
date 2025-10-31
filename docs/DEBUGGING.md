# 🔍 Guide de Débogage - Problèmes de Centrage RN

## 🎯 Vue d'Ensemble

Les problèmes de centrage dans React Native viennent principalement de la complexité de la stratégie **"Baked Scale"** actuelle. Ce guide vous aide à diagnostiquer et résoudre les problèmes de centrage visuel.

## 🚨 Activation des Logs de Debug

```tsx
// Dans votre DeckView
<DeckView
  debugLogs={__DEV__}  // Active tous les logs en développement
  // ... autres props
/>
```

## 📋 Logs à Analyser

### 1. `[DeckView] layoutParams adaptive`

**Vérifier** :
- `fanRadius` : Doit être < container width
- `ringRadius` : Doit être < container width/height
- `effectiveInnerWidth/Height` : Dimensions utilisables

**Exemple** :
```json
{
  "fanRadius": 91,
  "ringRadius": 26.78,
  "effectiveInnerWidth": 342,
  "effectiveInnerHeight": 432
}
```

### 2. `[DeckView] CENTERING DEBUG`

**CRITIQUE** : C'est ici que se trouve le problème de centrage !

**Valeurs normales** :
```json
{
  "avgCenter": { "x": "0.00", "y": "2.27" },      // Centre des positions (logique)
  "boundsCenter": { "x": "0.00", "y": "-7.53" },  // Centre des bounds (visuel)
  "diff": { "x": "0.00", "y": "9.80" },           // Différence entre les deux
  "translate": { "x": "0.00", "y": "7.53" },      // Translation appliquée
  "boundsSymmetry": {
    "sumX": "0.00",                               // Doit être ~0 (symétrique)
    "sumY": "-15.07"                              // Différence due aux rotations
  }
}
```

**Interprétation** :
- `avgCenter.x ≈ 0` ✅ : Positions bien centrées logiquement
- `boundsCenter.x ≈ 0` ✅ : Bounds bien calculés
- `translate.x ≈ -avgCenter.x` ✅ : Translation correcte

### 3. `[DeckView] Post-translation horizontal correction`

**Apparaît seulement si correction appliquée** :
```json
{
  "postMinX": -138.48,
  "postMaxX": 138.48,
  "postHorizontalDiff": 0.5,
  "correction": 0.25,
  "newTranslateX": 0.25
}
```

## 🔍 Diagnostic des Problèmes

### Problème A : Fan/Ring pas centré horizontalement

**Symptômes** :
- Fan semble décalé vers la gauche ou droite
- Ring pas au centre du container

**Causes possibles** :
1. **Bounds asymétriques** : `boundsSymmetry.sumX ≠ 0`
2. **Positions non centrées** : `avgCenter.x ≠ 0`
3. **Translation incorrecte** : `translate.x` pas opposé à `avgCenter.x`

**Solution** :
```typescript
// Vérifier dans CENTERING DEBUG
if (Math.abs(boundsSymmetry.sumX) > 1) {
  // Correction automatique appliquée
  translateX += boundsSymmetry.sumX / 2;
}
```

### Problème B : Fan/Ring déborde du container

**Symptômes** :
- Cartes sortent du cadre visible
- Layout semble trop grand pour l'écran

**Causes possibles** :
1. **fanRadius/ringRadius trop grands** : `layoutParams adaptive`
2. **Scaling insuffisant** : `fitScale` trop proche de 1
3. **Bounds calculation erronée** : `scaledBounds` > `container`

**Solution** :
```typescript
// Vérifier les contraintes
const maxRadius = Math.min(containerWidth, containerHeight) / 2;
const safeRadius = maxRadius - SAFETY_MARGIN;

// fanRadius et ringRadius doivent être ≤ safeRadius
```

### Problème C : Animations saccadées

**Symptômes** :
- Transitions pas fluides
- Cartes "sautent" pendant l'animation

**Causes possibles** :
1. **Recalculs trop fréquents** : `useMemo` dependencies
2. **Bounds calculation lente** : Trop d'itérations
3. **State updates asynchrones** : Race conditions

**Solution** :
```typescript
// Vérifier les dependencies des useMemo
const bounds = useMemo(() =>
  calculateDeckBounds(cards, positions, dimensions),
  [cards.length, positions, dimensions]  // Pas cards (référence change)
);
```

## 🛠️ Outils de Diagnostic

### Script de Validation

```typescript
// Ajouter dans DeckView pour validation
useEffect(() => {
  if (!__DEV__) return;

  const positions = deck.cards.map(c => scaledPositions[c.id]).filter(Boolean);
  const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
  const avgY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

  // Validation centrage
  if (Math.abs(avgX) > 5) {
    console.warn('❌ Positions not centered horizontally', { avgX });
  }

  // Validation bounds
  if (scaledBounds.width > containerWidth || scaledBounds.height > containerHeight) {
    console.warn('❌ Layout exceeds container', {
      bounds: { w: scaledBounds.width, h: scaledBounds.height },
      container: { w: containerWidth, h: containerHeight }
    });
  }
}, [deck.cards, scaledPositions, scaledBounds, containerWidth, containerHeight]);
```

### Visualisation des Bounds

```tsx
// Overlay de debug (DEV only)
{__DEV__ && (
  <View style={StyleSheet.absoluteFill}>
    {/* Bounds calculés */}
    <View style={{
      position: 'absolute',
      left: anchorLeft + scaledBounds.minX,
      top: anchorTop + scaledBounds.minY,
      width: scaledBounds.width,
      height: scaledBounds.height,
      borderWidth: 1,
      borderColor: 'red',
      backgroundColor: 'rgba(255,0,0,0.1)'
    }} />

    {/* Centre du container */}
    <View style={{
      position: 'absolute',
      left: anchorLeft - 5,
      top: anchorTop - 5,
      width: 10,
      height: 10,
      backgroundColor: 'blue',
      borderRadius: 5
    }} />
  </View>
)}
```

## 🔧 Solutions Rapides

### 1. Forcer le centrage (temporaire)

```typescript
// Dans CENTERING DEBUG, forcer translateX = 0
const translateX = 0;  // Temporaire pour test
const translateY = 0;  // Temporaire pour test
```

### 2. Ajuster les rayons manuellement

```typescript
// Valeurs fixes pour test
const fanRadius = Math.min(120, containerWidth / 3);
const ringRadius = Math.min(80, containerWidth / 4);
```

### 3. Désactiver le scaling adaptatif

```typescript
// Utiliser des valeurs fixes pour isoler le problème
const fitScale = 1;  // Pas de scaling
```

## 📊 Métriques de Diagnostic

### Checklist de Validation

**Pour chaque mode (stack/fan/ring)** :
- [ ] `avgCenter.x ≈ 0` (±2px)
- [ ] `boundsSymmetry.sumX ≈ 0` (±1px)
- [ ] Layout contenu dans container
- [ ] Animations fluides
- [ ] Pas de warnings dans console

### Valeurs de Référence (iPhone 12)

| Métrique | Stack | Fan | Ring |
|----------|-------|-----|------|
| `avgCenter.x` | 0.00 | 0.00 | 0.00 |
| `boundsSymmetry.sumX` | 0.00 | 0.00 | 0.00 |
| `fitScale` | 1.00 | 0.47 | 1.00 |
| `translateX` | 0.00 | 0.00 | 0.00 |

## 🚀 Migration Recommandée

### Problème Structurel

La stratégie actuelle **"Baked Scale"** est complexe et source d'erreurs :
- 6 `useMemo` pour gérer le scaling
- Calculs de bounds redondants
- Erreurs d'arrondi accumulées

### Solution : Parent Scale (comme Web)

```tsx
// Migration cible (simplifiée)
const fitScale = useMemo(() => calculateFitScale(bounds, container), [bounds, container]);

return (
  <Animated.View style={{
    transform: [
      { translateX: -bounds.centerX },
      { translateY: -bounds.centerY },
      { scale: fitScale }  // ← Scale sur le parent
    ]
  }}>
    {cards.map(card => (
      <CardView
        key={card.id}
        layout={deck.positions[card.id]}  // ← Positions logiques
        cardDimensions={BASE_DIMENSIONS} // ← Dimensions fixes
      />
    ))}
  </Animated.View>
);
```

**Avantages** :
- ✅ 2 `useMemo` au lieu de 6
- ✅ Pas d'erreurs d'arrondi
- ✅ GPU acceleration optimale
- ✅ Cohérent avec Web

## 📞 Support

### Logs à Fournir

Pour obtenir de l'aide, partagez :
1. **Version** : `package.json` versions
2. **Device** : Modèle + iOS/Android version
3. **Logs complets** : Tous les `[DeckView]` logs
4. **Screenshots** : Layout problématique
5. **Code** : Configuration DeckView

### Issues GitHub

**Template** :
```markdown
## Description
[Description du problème]

## Environment
- Device: [iPhone 12, Pixel 5, etc.]
- OS: [iOS 15.2, Android 12]
- Package versions: [@deck/rn@x.x.x]

## Logs
```
[Coller les logs ici]
```

## Screeshots
[Images du problème]
```

---

**🎯 Priorité** : Résoudre le centrage avant les optimisations de performance.
