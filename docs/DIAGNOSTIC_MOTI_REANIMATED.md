# 🔍 Diagnostic Exhaustif - Intégration Moti + React Native Reanimated

**Date** : 2025-01-27  
**Objectif** : Préparer l'intégration d'un moteur d'animation cross-platform basé sur Moti + React Native Reanimated pour l'app DAOa (web + mobile)

---

## 1. Structure du Projet

### 1.1 Architecture Monorepo

Le projet **deck-of-cards** est un **monorepo TypeScript** organisé comme suit :

```
deck-of-cards/
├── packages/
│   ├── @deck/core/          # Logique métier agnostique plateforme
│   ├── @deck/web/           # Implémentation Web (Framer Motion)
│   └── @deck/rn/            # Implémentation React Native (Reanimated)
├── apps/
│   ├── mobile/              # App React Native (Expo ~54.0.13)
│   └── web/                 # App Web (Next.js 14.2.5)
└── legacy/                  # Code legacy (non utilisé)
```

### 1.2 Workspaces & Monorepo

- **Gestionnaire** : `pnpm` (v9.6.0)
- **Configuration** : `pnpm-workspace.yaml` avec workspaces `packages/*` et `apps/*`
- **Build System** : Turbo (v2.1.0) pour orchestrer les builds parallèles
- **TypeScript** : Configuration partagée via `tsconfig.base.json`

### 1.3 Packages Shared vs Platform-Specific

| Package | Type | Dépendances Plateforme |
|---------|------|------------------------|
| `@deck/core` | Shared | Aucune (agnostique) |
| `@deck/web` | Web | `react-native-web`, `framer-motion` |
| `@deck/rn` | Mobile | `react-native-reanimated` |

---

## 2. Gestionnaire de Packages

### 2.1 pnpm

- **Version** : `pnpm@9.6.0` (définie dans `packageManager`)
- **Lock file** : `pnpm-lock.yaml` présent
- **Workspaces** : Configurés correctement

### 2.2 Scripts Principaux

```json
{
  "dev": "turbo run dev --parallel",
  "dev:web": "pnpm -r --parallel --filter @deck/core --filter @deck/web --filter deck-web-app --filter !deck-mobile dev",
  "dev:mobile": "pnpm -r --parallel --filter @deck/core --filter @deck/rn --filter deck-mobile --filter !deck-web-app dev",
  "build": "turbo run build"
}
```

---

## 3. Dépendances Principales

### 3.1 Versions React

| App | React | React-DOM | React Native |
|-----|-------|-----------|--------------|
| **Web** (`apps/web`) | `18.2.0` | `18.2.0` | N/A |
| **Mobile** (`apps/mobile`) | `19.1.0` | `19.1.0` | `0.81.4` |

⚠️ **INCOMPATIBILITÉ MAJEURE** : Versions React divergentes (18.2.0 vs 19.1.0)

### 3.2 react-native-web

- **Présent** : ✅ Oui (`apps/web/package.json`)
- **Version** : `0.19.10`
- **Configuration** : Alias dans `next.config.js` :
  ```js
  config.resolve.alias = {
    'react-native$': 'react-native-web'
  }
  ```
- **Usage** : Utilisé dans `@deck/web` (peerDependency)

### 3.3 react-native-reanimated

- **Présent** : ✅ Oui (`apps/mobile`)
- **Version** : `~4.1.1` (installé: `4.1.3`)
- **Plugin Babel** : ✅ Configuré dans `apps/mobile/babel.config.js`
  ```js
  plugins: ['react-native-reanimated/plugin']
  ```
- **Usage** : 
  - `@deck/rn` utilise `ReanimatedDriver` (implémente `AnimationDriver`)
  - `CardView.tsx` utilise `useAnimatedStyle`, `useSharedValue`, `withTiming`
  - **Peer dependency** : `^3.6.0 || ^4.1.0`

### 3.4 Babel vs SWC

| Plateforme | Transpiler | Config |
|------------|------------|--------|
| **Mobile** | Babel | `babel-preset-expo` + `react-native-reanimated/plugin` |
| **Web** | SWC (Next.js) | Pas de config Babel explicite |

