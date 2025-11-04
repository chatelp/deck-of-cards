# 🔍 Guide Debug – DeckView RN (scène déterministe)

## 1. Activer les logs
```tsx
<DeckView
  cards={cards}
  debugLogs={__DEV__}
/>
```
Les logs condensés `[DeckView] 📊 LOG CONDENSÉ` suffisent dans 90 % des cas.

---

## 2. Comprendre le pipeline
1. `OrientationManager` → dimensions engagées (`committedLayoutSize`, `committedRenderSize`).
2. `DeckView` → calcule `baseLayouts` (`computeFanLayout`, `computeRingLayout`, …) puis `setPositions(baseLayouts)`.
3. `computeDeckScene` → renvoie `fitScale`, `scaledPositions`, `scaledBounds`, `deckTransform`.
4. Rendu → `CardView` consomme la scène.

Lorsque `isTransitioning === true`, les animations sont désactivées : `driver.cancel?.()` et `useDeck` ne joue aucune séquence.

---

## 3. Logs à inspecter

### `[DeckView] layoutParams`
Vérifier :
- `fanRadius` / `ringRadius` cohérents avec le conteneur.
- `spacing` adapté au nombre de cartes.

### `[DeckView] 📊 LOG CONDENSÉ - Deck affiché`
Clés importantes :
- `layout.size` : dimensions engagées (une valeur par orientation).
- `container.size` : dimensions de rendu (devrait correspondre au conteneur React Native).
- `deck.scale` : unique pour une orientation donnée.
- `centering.centered` : `true`.

Si vous voyez plusieurs logs avec la même `layout.size` mais des `deck.scale` différents (ex. 0.781 → 1.000), cela signifie que des positions ont été recalculées après coup. Vérifier que `setPositions(baseLayouts)` est bien appelé une seule fois (cf. §4).

---

## 4. Vérifications rapides

### a. Signature des layouts
```ts
const baseLayoutsSignature = deck.cards
  .map(card => baseLayouts[card.id])
  .filter(Boolean)
  .map(pos => `${card.id}:${pos.x.toFixed(2)}:${pos.y.toFixed(2)}`)
  .join('|');
```
Loguer la signature avant chaque `setPositions(baseLayouts)` :
```ts
console.log('[DeckView] baseLayouts signature', baseLayoutsSignature);
```
La signature doit changer uniquement quand la configuration (orientation, layout mode, nombre de cartes) change réellement.

### b. Contrôle `useDeck`
Assurez-vous d’appeler :
```ts
useDeck(cards, driver, config, {
  manageLayoutExternally: true,
  animationsEnabled: !isTransitioning
});
```
Si `manageLayoutExternally` est oublié, le cœur rejouera ses propres séquences (flicker garanti).

### c. Transitions
À l’entrée en rotation (`isTransitioning` passe à `true`) :
- logs attendus : arrêt des animations (`driver.cancel?.()`).
À la sortie (`isTransitioning` passe à `false`) :
- première scène publiée ≠ même scale qu’avant (ex. passage de 0.781 → 1.000).
- plus aucun log tant qu’il n’y a pas d’autre interaction.

---

## 5. Symptômes & causes probables

| Symptôme | Vérifications | Correctif |
|---------|---------------|-----------|
| `deck.scale` oscille (0.781, 1.000, 0.796…) pour la même orientation | `baseLayoutsSignature` rejouée ? `manageLayoutExternally` absent ? | S’assurer que `setPositions` n’est appelé qu’une fois, `manageLayoutExternally: true`, animations coupées pendant la rotation. |
| Cartes décalées après rotation | `committedLayoutSize` correspond-il au container stabilisé ? | Vérifier `OrientationManager` et que `measure`/`commit` ne repassent pas en transition trop tôt. |
| Cartes qui débordent | Inspecter `fitScale` et `scaledBounds` dans le log condensé | Ajuster les paramètres fournis aux fonctions de layout (fan radius, spacing…). |

---

## 6. Commandes utiles

- Voir l’état du deck :
  ```ts
  console.log('[DeckView] deck', {
    mode: deck.layoutMode,
    cards: deck.cards.length,
    positions: Object.keys(deck.positions).length
  });
  ```
- Visualiser les bounds :
  ```tsx
  {__DEV__ && debugLogs && (
    <DebugBoundsOverlay scene={deckScene} />
  )}
  ```

---

En suivant ces étapes, on diagnostique rapidement toute divergence entre l’état métier (`deck.positions`) et la scène affichée. Le principe directeur reste : **une seule scène publiée par orientation, calculée localement par DeckView**.***
