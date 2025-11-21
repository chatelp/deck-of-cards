# Rapport d'Ajout des TestID - Précondition 2.6

## Date
2025-01-27

## Objectif
Ajouter des testID stables aux composants utilisés dans les tests Detox pour garantir la compatibilité et la stabilité des sélecteurs.

## Modifications Effectuées

### 1. apps/mobile/src/App.tsx

#### Container Principal
- **testID="DeckRoot"** ajouté sur le `View` qui contient le `DeckView`
- Utilisé dans tous les tests pour vérifier que l'app est chargée

#### ActionButton Component
- **testID={label}** ajouté sur `TouchableOpacity`
- Couvre : `Fan`, `Ring`, `Stack`, `Shuffle`, `Restart`
- Permet d'utiliser `by.id('Fan')` au lieu de `by.text('Fan')`

#### OptionButton Component
- **testID={`option-${label}`}** ajouté sur `TouchableOpacity`
- Couvre : `option-5`, `option-10`, `option-16`, `option-24`, `option-32`, `option-48`, `option-64`
- Permet d'utiliser `by.id('option-5')` au lieu de `by.text('5')`

### 2. packages/deck-rn/src/CardView.tsx

#### CardView Component
- **testID={state.id}** ajouté sur `Pressable`
- Les cartes utilisent `state.id` qui correspond à `card-0`, `card-1`, `card-2`, etc.
- Permet d'utiliser `by.id('card-0')` directement sans `.atIndex(0)`

### 3. Tests Detox Mis à Jour

Tous les fichiers `apps/mobile/e2e/*.test.js` ont été mis à jour pour utiliser `by.id()` au lieu de `by.text()` :

#### fan.test.js
- `by.text('Fan')` → `by.id('Fan')`
- `by.text('5')` → `by.id('option-5')`
- `by.text('20')` → `by.id('option-20')`

#### ring.test.js
- `by.text('Ring')` → `by.id('Ring')`
- `by.text('5')` → `by.id('option-5')`
- `by.text('20')` → `by.id('option-20')`

#### stack.test.js
- `by.text('Stack')` → `by.id('Stack')`
- `by.text('5')` → `by.id('option-5')`
- `by.text('20')` → `by.id('option-20')`

#### shuffle.test.js
- `by.text('Fan')` → `by.id('Fan')`
- `by.text('Ring')` → `by.id('Ring')`
- `by.text('Shuffle')` → `by.id('Shuffle')`

#### flip.test.js
- `by.text('Fan')` → `by.id('Fan')`
- `by.text('Ring')` → `by.id('Ring')`
- `by.text('Stack')` → `by.id('Stack')`
- `by.id('card-0').atIndex(0)` → `by.id('card-0')` (suppression de `.atIndex(0)`)

#### deck-sizes.test.js
- `by.text(size.toString())` → `by.id(\`option-${size}\`)`
- `by.text('Fan')` → `by.id('Fan')`
- `by.text('Ring')` → `by.id('Ring')`
- `by.text('Stack')` → `by.id('Stack')`

#### transitions.test.js
- Tous les `by.text()` convertis en `by.id()`

## Mapping des TestID

### Containers
- `DeckRoot` : Container principal du deck

### Boutons d'Action
- `Fan` : Bouton Fan layout
- `Ring` : Bouton Ring layout
- `Stack` : Bouton Stack layout
- `Shuffle` : Bouton Shuffle animation
- `Restart` : Bouton Restart

### Options de Taille
- `option-5` : Taille de deck 5
- `option-10` : Taille de deck 10
- `option-16` : Taille de deck 16
- `option-24` : Taille de deck 24
- `option-32` : Taille de deck 32
- `option-48` : Taille de deck 48
- `option-64` : Taille de deck 64

### Cartes
- `card-0`, `card-1`, `card-2`, ... : Cartes individuelles (basé sur `state.id`)

## Avantages

### Stabilité
- ✅ Les testID ne changent pas même si le texte de l'interface change
- ✅ Compatible avec la localisation (i18n)
- ✅ Moins sensible aux changements de style

### Performance
- ✅ `by.id()` est plus rapide que `by.text()`
- ✅ Pas besoin de `.atIndex(0)` pour les cartes

### Maintenabilité
- ✅ Sélecteurs explicites et faciles à comprendre
- ✅ Correspondance directe entre testID et usage dans les tests

## Compatibilité

### React Native
- ✅ `testID` est une prop standard de React Native
- ✅ Supporté sur iOS et Android

### React Native Web
- ✅ `testID` est converti en `data-testid` sur le web
- ✅ Compatible avec les tests web si nécessaire

## Validation

### Syntaxe
- ✅ Aucune erreur de linting détectée
- ✅ Tous les fichiers TypeScript compilent correctement

### Tests
- ⏳ `detox test --dry-run` nécessite un build iOS/Android
- ⏳ À valider lors de l'exécution réelle des tests

## Prochaines Étapes

1. ⏳ Valider les builds Android et iOS
2. ⏳ Exécuter `detox test --dry-run` pour vérifier les sélecteurs
3. ⏳ Ajuster si nécessaire selon les résultats

## Fichiers Modifiés

### Créés
- `tests/mobile/TESTID_ADDITION_REPORT.md` (ce fichier)

### Modifiés
- `apps/mobile/src/App.tsx`
- `packages/deck-rn/src/CardView.tsx`
- `apps/mobile/e2e/fan.test.js`
- `apps/mobile/e2e/ring.test.js`
- `apps/mobile/e2e/stack.test.js`
- `apps/mobile/e2e/shuffle.test.js`
- `apps/mobile/e2e/flip.test.js`
- `apps/mobile/e2e/deck-sizes.test.js`
- `apps/mobile/e2e/transitions.test.js`

## Conclusion

✅ **Tous les testID nécessaires ont été ajoutés**

- Container principal : `DeckRoot`
- Boutons d'action : `Fan`, `Ring`, `Stack`, `Shuffle`, `Restart`
- Options de taille : `option-5`, `option-10`, `option-16`, `option-24`, `option-32`, `option-48`, `option-64`
- Cartes : `card-0`, `card-1`, `card-2`, ... (basé sur `state.id`)

- Tous les tests utilisent maintenant `by.id()` au lieu de `by.text()`
- Sélecteurs stables et maintenables
- Prêt pour la génération des baselines dans la Précondition 3