⚠️ **IMPORTANT** : Le plugin Reanimated nécessite Babel. Pour le web avec Next.js/SWC, il faudra soit :
- Configurer Babel pour Next.js (override SWC)
- Utiliser `react-native-reanimated/web` (version web de Reanimated)

### 3.5 Bundlers

| App | Bundler | Config |
|-----|---------|--------|
| **Web** | Next.js (Webpack sous le capot) | `next.config.js` avec alias RN |
| **Mobile** | Metro (via Expo) | Config Expo standard |

---

## 4. Outils de Build et Scripts

### 4.1 Scripts Existants

#### Root (`package.json`)
- `dev` : Lance tous les packages en mode watch
- `dev:web` : Lance web + dépendances (exclut mobile)
- `dev:mobile` : Lance mobile + dépendances (exclut web)
- `build` : Build tous les packages

#### Web (`apps/web/package.json`)
- `dev` : `next dev`
- `build` : `next build` (avec prebuild pour `@deck/core` et `@deck/web`)
- `start` : `next start`

#### Mobile (`apps/mobile/package.json`)
- `dev` : `expo start`
- `android` : `expo run:android`
- `ios` : `expo run:ios`
- `web` : `expo start --web` (⚠️ Expo Web support)

### 4.2 Système d'Unification Actuel

**Architecture Driver Pattern** :

Le projet utilise déjà un système d'abstraction via `AnimationDriver` :

```typescript
// @deck/core
interface AnimationDriver {
  register(cardId, handle, initialFaceUp): void;
  unregister(cardId): void;
  play(sequence): Promise<void>;
  cancel(cardIds?): void;
}

// Implémentations :
// - ReanimatedDriver (@deck/rn)
// - WebMotionDriver (@deck/web)
```

**Avantages** :
- ✅ Séparation claire logique métier / rendu
- ✅ Support multi-plateforme déjà en place
- ✅ Interface unifiée

**Limitations actuelles** :
- ❌ Pas de support Reanimated sur web (utilise Framer Motion)
- ❌ Pas de Moti intégré

---

## 5. Incompatibilités Potentielles

### 5.1 Versions React Divergentes ⚠️ CRITIQUE

| App | React | Impact |
|-----|-------|--------|
| Web | 18.2.0 | |
| Mobile | 19.1.0 | |

**Problèmes** :
- Moti et Reanimated peuvent avoir des peer dependencies différentes
- Risque de conflits dans `node_modules` (pnpm hoisting)
- `@deck/core` accepte `^18.2.0 || ^19.1.0` mais les apps utilisent des versions différentes

**Solution recommandée** : Unifier vers React 19.1.0 (ou 18.2.0 si incompatibilité)

### 5.2 Conflits avec Reanimated sur Web

**État actuel** :
- Web utilise **Framer Motion** (`WebMotionDriver`)
- Mobile utilise **Reanimated** (`ReanimatedDriver`)
- Pas de Reanimated sur web actuellement

**Pour intégrer Reanimated sur web** :
- Nécessite `react-native-reanimated/web` (version web)
- Nécessite configuration Babel (ou override SWC dans Next.js)
- Nécessite plugin Babel `react-native-reanimated/plugin`

**Compatibilité** :
- ✅ `react-native-web` déjà présent
- ⚠️ Next.js utilise SWC par défaut (pas Babel)
- ⚠️ Plugin Reanimated nécessite Babel

### 5.3 Plugin react-native-reanimated

**État actuel** :
- ✅ Configuré dans `apps/mobile/babel.config.js`
- ❌ **Absent** pour le web

**Pour web** :
- Option 1 : Configurer Babel pour Next.js (désactiver SWC)
- Option 2 : Utiliser `react-native-reanimated/web` sans plugin (limitations)

### 5.4 Libs DOM-Only

**Vérifications** :

| Lib | Usage | Compatible RN Web ? |
|-----|-------|---------------------|
| `framer-motion` | `@deck/web` | ❌ Non (DOM-only) |
| `styled-jsx` | `apps/web` | ⚠️ Next.js spécifique |

