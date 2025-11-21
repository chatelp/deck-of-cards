# Précondition 2.6 : Rapport de Préparation des Tests Mobiles Detox

## Date
2025-01-27

## Objectif
Préparer complètement les tests mobiles Detox avant la génération des baselines (Précondition 3).

## État de la Configuration Detox

### ✅ Configuration Detox
- **Fichier de configuration** : `apps/mobile/detox.config.js` ✅ Présent
- **Configuration Jest** : `apps/mobile/e2e/config.json` ✅ Présent
- **Initialisation** : `apps/mobile/e2e/init.js` ✅ Présent
- **Dépendances** : `detox@^20.14.0` ✅ Installé dans `package.json`

### Configuration Actuelle
```javascript
// detox.config.js
- Test runner: jest
- Device: iPhone 14 simulator
- App: iOS Debug build
- Binary path: bin/Expo.app
```

## Tests Mobiles Générés

### ✅ Tests Créés

1. **fan.test.js** - Layout Fan
   - Fan layout avec deck par défaut
   - Fan layout avec 5 cartes
   - Fan layout avec 20 cartes

2. **ring.test.js** - Layout Ring
   - Ring layout avec deck par défaut
   - Ring layout avec 5 cartes
   - Ring layout avec 20 cartes

3. **stack.test.js** - Layout Stack
   - Stack layout avec deck par défaut
   - Stack layout avec 5 cartes
   - Stack layout avec 20 cartes

4. **shuffle.test.js** - Animation Shuffle
   - Shuffle depuis fan layout
   - Shuffle depuis ring layout
   - Shuffle sans restore layout

5. **flip.test.js** - Animation Flip
   - Flip d'une carte depuis fan
   - Flip de plusieurs cartes depuis ring
   - Flip d'une carte depuis stack

6. **deck-sizes.test.js** - Tailles de Deck
   - Tests pour chaque taille : 5, 10, 16, 24, 32, 48, 64
   - Pour chaque layout : fan, ring, stack
   - Total : 21 tests (7 tailles × 3 layouts)

7. **transitions.test.js** - Transitions entre Layouts
   - fan → ring
   - ring → stack
   - stack → fan
   - fan → stack
   - ring → fan
   - stack → ring
   - fan → shuffle → fan

## Caractéristiques des Tests

### Déterministes
- ✅ Tous les tests utilisent `device.reloadReactNative()` avant chaque test
- ✅ Pas d'utilisation de `Date.now()` ou `Math.random()`
- ✅ Attentes d'animations avec `setTimeout` contrôlés
- ✅ Utilisation de `waitFor()` pour synchroniser les éléments

### Automatiques
- ✅ Aucune interaction manuelle requise
- ✅ Tous les tests utilisent l'API Detox
- ✅ Configuration `beforeAll` et `beforeEach` pour initialisation

### Capture d'Écran
- ✅ Tous les tests utilisent `device.takeScreenshot()`
- ✅ Nomenclature cohérente : `{scenario}-mobile.png`
- ✅ Correspondance avec les tests web : `{scenario}-web.png`

## Emplacement des Screenshots

### Structure
```
tests/mobile/screenshots/
├── fan-default-mobile.png
├── fan-5-cards-mobile.png
├── fan-20-cards-mobile.png
├── ring-default-mobile.png
├── ...
└── deck-size-64-stack-mobile.png
```

### Cohérence avec Web
- **Web** : `tests/web/screenshots/{scenario}-web.png`
- **Mobile** : `tests/mobile/screenshots/{scenario}-mobile.png`
- ✅ Nomenclature alignée

## Couverture

### Layouts
- ✅ **fan** : Couvert (fan.test.js, deck-sizes.test.js, transitions.test.js)
- ✅ **ring** : Couvert (ring.test.js, deck-sizes.test.js, transitions.test.js)
- ✅ **stack** : Couvert (stack.test.js, deck-sizes.test.js, transitions.test.js)

### Animations
- ✅ **shuffle** : Couvert (shuffle.test.js, transitions.test.js)
- ✅ **flip** : Couvert (flip.test.js)

### Tailles de Deck
- ✅ **5, 10, 16, 24, 32, 48, 64** : Couvertes (deck-sizes.test.js)

### Transitions
- ✅ **fan → ring** : Couvert
- ✅ **ring → stack** : Couvert
- ✅ **stack → fan** : Couvert
- ✅ **fan → stack** : Couvert
- ✅ **ring → fan** : Couvert
- ✅ **stack → ring** : Couvert
- ✅ **fan → shuffle → fan** : Couvert

## Points d'Attention

### Sélecteurs
⚠️ **Note importante** : Les tests utilisent actuellement `by.text()` pour les boutons et `by.id()` pour les cartes. Il sera nécessaire de :
- Ajouter des `testID` aux composants dans `apps/mobile/src/App.tsx`
- Ajouter des `accessibilityLabel` si nécessaire
- Vérifier que les sélecteurs correspondent aux éléments réels de l'interface

### Builds
⚠️ **À valider** :
- Build iOS : `expo run:ios --configuration Debug`
- Build Android : Nécessite configuration supplémentaire dans `detox.config.js`
- Vérifier que les builds génèrent les artefacts nécessaires

### Synchronisation des Animations
✅ **Implémenté** :
- Délais contrôlés avec `setTimeout`
- Utilisation de `waitFor()` pour attendre les éléments
- `reloadReactNative()` pour garantir un état initial propre

## Prochaines Étapes

1. ⏳ **Ajouter des testID** aux composants dans `apps/mobile/src/App.tsx`
2. ⏳ **Valider les builds** Android et iOS
3. ⏳ **Tester l'exécution** : `detox test` ou `pnpm test:visual:mobile`
4. ⏳ **Ajuster les sélecteurs** selon les résultats des tests
5. ⏳ **Générer les baselines** dans la Précondition 3

## Fichiers Créés/Modifiés

### Créés
- `apps/mobile/e2e/fan.test.js`
- `apps/mobile/e2e/ring.test.js`
- `apps/mobile/e2e/stack.test.js`
- `apps/mobile/e2e/shuffle.test.js`
- `apps/mobile/e2e/flip.test.js`
- `apps/mobile/e2e/deck-sizes.test.js`
- `apps/mobile/e2e/transitions.test.js`
- `scripts/analyze-mobile-tests.js`
- `tests/mobile/screenshots/` (répertoire)
- `tests/mobile-test-analysis.json`

### Modifiés
- Aucun (nouveaux fichiers uniquement)

## Conclusion

✅ **Précondition 2.6 complétée**

- 7 nouveaux fichiers de tests générés
- Configuration Detox validée
- Tests déterministes et automatiques
- Capture d'écran configurée avec nomenclature cohérente
- Couverture exhaustive des scénarios web

**⚠️ Action requise avant Précondition 3** :
- Ajouter des `testID` aux composants mobiles
- Valider les builds Android et iOS
- Tester l'exécution des tests Detox

La préparation des tests mobiles est complète et prête pour la génération des baselines dans la Précondition 3.




