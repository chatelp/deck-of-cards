# Résumé des Problèmes - Deck Positioning

## 🔴 Problème 1 : Non-déterminisme des Bounds

### Symptômes
- Les `unscaledBounds` oscillent entre différentes valeurs pour le **même `stabilityToken`**
- Exemple observé : bounds passent de `488.9x321.4` à `742.9x454.5` puis reviennent à `488.9x321.4`
- Les logs montrent des `logStateKey` identiques mais des bounds différentes

### Impact
- Le `fitScale` est recalculé avec des bounds incorrectes
- Le rendu devient instable et imprévisible
- Les cartes changent de taille/position même sans rotation d'écran

### Cause probable
- Les positions ne sont pas correctement verrouillées malgré le `stabilityToken`
- `deck.positions` change encore après le verrouillage
- Le verrouillage se fait peut-être trop tôt (avant que toutes les positions soient calculées)
- Le `stabilityToken` pourrait changer même si les dimensions réelles sont identiques (arrondi)

---

## 🔴 Problème 2 : OVERFLOW en Mode Horizontal

### Symptômes
- En mode paysage (landscape), les cartes **sortent de l'écran**
- Erreurs répétées : `❌ OVERFLOW! {"bounds": {"h": "454", "w": "743"}, "container": {"h": "362", "w": "766"}}`
- Le `fitScale` reste à `1.0` alors qu'il devrait être réduit pour tenir dans le container

### Impact
- Les cartes sont coupées ou invisibles
- Expérience utilisateur dégradée

### Cause probable
- Le `fitScale` est calculé à partir de `unscaledBounds` qui sont incorrectes (voir Problème 1)
- Les `scaledBounds` utilisent des positions qui changent encore
- Le calcul du scale ne prend pas en compte correctement les rotations des cartes

---

## 🔴 Problème 3 : Flickering lors des Rotations

### Symptômes
- Les cartes **clignotent** lors des rotations d'écran
- Le problème survient de manière **intermittente** : parfois stable, parfois non
- Après plusieurs rotations, le problème réapparaît systématiquement

### Impact
- Expérience visuelle dégradée
- Le deck semble "cassé" ou instable

### Cause probable
- Les `scaledPositions` et `deckTransform` changent pendant la transition
- Le verrouillage dans `DeckView` ne fonctionne pas correctement
- Les positions sont recalculées plusieurs fois pendant la transition

---

## 🔴 Problème 4 : Avalanche de Logs

### Symptômes
- Les logs sont produits **en continu**, même lors du premier affichage
- Même `logStateKey` loggé plusieurs fois
- Logs répétés avec les mêmes valeurs

### Impact
- Performance dégradée
- Difficile de déboguer les vrais problèmes

### Cause probable
- Le mécanisme de déduplication des logs ne fonctionne pas correctement
- Les rendus se répètent en boucle sans stabilisation

---

## 🔴 Problème 5 : Décalage Vertical

### Symptômes
- Warnings : `⚠️ DECALAGE DETECTE! {"direction": "gauche", "offsetX": "0.0", "offsetY": "-14.1"}`
- Le deck n'est pas parfaitement centré verticalement

### Impact
- Mineur mais signe que le centrage n'est pas optimal

---

## 🔍 Analyse Technique

### Architecture Actuelle

1. **OrientationManager** : Gère les dimensions stables et les transitions
   - ✅ Fonctionne correctement pour stabiliser les dimensions
   - ⚠️ Mais les dimensions peuvent changer légèrement pendant la transition

2. **DeckPositioning** : Calcule le scale et les positions scalées
   - ❌ Le verrouillage des positions ne fonctionne pas correctement
   - ❌ Les `unscaledBounds` changent encore après verrouillage
   - ❌ Le `fitScale` n'est pas recalculé correctement quand les bounds changent

3. **DeckView** : Utilise les positions scalées pour le rendu
   - ⚠️ Le verrouillage des `scaledPositions` pourrait être contourné
   - ⚠️ Les positions peuvent changer même avec le même `stabilityToken`

### Points Critiques

1. **Le `stabilityToken` inclut maintenant les dimensions** (`containerWidth x containerHeight`)
   - ✅ Bonne amélioration
   - ⚠️ Mais si les dimensions changent légèrement (arrondi), le token change
   - ⚠️ Cela pourrait déclencher un nouveau verrouillage trop souvent

2. **Le verrouillage des positions dépend de `hasValidPositions`**
   - ⚠️ Vérifie si toutes les cartes ont des positions
   - ⚠️ Mais ne vérifie pas si les positions sont **stables** (ne changent plus)
   - ⚠️ Le hash `positionsHash` n'est pas utilisé pour vérifier la stabilité

3. **Les `scaledPositions` utilisent maintenant `stablePositions`**
   - ✅ Bonne amélioration
   - ⚠️ Mais si `stablePositions` change encore, le problème persiste

---

## 🎯 Solutions Proposées

### Solution 1 : Vérifier la Stabilité du Hash Avant Verrouillage
- Ne verrouiller les positions que si le `positionsHash` est **identique sur 2 rendus consécutifs**
- Cela garantit que les positions ne changent plus avant de les verrouiller