**Impact** :
- `framer-motion` ne fonctionne pas avec `react-native-web`
- Si on veut utiliser Reanimated partout, il faudra remplacer Framer Motion

---

## 6. Recommandations Spécifiques

### 6.1 Intégration react-native-web

**État** : ✅ Déjà intégré

**Actions** :
- ✅ Alias configuré dans `next.config.js`
- ✅ Peer dependency dans `@deck/web`
- ✅ Version compatible (`0.19.10`)

**Aucune action requise** pour cette partie.

### 6.2 Intégration Moti

**Prérequis** :
- `moti` nécessite `react-native-reanimated`
- Compatible avec `react-native-web` (via Reanimated web)

**Actions recommandées** :

1. **Installer Moti** :
   ```bash
   pnpm add moti --filter deck-mobile
   pnpm add moti --filter deck-web-app
   ```

2. **Ajouter peer dependency** dans `@deck/rn` et `@deck/web` :
   ```json
   "peerDependencies": {
     "moti": "^0.28.0"
   }
   ```

3. **Créer un nouveau Driver** (optionnel) :
   - `MotiDriver` qui utilise Moti pour les animations
   - Ou intégrer Moti directement dans les composants

### 6.3 Intégration Reanimated Plugin (Web + Mobile)

#### Mobile (déjà configuré) ✅

**État** : Plugin déjà présent dans `apps/mobile/babel.config.js`

#### Web (à configurer) ⚠️

**Option A : Utiliser Babel avec Next.js**

1. Installer Babel :
   ```bash
   pnpm add -D @babel/core @babel/preset-env @babel/preset-react babel-plugin-react-native-web --filter deck-web-app
   ```

2. Créer `apps/web/.babelrc` :
   ```json
   {
     "presets": ["next/babel"],
     "plugins": [
       "react-native-reanimated/plugin"
     ]
   }
   ```

3. Modifier `next.config.js` pour utiliser Babel :
   ```js
   module.exports = {
     transpilePackages: ['@deck/web', '@deck/core'],
     webpack: (config) => {
       // ... config existante
     },
     // Désactiver SWC pour utiliser Babel
     swcMinify: false,
     experimental: {
       forceSwcTranspile: false
     }
   }
   ```

**Option B : Utiliser react-native-reanimated/web (sans plugin)**

- Utiliser `react-native-reanimated/web` directement
- Pas besoin de plugin Babel
- Limitations : certaines fonctionnalités peuvent ne pas fonctionner

**Recommandation** : Option A pour compatibilité maximale.

### 6.4 Alias Nécessaires

**État actuel** (`next.config.js`) :
```js
config.resolve.alias = {
  'react-native$': 'react-native-web'
}
```

**À ajouter** (si nécessaire) :
```js
config.resolve.alias = {
  'react-native$': 'react-native-web',
  'react-native-reanimated': 'react-native-reanimated/web' // Pour web
}
```

⚠️ **Note** : L'alias `react-native-reanimated` vers `/web` peut causer des problèmes si utilisé dans le même bundle que la version native. Mieux vaut utiliser des imports conditionnels.

### 6.5 Compatibilité avec l'Infra Actuelle

#### Architecture Driver Pattern

**Recommandation** : Créer un nouveau driver `MotiReanimatedDriver` qui :
- Utilise Moti pour les animations déclaratives
- Utilise Reanimated sous le capot (via Moti)
- Implémente l'interface `AnimationDriver` existante

**Avantages** :
- ✅ Compatible avec l'architecture actuelle
- ✅ Pas de breaking changes
- ✅ Réutilise le système existant

#### Migration Progressive

**Stratégie recommandée** :

1. **Phase 1** : Ajouter Moti + Reanimated web
   - Installer dépendances
   - Configurer Babel pour web
   - Tester sur web et mobile

2. **Phase 2** : Créer `MotiReanimatedDriver`
   - Implémenter le driver
   - Tester avec les animations existantes

3. **Phase 3** : Migration progressive
   - Remplacer `WebMotionDriver` par `MotiReanimatedDriver` sur web
   - Garder `ReanimatedDriver` sur mobile (ou migrer vers Moti)

