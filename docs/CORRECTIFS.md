# ✅ Correctifs 2025 – Stabilisation du Deck RN

## Résumé exécutif
- **Problèmes traités** : flicker lors des rotations, tailles de cartes instables, débordements.
- **Approche** : une seule source de vérité visuelle (DeckView), scènes déterministes, animations contrôlées.
- **Packages impactés** : `@deck/core` (`useDeck`), `@deck/rn` (`DeckView`, `DeckPositioning`).

---

## 1. Découplage métier / présentation

| Avant | Maintenant |
|-------|------------|
| `useDeck` recalculait les layouts (`fan()`, `ring()`) et lançait les animations | `useDeck` expose une option `manageLayoutExternally`. Quand elle est vraie (cas RN/Web), le hook gère uniquement l’état métier — aucune animation ni layout implicite. |

### Points clefs
- `useDeck(cards, driver, config, { manageLayoutExternally: true })`
- Les actions (`fan`, `ring`, `shuffle`, …) continuent d’exister pour les interactions, mais la vue décide du moment et de la façon dont elles animent.
- Les séquences en cours sont annulées automatiquement lorsqu’on désactive les animations (`driver.cancel?.()`).

---

## 2. Calcul de scène déterministe

`DeckView` calcule désormais **une scène complète** à partir des positions brutes et des dimensions engagées :

1. Mesure stable → `committedLayoutSize` / `committedRenderSize`.
2. Calcul des positions brutes via les utilitaires `@deck/core` (`computeFanLayout`, `computeRingLayout`, etc.).
3. Synchronisation avec le cœur : `setPositions(baseLayouts)` – il n’existe qu’un seul jeu de positions.
4. Génération d’un `DeckScene` :
   ```ts
   const scene = computeDeckScene(deck, baseLayouts, layoutSize, renderSize);
   ```
5. Le rendu (`CardView`) consomme directement `scene.scaledPositions`, `scene.deckTransform`, `scene.scaledCardDimensions`.

**Impact** : plus de variations 0.781 → 1.000 → 0.796, plus de flicker après rotations, et un logging cohérent (`layout.size`, `deck.scale`, `centering`).

---

## 3. Gestion des rotations

- **Pendant** `isTransitioning = true`
  - `animationsEnabled = false`
  - `driver.cancel?.()` : aucune animation résiduelle.
  - Les nouveaux layouts sont appliqués instantanément (snap).

- **À la fin** de la transition (`transitionId` change)
  - On recalcule le layout final **sans animation** (nouvel appel `setPositions(baseLayouts)`).
  - On réactive ensuite `animationsEnabled = true` pour les interactions futures.

Cette séquence garantit une seule scène publiée par orientation.

---

## 4. Diagnostics & logs

Les logs condensés `[DeckView] 📊 LOG CONDENSÉ` reflètent la scène déterministe :
- `layout.size` : dimensions engagées (doit rester constante par orientation).
- `container.size` : dimensions de rendu.
- `deck.scale` : unique pour chaque orientation.
- `centering.centered` : doit être `true`.

En cas d’anomalie, vérifier :
1. Que `manageLayoutExternally` est bien activé.
2. Que `setPositions(baseLayouts)` est appelé (et que la signature change).
3. Que `computeDeckScene` reçoit les bonnes dimensions engagées.

---

## 5. Checklist post-intégration

- [ ] `@deck/core` typecheck (`pnpm --filter @deck/core typecheck`)
- [ ] `@deck/rn` typecheck (`pnpm --filter @deck/rn typecheck`)
- [ ] Tests manuels : rotations multiples, autoFan, shuffle → aucune variation de scale inattendue.
- [ ] Logs de debug activés (`debugLogs`) → vérifier une seule scène par orientation.

Ces correctifs unifient la logique visuelle et assurent un rendu stable, prévisible et facile à maintenir.***
