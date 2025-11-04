# 🏗️ Architecture Technique (2025)

## Vue d’ensemble

```
┌───────────────┐
│   @deck/core  │  ← logique métier pure
│  (cartes,     │
│   layouts,    │
│   états)      │
└──────┬────────┘
       │
       ▼
┌───────────────┐       ┌───────────────┐
│   @deck/rn    │       │   @deck/web   │   ← rendus plateforme
│ DeckView      │       │ DeckView      │
│ (orchestration│       │ (idem)        │
│  & animations)│       │               │
└──────┬────────┘       └───────────────┘
       │
       ▼
┌───────────────┐
│  Apps démo    │
│  mobile/web   │
└───────────────┘
```

L’idée clef : **`@deck/core` ne décide plus du rendu**. Il expose les structures de données, les fonctions de layout et un hook `useDeck` qui gère uniquement l’état métier (ordre des cartes, tirages, sélection). Les composants de rendu (`@deck/rn`, `@deck/web`) calculent eux‑mêmes les positions brutes et orchestrent les animations.

---

## @deck/core

### Responsabilités
- Modèles : `CardState`, `CardLayout`, `DeckState`, etc.
- Fonctions de layout pures : `computeFanLayout`, `computeRingLayout`, `computeStackLayout`, `computeLineLayout`.
- Hook `useDeck` :
  - fournit l’état (`deck`) et les actions métier (`fan`, `ring`, `shuffle`, `drawCard`, …)
  - **option `manageLayoutExternally`** : quand elle est vraie, le hook ne reconstruit plus les positions ni ne lance d’animations. Il s’en remet entièrement à la vue.
- Observable d’évènements (`DeckObservable`) et contrat `AnimationDriver` (toujours utilisé par les vues pour leurs propres animations).

### Invariants
- Fonctions de layout/état 100 % pures, testables.
- Aucune dépendance React pour les algorithmes.
- Les animations sont opt-in : `useDeck` ne déclenche `driver.play()` que si `manageLayoutExternally` est `false`.

---

## @deck/rn

### Pipeline DeckView (simplifié)
1. **Mesure & stabilisation**  
   `OrientationManager` fournit des dimensions “committed” (layout + render) une fois la rotation terminée. Tant que `isTransitioning`, on désactive les animations (`animationsEnabled = false` dans `useDeck`).

2. **Calculs de base**  
   `DeckView` calcule les positions brutes via les fonctions pures de `@deck/core` :
   ```ts
   const baseLayouts =
     deck.layoutMode === 'ring' ? computeRingLayout(...) :
     deck.layoutMode === 'stack' ? computeStackLayout(...) :
     deck.layoutMode === 'line' ? computeLineLayout(...) :
     computeFanLayout(...);
   ```
   Ces positions sont poussées dans l’état du cœur via `setPositions(baseLayouts)` – **une seule source de vérité visuelle**.

3. **Scène déterministe**  
   `computeDeckScene(deck, baseLayouts, layoutSize, renderSize)` renvoie :
   - `fitScale` (scale clampé, basé sur les dimensions engagées),
   - `scaledPositions`, `scaledBounds`,
   - `deckTransform` (centrage),
   - `scaledCardDimensions`.
   Ce snapshot est utilisé directement pour le rendu.

4. **Animations pilotées par DeckView**  
   - pendant une rotation : animations coupées (`driver.cancel?.()` + `animationsEnabled=false`);
   - à la fin : la vue snap le layout final (en rejouant `setPositions(baseLayouts)` une dernière fois), puis rouvre les animations pour les actions utilisateur (tap, shuffle…).

### Avantages
- Aucun recalcul visuel caché dans `@deck/core`.
- Une seule scène publiée par orientation (pas de flicker).
- Facile à debugger : les logs condensés reflètent la scène calculée localement.

---

## @deck/web

La logique est identique côté web :
- `DeckView` web calcule `baseLayouts`, les synchronise via `setPositions`, puis génère la scène et applique les animations (Framer Motion).
- Le hook `useDeck` est appelé avec `manageLayoutExternally: true` pour rester cohérent avec RN.

---

## Guidelines pour les évolutions

1. **Toute nouvelle animation doit être déclenchée depuis la vue**, jamais dans `@deck/core`.
2. **Toujours synchroniser `deck.positions` via `setPositions`** avant d’animer quoi que ce soit : cela aligne l’état métier avec ce qui est affiché.
3. **Ne pas reposer sur les anciennes optimisations Baked Scale** : la scène (`DeckScene`) est la nouvelle référence (positions scalées + transform).
4. **Conserver le split dimensions “layout” vs “render”** : `layoutWidth/Height` servent aux calculs, `renderWidth/Height` au centrage final.

Avec cette architecture, React Native et Web partagent la même logique tout en gardant la flexibilité nécessaire pour gérer les transitions et animations de manière fiable.***