### Solution 2 : Normaliser les Dimensions dans le Token
- Arrondir les dimensions à des valeurs plus grossières (ex: multiples de 10)
- Évite les changements de token dus aux petites variations

### Solution 3 : Forcer le Recalcul du Scale si Overflow
- Si les `scaledBounds` dépassent le container, **forcer un recalcul du scale**
- Ne pas accepter un scale qui cause un overflow

### Solution 4 : Stabiliser les Dimensions Avant de Calculer les Positions
- Utiliser uniquement `stableDimensions` de `OrientationManager` pour le calcul
- Ne pas utiliser `pendingDimensions` pour éviter les calculs intermédiaires

### Solution 5 : Améliorer le Système de Logs
- Ajouter un mécanisme de throttling plus strict
- Ne logger que lors des changements réels de state

---

## 📊 État Actuel du Code

### Ce qui fonctionne ✅
- `OrientationManager` stabilise correctement les dimensions
- Le `stabilityToken` inclut maintenant les dimensions
- Les `scaledPositions` utilisent `stablePositions`

### Ce qui ne fonctionne pas ❌
- Les positions ne sont pas vraiment verrouillées (elles changent encore)
- Les bounds oscillent pour le même token
- Le scale cause des overflows
- Les logs sont trop nombreux

### Ce qui est incertain ⚠️
- Si le problème vient du timing (verrouillage trop tôt/tard)
- Si le problème vient du core qui recalcule les positions
- Si le problème vient de la logique de verrouillage elle-même

---

## ✅ Correctifs appliqués (simplification + déterminisme)

Objectif: supprimer la complexité inutile, rendre le dimensionnement/centrage déterministe et éviter tout flicker/overflow.

1) Simplification de DeckPositioning (pipeline déterministe)
- Fichier: `packages/deck-rn/src/DeckPositioning.tsx`
- Nouveau flux simple et stable:
  - Calcule des `unscaledBounds` directement depuis `deck.positions` et les dimensions de carte constantes (`CARD_WIDTH/HEIGHT`).
  - Calcul d’un `fitScale` unique: `min(effectiveInnerWidth/width, effectiveInnerHeight/height, 1)`, borné à `>= 0.1` et arrondi (4 décimales).
  - Application du scale aux positions (arrondi 3 décimales) pour produire `scaledPositions`.
  - Recalcule des `scaledBounds` et centrage unique via translation: `translate = containerCenter - scaledBounds.center`.
  - Suppression de tout “locking”/hash/token côté RN: plus de mémoires intermédiaires susceptibles d’osciller.

2) Séparation claire des tailles « layout » vs « render » côté DeckView
- Fichier: `packages/deck-rn/src/DeckView.tsx`
- `OrientationManager` fournit des dimensions stables; on conserve une taille « layoutContainerSize » qui ne change qu’une fois la transition terminée.
- `useDeckPositioning` reçoit deux couples de dimensions:
  - `layoutWidth/Height` (pour calculer le scale et les bounds)
  - `renderWidth/Height` (pour calculer le point d’ancrage exact du centrage visuel)
- Résultat: les positions/échelle ne “glissent” plus pendant la transition; l’UI n’oscille plus.

3) Nettoyage des logs et diagnostics
- Condensation des logs (moins de bruit) et ajout des tailles `layout` et `container` pour comprendre d’éventuels deltas.
- Warning « OVERFLOW » conservé mais ne se déclenche que si `scaledBounds` dépasse réellement le `effectiveInner`.
- Warning « DECALAGE DETECTE » seulement si l’écart centre-deck/centre-container > 0.5px.

4) Suppressions de la logique de verrouillage fragile dans DeckView
- Suppression des refs de verrouillage de `scaledPositions` et `deckTransform` dépendantes d’un `stabilityToken`.
- On s’appuie uniquement sur les dimensions stables de `OrientationManager` + pipeline de `DeckPositioning`.

---

## 🔎 Effets attendus après correctifs

- Plus de flicker intermittent lors des rotations: la taille de layout est « engagée » une fois la rotation stabilisée.
- Pas d’overflow en paysage: le `fitScale` est toujours borné pour faire tenir le deck dans le `effectiveInner`.
- Centrage constant: calcul par `scaledBounds.center` vs centre du container de rendu.
- Taille visuelle cohérente pour une même orientation, même après plusieurs rotations.

---

## 🧪 Procédure de test

- Activer `debugLogs` dans `DeckView`.
- Faire plusieurs rotations paysage/portrait et vérifier dans le log condensé que:
  - `layout.size` est stable pour une orientation donnée.
  - `deck.scale` reste identique pour la même orientation.
  - `centering.centered` est `true` (offsets ≈ 0.0).
- Vérifier visuellement qu’aucune carte ne dépasse des bords en paysage.

---

## 🔜 Pistes ultérieures (si besoin)

- Si un device particulier remonte encore des oscillations, on pourra arrondir davantage `layoutContainerSize` (ex: pas de 2–4 px) côté DeckView.
- Ajouter un overlay de debug (déjà documenté dans `docs/DEBUGGING.md`) pour visualiser les bounds et le centre.

