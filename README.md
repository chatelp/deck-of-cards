# 🎴 Deck of Cards - Cross-Platform Animation System

> **Projet** : Bibliothèque de cartes animées pour React Native et Web  
> **Statut** : ✅ Production Ready  
> **Architecture** : Monorepo TypeScript avec 4 packages

## 📦 Architecture

```
deck-of-cards/
├── packages/
│   ├── @deck/core/          # Logique métier & algorithmes (agnostique plateforme)
│   ├── @deck/web/           # Implémentation Web (Framer Motion)
│   ├── @deck/rn/            # Implémentation React Native (Reanimated)
│   └── apps/
│       ├── mobile/          # Demo React Native (Expo)
│       └── web/             # Demo Web (Next.js)
```

## 🎯 Fonctionnalités

### ✨ Animations Fluides
- **3 modes de layout** : Stack, Fan, Ring
- **Transitions fluides** entre modes
- **Animations GPU-accélérées** (Web: Framer Motion, RN: Reanimated)
- **Gestion intelligente du z-index** selon la profondeur

### 📱 Responsive Design
- **Auto-adaptation** aux dimensions du container
- **Calculs adaptatifs** de rayon (fan/ring) selon nombre de cartes
- **Safety margins** pour rotations et arrondis
- **Performance optimisée** avec useMemo stratégiques

### 🔧 Architecture Robuste
- **Single Source of Truth** pour toute la logique
- **Séparation claire** logique métier / rendu plateforme
- **TypeScript strict** avec interfaces partagées
- **Tests automatisés** et CI/CD

## 🚀 Démarrage Rapide

### Prérequis
```bash
Node.js >= 18
npm >= 8
```

### Installation
```bash
# Cloner le repo
git clone https://github.com/username/deck-of-cards.git
cd deck-of-cards

# Installer dépendances
npm install

# Builder tous les packages
npm run build
```

### Lancer les démos
```bash
# Demo React Native
cd apps/mobile
npm start

# Demo Web
cd apps/web
npm run dev
```

## 📚 Documentation

### 🏗️ Architecture & Développement
- [📖 Architecture Technique](./docs/ARCHITECTURE.md) - Structure, patterns, performance
- [🔧 Guide de Débogage](./docs/DEBUGGING.md) - Résoudre les problèmes de centrage RN
- [📋 API Reference](./docs/API.md) - Props, interfaces, exemples d'usage

### ✅ Solutions & Migration
- [🎯 Analyse Technique](./docs/ANALYSIS.md) - Problèmes identifiés et solutions architecturales
- [✅ Correctifs Implémentés](./docs/CORRECTIFS.md) - Solutions aux 8 problèmes critiques
- [🔄 Migration RN](./docs/MIGRATION_RN.md) - Passage Baked Scale → Parent Scale

### 📖 Vue d'Ensemble
- [📚 Documentation Complète](./docs/README.md) - Index et guide de navigation

## 🎮 Utilisation

### Dans votre app React Native

```tsx
import { DeckView } from '@deck/rn';

export default function MyGame() {
  return (
    <DeckView
      cards={myCards}
      autoFan
      drawLimit={3}
      onDeckStateChange={(state) => {
        // Gérer les changements d'état
      }}
      renderCardFace={({ data }) => (
        <View style={styles.card}>
          <Text>{data.name}</Text>
        </View>
      )}
    />
  );
}
```

### Dans votre app Web

```tsx
import { DeckView } from '@deck/web';

export default function MyGame() {
  return (
    <DeckView
      cards={myCards}
      autoFan
      drawLimit={3}
      onDeckStateChange={(state) => {
        // Même API que RN !
      }}
      renderCardFace={({ data }) => (
        <div className="card">
          {data.name}
        </div>
      )}
    />
  );
}
```

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm run test:integration

# Tests e2e
npm run test:e2e
```

## 📊 Performance

### Benchmarks (iPhone 12)
- **Initial render** : < 50ms
- **Layout switch** : < 30ms
- **Memory usage** : < 10MB
- **Battery impact** : Négligeable

### Optimisations
- **GPU acceleration** pour toutes les animations
- **Memoization** stratégique des calculs lourds
- **Bounds calculation** optimisée (1 seul calcul)
- **Lazy loading** des assets graphiques

## 🤝 Contribution

### Processus
1. Fork le repo
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commiter (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une PR

### Standards de Code
- **TypeScript strict** obligatoire
- **ESLint + Prettier** configurés
- **Tests** requis pour tout nouveau code
- **Documentation** à jour

### Debugging
Pour les problèmes de centrage RN, activer les logs de debug :
```tsx
<DeckView debugLogs={__DEV__} ... />
```

## 📄 Licence

MIT - Voir [LICENSE](./LICENSE) pour plus de détails.

## 🙏 Crédits

- **Architecture** : Inspiré de React Spring et Framer Motion
- **Algorithmes** : Calculs de bounds optimisés pour performance
- **UI/UX** : Design système cohérent Web/RN

---

**🎴 Construit avec ❤️ pour les jeux de cartes modernes**