---

## 7. Checklist d'Intégration

### 7.1 Prérequis

- [ ] Unifier les versions React (18.2.0 ou 19.1.0)
- [ ] Vérifier compatibilité Moti avec React 19
- [ ] Vérifier compatibilité Reanimated web avec Next.js 14

### 7.2 Installation

- [ ] Installer `moti` dans `apps/mobile` et `apps/web`
- [ ] Installer `react-native-reanimated` dans `apps/web` (si pas déjà présent)
- [ ] Installer dépendances Babel pour web (si Option A)

### 7.3 Configuration

- [ ] Configurer Babel pour Next.js (web)
- [ ] Ajouter plugin Reanimated dans Babel config web
- [ ] Configurer alias webpack si nécessaire
- [ ] Vérifier plugin Reanimated mobile (déjà fait)

### 7.4 Implémentation

- [ ] Créer `MotiReanimatedDriver` (ou intégrer Moti directement)
- [ ] Tester sur mobile
- [ ] Tester sur web
- [ ] Migrer progressivement les animations existantes

### 7.5 Tests

- [ ] Tests unitaires du nouveau driver
- [ ] Tests d'intégration web
- [ ] Tests d'intégration mobile
- [ ] Tests de performance

---

## 8. Risques Identifiés

### 8.1 Risque Élevé

1. **Incompatibilité React 18 vs 19**
   - Impact : Conflits de dépendances, bugs runtime
   - Mitigation : Unifier les versions avant intégration

2. **SWC vs Babel dans Next.js**
   - Impact : Plugin Reanimated peut ne pas fonctionner
   - Mitigation : Configurer Babel explicitement

### 8.2 Risque Moyen

1. **Framer Motion vs Reanimated sur web**
   - Impact : Deux systèmes d'animation différents
   - Mitigation : Migration progressive vers Reanimated

2. **Performance Reanimated sur web**
   - Impact : Performance peut être inférieure à Framer Motion
   - Mitigation : Benchmarks avant migration complète

### 8.3 Risque Faible

1. **Compatibilité Moti avec architecture existante**
   - Impact : Refactoring nécessaire
   - Mitigation : Utiliser le pattern Driver existant

---

## 9. Synthèse pour Plan Cursor

### 9.1 Points Clés

1. ✅ **Monorepo pnpm** bien structuré avec Turbo
2. ✅ **react-native-web** déjà intégré
3. ✅ **react-native-reanimated** présent sur mobile avec plugin Babel
4. ⚠️ **Versions React divergentes** (18.2.0 vs 19.1.0) - À unifier
5. ⚠️ **Pas de Reanimated sur web** - Nécessite configuration Babel
6. ✅ **Architecture Driver** permet intégration propre de Moti

### 9.2 Plan d'Action Recommandé

1. **Unifier React** vers 19.1.0 (ou 18.2.0 si incompatibilité Moti)
2. **Configurer Babel pour Next.js** avec plugin Reanimated
3. **Installer Moti** dans apps mobile et web
4. **Créer MotiReanimatedDriver** qui implémente `AnimationDriver`
5. **Tester et migrer progressivement**

### 9.3 Fichiers à Modifier

- `apps/web/next.config.js` - Ajouter config Babel
- `apps/web/.babelrc` - Nouveau fichier avec plugin Reanimated
- `apps/web/package.json` - Ajouter Moti + Reanimated
- `apps/mobile/package.json` - Ajouter Moti
- `packages/deck-web/package.json` - Ajouter peer dependencies
- `packages/deck-rn/package.json` - Ajouter peer dependencies
- Nouveau : `packages/deck-web/src/drivers/MotiReanimatedDriver.ts` (ou similaire)

---

## 10. Références

- [Moti Documentation](https://moti.fyi/)
- [React Native Reanimated Web](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/web-support/)
- [Next.js Babel Configuration](https://nextjs.org/docs/pages/building-your-application/configuring/babel)
- [react-native-web](https://necolas.github.io/react-native-web/)

---

**Fin du Diagnostic**





